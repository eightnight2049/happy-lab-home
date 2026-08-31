"""Playwright API business-flow checks with isolated, cleaned-up fixtures."""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any

from playwright.sync_api import APIRequestContext, sync_playwright


BASE_URL = os.getenv("LAB_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
ADMIN_EMAIL = os.getenv("LAB_ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("LAB_ADMIN_PASSWORD", "")
ROOT = Path(__file__).resolve().parents[1]

# A tiny valid 1x1 PNG, used only to verify the upload contract.
PNG_BYTES = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")


class Checks:
    def __init__(self) -> None:
        self.passed: list[str] = []
        self.failed: list[str] = []

    def ok(self, name: str, condition: bool, detail: str = "") -> None:
        if condition:
            self.passed.append(name)
        else:
            self.failed.append(f"{name}{': ' + detail if detail else ''}")


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def cleanup(email: str, ids: dict[str, int], media_names: list[str]) -> None:
    statements = [
        *(f"DELETE FROM {table} WHERE id = {value};" for table, value in (("news_items", ids.get("news")), ("publications", ids.get("publication")), ("people", ids.get("person")), ("feedback", ids.get("feedback"))) if value),
        f"DELETE FROM users WHERE email = '{email}';",
    ]
    subprocess.run(["docker", "compose", "exec", "-T", "db", "psql", "-U", "lab", "-d", "labdb", "-v", "ON_ERROR_STOP=1", "-c", " ".join(statements)], cwd=ROOT, check=False, capture_output=True, text=True)
    for name in media_names:
        if Path(name).name == name:
            subprocess.run(["docker", "compose", "exec", "-T", "api", "rm", "-f", f"/data/uploads/{name}"], cwd=ROOT, check=False, capture_output=True, text=True)


def main() -> int:
    checks = Checks()
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("LAB_ADMIN_EMAIL and LAB_ADMIN_PASSWORD are required", file=sys.stderr)
        return 2

    suffix = uuid.uuid4().hex[:10]
    email = f"qa-{suffix}@example.invalid"
    password = "qa-password-123"
    news_title = f"QA news {suffix}"
    publication_title = f"QA publication {suffix}"
    person_name = f"QA person {suffix}"
    feedback_message = f"QA feedback {suffix}"
    ids: dict[str, int] = {}
    media_names: list[str] = []

    with sync_playwright() as playwright:
        api = playwright.request.new_context(base_url=BASE_URL)
        try:
            owner_login = api.post("/api/auth/login", data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
            checks.ok("owner login succeeds", owner_login.ok, str(owner_login.status))
            if not owner_login.ok:
                return 1
            owner_token = owner_login.json()["token"]
            owner_headers = auth(owner_token)

            register = api.post("/api/auth/register", data={"email": email, "full_name": f"QA Contributor {suffix}", "password": password})
            checks.ok("register creates Contributor", register.status == 201 and register.json().get("user", {}).get("role") == "contributor", str(register.status))
            contributor_token = register.json()["token"] if register.ok else ""
            contributor_headers = auth(contributor_token)

            news_payload = {"date": "2026-08-29", "title": news_title, "body": "Temporary business-flow test news.", "tag": "QA", "is_published": True}
            news = api.post("/api/admin/news", headers=contributor_headers, data=news_payload)
            news_data = news.json() if news.ok else {}
            ids["news"] = int(news_data.get("id", 0))
            checks.ok("Contributor news is forced to pending review", news.ok and news_data.get("is_published") is False)
            contributor_news_update = api.put(f"/api/admin/news/{ids['news']}", headers=contributor_headers, data={**news_data, "is_published": True})
            checks.ok("Contributor cannot self-publish news", contributor_news_update.ok and contributor_news_update.json().get("is_published") is False)

            publication_payload = {"title": publication_title, "authors": "QA Author", "venue": "QA Conference", "venue_short": "QA", "year": 2026, "type": "Conference", "status": "Published", "abstract": "Temporary publication.", "paper_url": "https://example.invalid/paper", "featured": True, "is_published": True}
            publication = api.post("/api/admin/publications", headers=contributor_headers, data=publication_payload)
            publication_data = publication.json() if publication.ok else {}
            ids["publication"] = int(publication_data.get("id", 0))
            checks.ok("Contributor publication is pending review", publication.ok and publication_data.get("status") == "Pending review" and publication_data.get("is_published") is False and publication_data.get("featured") is False)
            contributor_publication_update = api.put(f"/api/admin/publications/{ids['publication']}", headers=contributor_headers, data={**publication_data, "status": "Published", "is_published": True})
            checks.ok("Contributor cannot self-publish publication", contributor_publication_update.ok and contributor_publication_update.json().get("is_published") is False)

            person_payload = {"name": person_name, "role": "QA Student", "group": "PhD Students", "bio": "Temporary business-flow test member.", "research_interests": ["Testing"], "is_visible": True}
            checks.ok("Contributor cannot create People directly", api.post("/api/admin/people", headers=contributor_headers, data=person_payload).status == 403)
            person = api.put("/api/admin/profile", headers=contributor_headers, data=person_payload)
            person_data = person.json() if person.ok else {}
            ids["person"] = int(person_data.get("id", 0))
            checks.ok("Contributor profile is forced to hidden", person.status == 200 and person_data.get("is_visible") is False)
            checks.ok("review queue lists pending submissions", api.get("/api/admin/review-queue", headers=owner_headers).ok and any(item.get("content_type") == "person" and item.get("id") == ids["person"] for item in api.get("/api/admin/review-queue", headers=owner_headers).json()))
            checks.ok("Contributor cannot change site settings", api.put("/api/admin/settings", headers=contributor_headers, data={}).status == 403)
            checks.ok("Contributor cannot moderate feedback", api.patch("/api/admin/feedback/1", headers=contributor_headers, data={"is_resolved": True}).status == 403)
            checks.ok("Contributor cannot delete news", api.delete("/api/admin/news/1", headers=contributor_headers).status == 403)
            checks.ok("Contributor cannot delete People profile", api.delete(f"/api/admin/people/{ids['person']}", headers=contributor_headers).status == 403)

            public_before = api.get("/api/public/home").json()
            checks.ok("pending news is not public", not any(item.get("title") == news_title for item in public_before.get("news", [])))
            checks.ok("pending publication is not public", not any(item.get("title") == publication_title for item in public_before.get("publications", [])))
            checks.ok("pending profile is not public", not any(item.get("name") == person_name for item in public_before.get("people", [])))

            published_news = api.put(f"/api/admin/news/{ids['news']}", headers=owner_headers, data={**news_data, "is_published": True})
            checks.ok("Owner can publish news", published_news.ok and published_news.json().get("is_published") is True)
            published_publication = api.put(f"/api/admin/publications/{ids['publication']}", headers=owner_headers, data={**publication_data, "status": "Published", "is_published": True})
            checks.ok("Owner can publish publication", published_publication.ok and published_publication.json().get("is_published") is True)
            published_person = api.put(f"/api/admin/people/{ids['person']}", headers=owner_headers, data={**person_data, "is_visible": True})
            checks.ok("Owner can publish profile", published_person.ok and published_person.json().get("is_visible") is True)
            public_after = api.get("/api/public/home").json()
            checks.ok("published news reaches public API", any(item.get("title") == news_title for item in public_after.get("news", [])))
            checks.ok("published publication reaches public API", any(item.get("title") == publication_title for item in public_after.get("publications", [])))
            checks.ok("published profile reaches public API", any(item.get("name") == person_name for item in public_after.get("people", [])))

            invalid_upload = api.post("/api/admin/upload", headers=owner_headers, multipart={"file": {"name": "qa.txt", "mimeType": "text/plain", "buffer": b"not an image"}})
            checks.ok("invalid admin upload is rejected", invalid_upload.status == 400, str(invalid_upload.status))
            valid_upload = api.post("/api/admin/upload", headers=owner_headers, multipart={"file": {"name": "qa.png", "mimeType": "image/png", "buffer": PNG_BYTES}})
            upload_data = valid_upload.json() if valid_upload.ok else {}
            if upload_data.get("url"):
                media_names.append(Path(upload_data["url"]).name)
            checks.ok("valid admin upload returns media URL", valid_upload.ok and upload_data.get("url", "").startswith("/media/"))

            feedback = api.post("/api/feedback", data={"author_name": f"QA visitor {suffix}", "message": feedback_message})
            feedback_data = feedback.json() if feedback.ok else {}
            ids["feedback"] = int(feedback_data.get("id", 0))
            checks.ok("visitor can submit feedback", feedback.status == 201 and feedback_data.get("is_resolved") is False)
            agreed = api.post(f"/api/feedback/{ids['feedback']}/like")
            agreed_again = api.post(f"/api/feedback/{ids['feedback']}/like")
            checks.ok("visitor can agree repeatedly", agreed.ok and agreed_again.ok and agreed_again.json().get("likes_count") == 2)
            resolved = api.patch(f"/api/admin/feedback/{ids['feedback']}", headers=owner_headers, data={"is_resolved": True})
            checks.ok("Owner can resolve feedback", resolved.ok and resolved.json().get("is_resolved") is True)

            deleted = api.delete(f"/api/admin/news/{ids['news']}", headers=owner_headers)
            checks.ok("Owner can delete news", deleted.ok and deleted.json().get("deleted") is True)
            deleted_publication = api.delete(f"/api/admin/publications/{ids['publication']}", headers=owner_headers)
            checks.ok("Owner can delete publication", deleted_publication.ok and deleted_publication.json().get("deleted") is True)
            deleted_person = api.delete(f"/api/admin/people/{ids['person']}", headers=owner_headers)
            checks.ok("Owner can delete People profile", deleted_person.ok and deleted_person.json().get("deleted") is True)

            promoted = api.patch(f"/api/admin/users/{int(register.json()['user']['id'])}", headers=owner_headers, data={"role": "editor"})
            checks.ok("Owner can change account role", promoted.ok and promoted.json().get("role") == "editor")
            paused = api.patch(f"/api/admin/users/{int(register.json()['user']['id'])}", headers=owner_headers, data={"is_active": False})
            checks.ok("Owner can pause account", paused.ok and paused.json().get("is_active") is False)
            checks.ok("paused account cannot log in", api.post("/api/auth/login", data={"email": email, "password": password}).status == 401)
            restored = api.patch(f"/api/admin/users/{int(register.json()['user']['id'])}", headers=owner_headers, data={"role": "contributor", "is_active": True})
            checks.ok("Owner can restore account", restored.ok and restored.json().get("role") == "contributor" and restored.json().get("is_active") is True)
            owner_id = int(owner_login.json()["user"]["id"])
            checks.ok("Owner cannot remove own access", api.patch(f"/api/admin/users/{owner_id}", headers=owner_headers, data={"role": "contributor"}).status == 400)
            checks.ok("unauthenticated publication admin list is protected", api.get("/api/admin/publications").status in (401, 403))
        finally:
            api.dispose()
            cleanup(email, ids, media_names)

    print(json.dumps({"base_url": BASE_URL, "passed": checks.passed, "failed": checks.failed}, ensure_ascii=False, indent=2))
    return 1 if checks.failed else 0


if __name__ == "__main__":
    sys.exit(main())
