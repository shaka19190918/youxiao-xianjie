"""Acceptance checks for v64 anti-addiction controls and companion home panel."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


sys.stdout.reconfigure(encoding="utf-8")
BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:4173/index.html")
TEST_URL = BASE + ("&" if "?" in BASE else "?") + "test=1"
CHROME = Path(os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"))


STATE = """
localStorage.setItem('grade1_island_reset_v1','1');
localStorage.setItem('grade1_island_state_v1', JSON.stringify({
  schema:'grade1-game-v1',pts:36,strk:2,
  dog:{type:'trex',xp:48,hu:72,hy:64,en:86,tasks:4},
  _setup:{done:true,name:'测试小朋友',grade:'一年级'},parentPin:'1234',
  parentQA:{q:'',a:''},vR:{},poems:{},chars:{},dailyGoal:{tasks:3,chars:3},
  mathC:0,mathT:0,
  scr:{on:true,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},
  game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'start-1'}
}));
HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.onended&&this.onended(),0);return Promise.resolve()};
HTMLMediaElement.prototype.pause=function(){};
"""


def overlap(a: dict, b: dict) -> bool:
    return a["x"] < b["x"] + b["width"] and a["x"] + a["width"] > b["x"] and a["y"] < b["y"] + b["height"] and a["y"] + a["height"] > b["y"]


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=str(CHROME) if CHROME.exists() else None,
        args=["--no-proxy-server", "--autoplay-policy=no-user-gesture-required"],
    )
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    context.add_init_script(STATE)
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(TEST_URL, wait_until="networkidle", timeout=30_000)
    page.wait_for_function("window.__G1_TEST && document.documentElement.dataset.appVersion === 'v64-companion-controls'")

    # Anti-addiction is enabled by default for this real child profile and actively counts.
    assert page.evaluate("S.scr.on && S.scr.contMin===20 && S.scr.restMin===5 && S.scr.dayMin===30")
    before = page.evaluate("S.scr.used")
    page.evaluate("scrTick()")
    assert page.evaluate("S.scr.used") == before + 1
    assert page.locator("#eyeBar").is_visible()

    # The former single pet strip is now an informative companion house.
    house = page.locator(".g1-pet-house")
    assert house.count() == 1
    text = house.inner_text()
    for label in ("伙伴小屋", "饱腹", "清洁", "活力", "成长", "今天陪你完成", "去照顾伙伴"):
        assert label in text, (label, text)
    assert house.locator(".g1-pet-stats > div").count() == 3
    assert house.locator(".g1-pet-grow").count() == 1

    # Countdown and sound are one managed tray and cannot overlap at phone/iPad/desktop widths.
    for width, height in ((320, 568), (375, 667), (390, 844), (768, 1024), (1024, 768), (1366, 768), (1920, 1080)):
        page.set_viewport_size({"width": width, "height": height})
        page.evaluate("showPage('home')")
        page.wait_for_timeout(30)
        assert page.evaluate("document.getElementById('eyeBar').parentElement.id") == "v64FloatControls"
        assert page.evaluate("document.getElementById('v41Sound').parentElement.id") == "v64FloatControls"
        eye = page.locator("#eyeBar").bounding_box()
        sound = page.locator("#v41Sound").bounding_box()
        assert eye and sound and not overlap(eye, sound), (width, eye, sound)
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"), width

    # Rebuilding the sound button after toggling keeps it in the managed tray.
    page.locator("#v41Sound").click()
    assert page.evaluate("document.getElementById('v41Sound').parentElement.id") == "v64FloatControls"
    eye = page.locator("#eyeBar").bounding_box()
    sound = page.locator("#v41Sound").bounding_box()
    assert eye and sound and not overlap(eye, sound)

    # At wide sizes, the map spans the content width and the companion occupies the right rail.
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.evaluate("showPage('home')")
    layout = page.evaluate("""() => {
      const shell=document.querySelector('.g1-shell').getBoundingClientRect();
      const map=document.querySelector('.g1-map').getBoundingClientRect();
      const pet=document.querySelector('.g1-pet-house').getBoundingClientRect();
      return {shell,map,pet};
    }""")
    assert abs(layout["map"]["width"] - layout["shell"]["width"]) < 2
    assert layout["pet"]["left"] > layout["shell"]["left"] + layout["shell"]["width"] / 2

    assert not errors, errors
    print("ui v64 acceptance: PASS (anti-addiction, non-overlap, companion house, responsive)")
    context.close()
    browser.close()
