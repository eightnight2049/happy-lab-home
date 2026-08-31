"""Full API contract and PostgreSQL consistency regression for the lab site."""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Any

from playwright.sync_api import APIRequestContext, sync_playwright


BASE_URL = os.getenv("LAB_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
ADMIN_EMAIL = os.getenv("LAB_ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("LAB_ADMIN_PASSWORD", "")
ROOT = Path(__file__).resolve().parents[1]
PNG_BYTES = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
EXPECTED_PATHS = {
    "/health",
    "/api/auth/login",
    "/api/auth/register",
    "/api/public/home",
    "/api/admin/settings",
    "/api/admin/news",
    "/api/admin/news/{news_id}",
    "/api/admin/publications",
    "/api/admin/publications/{publication_id}",
    "/api/admin/review-queue",
    "/api/admin/review-queue/{content_type}/{content_id}/publish",
    "/api/admin/people",
    "/api/admin/people/{person_id}",
    "/api/admin/people/{person_id}/sub-admin",
    "/api/admin/users",
    "/api/admin/users/{user_id}",
    "/api/admin/upload",
    "/api/feedback",
    "/api/feedback/upload",
    "/api/feedback/{feedback_id}/like",
    "/api/feedback/{feedback_id}/resolve",
    "/api/admin/feedback/{feedback_id}",
}


class Checks:
    def __init__(self) -> None:
        self.passed: list[str] = []
        self.failed: list[str] = []

    def ok(self, name: str, condition: bool, detail: str = "") -> None:
        if condition:
            self.passed.append(name)
        else:
            self.failed.append(f"{name}{': ' + detail if detail else ''}")


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def psql(query: str) -> tuple[int, str, str]:
    result = subprocess.run(
        ["docker", "compose", "exec", "-T", "db", "psql", "-U", "lab", "-d", "labdb", "-tA", "-v", "ON_ERROR_STOP=1", "-c", query],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def db_value(query: str) -> str:
    return psql(query)[1]


def cleanup(emails: list[str], ids: dict[str, int], media_names: list[str], original_settings: dict[str, Any] | None, owner_token: str) -> None:
    if original_settings:
        # Best effort restore in case the test stops after the settings mutation.
        subprocess.run(
            ["curl", "-fsS", "-X", "PUT", f"{BASE_URL}/api/admin/settings", "-H", f"Authorization: Bearer {owner_token}", "-H", "Content-Type: application/json", "-d", json.dumps(original_settings)],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
    statements = [
        *(f"DELETE FROM {table} WHERE id = {value};" for table, value in (("news_items", ids.get("news")), ("publications", ids.get("publication")), ("people", ids.get("person")), ("feedback", ids.get("feedback"))) if value),
        f"DELETE FROM users WHERE email IN ({', '.join(repr(email) for email in emails)});",
    ]
    psql(" ".join(statements))
    for name in media_names:
        if Path(name).name == name:
            subprocess.run(["docker", "compose", "exec", "-T", "api", "rm", "-f", f"/data/uploads/{name}"], cwd=ROOT, check=False, capture_output=True, text=True)


def main() -> int:
    checks = Checks()
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("LAB_ADMIN_EMAIL and LAB_ADMIN_PASSWORD are required", file=sys.stderr)
        return 2

    suffix = uuid.uuid4().hex[:10]
    email = f"qa-api-{suffix}@example.invalid"
    editor_email = f"qa-editor-{suffix}@example.invalid"
    password = "qa-password-123"
    ids: dict[str, int] = {}
    media_names: list[str] = []
    original_settings: dict[str, Any] | None = None
    owner_token = ""
    contributor_token = ""

    with sync_playwright() as playwright:
        api = playwright.request.new_context(base_url=BASE_URL)
        try:
            health = api.get("/health")
            checks.ok("GET /health", health.status == 200 and health.json().get("status") == "ok")

            openapi = api.get("/api/openapi.json")
            openapi_paths = set(openapi.json().get("paths", {})) if openapi.ok else set()
            checks.ok("OpenAPI lists every implemented path", openapi.ok and EXPECTED_PATHS <= openapi_paths, f"missing={sorted(EXPECTED_PATHS - openapi_paths)}")

            public_before_response = api.get("/api/public/home")
            checks.ok("GET /api/public/home", public_before_response.ok)
            public_before = public_before_response.json() if public_before_response.ok else {}
            original_settings = public_before.get("settings")
            checks.ok("public home has all collections", all(key in public_before for key in ("settings", "news", "research", "people", "publications")))
            checks.ok("public home excludes pending content", all(item.get("is_published", True) for item in public_before.get("news", [])) and all(item.get("is_published", True) for item in public_before.get("publications", [])))

            bad_login = api.post("/api/auth/login", data={"email": ADMIN_EMAIL, "password": "wrong-password"})
            checks.ok("invalid login returns 401", bad_login.status == 401)
            short_registration = api.post("/api/auth/register", data={"email": f"short-{suffix}@example.invalid", "full_name": "QA", "password": "short"})
            checks.ok("invalid registration is rejected", short_registration.status == 422)

            owner_login = api.post("/api/auth/login", data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
            checks.ok("owner login returns 200", owner_login.ok)
            if not owner_login.ok:
                return 1
            owner_session = owner_login.json()
            owner_token = owner_session["token"]
            owner_headers = headers(owner_token)

            registration = api.post("/api/auth/register", data={"email": email, "full_name": f"QA API {suffix}", "password": password})
            checks.ok("POST /api/auth/register returns Contributor", registration.status == 201 and registration.json().get("user", {}).get("role") == "contributor")
            contributor_token = registration.json()["token"] if registration.ok else ""
            registered_user_id = int(registration.json().get("user", {}).get("id", 0)) if registration.ok else 0
            contributor_headers = headers(contributor_token)
            duplicate = api.post("/api/auth/register", data={"email": email, "full_name": "Duplicate", "password": password})
            checks.ok("duplicate registration returns 409", duplicate.status == 409)

            protected_gets = {
                "/api/admin/news": api.get("/api/admin/news"),
                "/api/admin/publications": api.get("/api/admin/publications"),
                "/api/admin/people": api.get("/api/admin/people"),
                "/api/admin/review-queue": api.get("/api/admin/review-queue"),
                "/api/admin/profile": api.get("/api/admin/profile"),
                "/api/admin/users": api.get("/api/admin/users"),
            }
            checks.ok("all protected collection GETs reject anonymous access", all(response.status in (401, 403) for response in protected_gets.values()))
            checks.ok("GET /api/admin/news as Contributor", api.get("/api/admin/news", headers=contributor_headers).ok)
            checks.ok("GET /api/admin/publications as Contributor", api.get("/api/admin/publications", headers=contributor_headers).ok)
            checks.ok("GET /api/admin/people as Contributor", api.get("/api/admin/people", headers=contributor_headers).ok)
            checks.ok("GET /api/admin/review-queue rejects Contributor", api.get("/api/admin/review-queue", headers=contributor_headers).status == 403)
            checks.ok("GET /api/admin/profile as Contributor", api.get("/api/admin/profile", headers=contributor_headers).ok)
            checks.ok("GET /api/admin/users rejects Contributor", api.get("/api/admin/users", headers=contributor_headers).status == 403)

            news_payload = {"date": "2026-08-29", "title": f"QA news {suffix}", "body": "Database consistency news", "href": "/publications", "tag": "QA", "is_published": True}
            news = api.post("/api/admin/news", headers=contributor_headers, data=news_payload)
            news_data = news.json() if news.ok else {}
            ids["news"] = int(news_data.get("id", 0))
            checks.ok("POST /api/admin/news persists Contributor pending content", news.ok and news_data.get("is_published") is False and db_value(f"SELECT title FROM news_items WHERE id = {ids['news']}") == news_payload["title"])
            checks.ok("GET /api/admin/news includes pending content", any(item.get("id") == ids["news"] and item.get("is_published") is False for item in api.get("/api/admin/news", headers=owner_headers).json()))
            news_update = api.put(f"/api/admin/news/{ids['news']}", headers=owner_headers, data={**news_data, "body": "Updated in PostgreSQL", "is_published": False})
            checks.ok("PUT /api/admin/news edits pending content", news_update.ok and news_update.json().get("is_published") is False and db_value(f"SELECT body FROM news_items WHERE id = {ids['news']}") == "Updated in PostgreSQL")
            checks.ok("PUT missing news returns 404", api.put("/api/admin/news/999999", headers=owner_headers, data=news_payload).status == 404)

            publication_payload = {"title": f"QA publication {suffix}", "authors": "QA Author", "venue": "QA Conference", "venue_short": "QA", "year": 2026, "type": "Conference", "status": "Pending review", "abstract": "Database consistency publication", "paper_url": "https://example.invalid/paper", "featured": False, "is_published": False}
            publication = api.post("/api/admin/publications", headers=contributor_headers, data=publication_payload)
            publication_data = publication.json() if publication.ok else {}
            ids["publication"] = int(publication_data.get("id", 0))
            checks.ok("POST /api/admin/publications persists pending content", publication.ok and publication_data.get("is_published") is False and db_value(f"SELECT title FROM publications WHERE id = {ids['publication']}") == publication_payload["title"])
            checks.ok("GET /api/admin/publications includes pending content", any(item.get("id") == ids["publication"] for item in api.get("/api/admin/publications", headers=owner_headers).json()))
            publication_update = api.put(f"/api/admin/publications/{ids['publication']}", headers=owner_headers, data={**publication_data, "abstract": "Updated in PostgreSQL", "status": "Pending review", "is_published": False})
            checks.ok("PUT /api/admin/publications edits pending content", publication_update.ok and publication_update.json().get("status") == "Pending review" and db_value(f"SELECT abstract FROM publications WHERE id = {ids['publication']}") == "Updated in PostgreSQL")
            checks.ok("PUT missing publication returns 404", api.put("/api/admin/publications/999999", headers=owner_headers, data=publication_payload).status == 404)

            person_payload = {"name": f"QA person {suffix}", "role": "QA Student", "group": "PhD Students", "bio": "Database consistency profile", "research_interests": ["Testing"], "email": email, "is_visible": False}
            direct_person = api.post("/api/admin/people", headers=contributor_headers, data=person_payload)
            checks.ok("Contributor cannot create a People profile directly", direct_person.status == 403)
            person = api.put("/api/admin/profile", headers=contributor_headers, data=person_payload)
            person_data = person.json() if person.ok else {}
            ids["person"] = int(person_data.get("id", 0))
            checks.ok("PUT /api/admin/profile persists hidden profile", person.status == 200 and person_data.get("is_visible") is False and db_value(f"SELECT name FROM people WHERE id = {ids['person']}") == person_payload["name"])
            checks.ok("Contributor cannot delete a People profile", api.delete(f"/api/admin/people/{ids['person']}", headers=contributor_headers).status == 403)
            my_profile = api.get("/api/admin/profile", headers=contributor_headers)
            checks.ok("GET /api/admin/profile returns own profile", my_profile.ok and my_profile.json().get("id") == ids["person"])
            profile_update = api.put("/api/admin/profile", headers=contributor_headers, data={**person_payload, "name": f"QA profile update {suffix}", "is_visible": True})
            checks.ok("PUT /api/admin/profile keeps Contributor profile pending", profile_update.ok and profile_update.json().get("is_visible") is False and db_value(f"SELECT name FROM people WHERE id = {ids['person']}") == f"QA profile update {suffix}")
            checks.ok("PATCH sub-admin rejects Contributor", api.patch(f"/api/admin/people/{ids['person']}/sub-admin", headers=contributor_headers, data={"is_sub_admin": True}).status == 403)
            granted = api.patch(f"/api/admin/people/{ids['person']}/sub-admin", headers=owner_headers, data={"is_sub_admin": True})
            checks.ok("Owner can grant sub-admin from People", granted.ok and granted.json().get("account_role") == "editor" and db_value(f"SELECT role FROM users WHERE email = '{email}'") == "editor")
            revoked = api.patch(f"/api/admin/people/{ids['person']}/sub-admin", headers=owner_headers, data={"is_sub_admin": False})
            checks.ok("Owner can revoke sub-admin from People", revoked.ok and revoked.json().get("account_role") == "contributor" and db_value(f"SELECT role FROM users WHERE email = '{email}'") == "contributor")
            promote_linked = api.patch(f"/api/admin/users/{registered_user_id}", headers=owner_headers, data={"role": "admin"})
            blocked_admin_change = api.patch(f"/api/admin/people/{ids['person']}/sub-admin", headers=owner_headers, data={"is_sub_admin": True})
            checks.ok("People sub-admin route protects Administrator accounts", promote_linked.ok and blocked_admin_change.status == 400)
            api.patch(f"/api/admin/users/{registered_user_id}", headers=owner_headers, data={"role": "contributor"})
            person_update = api.put(f"/api/admin/people/{ids['person']}", headers=owner_headers, data={**person_data, "name": f"QA admin edit {suffix}", "is_visible": False})
            checks.ok("PUT /api/admin/people edits pending content", person_update.ok and person_update.json().get("is_visible") is False and db_value(f"SELECT name FROM people WHERE id = {ids['person']}") == f"QA admin edit {suffix}")
            checks.ok("PUT missing person returns 404", api.put("/api/admin/people/999999", headers=owner_headers, data=person_payload).status == 404)

            review_queue = api.get("/api/admin/review-queue", headers=owner_headers)
            review_items = review_queue.json() if review_queue.ok else []
            checks.ok("review queue aggregates pending news, publication, and profile", review_queue.ok and {item.get("content_type") for item in review_items} >= {"news", "publication", "person"})
            for content_type, content_id in (("news", ids["news"]), ("publication", ids["publication"]), ("person", ids["person"])):
                published = api.post(f"/api/admin/review-queue/{content_type}/{content_id}/publish", headers=owner_headers)
                checks.ok(f"review queue publishes {content_type}", published.ok and published.json().get("status") == "published")
            remaining_review_items = api.get("/api/admin/review-queue", headers=owner_headers)
            remaining_review_data = remaining_review_items.json() if remaining_review_items.ok else []
            checks.ok("published submissions leave the review queue", remaining_review_items.ok and not any(item.get("id") == content_id and item.get("content_type") == content_type for item in remaining_review_data for content_type, content_id in (("news", ids["news"]), ("publication", ids["publication"]), ("person", ids["person"]))))
            public_after_review = api.get("/api/public/home").json()
            checks.ok("reviewed news reaches public API", any(item.get("title") == news_payload["title"] for item in public_after_review.get("news", [])))
            checks.ok("reviewed publication reaches public API", any(item.get("title") == publication_payload["title"] for item in public_after_review.get("publications", [])))
            checks.ok("reviewed profile reaches public API", any(item.get("name") == f"QA admin edit {suffix}" for item in public_after_review.get("people", [])))

            invalid_admin_upload = api.post("/api/admin/upload", headers=owner_headers, multipart={"file": {"name": "qa.txt", "mimeType": "text/plain", "buffer": b"invalid"}})
            checks.ok("POST /api/admin/upload rejects unsupported type", invalid_admin_upload.status == 400)
            admin_upload = api.post("/api/admin/upload", headers=owner_headers, multipart={"file": {"name": "qa.png", "mimeType": "image/png", "buffer": PNG_BYTES}})
            admin_upload_data = admin_upload.json() if admin_upload.ok else {}
            admin_media = Path(admin_upload_data.get("url", "")).name
            if admin_media:
                media_names.append(admin_media)
            checks.ok("POST /api/admin/upload stores valid file", admin_upload.ok and admin_upload_data.get("url", "").startswith("/media/") and api.get(admin_upload_data.get("url", "")).ok)

            settings_update = {**original_settings, "tagline": f"QA settings {suffix}"} if original_settings else None
            if settings_update:
                settings_response = api.put("/api/admin/settings", headers=owner_headers, data=settings_update)
                checks.ok("PUT /api/admin/settings writes database", settings_response.ok and settings_response.json().get("tagline") == settings_update["tagline"] and db_value("SELECT tagline FROM lab_settings LIMIT 1") == settings_update["tagline"])
                public_after_settings = api.get("/api/public/home").json()
                checks.ok("updated settings reach public API", public_after_settings.get("settings", {}).get("tagline") == settings_update["tagline"])

            feedback_upload_invalid = api.post("/api/feedback/upload", multipart={"file": {"name": "qa.txt", "mimeType": "text/plain", "buffer": b"invalid"}})
            checks.ok("POST /api/feedback/upload rejects unsupported type", feedback_upload_invalid.status == 400)
            feedback_upload = api.post("/api/feedback/upload", multipart={"file": {"name": "feedback.png", "mimeType": "image/png", "buffer": PNG_BYTES}})
            feedback_upload_data = feedback_upload.json() if feedback_upload.ok else {}
            feedback_media = Path(feedback_upload_data.get("url", "")).name
            if feedback_media:
                media_names.append(feedback_media)
            checks.ok("POST /api/feedback/upload stores valid screenshot", feedback_upload.ok and feedback_upload_data.get("url", "").startswith("/media/") and api.get(feedback_upload_data.get("url", "")).ok)
            invalid_feedback = api.post("/api/feedback", data={"author_name": "QA", "message": "Invalid screenshot", "screenshot_url": "https://example.invalid/not-media.png"})
            checks.ok("POST /api/feedback validates screenshot URL", invalid_feedback.status == 400)
            feedback = api.post("/api/feedback", data={"author_name": f"QA visitor {suffix}", "message": f"QA feedback {suffix}", "screenshot_url": feedback_upload_data.get("url")})
            feedback_data = feedback.json() if feedback.ok else {}
            ids["feedback"] = int(feedback_data.get("id", 0))
            checks.ok("POST /api/feedback writes database", feedback.status == 201 and db_value(f"SELECT message FROM feedback WHERE id = {ids['feedback']}") == f"QA feedback {suffix}")
            checks.ok("GET /api/feedback includes new row", any(item.get("id") == ids["feedback"] for item in api.get("/api/feedback").json()))
            agreed = api.post(f"/api/feedback/{ids['feedback']}/like")
            agreed_again = api.post(f"/api/feedback/{ids['feedback']}/like")
            checks.ok("POST /api/feedback/{id}/like increments on every agree", agreed.ok and agreed.json().get("likes_count") == 1 and agreed_again.ok and agreed_again.json().get("likes_count") == 2 and db_value(f"SELECT likes_count::text FROM feedback WHERE id = {ids['feedback']}") == "2")
            checks.ok("agree missing feedback returns 404", api.post("/api/feedback/999999/like").status == 404)
            resolved_public = api.post(f"/api/feedback/{ids['feedback']}/resolve")
            checks.ok("POST /api/feedback/{id}/resolve is public", resolved_public.ok and resolved_public.json().get("is_resolved") is True and db_value(f"SELECT is_resolved::text FROM feedback WHERE id = {ids['feedback']}") == "true")
            reopened_public = api.post(f"/api/feedback/{ids['feedback']}/resolve")
            checks.ok("POST /api/feedback/{id}/resolve reopens feedback", reopened_public.ok and reopened_public.json().get("is_resolved") is False and db_value(f"SELECT is_resolved::text FROM feedback WHERE id = {ids['feedback']}") == "false")
            checks.ok("resolve missing feedback returns 404", api.post("/api/feedback/999999/resolve").status == 404)
            checks.ok("PATCH feedback rejects anonymous access", api.patch(f"/api/admin/feedback/{ids['feedback']}", data={"is_resolved": True}).status in (401, 403))
            resolved = api.patch(f"/api/admin/feedback/{ids['feedback']}", headers=owner_headers, data={"is_resolved": True})
            checks.ok("PATCH /api/admin/feedback updates database", resolved.ok and resolved.json().get("is_resolved") is True and db_value(f"SELECT is_resolved::text FROM feedback WHERE id = {ids['feedback']}") == "true")
            checks.ok("PATCH missing feedback returns 404", api.patch("/api/admin/feedback/999999", headers=owner_headers, data={"is_resolved": True}).status == 404)

            deleted = api.delete(f"/api/admin/news/{ids['news']}", headers=owner_headers)
            checks.ok("DELETE /api/admin/news removes database row", deleted.ok and db_value(f"SELECT count(*)::text FROM news_items WHERE id = {ids['news']}") == "0")
            checks.ok("DELETE missing news returns 404", api.delete("/api/admin/news/999999", headers=owner_headers).status == 404)
            deleted_publication = api.delete(f"/api/admin/publications/{ids['publication']}", headers=owner_headers)
            checks.ok("DELETE /api/admin/publications removes database row", deleted_publication.ok and db_value(f"SELECT count(*)::text FROM publications WHERE id = {ids['publication']}") == "0")
            deleted_person = api.delete(f"/api/admin/people/{ids['person']}", headers=owner_headers)
            checks.ok("DELETE /api/admin/people removes database row", deleted_person.ok and db_value(f"SELECT count(*)::text FROM people WHERE id = {ids['person']}") == "0")

            created_user = api.post("/api/admin/users", headers=owner_headers, data={"email": editor_email, "full_name": "QA Editor", "password": password, "role": "editor"})
            user_data = created_user.json() if created_user.ok else {}
            user_id = int(user_data.get("id", 0))
            checks.ok("POST /api/admin/users creates account", created_user.status == 200 and user_data.get("role") == "editor" and db_value(f"SELECT role FROM users WHERE id = {user_id}") == "editor")
            checks.ok("GET /api/admin/users returns accounts", api.get("/api/admin/users", headers=owner_headers).ok)
            duplicate_user = api.post("/api/admin/users", headers=owner_headers, data={"email": editor_email, "full_name": "Duplicate", "password": password, "role": "editor"})
            checks.ok("duplicate admin user returns 409", duplicate_user.status == 409)
            invalid_role = api.post("/api/admin/users", headers=owner_headers, data={"email": f"invalid-{suffix}@example.invalid", "full_name": "Invalid", "password": password, "role": "root"})
            checks.ok("unsupported admin role returns 400", invalid_role.status == 400)
            promoted = api.patch(f"/api/admin/users/{user_id}", headers=owner_headers, data={"role": "contributor"})
            checks.ok("PATCH /api/admin/users changes role", promoted.ok and promoted.json().get("role") == "contributor" and db_value(f"SELECT role FROM users WHERE id = {user_id}") == "contributor")
            paused = api.patch(f"/api/admin/users/{user_id}", headers=owner_headers, data={"is_active": False})
            checks.ok("PATCH /api/admin/users pauses account", paused.ok and paused.json().get("is_active") is False and db_value(f"SELECT is_active::text FROM users WHERE id = {user_id}") == "false")
            checks.ok("paused account login returns 401", api.post("/api/auth/login", data={"email": editor_email, "password": password}).status == 401)
            checks.ok("PATCH missing user returns 404", api.patch("/api/admin/users/999999", headers=owner_headers, data={"role": "editor"}).status == 404)
            checks.ok("Owner cannot demote own account", api.patch(str(f"/api/admin/users/{int(owner_session['user']['id'])}"), headers=owner_headers, data={"role": "contributor"}).status == 400)

            # The API has already been restarted in deployment checks; verify the actual persisted fixture state directly before cleanup.
            checks.ok("PostgreSQL has expected core tables", db_value("SELECT count(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users','lab_settings','research_areas','people','news_items','publications','feedback')") == "7")
            checks.ok("database has no orphaned test news after delete", db_value(f"SELECT count(*)::text FROM news_items WHERE title = '{news_payload['title']}'") == "0")
        finally:
            api.dispose()
            cleanup([email, editor_email], ids, media_names, original_settings, owner_token)

    print(json.dumps({"base_url": BASE_URL, "passed": checks.passed, "failed": checks.failed}, ensure_ascii=False, indent=2))
    return 1 if checks.failed else 0


if __name__ == "__main__":
    sys.exit(main())
