"""Capture the v64 home at phone and wide-desktop sizes."""
from __future__ import annotations

import os
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".visual-v64"
OUT.mkdir(exist_ok=True)
BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:4173/index.html")
STATE = """
localStorage.setItem('grade1_island_reset_v1','1');
localStorage.setItem('grade1_island_state_v1', JSON.stringify({
 schema:'grade1-game-v1',pts:36,strk:2,dog:{type:'trex',xp:48,hu:72,hy:64,en:86,tasks:4},
 _setup:{done:true,name:'乐乐',grade:'一年级'},parentPin:'1234',parentQA:{q:'',a:''},vR:{},poems:{},chars:{},
 dailyGoal:{tasks:3,chars:3},mathC:0,mathT:0,scr:{on:true,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},
 game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'start-1'}
}));
"""
CHROME = Path(os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(CHROME) if CHROME.exists() else None, args=["--no-proxy-server"])
    for width, height, name in ((390, 844, "home-phone.png"), (1920, 1080, "home-wide.png")):
        context = browser.new_context(viewport={"width": width, "height": height}, service_workers="block")
        context.add_init_script(STATE)
        page = context.new_page()
        page.goto(BASE + "?test=1", wait_until="networkidle")
        page.wait_for_function("document.documentElement.dataset.appVersion === 'v64-companion-controls'")
        page.screenshot(path=str(OUT / name), full_page=True)
        context.close()
    browser.close()
print(OUT)
