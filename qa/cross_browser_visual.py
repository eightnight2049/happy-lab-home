"""Cross-browser layout and interaction checks for Chrome, Edge, and Safari/WebKit."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, BrowserType, Page, TimeoutError as PlaywrightTimeoutError, sync_playwright


BASE_URL = os.getenv("LAB_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
ADMIN_EMAIL = os.getenv("LAB_ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("LAB_ADMIN_PASSWORD", "")
ARTIFACT_DIR = Path(os.getenv("LAB_BROWSER_ARTIFACTS", "/tmp/lab-cross-browser"))

PUBLIC_ROUTES = {
    "/": "News",
    "/research": "Research bets",
    "/publications": "Publications",
    "/people": "PhD students",
    "/join": "Join us",
    "/feedback": "Feedback",
    "/studio/login": "Welcome back.",
}
VIEWPORTS = {"desktop": {"width": 1440, "height": 900}, "mobile": {"width": 390, "height": 844}}
EXECUTABLES = {
    "Chrome": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "Edge": "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
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


def goto(page: Page, path: str) -> None:
    page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=30_000)
    page.wait_for_load_state("networkidle", timeout=30_000)


def check_page(page: Page, browser_name: str, viewport_name: str, path: str, expected: str, checks: Checks) -> None:
    label = f"{browser_name}/{viewport_name} {path}"
    try:
        goto(page, path)
        body = page.locator("body").inner_text()
        checks.ok(f"{label} loads", expected in body, f"missing {expected!r}")
        checks.ok(f"{label} has no public Admin link", "Admin" not in body)
        checks.ok(f"{label} has no public Feedback link", page.get_by_role("link", name="Feedback", exact=True).count() == 0)
        overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        checks.ok(f"{label} has no horizontal overflow", overflow <= 2, f"overflow={overflow}")
    except PlaywrightTimeoutError as exc:
        checks.failed.append(f"{label} timeout: {exc}")


def check_interactions(page: Page, browser_name: str, checks: Checks) -> None:
    goto(page, "/")
    try:
        page.get_by_role("button", name="Show more news ↓").click()
        checks.ok(f"{browser_name} expands news", page.get_by_role("button", name="Show less news ↑").is_visible())
        page.get_by_role("button", name="Show less news ↑").click()
        checks.ok(f"{browser_name} collapses news", page.get_by_role("button", name="Show more news ↓").is_visible())
    except Exception as exc:  # noqa: BLE001 - keep independent browser results
        checks.failed.append(f"{browser_name} news interaction: {exc}")

    goto(page, "/publications")
    try:
        search = page.get_by_label("Search publications")
        search.fill("World Models")
        checks.ok(f"{browser_name} publication search works", page.locator(".pub__title").count() >= 1)
        checks.ok(f"{browser_name} publication search filters", not page.get_by_text("Mobile ALOHA: Learning Bimanual Mobile Manipulation with Low-Cost Whole-Body Teleoperation").is_visible())
    except Exception as exc:  # noqa: BLE001
        checks.failed.append(f"{browser_name} publication interaction: {exc}")

    page.set_viewport_size(VIEWPORTS["mobile"])
    goto(page, "/")
    try:
        menu = page.get_by_role("button", name="Toggle navigation")
        menu.click()
        checks.ok(f"{browser_name} mobile menu opens", page.get_by_role("navigation", name="Main navigation").get_by_role("link", name="People").is_visible())
        menu.click()
        checks.ok(f"{browser_name} mobile menu closes", not page.get_by_role("navigation", name="Main navigation").get_by_role("link", name="People").is_visible())
    except Exception as exc:  # noqa: BLE001
        checks.failed.append(f"{browser_name} mobile interaction: {exc}")
    page.set_viewport_size(VIEWPORTS["desktop"])


def check_portal(page: Page, browser_name: str, checks: Checks) -> None:
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        checks.failed.append(f"{browser_name} portal test skipped: credentials missing")
        return
    try:
        goto(page, "/studio/login")
        page.get_by_label("Email").fill(ADMIN_EMAIL)
        page.get_by_label("Password").fill(ADMIN_PASSWORD)
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_timeout(350)
        checks.ok(f"{browser_name} portal login works", page.get_by_role("navigation", name="Portal sections").is_visible())
        checks.ok(f"{browser_name} portal URL is normalized", page.url.rstrip("/").endswith("/studio"), page.url)
        page.get_by_role("button", name="Review queue").click()
        checks.ok(f"{browser_name} portal review queue works", page.get_by_role("heading", name="Unified review queue").is_visible())
        page.get_by_role("button", name="News", exact=True).click()
        checks.ok(f"{browser_name} portal news editor actions work", page.get_by_role("button", name="Edit", exact=True).count() >= 1)
        page.get_by_role("button", name="Publications", exact=True).click()
        checks.ok(f"{browser_name} portal publications view works", page.get_by_role("heading", name="Publication library").is_visible())
        checks.ok(f"{browser_name} portal publication editor actions work", page.get_by_role("button", name="Edit", exact=True).count() >= 1)
        page.get_by_role("link", name="People", exact=True).click()
        page.wait_for_timeout(200)
        checks.ok(f"{browser_name} portal People delete actions work", page.get_by_role("button", name="Delete", exact=True).count() >= 1)
        page.get_by_role("button", name="Account", exact=True).click()
        checks.ok(f"{browser_name} portal accounts view works", page.get_by_role("heading", name="Accounts").is_visible())
        checks.ok(f"{browser_name} portal has no Feedback section", page.get_by_role("button", name="Feedback", exact=True).count() == 0)
    except Exception as exc:  # noqa: BLE001
        checks.failed.append(f"{browser_name} portal interaction: {exc}")


def run_browser(browser_type: BrowserType, browser_name: str, executable_path: str | None, checks: Checks) -> None:
    launch_args: dict[str, Any] = {"headless": True}
    if executable_path:
        launch_args["executable_path"] = executable_path
    try:
        browser: Browser = browser_type.launch(**launch_args)
    except Exception as exc:  # noqa: BLE001
        checks.failed.append(f"{browser_name} could not launch: {exc}")
        return

    try:
        for viewport_name, viewport in VIEWPORTS.items():
            context = browser.new_context(viewport=viewport)
            page = context.new_page()
            console_errors: list[str] = []
            page_errors: list[str] = []
            request_failures: list[str] = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: page_errors.append(str(exc)))
            page.on("requestfailed", lambda request: request_failures.append(f"{request.method} {request.url}: {request.failure}") if request.failure and "ERR_ABORTED" not in request.failure else None)
            for path, expected in PUBLIC_ROUTES.items():
                check_page(page, browser_name, viewport_name, path, expected, checks)
            goto(page, "/")
            screenshot_name = "home" if viewport_name == "desktop" else "mobile-home"
            browser_artifacts = ARTIFACT_DIR / browser_name.lower()
            browser_artifacts.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(browser_artifacts / f"{screenshot_name}.png"), full_page=True)
            checks.ok(f"{browser_name}/{viewport_name} console is clean", not console_errors, "; ".join(console_errors[:2]))
            checks.ok(f"{browser_name}/{viewport_name} page errors are clean", not page_errors, "; ".join(page_errors[:2]))
            checks.ok(f"{browser_name}/{viewport_name} requests are clean", not request_failures, "; ".join(request_failures[:2]))
            if viewport_name == "desktop":
                check_interactions(page, browser_name, checks)
                check_portal(page, browser_name, checks)
            context.close()
    finally:
        browser.close()


def main() -> int:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    checks = Checks()
    with sync_playwright() as playwright:
        for browser_name, executable in EXECUTABLES.items():
            if not Path(executable).exists():
                checks.failed.append(f"{browser_name} executable missing: {executable}")
                continue
            run_browser(playwright.chromium, browser_name, executable, checks)
        # Playwright WebKit is the Safari rendering engine and is the portable way to test Safari layout.
        run_browser(playwright.webkit, "Safari-WebKit", None, checks)

    report = {"base_url": BASE_URL, "browsers": ["Chrome", "Edge", "Safari-WebKit"], "passed": checks.passed, "failed": checks.failed, "artifacts": str(ARTIFACT_DIR)}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if checks.failed else 0


if __name__ == "__main__":
    sys.exit(main())
