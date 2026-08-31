"""End-to-end role workflow using temporary accounts and cleaned-up fixtures."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any

from playwright.sync_api import APIRequestContext, Page, sync_playwright


BASE_URL = os.getenv("LAB_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
OWNER_EMAIL = os.getenv("LAB_ADMIN_EMAIL", "")
OWNER_PASSWORD = os.getenv("LAB_ADMIN_PASSWORD", "")
ROOT = Path(__file__).resolve().parents[1]
AVATAR_A = Path(os.getenv("QA_AVATAR_A", str(ROOT / "public/reference/lab-dinner.jpg")))
AVATAR_B = Path(os.getenv("QA_AVATAR_B", str(ROOT / "public/reference/talk-thumb.jpg")))
PDF_BYTES = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


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


def psql(query: str) -> None:
    subprocess.run(
        ["docker", "compose", "exec", "-T", "db", "psql", "-U", "lab", "-d", "labdb", "-v", "ON_ERROR_STOP=1", "-c", query],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def cleanup(emails: list[str], ids: dict[str, int], media_names: list[str]) -> None:
    statements = [
        *(f"DELETE FROM {table} WHERE id = {value};" for table, value in (("news_items", ids.get("news")), ("news_items", ids.get("other_news")), ("news_items", ids.get("editor_news")), ("publications", ids.get("publication")), ("publications", ids.get("normalized_publication")), ("people", ids.get("person")), ("people", ids.get("editor_person"))) if value),
        f"DELETE FROM users WHERE email IN ({', '.join(repr(email) for email in emails)});",
    ]
    psql(" ".join(statements))
    for name in media_names:
        if Path(name).name == name:
            subprocess.run(["docker", "compose", "exec", "-T", "api", "rm", "-f", f"/data/uploads/{name}"], cwd=ROOT, check=False, capture_output=True, text=True)


def login(api: APIRequestContext, email: str, password: str) -> dict[str, Any]:
    response = api.post("/api/auth/login", data={"email": email, "password": password})
    return response.json() if response.ok else {}


def upload(api: APIRequestContext, token: str, path: Path, mime: str, filename: str) -> tuple[dict[str, Any], str]:
    response = api.post("/api/admin/upload", headers=auth(token), multipart={"file": {"name": filename, "mimeType": mime, "buffer": path.read_bytes()}})
    data = response.json() if response.ok else {}
    return data, Path(data.get("url", "")).name if data.get("url") else ""


def goto(page: Page, path: str) -> None:
    page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")


def sign_in(page: Page, email: str, password: str) -> None:
    goto(page, "/studio/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    page.wait_for_timeout(350)


def main() -> int:
    checks = Checks()
    if not OWNER_EMAIL or not OWNER_PASSWORD:
        print("LAB_ADMIN_EMAIL and LAB_ADMIN_PASSWORD are required", file=sys.stderr)
        return 2
    if not AVATAR_A.exists() or not AVATAR_B.exists():
        print(f"QA avatar files are missing: {AVATAR_A}, {AVATAR_B}", file=sys.stderr)
        return 2

    suffix = uuid.uuid4().hex[:10]
    password = "qa-password-123"
    submitter_email = f"qa-submitter-{suffix}@example.invalid"
    reviewer_email = f"qa-reviewer-{suffix}@example.invalid"
    observer_email = f"qa-observer-{suffix}@example.invalid"
    news_title = f"QA submitted news {suffix}"
    other_news_title = f"QA private pending news {suffix}"
    editor_news_title = f"QA editor news {suffix}"
    publication_title = f"QA submitted paper {suffix}"
    person_name = f"QA submitted person {suffix}"
    edited_person_name = f"QA approved person {suffix}"
    ids: dict[str, int] = {}
    media_names: list[str] = []
    emails = [submitter_email, reviewer_email, observer_email]

    with sync_playwright() as playwright:
        api = playwright.request.new_context(base_url=BASE_URL)
        try:
            owner = login(api, OWNER_EMAIL, OWNER_PASSWORD)
            checks.ok("owner can start workflow", bool(owner.get("token")))
            if not owner:
                return 1
            owner_token = owner["token"]
            owner_headers = auth(owner_token)

            submitter_response = api.post("/api/auth/register", data={"email": submitter_email, "full_name": f"QA Submitter {suffix}", "password": password})
            reviewer_response = api.post("/api/auth/register", data={"email": reviewer_email, "full_name": f"QA Reviewer {suffix}", "password": password})
            observer_response = api.post("/api/auth/register", data={"email": observer_email, "full_name": f"QA Observer {suffix}", "password": password})
            checks.ok("three temporary accounts register as Users", all(response.status == 201 and response.json().get("user", {}).get("role") == "contributor" for response in (submitter_response, reviewer_response, observer_response)))
            submitter = submitter_response.json() if submitter_response.ok else {}
            reviewer = reviewer_response.json() if reviewer_response.ok else {}
            observer = observer_response.json() if observer_response.ok else {}
            submitter_token = submitter.get("token", "")
            observer_token = observer.get("token", "")
            reviewer_id = int(reviewer.get("user", {}).get("id", 0))

            promoted = api.patch(f"/api/admin/users/{reviewer_id}", headers=owner_headers, data={"role": "editor"})
            checks.ok("Owner can promote the reviewer to Sub-admin", promoted.ok and promoted.json().get("role") == "editor")
            reviewer_session = login(api, reviewer_email, password)
            reviewer_token = reviewer_session.get("token", "")
            reviewer_headers = auth(reviewer_token)
            checks.ok("promoted reviewer logs in as Sub-admin", reviewer_session.get("user", {}).get("role") == "editor")

            avatar_data, avatar_name = upload(api, submitter_token, AVATAR_A, "image/png", "qa-submitter-avatar.png")
            if avatar_name:
                media_names.append(avatar_name)
            thumbnail_data, thumbnail_name = upload(api, submitter_token, AVATAR_B, "image/png", "qa-paper-thumbnail.png")
            if thumbnail_name:
                media_names.append(thumbnail_name)
            checks.ok("User can upload avatar and paper thumbnail", bool(avatar_data.get("url") and thumbnail_data.get("url") and api.get(avatar_data["url"]).ok and api.get(thumbnail_data["url"]).ok))

            profile_payload = {"name": person_name, "role": "PhD Student", "group": "PhD Students", "bio": "Temporary profile submitted through the user workflow.", "research_interests": ["Robot learning", "Evaluation"], "email": "spoofed@example.invalid", "website_url": "https://example.invalid/profile", "avatar_url": avatar_data.get("url"), "is_visible": True}
            profile = api.put("/api/admin/profile", headers=auth(submitter_token), data=profile_payload)
            profile_data = profile.json() if profile.ok else {}
            ids["person"] = int(profile_data.get("id", 0))
            checks.ok("User profile submission is hidden and keeps account email", profile.ok and profile_data.get("is_visible") is False and profile_data.get("email") == submitter_email)
            checks.ok("User cannot add a second People profile through the admin endpoint", api.post("/api/admin/people", headers=auth(submitter_token), data=profile_payload).status == 403)

            news_payload = {"date": "2026-08-29", "title": news_title, "body": "Temporary submitted news.", "href": "/publications", "tag": "QA", "is_published": True}
            news = api.post("/api/admin/news", headers=auth(submitter_token), data=news_payload)
            news_data = news.json() if news.ok else {}
            ids["news"] = int(news_data.get("id", 0))
            checks.ok("User news submission becomes Pending review", news.ok and news_data.get("is_published") is False)

            other_news = api.post("/api/admin/news", headers=auth(observer_token), data={**news_payload, "title": other_news_title})
            other_news_data = other_news.json() if other_news.ok else {}
            ids["other_news"] = int(other_news_data.get("id", 0))
            submitter_news = api.get("/api/admin/news", headers=auth(submitter_token)).json()
            checks.ok("User sees published news and own pending news only", any(item.get("id") == ids["news"] for item in submitter_news) and not any(item.get("id") == ids["other_news"] for item in submitter_news))
            checks.ok("User cannot open the review queue", api.get("/api/admin/review-queue", headers=auth(submitter_token)).status == 403)
            checks.ok("User cannot change site settings", api.put("/api/admin/settings", headers=auth(submitter_token), data={}).status == 403)
            checks.ok("User cannot manage accounts", api.get("/api/admin/users", headers=auth(submitter_token)).status == 403)
            checks.ok("User cannot publish through the review action", api.post(f"/api/admin/review-queue/news/{ids['news']}/publish", headers=auth(submitter_token)).status == 403)
            checks.ok("User cannot edit another user's pending news", api.put(f"/api/admin/news/{ids['other_news']}", headers=auth(submitter_token), data={**other_news_data, "body": "Should be blocked"}).status == 403)

            pdf_upload = api.post("/api/admin/upload", headers=auth(submitter_token), multipart={"file": {"name": "qa-paper.pdf", "mimeType": "application/pdf", "buffer": PDF_BYTES}})
            pdf_data = pdf_upload.json() if pdf_upload.ok else {}
            pdf_name = Path(pdf_data.get("url", "")).name if pdf_data.get("url") else ""
            if pdf_name:
                media_names.append(pdf_name)
            checks.ok("User can upload a paper PDF", pdf_upload.ok and pdf_data.get("url", "").startswith("/media/") and api.get(pdf_data["url"]).ok)

            publication_payload = {"title": publication_title, "authors": "QA Submitter; QA Reviewer", "venue": "Robotics QA Conference", "venue_short": "RQAC", "year": 2026, "type": "Conference", "status": "Published", "abstract": "Temporary paper submitted for the full workflow test.", "paper_url": "https://example.invalid/paper", "pdf_url": pdf_data.get("url"), "code_url": "https://github.com/example/qa-paper", "video_url": "https://youtu.be/example", "thumbnail_url": thumbnail_data.get("url"), "featured": True, "is_published": True}
            publication = api.post("/api/admin/publications", headers=auth(submitter_token), data=publication_payload)
            publication_data = publication.json() if publication.ok else {}
            ids["publication"] = int(publication_data.get("id", 0))
            checks.ok("User paper submission keeps all links but becomes Pending review", publication.ok and publication_data.get("status") == "Pending review" and publication_data.get("is_published") is False and publication_data.get("featured") is False and publication_data.get("pdf_url") == pdf_data.get("url"))

            reviewer_queue = api.get("/api/admin/review-queue", headers=reviewer_headers)
            queue = reviewer_queue.json() if reviewer_queue.ok else []
            checks.ok("Sub-admin sees all pending submissions", reviewer_queue.ok and {item.get("content_type") for item in queue} >= {"news", "publication", "person"})

            edited_news = api.put(f"/api/admin/news/{ids['news']}", headers=reviewer_headers, data={**news_data, "title": f"QA approved news {suffix}", "body": "Edited by the reviewer before publishing.", "is_published": False})
            checks.ok("Sub-admin can edit pending news", edited_news.ok and edited_news.json().get("title") == f"QA approved news {suffix}" and edited_news.json().get("is_published") is False)
            edited_publication = api.put(f"/api/admin/publications/{ids['publication']}", headers=reviewer_headers, data={**publication_data, "title": f"QA approved paper {suffix}", "abstract": "Edited by the reviewer before publishing.", "status": "Published", "is_published": False})
            checks.ok("Sub-admin can edit pending paper", edited_publication.ok and edited_publication.json().get("title") == f"QA approved paper {suffix}" and edited_publication.json().get("status") == "Pending review")
            edited_person = api.put(f"/api/admin/people/{ids['person']}", headers=reviewer_headers, data={**profile_data, "name": edited_person_name, "bio": "Edited by the reviewer before publishing.", "is_visible": False})
            checks.ok("Sub-admin can edit pending profile", edited_person.ok and edited_person.json().get("name") == edited_person_name and edited_person.json().get("is_visible") is False)

            for content_type, content_id in (("news", ids["news"]), ("publication", ids["publication"]), ("person", ids["person"])):
                published = api.post(f"/api/admin/review-queue/{content_type}/{content_id}/publish", headers=reviewer_headers)
                checks.ok(f"Sub-admin can publish reviewed {content_type}", published.ok and published.json().get("status") == "published")
            public_after_review = api.get("/api/public/home").json()
            checks.ok("reviewed news, paper, and profile reach the public API", any(item.get("title") == f"QA approved news {suffix}" for item in public_after_review.get("news", [])) and any(item.get("title") == f"QA approved paper {suffix}" and item.get("thumbnail_url") == thumbnail_data.get("url") for item in public_after_review.get("publications", [])) and any(item.get("name") == edited_person_name and item.get("avatar_url") == avatar_data.get("url") for item in public_after_review.get("people", [])))

            inconsistent_publication = api.post("/api/admin/publications", headers=reviewer_headers, data={**publication_payload, "title": f"QA normalized paper {suffix}", "status": "Draft", "is_published": True})
            inconsistent_data = inconsistent_publication.json() if inconsistent_publication.ok else {}
            ids["normalized_publication"] = int(inconsistent_data.get("id", 0))
            checks.ok("Published paper status is normalized to Published", inconsistent_publication.ok and inconsistent_data.get("status") == "Published" and inconsistent_data.get("is_published") is True)

            editor_person = api.post("/api/admin/people", headers=reviewer_headers, data={"name": f"QA editor-created person {suffix}", "role": "Research Engineer", "group": "Research Staff", "bio": "Created by the Sub-admin workflow.", "research_interests": ["Systems"], "is_visible": True})
            editor_person_data = editor_person.json() if editor_person.ok else {}
            ids["editor_person"] = int(editor_person_data.get("id", 0))
            checks.ok("Sub-admin can add a People profile", editor_person.status == 201 and editor_person_data.get("is_visible") is True)
            editor_news = api.post("/api/admin/news", headers=reviewer_headers, data={"date": "2026-08-29", "title": editor_news_title, "body": "Created directly by the Sub-admin.", "tag": "QA", "is_published": True})
            editor_news_data = editor_news.json() if editor_news.ok else {}
            ids["editor_news"] = int(editor_news_data.get("id", 0))
            checks.ok("Sub-admin can publish news directly", editor_news.ok and editor_news_data.get("is_published") is True)
            checks.ok("Sub-admin cannot manage accounts", api.get("/api/admin/users", headers=reviewer_headers).status == 403)
            checks.ok("Sub-admin cannot delete People profiles", api.delete(f"/api/admin/people/{ids['editor_person']}", headers=reviewer_headers).status == 403)
            checks.ok("Sub-admin cannot grant sub-admin access", api.patch(f"/api/admin/people/{ids['person']}/sub-admin", headers=reviewer_headers, data={"is_sub_admin": True}).status == 403)

            owner_grant = api.patch(f"/api/admin/people/{ids['person']}/sub-admin", headers=owner_headers, data={"is_sub_admin": True})
            checks.ok("Owner can grant sub-admin from the linked profile", owner_grant.ok and owner_grant.json().get("account_role") == "editor")
            owner_revoke = api.patch(f"/api/admin/people/{ids['person']}/sub-admin", headers=owner_headers, data={"is_sub_admin": False})
            checks.ok("Owner can revoke sub-admin access", owner_revoke.ok and owner_revoke.json().get("account_role") == "contributor")

            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            page = context.new_page()
            try:
                sign_in(page, reviewer_email, password)
                checks.ok("reviewer can enter the portal UI", page.get_by_role("navigation", name="Portal sections").is_visible())
                checks.ok("portal UI has no Feedback section", page.get_by_role("button", name="Feedback", exact=True).count() == 0)
                page.get_by_role("button", name="News", exact=True).click()
                row = page.locator(".admin-list__row").filter(has_text=editor_news_title)
                row.get_by_role("button", name="Edit", exact=True).click()
                page.get_by_label("Summary").fill("Edited from the reviewer browser workflow.")
                page.get_by_role("button", name="Save news", exact=True).click()
                page.wait_for_timeout(250)
                refreshed_news = api.get("/api/admin/news", headers=reviewer_headers).json()
                checks.ok("reviewer can edit published news from the browser", any(item.get("id") == ids["editor_news"] and item.get("body") == "Edited from the reviewer browser workflow." for item in refreshed_news))
            finally:
                context.close()
                browser.close()
        finally:
            api.dispose()
            cleanup(emails, ids, media_names)

    print(json.dumps({"base_url": BASE_URL, "passed": checks.passed, "failed": checks.failed}, ensure_ascii=False, indent=2))
    return 1 if checks.failed else 0


if __name__ == "__main__":
    sys.exit(main())
