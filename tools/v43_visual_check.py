"""Capture the mobile textbook and sync routes for visual inspection."""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:4199")

with sync_playwright() as playwright:
    executable = Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe"
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=str(executable) if executable.exists() else None,
    )
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.add_init_script(
        """
        localStorage.setItem('yxxj_s', JSON.stringify({
          pts:0,strk:0,dog:{type:'labrador',xp:0,hu:80,hy:80,en:80,tasks:0},
          _setup:{done:true,name:'测试小朋友',grade:'一年级'},
          vR:{},poems:{},chars:{},scr:{on:false}
        }));
        """
    )
    page = context.new_page()
    page.goto(BASE, wait_until="networkidle")
    page.evaluate("showPage('textbook')")
    page.locator(".tb-unit").nth(1).evaluate("element => { element.open = true; }")
    page.screenshot(path="v43-textbook-mobile.png", full_page=True)
    page.evaluate("textbookSubjectSetV44('数学上册')")
    page.locator(".tb-unit").nth(1).evaluate("element => { element.open = true; }")
    page.screenshot(path="v44-textbook-math-mobile.png", full_page=True)
    page.evaluate("showPage('mathsync')")
    page.screenshot(path="v44-math-mobile.png", full_page=True)
    page.evaluate("textbookSubjectSetV44('数学下册')")
    page.locator(".tb-unit").nth(1).evaluate("element => { element.open = true; }")
    page.screenshot(path="v45-textbook-math-lower-mobile.png", full_page=True)
    page.evaluate("showPage('mathlower')")
    page.screenshot(path="v45-math-lower-mobile.png", full_page=True)
    page.evaluate("showPage('timeextra')")
    page.screenshot(path="v45-time-mobile.png", full_page=True)
    page.evaluate("showPage('englishsync')")
    page.screenshot(path="v44-english-mobile.png", full_page=True)
    browser.close()
