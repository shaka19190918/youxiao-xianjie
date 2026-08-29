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
      localStorage.setItem('yxxj_s', JSON.stringify({
        pts:20,strk:1,dog:{type:'labrador',name:'Test',xp:0,hu:80,hy:80,en:80,tasks:0},
        _setup:{done:true,name:'Test',grade:'幼升小'},parentPin:'1234',
        vR:{},poems:{},chars:{},dailyGoal:{tasks:5,chars:3},mathC:0,mathT:0
      }));
      window.__played=[];
      HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return Promise.resolve();};
    """)
    page.goto(os.environ.get("SMOKE_URL", Path("index.html").resolve().as_uri()), wait_until="commit")
    page.wait_for_function("typeof showPage === 'function'", timeout=10000)
    page.reload(wait_until="networkidle")
    assert "快乐营" in page.title(), "application shell did not load"

    for size in [(320, 568), (375, 667), (390, 844), (768, 1024), (1440, 900)]:
        assert_no_overflow(page, *size)
    assert page.locator(".v54-home").count() == 1, "child-first home is missing"
    assert page.locator("#kidDock button").count() == 5, "mobile child dock is incomplete"
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.locator(".v54-quick button").count() == 4

    page.evaluate("showPage('home'); v41ToggleSound()")
    assert page.evaluate("S.audio.muted") is True
    page.evaluate("v41ToggleSound(); showPage('dog')")
    assert page.locator(".pet-growth").count() == 1
    assert page.locator(".pet-listen").count() == 1
    page.evaluate("fDog()")
    assert page.evaluate("S.dog.hu") == 100
    page.wait_for_timeout(50)
    assert any("assets/voice/" in x for x in page.evaluate("window.__played")), "pet did not request local audio"

    page.evaluate("showPage('pinyin')")
    assert page.locator(".v54-pinyin-tabs button").count() == 3
    assert page.locator(".v42-py").count() == 24
    page.evaluate("setPinyinPartV54('initials')")
    assert page.locator(".v42-py").count() == 23
    page.evaluate("setPinyinPartV54('finals')")
    assert page.locator(".v42-py").count() == 36
    page.evaluate("window.__played=[];playPinyinV42('ke1','k');playPinyinV42('ying1','ing');playPinyinV42('zhong1','ong')")
    played = page.evaluate("window.__played")
    assert any("pinyin-v46/k-ke1.mp3" in x for x in played)
    assert any("pinyin-v46/ing-ying1.mp3" in x for x in played)
    assert any("pinyin-v46/ong-zhong1.mp3" in x for x in played)

    page.evaluate("S._parentAuth=true;showPage('parent')")
    parent_text = page.locator("#ct").inner_text()
    assert "今日家长小结" in parent_text and "教学音频核对" in parent_text
    assert "二年级" not in parent_text
    page.evaluate("S._setup.grade='二年级';v41NormalizeStage()")
    assert page.evaluate("S._setup.grade") == "一年级"
    page.evaluate("v41AuditPlay(0)")
    page.wait_for_timeout(50)
    assert any("poem_yong_e" in x for x in page.evaluate("window.__played"))
    for route in page.evaluate("Object.keys(PGS)"):
        page.evaluate("route=>showPage(route)", route)
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"), f"route overflow: {route}"
    print("browser smoke test: PASS", flush=True)
    browser.close()
