"""Small offline-browser regression suite for the static child-learning app."""
import os
from playwright.sync_api import sync_playwright


def verify_page(page, width, height):
    page.set_viewport_size({"width": width, "height": height})
    page.reload(wait_until="networkidle")
    page.evaluate("showPage('pinyin')")
    assert page.locator(".pc").count() >= 24, "pinyin cards did not render"
    labels = page.locator(".pc .py-c").all_text_contents()
    for tone in ["ō", "ó", "ǒ", "ò"]:
        assert tone in labels, f"missing o tone: {tone}"
    overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
    assert not overflow, f"horizontal overflow at {width}px"


with sync_playwright() as p:
    # Use the installed stable Chrome instead of requiring a browser download.
    browser = p.chromium.launch(
        headless=True,
        executable_path=r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    )
    page = browser.new_page(viewport={"width": 390, "height": 844})
    played = []
    page.add_init_script("""
      localStorage.setItem('yxxj_s', JSON.stringify({
        pts:0, strk:0, dog:{type:'labrador',name:'测试小狗',xp:0,energy:80,clean:80},
        _setup:{done:true,name:'测试小主人',grade:'幼升小'}, parentPin:'1234',
        pinyin:{},pinyinToday:{},poems:{},chars:{},dailyGoal:{tasks:5,chars:3}
      }));
      window.__played=[];
      HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return Promise.resolve();};
    """)
    page.goto(os.environ.get("SMOKE_URL", "http://127.0.0.1:4173"), wait_until="networkidle")
    for width, height in [(320, 568), (375, 667), (390, 844), (768, 1024)]:
        verify_page(page, width, height)

    page.set_viewport_size({"width": 390, "height": 844})
    page.evaluate("showPage('pinyin')")
    page.locator("button.pc", has_text="ó").click()
    page.wait_for_timeout(50)
    assert any(src.endswith("/assets/pinyin/o2.mp3") for src in page.evaluate("window.__played"))

    page.evaluate("showPage('english')")
    page.get_by_role("button", name="翻译").first.click()
    page.wait_for_timeout(50)
    assert any("/assets/english-cn/dog.mp3" in src for src in page.evaluate("window.__played"))

    page.evaluate("showPage('poems')")
    assert "今日课程 1 / 7" in page.locator("#ct").inner_text()
    page.evaluate("playPoemV6(0)")
    page.wait_for_timeout(50)
    assert any("/assets/voice/poem_yong_e.mp3" in src for src in page.evaluate("window.__played"))
    print("browser smoke test: PASS")
    browser.close()
