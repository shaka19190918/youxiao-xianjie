"""Full browser acceptance audit for curriculum v43."""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:4173")


def profile_script():
    return """
      localStorage.setItem('yxxj_s', JSON.stringify({
        pts:100,strk:1,dog:{type:'labrador',xp:0,hu:80,hy:80,en:80,tasks:0},
        _setup:{done:true,name:'测试小朋友',grade:'一年级'},parentPin:'1234',
        vR:{},poems:{},chars:{},dailyGoal:{tasks:5,chars:3},mathC:0,mathT:0,
        scr:{on:false,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''}
      }));
      window.__media=[];
      HTMLMediaElement.prototype.play=function(){window.__media.push(this.getAttribute('src')||this.src);queueMicrotask(()=>this.oncanplay&&this.oncanplay());return Promise.resolve();};
      HTMLMediaElement.prototype.pause=function(){};
    """


def assert_no_overflow(page, route, width, height):
    page.set_viewport_size({"width": width, "height": height})
    page.evaluate("route=>showPage(route)", route)
    page.wait_for_timeout(20)
    dims = page.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth})")
    assert dims["sw"] <= dims["iw"] + 1, f"horizontal overflow {route} at {width}: {dims}"


with sync_playwright() as p:
    executable = os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe")
    browser = p.chromium.launch(headless=True, executable_path=executable if Path(executable).exists() else None)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.add_init_script(profile_script())
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on("console", lambda msg: errors.append(f"console {msg.type}: {msg.text}") if msg.type == "error" else None)
    page.on("response", lambda response: errors.append(f"http {response.status}: {response.url}") if response.status >= 400 else None)
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_function("typeof v42State === 'function' && typeof V43_TEXTBOOK !== 'undefined' && typeof showPage === 'function'")

    assert page.locator("#v42CourseCard").count() == 1
    assert "一年级核心课程" in page.locator("#v42CourseCard").inner_text()
    home_labels = page.evaluate("[...document.querySelectorAll('#ct .ql,#ct .qs')].map(x=>x.textContent)")
    assert "节拍启蒙" in home_labels and "家长课程表" in home_labels
    assert page.evaluate("V42_CHARS.length") == 69
    assert page.evaluate("V42_READINGS.length") == 12
    assert page.evaluate("V42_MATH.length") == 40
    assert page.evaluate("V42_TONES.length") == 24
    assert page.evaluate("V42_INITIALS.length") == 23
    assert page.evaluate("POEM_COURSE_V6.length") == 12

    page.evaluate("showPage('curriculum')")
    course_text = page.locator("#ct").inner_text()
    for label in ["教材同步路线", "拼音与正音", "识字与写字", "阅读与表达", "数学核心", "古诗积累", "思维实践"]:
        assert label in course_text, label
    assert "二年级" not in page.locator("body").inner_text()

    page.evaluate("showPage('textbook')")
    assert page.locator(".tb-unit").count() == 9
    assert page.locator(".tb-lesson").count() == 45
    textbook_text = page.locator("#ct").text_content()
    for label in ["统编版语文", "2024新教材", "1 ɑ o e", "14 ɑng eng ing ong", "秋天", "乌鸦喝水"]:
        assert label in textbook_text, label
    assert "不复制教材课文" in textbook_text
    page.evaluate("playTextbookV43(0,0)")
    assert any("assets/textbook/tb_00_01.mp3" in x for x in page.evaluate("window.__media"))

    page.evaluate("showPage('pinyin');playPinyinV42('fo2','f');playPinyinV42('a2','á')")
    media = page.evaluate("window.__media")
    assert any("assets/pinyin/fo2.mp3" in x for x in media)
    assert any("assets/pinyin/a2.wav" in x for x in media)

    page.evaluate("showPage('chars');playCharV42(0,false)")
    assert page.locator(".v42-char").count() == 12
    assert any("assets/chars/u4e00.mp3" in x for x in page.evaluate("window.__media"))
    assert page.get_by_role("button", name="学会", exact=True).count() == 0

    page.evaluate("showPage('reading')")
    page.evaluate("answerReadingV42(0,'家门口',document.querySelector('.v42-answer'))")
    assert "read_0" in page.evaluate("v42State().wrong")
    page.evaluate("answerReadingV42(0,'校门口',document.querySelectorAll('.v42-answer')[1])")
    assert page.evaluate("v42State().mastery['read_0'].score") == 1
    assert "read_0" not in page.evaluate("v42State().wrong")

    page.evaluate("showPage('math')")
    page.evaluate("v42MathQ=V42_MATH[0];renderMathV42();answerMathV42('7',document.querySelector('.v42-answer'))")
    assert "math_1" in page.evaluate("v42State().wrong")
    page.evaluate("v42MathQ=V42_MATH[0];renderMathV42();answerMathV42('9',document.querySelectorAll('.v42-answer')[1])")
    assert page.evaluate("v42State().mastery['math_1'].score") == 1
    assert page.evaluate("new Set(V42_MATH.map(q=>q.cat)).size") == 8

    routes = page.evaluate("Object.keys(PGS)")
    for width, height in [(320, 568), (375, 667), (390, 844), (768, 1024)]:
        for route in routes:
            assert_no_overflow(page, route, width, height)

    page.evaluate("S._parentAuth=true;showPage('parent')")
    assert page.locator("#v42ParentReport").count() == 1
    assert "核心课程掌握报告" in page.locator("#v42ParentReport").inner_text()

    assets = page.evaluate("""async()=>{
      const paths=[
        ...V42_CHARS.map(x=>'assets/chars/u'+x[0].codePointAt(0).toString(16)+'.mp3'),
        ...V42_READINGS.map((_,i)=>'assets/reading/reading_'+String(i+1).padStart(2,'0')+'.mp3'),
        ...V42_MATH.map(q=>'assets/math-v42/question_'+String(q.id).padStart(2,'0')+'.mp3'),
        ...V42_INITIALS.map(x=>'assets/pinyin/'+x[2]+'.mp3'),
        ...V42_TONES.map(x=>'assets/pinyin/'+x[1]+'.'+pinyinExtV42(x[1])),
        ...V42_FINALS.map(x=>'assets/pinyin/'+x[1]+'.'+pinyinExtV42(x[1]))
        ,...POEM_COURSE_V6.flatMap(p=>['assets/voice/'+p.key+'_info.mp3',...p.lns.map((_,i)=>'assets/voice/'+p.key+'_l'+(i+1)+(p.key==='poem_yong_e'&&i===0?'.wav':'.mp3'))]),
        ...V43_TEXTBOOK.flatMap((u,ui)=>u.items.map((_,i)=>'assets/textbook/tb_'+String(ui).padStart(2,'0')+'_'+String(i+1).padStart(2,'0')+'.mp3'))
      ];
      const unique=[...new Set(paths)];
      return Promise.all(unique.map(async p=>[p,(await fetch(p)).status]));
    }""")
    assert all(status == 200 for _, status in assets), assets
    decode_failures = page.evaluate("""async paths=>{
      const Ctx=window.AudioContext||window.webkitAudioContext,ctx=new Ctx(),bad=[];
      for(const path of paths){try{const data=await (await fetch(path)).arrayBuffer();const audio=await ctx.decodeAudioData(data.slice(0));if(!audio.duration||audio.duration<0.08)bad.push(path+':empty')}catch(e){bad.push(path+':'+e.name)}}
      await ctx.close();return bad;
    }""", [path for path, _ in assets])
    assert not decode_failures, decode_failures
    assert not errors, "\n".join(errors)

    # Verify the installed shell can reload without a network connection.
    page.evaluate("navigator.serviceWorker.ready")
    page.wait_for_timeout(600)
    context.set_offline(True)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_function("typeof showPage === 'function'")
    assert page.locator("#v42CourseCard").count() == 1
    context.set_offline(False)
    browser.close()
    print(f"v43 acceptance: PASS ({len(routes)} routes, 4 viewports, 45 textbook nodes, offline reload)")
