"""Acceptance suite for the national-platform Grade 1 curriculum release."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("SMOKE_URL", (ROOT / "index.html").as_uri())
CHROME = Path(
    os.path.expandvars(
        r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"
    )
)
EXPECTED = {
    "chinese": {"edition": "统编版", "terms": ["upper", "lower"]},
    "math": {"edition": "人教版", "terms": ["upper", "lower", "extra"]},
    "english": {"edition": "北京版", "terms": ["upper", "lower"]},
    "morality": {"edition": "统编版", "terms": ["upper", "lower"]},
    "science": {"edition": "人教鄂教版", "terms": ["upper", "lower"]},
    "music": {"edition": "人教版", "terms": ["upper", "lower"]},
    "art": {"edition": "人教版", "terms": ["upper", "lower"]},
    "pe": {"edition": "人教版·水平一", "terms": ["level1"]},
    "integrated": {"edition": "教科版", "terms": ["upper"]},
    "labor": {"edition": "苏科版", "terms": ["upper"]},
}
PINYIN_LESSONS = [
    "1 ɑ o e",
    "2 i u ü",
    "3 b p m f",
    "4 d t n l",
    "5 g k h",
    "6 j q x",
    "7 z c s",
    "8 zh ch sh r",
    "9 y w",
    "10 ɑi ei ui",
    "11 ɑo ou iu",
    "12 ie üe er",
    "13 ɑn en in un ün",
    "14 ɑng eng ing ong",
]


def assert_assets() -> None:
    snapshot = json.loads((ROOT / "data/curriculum-manifest-v61.json").read_text("utf-8"))
    checklist = json.loads(
        (ROOT / "data/curriculum-audio-checklist-v61.json").read_text("utf-8")
    )
    assert len(snapshot["subjects"]) == 10
    assert len(checklist) == 156
    assert len({item["audio"] for item in checklist}) == len(checklist)
    for item in checklist:
        target = ROOT / item["audio"]
        assert target.exists() and target.stat().st_size > 1_000, target
        for option in next(
            task["options"]
            for level in _levels
            if level["id"] == item["levelId"]
            for task in level["tasks"]
            if task["id"] == item["taskId"]
        ):
            assert option in item["text"], (item["audio"], option)
    for syllable in ("ma", "bo", "ge", "yi", "wu", "yu"):
        for tone in range(1, 5):
            target = ROOT / f"assets/pinyin-v61/{syllable}{tone}.mp3"
            assert target.exists() and target.stat().st_size > 1_000, target


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=str(CHROME) if CHROME.exists() else None,
        args=["--no-proxy-server"],
    )
    context = browser.new_context(
        viewport={"width": 390, "height": 844}, service_workers="block"
    )
    context.add_init_script(
        """
        localStorage.setItem('grade1_island_reset_v1','1');
        localStorage.setItem('grade1_island_state_v1', JSON.stringify({
          schema:'grade1-game-v1',pts:0,strk:1,
          dog:{type:'labrador',xp:0,hu:80,hy:80,en:80,tasks:0},
          _setup:{done:true,name:'测试小朋友',grade:'一年级'},parentPin:'1234',
          parentQA:{q:'',a:''},vR:{},poems:{},chars:{},dailyGoal:{tasks:3,chars:3},
          mathC:0,mathT:0,scr:{on:false,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},
          game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'start-1'}
        }));
        window.__played=[];
        HTMLMediaElement.prototype.play=function(){
          window.__played.push(this.getAttribute('src')||this.src);
          setTimeout(()=>this.onended&&this.onended(),0);
          return Promise.resolve();
        };
        HTMLMediaElement.prototype.pause=function(){};
        """
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(BASE + ("&" if "?" in BASE else "?") + "test=1", wait_until="networkidle")
    page.wait_for_function(
        "window.__G1_TEST && document.documentElement.dataset.appVersion === 'v64-companion-controls'"
    )

    manifest = page.evaluate("() => window.CURRICULUM_MANIFEST_V1")
    assert manifest["verifiedAt"] == "2026-09-07"
    assert len(manifest["subjects"]) == 10
    for subject in manifest["subjects"]:
        expected = EXPECTED[subject["id"]]
        assert subject["edition"] == expected["edition"]
        assert [term["id"] for term in subject["terms"]] == expected["terms"]
        assert all(term["sourceUrl"].startswith("https://basic.smartedu.cn/") for term in subject["terms"] if term["id"] != "extra")
    assert next(s for s in manifest["subjects"] if s["id"] == "pe")["gradeBand"] == "一至二年级"

    lessons = page.evaluate(
        """() => V43_TEXTBOOK.slice(2,5).flatMap(unit => unit.items)
          .map(item => item[0]).filter(title => /^\\d+ /.test(title))"""
    )
    assert lessons == PINYIN_LESSONS, lessons
    assert page.evaluate("pinyinPathV60('a1','ā')") == "assets/pinyin-v61/ma1.mp3"
    assert page.evaluate("pinyinPathV60('o4','ò')") == "assets/pinyin-v61/bo4.mp3"
    assert page.evaluate("pinyinPathV60('v3','ǚ')") == "assets/pinyin-v61/yu3.mp3"

    global _levels
    _levels = page.evaluate("() => window.__G1_TEST.levels.filter(x=>x.id.startsWith('curr-'))")
    assert len(_levels) == 52
    assert all(len(level["tasks"]) == 3 for level in _levels)
    assert {level["region"] for level in _levels} == {"life", "science", "arts"}
    assert_assets()

    page.evaluate("showPage('curriculum')")
    assert page.locator(".v61-subject-grid>button").count() == 10
    assert "全部来自" + "教材" not in page.locator("#ct").inner_text()
    for width, height in [(320, 568), (375, 667), (390, 844), (768, 1024), (1180, 820)]:
        page.set_viewport_size({"width": width, "height": height})
        for route in ("curriculum", "home"):
            page.evaluate("route => showPage(route)", route)
            assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"), (width, route)

    # Unlock the first life-science path without awarding it, then complete a real new level.
    page.evaluate(
        """() => {
          ['start-1','zh-tone-1','zh-tone-2','zh-tone-3'].forEach(id => {
            const state=__G1_TEST.levelState(id);state.stars=3;state.tasks=[true,true,true];
          });
          return g1StartCurriculumLevel('morality','upper',0);
        }"""
    )
    assert page.evaluate("__G1_TEST.current().level.id") == "curr-morality-upper-0"
    for _ in range(3):
        assert page.evaluate("__G1_TEST.correct()")
        page.wait_for_timeout(720)
        page.evaluate("document.getElementById('g1Celebrate')?.remove()")
    assert page.evaluate("__G1_TEST.levelState('curr-morality-upper-0').stars") == 3
    assert page.evaluate("S.pts") == 9
    assert page.evaluate("S.dog.xp") == 12

    page.evaluate("showPage('dog')")
    assert page.locator(".pet-listen").count() == 0
    assert "听它" + "说一句" not in page.locator("#ct").inner_text()
    assert not errors, errors
    context.close()

    # Chromium must be able to parse duration metadata for every new MP3.
    checklist = json.loads(
        (ROOT / "data/curriculum-audio-checklist-v61.json").read_text("utf-8")
    )
    audio_paths = [item["audio"] for item in checklist]
    audio_paths += [
        f"assets/pinyin-v61/{syllable}{tone}.mp3"
        for syllable in ("ma", "bo", "ge", "yi", "wu", "yu")
        for tone in range(1, 5)
    ]
    audio_paths += [f"assets/textbook/tb_04_{index:02d}.mp3" for index in range(1, 8)]
    audio_context = browser.new_context(service_workers="block")
    audio_page = audio_context.new_page()
    audio_page.goto((ROOT / "index.html").as_uri(), wait_until="domcontentloaded")
    for start in range(0, len(audio_paths), 24):
        failures = audio_page.evaluate(
            """async paths => (await Promise.all(paths.map(path => new Promise(resolve => {
              const audio=new Audio(path);const timer=setTimeout(()=>resolve(path+':timeout'),5000);
              audio.onloadedmetadata=()=>{clearTimeout(timer);resolve(Number.isFinite(audio.duration)&&audio.duration>.08?'':path+':empty')};
              audio.onerror=()=>{clearTimeout(timer);resolve(path+':decode')};audio.load();
            })))).filter(Boolean)""",
            audio_paths[start : start + 24],
        )
        assert not failures, failures
    audio_context.close()
    print(f"v61 national-platform acceptance: PASS ({len(audio_paths)} new audio files decoded)")
    browser.close()
