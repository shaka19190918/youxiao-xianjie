"""Capture the v46 child-first routes for human visual inspection."""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = os.environ.get("SMOKE_URL", Path("index.html").resolve().as_uri())
OUT = Path(os.environ.get("VISUAL_OUT", ".visual-v59"))
OUT.mkdir(exist_ok=True)

with sync_playwright() as playwright:
    executable = Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe"
    browser = playwright.chromium.launch(headless=True, executable_path=str(executable) if executable.exists() else None, args=["--no-proxy-server"])
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.add_init_script("""
      localStorage.setItem('grade1_island_reset_v1','1');
      localStorage.setItem('grade1_island_state_v1', JSON.stringify({
        schema:'grade1-game-v1',pts:9,strk:1,dog:{type:'labrador',xp:12,hu:80,hy:80,en:80,tasks:1},
        _setup:{done:true,name:'测试小朋友',grade:'一年级'},parentPin:'1234',
        vR:{},poems:{},chars:{},scr:{on:false,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},
        game:{levels:{'start-1':{stars:3,tasks:[true,true,true],completedAt:1}},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'zh-tone-1'}
      }));
      HTMLMediaElement.prototype.play=function(){return Promise.resolve()};
      HTMLMediaElement.prototype.pause=function(){};
    """)
    page = context.new_page()
    page.goto(BASE, wait_until="networkidle")
    for route in ("home", "dog", "review"):
        page.evaluate("route=>showPage(route)", route)
        page.screenshot(path=str(OUT / f"{route}-390.png"), full_page=True)
    page.evaluate("g1OpenRegion('chinese')")
    page.screenshot(path=str(OUT / "region-390.png"), full_page=True)
    page.evaluate("g1StartLevel('zh-tone-1')")
    page.screenshot(path=str(OUT / "level-390.png"), full_page=True)
    page.evaluate("eyeOpen('rest')")
    page.screenshot(path=str(OUT / "eye-rest-390.png"), full_page=False)
    browser.close()
