"""Offline browser regression suite for the child-learning static app."""
import os
import sys
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
    page.goto(os.environ.get("SMOKE_URL", "http://127.0.0.1:4173"), wait_until="commit")
    page.wait_for_function("typeof showPage === 'function'", timeout=10000)
    page.reload(wait_until="networkidle")
    assert "快乐营" in page.title(), "application shell did not load"

    for size in [(320, 568), (375, 667), (390, 844), (768, 1024)]:
        assert_no_overflow(page, *size)
    assert page.locator("#v41Guide").count() == 1, "daily guide is missing"

    page.locator("#v41Guide button").click()
    assert "会写字" in page.locator("#ct").inner_text() or "描红" in page.locator("#ct").inner_text()

    page.evaluate("showPage('home'); v41ToggleSound()")
    assert page.evaluate("S.audio.muted") is True
    page.evaluate("v41ToggleSound(); showPage('dog')")
    assert "我们的成长故事" in page.locator("#ct").inner_text()
    page.evaluate("fDog()")
    assert page.evaluate("S.dog.hu") == 100

    page.evaluate("S._parentAuth=true;showPage('parent')")
    parent_text = page.locator("#ct").inner_text()
    assert "今日家长小结" in parent_text and "教学音频核对" in parent_text
    page.evaluate("v41AuditPlay(0)")
    page.wait_for_timeout(50)
    assert any("poem_yong_e" in x for x in page.evaluate("window.__played"))
    for route in page.evaluate("Object.keys(PGS)"):
        page.evaluate("route=>showPage(route)", route)
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"), f"route overflow: {route}"
    print("browser smoke test: PASS", flush=True)
    browser.close()
