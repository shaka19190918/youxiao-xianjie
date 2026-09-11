"""Browser and asset acceptance checks for pinyin point-read v63."""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:4173/index.html")
TEST_URL = BASE + ("&" if "?" in BASE else "?") + "test=1"
CHROME = Path(os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"))


def check_manifest() -> None:
    manifest = json.loads((ROOT / "assets/pinyin-v63/manifest.json").read_text("utf-8"))
    assert manifest["license"] == "MIT"
    assert manifest["sourceCommit"] == "6580657e327edd4a94bd87325ce4d47dc2409126"
    assert manifest["count"] == 406
    assert len(manifest["files"]) == 406
    names = {item["file"] for item in manifest["files"]}
    for required in ("a.mp3", "o.mp3", "bo.mp3", "ke.mp3", "ying.mp3", "zhong.mp3"):
        assert required in names
    for item in manifest["files"]:
        path = ROOT / "assets/pinyin-v63" / item["file"]
        assert path.exists() and path.stat().st_size == item["bytes"], path
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"], path


def state_script() -> str:
    return """
      localStorage.setItem('grade1_island_reset_v1','1');
      localStorage.setItem('grade1_island_state_v1', JSON.stringify({
        schema:'grade1-game-v1',pts:0,strk:1,
        dog:{type:'labrador',xp:0,hu:80,hy:80,en:80,tasks:0},
        _setup:{done:true,name:'测试小朋友',grade:'一年级'},parentPin:'1234',
        parentQA:{q:'',a:''},vR:{},poems:{},chars:{},dailyGoal:{tasks:3,chars:3},
        mathC:0,mathT:0,scr:{on:false,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},
        game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'start-1'}
      }));
      window.__ttsCalls=0;
      if(window.speechSynthesis) window.speechSynthesis.speak=()=>window.__ttsCalls++;
    """


check_manifest()
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=str(CHROME) if CHROME.exists() else None,
        args=["--no-proxy-server", "--autoplay-policy=no-user-gesture-required"],
    )
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    context.add_init_script(state_script())
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.goto(TEST_URL, wait_until="domcontentloaded", timeout=30_000)
    page.wait_for_function("window.__PINYIN_V63_TEST && window.__G1_TEST")
    assert page.evaluate("document.documentElement.dataset.appVersion") == "v63-pinyin-point-read"
    assert page.evaluate("__PINYIN_V63_TEST.INITIALS.length") == 23
    assert page.evaluate("__PINYIN_V63_TEST.FINALS.length") == 24
    assert page.evaluate("__PINYIN_V63_TEST.WHOLE.length") == 16
    assert page.evaluate("__PINYIN_V63_TEST.toneMark('gui', 3)") == "guǐ"
    assert page.evaluate("__PINYIN_V63_TEST.toneMark('liu', 2)") == "liú"
    assert page.evaluate("__PINYIN_V63_TEST.taskToken(['k','ke1'])") == "p63|ke|1"
    assert page.evaluate("__PINYIN_V63_TEST.taskToken(['ing','ing1'])") == "p63|ying|1"
    assert page.evaluate("__PINYIN_V63_TEST.taskToken(['ong','ong1'])") == "p63|zhong|1"
    assert page.evaluate("__PINYIN_V63_TEST.taskToken(['ǖ','v1'])") == "p63|yu|1"

    page.evaluate("showPage('pinyin')")
    page.wait_for_selector(".p63")
    assert page.locator(".p63-card").count() == 23
    page.evaluate("pinyinV63Part('finals')")
    assert page.locator(".p63-card").count() == 24
    page.evaluate("pinyinV63Part('whole')")
    assert page.locator(".p63-card").count() == 16
    page.evaluate("pinyinV63Part('tones')")
    assert page.locator(".p63-card").count() == 24
    page.evaluate("pinyinV63Part('table')")
    page.wait_for_function("document.querySelectorAll('#p63Syllables .p63-card').length === 406")
    page.fill("#p63Search", "ing")
    assert page.locator("#p63Syllables .p63-card").count() > 0

    # Decode and segment the historically troublesome mappings. Each source
    # must expose exactly four voiced spans and never call speech synthesis.
    for name in ("a", "o", "bo", "ke", "ying", "zhong", "eng", "an"):
        spans = page.evaluate(
            "async n => __PINYIN_V63_TEST.findSegments(await __PINYIN_V63_TEST.getBuffer(n))",
            name,
        )
        assert len(spans) == 4, (name, spans)
        assert all(0 <= a < b for a, b in spans), (name, spans)
    page.evaluate("pinyinV63PlayToken('p63|ke|1')")
    page.wait_for_timeout(150)
    assert page.evaluate("window.__ttsCalls") == 0

    # The adventure engine must use the same v63 token mapping.
    pinyin_tasks = page.evaluate(
        "__G1_TEST.levels.filter(l=>l.id.startsWith('zh-')).flatMap(l=>l.tasks).filter(t=>String(t.key).startsWith('pinyin_')).map(t=>t.audio)"
    )
    assert pinyin_tasks and all(str(x).startswith("p63|") for x in pinyin_tasks)

    for width in (320, 375, 390, 768):
        page.set_viewport_size({"width": width, "height": 844})
        page.evaluate("showPage('pinyin'); pinyinV63Part('initials')")
        assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
        assert page.evaluate("Math.min(...[...document.querySelectorAll('.p63-tabs button,.p63-back')].map(x=>x.getBoundingClientRect().height))") >= 48

    assert not errors, errors
    browser.close()

print("pinyin v63 acceptance: PASS (406 files, point-read, tones, blending, mobile)")
