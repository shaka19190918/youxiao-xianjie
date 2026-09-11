"""Browser acceptance test for the Grade 1 island game loop."""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
BASE = os.environ.get("SMOKE_URL", Path("index.html").resolve().as_uri())
TEST_URL = BASE + ("&" if "?" in BASE else "?") + "test=1"
CHROME = Path(os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"))


def new_state():
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
      window.__played=[];
      HTMLMediaElement.prototype.play=function(){window.__played.push(this.getAttribute('src')||this.src);setTimeout(()=>this.onended&&this.onended(),0);return Promise.resolve()};
      HTMLMediaElement.prototype.pause=function(){};
    """


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(CHROME) if CHROME.exists() else None, args=["--no-proxy-server"])

    # One-time destructive migration from the retired storage schema.
    migration = browser.new_context(service_workers="block")
    migration.add_init_script("""
      localStorage.setItem('yxxj_s','{"pts":999,"_setup":{"done":true}}');
      localStorage.setItem('yxxj_dog','{"type":"husky","xp":999}');
    """)
    page = migration.new_page()
    page.goto(TEST_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_function("document.documentElement.dataset.appVersion === 'v63-pinyin-point-read'", timeout=30000)
    assert page.evaluate("localStorage.getItem('yxxj_s')") is None
    assert page.evaluate("localStorage.getItem('yxxj_dog')") is None
    assert page.evaluate("localStorage.getItem('grade1_island_reset_v1')") == "1"
    assert page.evaluate("JSON.parse(localStorage.getItem('grade1_island_state_v1')).schema") == "grade1-game-v1"
    page.reload(wait_until="domcontentloaded")
    assert page.evaluate("localStorage.getItem('grade1_island_reset_v1')") == "1"
    migration.close()

    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    context.add_init_script(new_state())
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on("console", lambda msg: errors.append(f"console {msg.type}: {msg.text}") if msg.type == "error" else None)
    page.goto(TEST_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_function("window.__G1_TEST && document.documentElement.dataset.appVersion === 'v63-pinyin-point-read'")

    assert page.title() == "一年级成长岛"
    assert page.locator(".g1-map").count() == 1
    assert page.locator(".g1-region").count() == 9
    assert page.locator("#kidDock button").count() == 5
    assert page.evaluate("__G1_TEST.levels.length") >= 100
    assert page.evaluate("__G1_TEST.levels.every(x=>x.tasks.length===3)")
    assert page.evaluate("['choice','trace','focus','piano','sport'].every(t=>__G1_TEST.levels.some(l=>l.tasks.some(x=>x.type===t)))")
    resources = page.evaluate("performance.getEntriesByType('resource').map(x=>x.name)")
    assert not any("math-v44/question" in x or "reading/reading" in x or "poem_" in x for x in resources), resources
    assert page.evaluate("__G1_TEST.regionUnlocked('start')")
    assert not page.evaluate("__G1_TEST.regionUnlocked('chinese')")

    # Complete the start level: three validated tasks, 3 stars, 9 diamonds, one pet XP reward.
    page.evaluate("g1StartLevel('start-1')")
    page.locator("#g1Listen").click()
    page.wait_for_timeout(30)
    first_answer = page.evaluate("__G1_TEST.current().task.answer")
    page.locator(".g1-answer").filter(has_text=first_answer).click()
    page.wait_for_timeout(750)
    for _ in range(2):
        assert page.evaluate("__G1_TEST.correct()")
        page.wait_for_timeout(750)
    assert page.evaluate("__G1_TEST.levelState('start-1').stars") == 3
    assert page.evaluate("S.pts") == 9
    assert page.evaluate("S.dog.xp") == 12
    assert page.evaluate("S.dog.tasks") == 1
    assert page.evaluate("__G1_TEST.regionUnlocked('chinese')")
    assert page.evaluate("__G1_TEST.regionUnlocked('math')")
    page.evaluate("document.getElementById('g1Celebrate')?.remove()")

    # Reopening/replaying a completed level cannot grant more rewards.
    page.evaluate("g1StartLevel('start-1')")
    page.wait_for_timeout(50)
    assert page.evaluate("S.pts") == 9
    assert page.evaluate("S.dog.xp") == 12

    # A wrong answer is queued for 10-minute review; correction can still earn the star.
    page.evaluate("g1StartLevel('zh-tone-1')")
    correct_index = page.evaluate("c=__G1_TEST.current();c.task.options.indexOf(c.task.answer)")
    page.evaluate("i=>g1AnswerTask(i)", correct_index)
    assert page.evaluate("__G1_TEST.levelState('zh-tone-1').stars") == 0
    assert page.evaluate("__G1_TEST.wrong()")
    assert page.evaluate("Object.keys(__G1_TEST.game().reviewQueue).length") == 1
    delay = page.evaluate("Object.values(__G1_TEST.game().reviewQueue)[0].dueAt-Date.now()")
    assert 590000 <= delay <= 610000, delay
    assert page.evaluate("__G1_TEST.correct()")
    page.wait_for_timeout(750)
    assert page.evaluate("__G1_TEST.levelState('zh-tone-1').stars") == 1

    # Review interval progresses 10 minutes -> 1/3/7/14 days and then leaves the queue.
    intervals = [1, 3, 7, 14]
    for days in intervals:
        page.evaluate("__G1_TEST.dueNow();showPage('review')")
        page.locator(".g1-answer").filter(has_text=page.evaluate("Object.values(__G1_TEST.game().reviewQueue)[0].task.answer")).click()
        page.wait_for_timeout(700)
        if page.evaluate("Object.keys(__G1_TEST.game().reviewQueue).length"):
            delay = page.evaluate("Object.values(__G1_TEST.game().reviewQueue)[0].dueAt-Date.now()")
            assert abs(delay - days * 86400000) < 3000, (days, delay)
    page.evaluate("__G1_TEST.dueNow();showPage('review')")
    answer = page.evaluate("Object.values(__G1_TEST.game().reviewQueue)[0].task.answer")
    page.locator(".g1-answer").filter(has_text=answer).click()
    page.wait_for_timeout(700)
    assert page.evaluate("Object.keys(__G1_TEST.game().reviewQueue).length") == 0

    # Pet reply history retains three distinct recent replies.
    page.evaluate("Array.from({length:10},()=>__G1_TEST.petReply())")
    recent = page.evaluate("__G1_TEST.game().petResponseHistory")
    assert len(recent) == 3 and len(set(recent)) == 3, recent

    # Responsive layout and minimum touch targets.
    for width, height in [(320, 568), (375, 667), (390, 844), (768, 1024), (1280, 800)]:
        page.set_viewport_size({"width": width, "height": height})
        page.evaluate("showPage('home')")
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"), width
        assert page.locator(".g1-continue").evaluate("e=>e.getBoundingClientRect().height") >= 48
        if width < 700:
            assert page.locator("#kidDock button").first.evaluate("e=>e.getBoundingClientRect().height") >= 44

    errors = [e for e in errors if "pet_voice_map.json" not in e and "ERR_FAILED" not in e]
    assert not errors, errors
    print("game v61 acceptance: PASS")
    context.close()
    browser.close()
