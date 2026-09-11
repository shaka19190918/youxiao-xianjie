"""Capture pinyin v63 mobile and iPad views for visual inspection."""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".visual-v63"
OUT.mkdir(exist_ok=True)
BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:4185/index.html")

with sync_playwright() as p:
    executable = Path(os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"))
    browser = p.chromium.launch(headless=True, executable_path=str(executable) if executable.exists() else None)
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    context.add_init_script("""
      localStorage.setItem('grade1_island_reset_v1','1');
      localStorage.setItem('grade1_island_state_v1', JSON.stringify({schema:'grade1-game-v1',pts:0,strk:1,dog:{type:'husky',xp:0,hu:80,hy:80,en:80,tasks:0},_setup:{done:true,name:'小宇',grade:'一年级'},parentPin:'1234',vR:{},poems:{},chars:{},game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'start-1'}}));
    """)
    page = context.new_page()
    page.goto(BASE + "?test=1", wait_until="domcontentloaded")
    page.wait_for_function("window.__PINYIN_V63_TEST")
    page.evaluate("showPage('pinyin')")
    page.screenshot(path=OUT / "01-initials-mobile.png", full_page=True)
    page.evaluate("pinyinV63Part('blend')")
    page.screenshot(path=OUT / "02-blend-mobile.png", full_page=True)
    page.set_viewport_size({"width": 768, "height": 1024})
    page.evaluate("pinyinV63Part('tones')")
    page.screenshot(path=OUT / "03-tones-ipad.png", full_page=True)
    browser.close()
    print(OUT)
