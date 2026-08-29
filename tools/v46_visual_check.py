"""Capture the v46 child-first routes for human visual inspection."""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = os.environ.get("SMOKE_URL", Path("index.html").resolve().as_uri())
OUT = Path(os.environ.get("VISUAL_OUT", ".visual-v54"))
OUT.mkdir(exist_ok=True)

with sync_playwright() as playwright:
    executable = Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe"
    browser = playwright.chromium.launch(headless=True, executable_path=str(executable) if executable.exists() else None, args=["--no-proxy-server"])
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.add_init_script("""
      localStorage.setItem('yxxj_s', JSON.stringify({
        pts:100,strk:1,dog:{type:'labrador',xp:16,hu:80,hy:80,en:80,tasks:2},
        _setup:{done:true,name:'测试小朋友',grade:'一年级'},parentPin:'1234',
        vR:{},poems:{},chars:{},scr:{on:false,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''}
      }));
      HTMLMediaElement.prototype.play=function(){return Promise.resolve()};
      HTMLMediaElement.prototype.pause=function(){};
    """)
    page = context.new_page()
    page.goto(BASE, wait_until="networkidle")
    for route in ("home", "dog", "chars", "pinyin"):
        page.evaluate("route=>showPage(route)", route)
        page.screenshot(path=str(OUT / f"{route}-390.png"), full_page=True)
    page.evaluate("showPage('textbook');textbookSubjectSetV44('数学上册')")
    page.screenshot(path=str(OUT / "textbook-math-390.png"), full_page=True)
    page.evaluate("eyeOpen('rest')")
    page.screenshot(path=str(OUT / "eye-rest-390.png"), full_page=False)
    browser.close()
