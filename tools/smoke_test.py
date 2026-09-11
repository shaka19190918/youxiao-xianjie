"""Offline browser regression suite for the child-learning static app."""
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")


def assert_no_overflow(page, width, height):
    page.set_viewport_size({"width": width, "height": height})
    page.evaluate("showPage('home')")
    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"), f"overflow at {width}px"


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"),
        args=["--no-proxy-server"],
    )
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    page = context.new_page()
    page.add_init_script("""
      localStorage.setItem('grade1_island_reset_v1','1');
      localStorage.setItem('grade1_island_state_v1', JSON.stringify({
        schema:'grade1-game-v1',
        pts:20,strk:1,dog:{type:'labrador',name:'Test',xp:0,hu:80,hy:80,en:80,tasks:0},
        _setup:{done:true,name:'Test',grade:'一年级'},parentPin:'1234',
        vR:{},poems:{},chars:{},dailyGoal:{tasks:3,chars:3},mathC:0,mathT:0,
        game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'start-1'}
      }));
      window.__played=[];
      HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return Promise.resolve();};
    """)
    page.goto(os.environ.get("SMOKE_URL", Path("index.html").resolve().as_uri()), wait_until="commit")
    page.wait_for_function("typeof showPage === 'function'", timeout=10000)
    page.reload(wait_until="networkidle")
    assert page.title() == "一年级成长岛", "application shell did not load"

    for size in [(320, 568), (375, 667), (390, 844), (768, 1024), (1440, 900)]:
        assert_no_overflow(page, *size)
    assert page.locator(".g1-shell").count() == 1, "child-first map is missing"
    assert page.locator("#kidDock button").count() == 5, "mobile child dock is incomplete"
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.locator(".g1-region").count() == 9

    page.evaluate("showPage('home'); v41ToggleSound()")
    assert page.evaluate("S.audio.muted") is True
    page.evaluate("v41ToggleSound(); showPage('dog')")
    assert page.locator(".pet-growth").count() == 1
    assert page.locator(".pet-listen").count() == 0
    assert page.locator(".dog-btn").count() == 3
    assert "听说话" not in page.locator("#ct").inner_text()
    page.evaluate("fDog()")
    assert page.evaluate("S.dog.hu") == 100
    page.wait_for_timeout(50)
    assert any("assets/voice/" in x for x in page.evaluate("window.__played")), "pet did not request local audio"

    page.evaluate("showPage('pinyin')")
    assert page.locator(".p63-tabs button").count() == 7
    assert page.locator(".p63-card").count() == 23
    page.evaluate("pinyinV63Part('tones')")
    assert page.locator(".p63-card").count() == 24
    page.evaluate("pinyinV63Part('finals')")
    assert page.locator(".p63-card").count() == 24
    assert page.evaluate("pinyinV63TaskToken(['k','ke1'])") == "p63|ke|1"
    assert page.evaluate("pinyinV63TaskToken(['ing','ing1'])") == "p63|ying|1"
    assert page.evaluate("pinyinV63TaskToken(['ong','ong1'])") == "p63|zhong|1"

    page.evaluate("S._parentAuth=true;showPage('parent')")
    parent_text = page.locator("#ct").inner_text()
    assert "成长岛闯关报告" in parent_text and "教学音频核对" in parent_text
    assert "课程依据与边界" in parent_text
    assert "学习阶段" not in parent_text
    page.evaluate("v41AuditPlay(0)")
    page.wait_for_timeout(50)
    assert any("poem_yong_e" in x for x in page.evaluate("window.__played"))
    for route in page.evaluate("Object.keys(PGS)"):
        page.evaluate("route=>showPage(route)", route)
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"), f"route overflow: {route}"
    print("browser smoke test: PASS", flush=True)
    browser.close()
