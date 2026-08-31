"""Read-mostly Playwright checks for the lab website and content portal."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from playwright.sync_api import APIRequestContext, Page, TimeoutError as PlaywrightTimeoutError, sync_playwright


BASE_URL = os.getenv("LAB_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
ADMIN_EMAIL = os.getenv("LAB_ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("LAB_ADMIN_PASSWORD", "")
ARTIFACT_DIR = Path(os.getenv("LAB_TEST_ARTIFACTS", "/tmp/lab-webapp-e2e"))


class Checks:
    def __init__(self) -> None:
        self.passed: list[str] = []
        self.failed: list[str] = []

    def ok(self, name: str, condition: bool, detail: str = "") -> None:
        if condition:
            self.passed.append(name)
        else:
            self.failed.append(f"{name}{': ' + detail if detail else ''}")

    def expect(self, name: str, callback: Any) -> None:
        try:
            callback()
            self.passed.append(name)
        except Exception as exc:  # noqa: BLE001 - report every independent check
            self.failed.append(f"{name}: {exc}")


def goto(page: Page, path: str) -> None:
    page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")


def test_public_pages(page: Page, checks: Checks) -> None:
    routes = {
        "/": "News",
        "/research": "Research bets",
        "/publications": "Publications",
        "/people": "PhD students",
        "/join": "Join us",
        "/feedback": "Send feedback",
        "/studio/login": "Welcome back.",
        "/studio/register": "Join the lab workspace.",
        "/studio/profile": "Welcome back.",
        "/studio/review": "Welcome back.",
        "/studio/news": "Welcome back.",
        "/studio/publications": "Welcome back.",
    }
    for path, expected in routes.items():
        def check_route(path: str = path, expected: str = expected) -> None:
            goto(page, path)
            body = page.locator("body").inner_text()
            checks.ok(f"public route {path}", expected in body, f"missing {expected!r}")
            checks.ok(f"public route {path} has no admin nav", "Admin" not in body)
            checks.ok(f"public route {path} has no feedback link", page.get_by_role("link", name="Feedback", exact=True).count() == 0)

        checks.expect(f"load {path}", check_route)

    goto(page, "/feedback")
    checks.expect("feedback shows current issues region", lambda: page.get_by_role("heading", name="Current issues", exact=True).is_visible())
    checks.expect("feedback shows resolved issues region", lambda: page.get_by_role("heading", name="Resolved issues").is_visible())
    checks.expect("feedback shows right-side submission region", lambda: page.get_by_role("heading", name="Help us make this site better.").is_visible())
    checks.ok("feedback is a standalone page", page.get_by_role("navigation", name="Main navigation").count() == 0)

    goto(page, "/admin")
    checks.ok("legacy admin route redirects to private login", page.url.rstrip("/").endswith("/studio/login"), page.url)
    checks.ok("legacy admin redirect has no public admin nav", "Admin" not in page.locator("body").inner_text())

    for path, expected in (("/demos/a/", "Robot learning demo A"), ("/demos/b/", "Embodied intelligence demo B")):
        def check_demo(path: str = path, expected: str = expected) -> None:
            goto(page, path)
            checks.ok(f"demo route {path} is wired", expected in page.locator("body").inner_text())

        checks.expect(f"load {path}", check_demo)

    goto(page, "/")
    checks.expect("homepage has News heading", lambda: page.get_by_role("heading", name="News").is_visible())
    checks.expect("homepage has Show more news", lambda: page.get_by_role("button", name="Show more news ↓").is_visible())
    page.get_by_role("button", name="Show more news ↓").click()
    checks.expect("homepage expands all news", lambda: page.get_by_role("button", name="Show less news ↑").is_visible())
    page.get_by_role("button", name="Show less news ↑").click()
    checks.expect("homepage collapses news", lambda: page.get_by_role("button", name="Show more news ↓").is_visible())

    goto(page, "/publications")
    page.get_by_label("Search publications").fill("World Models")
    checks.expect("publication search finds matching title", lambda: page.locator(".pub__title").count() >= 1)
    checks.expect("publication search hides nonmatching title", lambda: not page.get_by_text("Mobile ALOHA: Learning Bimanual Mobile Manipulation with Low-Cost Whole-Body Teleoperation").is_visible())

    page.set_viewport_size({"width": 390, "height": 844})
    goto(page, "/")
    menu = page.get_by_role("button", name="Toggle navigation")
    checks.expect("mobile navigation toggle exists", lambda: menu.is_visible())
    menu.click()
    checks.expect("mobile navigation opens", lambda: page.get_by_role("navigation", name="Main navigation").get_by_role("link", name="People").is_visible())
    menu.click()
    checks.expect("mobile navigation closes", lambda: not page.get_by_role("navigation", name="Main navigation").get_by_role("link", name="People").is_visible())
    page.set_viewport_size({"width": 1280, "height": 900})


def test_api(api: APIRequestContext, checks: Checks) -> dict[str, Any] | None:
    health = api.get("/health")
    checks.ok("health endpoint returns 200", health.ok, str(health.status))

    public = api.get("/api/public/home")
    checks.ok("public home API returns 200", public.ok, str(public.status))
    public_data = public.json() if public.ok else {}
    checks.ok("public home has all content collections", all(key in public_data for key in ("settings", "news", "research", "people", "publications")))
    checks.ok("public API only returns published news", all(item.get("is_published", True) for item in public_data.get("news", [])))

    for path in ("/api/admin/news", "/api/admin/people", "/api/admin/users"):
        response = api.get(path)
        checks.ok(f"unauthenticated {path} is protected", response.status in (401, 403), str(response.status))

    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        checks.failed.append("admin API checks skipped: LAB_ADMIN_EMAIL/LAB_ADMIN_PASSWORD not supplied")
        return None

    login = api.post("/api/auth/login", data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    checks.ok("admin login returns 200", login.ok, str(login.status))
    if not login.ok:
        return None
    session = login.json()
    checks.ok("login response contains token and user", bool(session.get("token") and session.get("user", {}).get("role")))
    token = session["token"]
    auth = {"Authorization": f"Bearer {token}"}

    admin_news = api.get("/api/admin/news", headers=auth)
    admin_people = api.get("/api/admin/people", headers=auth)
    checks.ok("authenticated admin news list returns 200", admin_news.ok, str(admin_news.status))
    checks.ok("authenticated admin people list returns 200", admin_people.ok, str(admin_people.status))
    admin_news_data = admin_news.json() if admin_news.ok else []
    checks.ok("admin news list exposes publication status", all("is_published" in item for item in admin_news_data))
    checks.ok("admin news list is larger than or equal to public list", len(admin_news_data) >= len(public_data.get("news", [])))

    users = api.get("/api/admin/users", headers=auth)
    checks.ok("owner can list users", users.ok, str(users.status))
    return {"token": token, "public": public_data, "admin_news": admin_news_data}


def test_admin_ui(page: Page, checks: Checks, admin: dict[str, Any] | None) -> None:
    if not admin:
        checks.failed.append("admin UI checks skipped because admin login failed")
        return
    goto(page, "/studio/login")
    page.get_by_label("Email").fill(ADMIN_EMAIL)
    page.get_by_label("Password").fill(ADMIN_PASSWORD)
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_timeout(250)
    checks.expect("admin dashboard appears after login", lambda: page.get_by_role("navigation", name="Portal sections").is_visible())
    checks.ok("login URL is normalized to studio", page.url.rstrip("/").endswith("/studio"), page.url)
    checks.expect("admin dashboard has no public Admin link requirement", lambda: page.get_by_role("link", name="View public site ↗").is_visible())

    checks.expect("review queue navigation appears for owner", lambda: page.get_by_role("button", name="Review queue").is_visible())
    page.get_by_role("button", name="Review queue").click()
    page.wait_for_timeout(150)
    checks.expect("unified review queue appears in portal", lambda: page.get_by_role("heading", name="Unified review queue").is_visible())

    page.get_by_role("button", name="News", exact=True).click()
    page.wait_for_timeout(150)
    checks.expect("news library appears in portal", lambda: page.get_by_role("heading", name="News library").is_visible())
    checks.expect("submitted news is listed in portal", lambda: page.get_by_text("实验室首页demo建立了！", exact=True).count() >= 1)
    checks.expect("pending review status is visible in news library", lambda: page.get_by_text("Pending review", exact=True).count() >= 1)
    checks.expect("published and pending news can be edited", lambda: page.get_by_role("button", name="Edit", exact=True).count() >= 1)
    page.get_by_role("button", name="Edit", exact=True).first.click()
    checks.expect("news editor opens from the library", lambda: page.get_by_role("heading", name="Edit news").is_visible())
    page.get_by_role("button", name="Cancel", exact=True).click()

    page.get_by_role("link", name="People", exact=True).click()
    page.wait_for_timeout(250)
    checks.expect("People has its own portal route", lambda: page.url.rstrip("/").endswith("/studio/people"))
    page.wait_for_timeout(150)
    checks.expect("people directory appears in portal", lambda: page.get_by_role("heading", name="People directory").is_visible())
    checks.expect("people directory is grouped by category", lambda: page.get_by_role("heading", name="Faculty", exact=True).is_visible() and page.get_by_role("heading", name="PhD students", exact=True).is_visible() and page.get_by_role("heading", name="Alumni", exact=True).is_visible())
    checks.expect("add person form appears in portal", lambda: page.get_by_role("heading", name="Add a person").is_visible())
    checks.expect("people categories include alumni", lambda: page.get_by_role("option", name="Alumni").is_visible())
    checks.expect("permission guide appears in People", lambda: page.get_by_role("heading", name="Permissions explained").is_visible())
    checks.expect("owner identity badge appears in portal", lambda: page.get_by_text("Administrator", exact=True).count() >= 1)
    checks.expect("People profiles have edit actions", lambda: page.get_by_role("link", name="Edit profile", exact=True).count() >= 1)
    checks.expect("Administrator has People delete actions", lambda: page.get_by_role("button", name="Delete", exact=True).count() >= 1)

    first_profile = page.get_by_role("link", name="Edit profile", exact=True).first
    first_profile.click()
    page.wait_for_timeout(250)
    checks.expect("People edit opens the selected profile", lambda: "/studio/profile?personId=" in page.url and page.locator(".profile-editor h2").inner_text().startswith("Edit "))
    page.get_by_role("button", name="Save profile", exact=True).click()
    page.wait_for_timeout(350)
    checks.expect("saving another People profile returns to the directory", lambda: page.url.rstrip("/").endswith("/studio/people") and page.get_by_role("heading", name="People directory", exact=True).is_visible())
    page.get_by_role("link", name="Edit profile", exact=True).last.click()
    page.wait_for_timeout(250)
    checks.expect("a second People edit remains clickable", lambda: page.url.startswith(f"{BASE_URL}/studio/profile?personId=") and page.locator(".profile-editor").is_visible())

    page.get_by_role("button", name="Publications", exact=True).click()
    page.wait_for_timeout(150)
    checks.expect("publication form appears in portal", lambda: page.get_by_role("heading", name="Add a publication").is_visible())
    checks.expect("publication library appears in portal", lambda: page.get_by_role("heading", name="Publication library").is_visible())
    checks.expect("publication year field appears", lambda: page.get_by_label("Publication year").is_visible())
    checks.expect("publication type field appears", lambda: page.get_by_label("Publication type").is_visible())
    checks.expect("publication abstract field appears", lambda: page.get_by_label("Abstract").is_visible())
    checks.expect("published and pending publications can be edited", lambda: page.get_by_role("button", name="Edit", exact=True).count() >= 1)
    page.get_by_role("button", name="Edit", exact=True).first.click()
    checks.expect("publication editor opens from the library", lambda: page.get_by_role("heading", name="Edit publication").is_visible())
    page.get_by_role("button", name="Cancel", exact=True).click()

    page.get_by_role("button", name="Account", exact=True).click()
    page.wait_for_timeout(150)
    checks.expect("account management appears for owner", lambda: page.get_by_role("heading", name="Accounts").is_visible())
    checks.expect("account role controls appear", lambda: page.get_by_label(f"Role for {ADMIN_EMAIL}").is_visible())
    checks.ok("account pause controls appear", page.get_by_role("button", name="Pause access", exact=True).count() >= 1)
    checks.ok("feedback is not part of the admin portal", page.get_by_role("button", name="Feedback", exact=True).count() == 0)

    page.get_by_role("link", name="My profile", exact=True).click()
    page.wait_for_timeout(250)
    checks.expect("my profile has a separate portal page", lambda: page.url.rstrip("/").endswith("/studio/profile") and page.locator("h1").filter(has_text="My profile").is_visible())


def main() -> int:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    checks = Checks()
    console_errors: list[str] = []
    page_errors: list[str] = []
    request_failures: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        page.on("requestfailed", lambda request: request_failures.append(f"{request.method} {request.url}: {request.failure}") if request.failure and "ERR_ABORTED" not in request.failure else None)
        api = playwright.request.new_context(base_url=BASE_URL)
        try:
            test_public_pages(page, checks)
            admin = test_api(api, checks)
            test_admin_ui(page, checks, admin)
            page.screenshot(path=str(ARTIFACT_DIR / "final-portal.png"), full_page=True)
        except PlaywrightTimeoutError as exc:
            checks.failed.append(f"global Playwright timeout: {exc}")
        finally:
            api.dispose()
            context.close()
            browser.close()

    report = {
        "base_url": BASE_URL,
        "passed": checks.passed,
        "failed": checks.failed,
        "console_errors": console_errors,
        "page_errors": page_errors,
        "request_failures": request_failures,
        "artifact": str(ARTIFACT_DIR / "final-portal.png"),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if checks.failed or console_errors or page_errors or request_failures else 0


if __name__ == "__main__":
    sys.exit(main())
