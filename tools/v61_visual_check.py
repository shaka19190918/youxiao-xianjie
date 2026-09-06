"""Capture the v61 map, curriculum and new-subject task for visual review."""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".visual-v61"
OUT.mkdir(exist_ok=True)
BASE = os.environ.get("SMOKE_URL", (ROOT / "index.html").as_uri())

with sync_playwright() as playwright:
    executable = Path(os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"))
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=str(executable) if executable.exists() else None,
        args=["--no-proxy-server"],
    )
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    context.add_init_script(
        """
        localStorage.setItem('grade1_island_reset_v1','1');
        localStorage.setItem('grade1_island_state_v1', JSON.stringify({
          schema:'grade1-game-v1',pts:0,strk:1,
          dog:{type:'husky',xp:0,hu:80,hy:80,en:80,tasks:0},
          _setup:{done:true,name:'小宇',grade:'一年级'},parentPin:'1234',
          vR:{},poems:{},chars:{},dailyGoal:{tasks:3,chars:3},mathC:0,mathT:0,
          game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'start-1'}
        }));
        HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.onended&&this.onended(),0);return Promise.resolve()};
        HTMLMediaElement.prototype.pause=function(){};
        """
    )
    page = context.new_page()
    page.goto(BASE + ("&" if "?" in BASE else "?") + "test=1", wait_until="networkidle")
    page.wait_for_function("window.__G1_TEST")
    page.screenshot(path=OUT / "01-map-mobile.png", full_page=True)
    page.evaluate("showPage('curriculum')")
    page.screenshot(path=OUT / "02-curriculum-mobile.png", full_page=True)
    page.evaluate("openCurriculumSubjectV61('science')")
    page.screenshot(path=OUT / "03-science-mobile.png", full_page=True)
    page.evaluate(
        """() => {
          ['start-1','zh-tone-1','zh-tone-2','zh-tone-3'].forEach(id=>{
            const state=__G1_TEST.levelState(id);state.stars=3;state.tasks=[true,true,true]
          });
          g1StartCurriculumLevel('morality','upper',0);
        }"""
    )
    page.screenshot(path=OUT / "04-life-level-mobile.png", full_page=True)
    page.set_viewport_size({"width": 1024, "height": 768})
    page.evaluate("showPage('home')")
    page.screenshot(path=OUT / "05-map-ipad.png", full_page=True)
    print(OUT)
    browser.close()
