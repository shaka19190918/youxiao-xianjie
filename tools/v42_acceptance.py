"""Full browser acceptance audit for curriculum v46."""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:4199")


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
    page.wait_for_function("typeof v42State === 'function' && typeof V45_MATH_LOWER !== 'undefined' && typeof V45_TIME !== 'undefined' && typeof V46_PINYIN_AUDIO !== 'undefined' && typeof showPage === 'function'")
    page.evaluate("PET_VOICE_READY")

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
    assert page.evaluate("V44_MATHBOOK.length") == 7
    assert page.evaluate("V44_MATHBOOK.reduce((n,u)=>n+u.items.length,0)") == 42
    assert page.evaluate("V44_ENGLISHBOOK.length") == 8
    assert page.evaluate("V44_ENGLISHBOOK.reduce((n,u)=>n+u.items.length,0)") == 40
    assert page.evaluate("V44_MATH.length") == 42
    assert page.evaluate("V45_MATHBOOK_LOWER.length") == 8
    assert page.evaluate("V45_MATHBOOK_LOWER.reduce((n,u)=>n+u.items.length,0)") == 37
    assert page.evaluate("V45_MATH_LOWER.length") == 48
    assert page.evaluate("V45_TIME.length") == 18
    assert page.evaluate("V44_ENGLISH.reduce((n,u)=>n+u.items.length,0)") == 24
    assert page.evaluate("V44_MATH.every(q=>q.o.includes(q.a)&&new Set(q.o).size===q.o.length)")
    assert page.evaluate("[0,1,2,3,4,5,6].every(u=>V44_MATH.filter(q=>q.unit===u).length===6)")
    assert page.evaluate("V45_MATH_LOWER.every(q=>q.o.includes(q.a)&&new Set(q.o).size===q.o.length)")
    assert page.evaluate("[0,1,2,3,4,5,6,7].every(u=>V45_MATH_LOWER.filter(q=>q.unit===u).length===6)")
    assert page.evaluate("V45_TIME.every(q=>q.o.includes(q.a)&&new Set(q.o).size===q.o.length)")

    page.evaluate("showPage('curriculum')")
    course_text = page.locator("#ct").inner_text()
    for label in ["教材同步路线", "拼音与正音", "识字与写字", "阅读与表达", "数学教材同步", "英语教材同步", "古诗积累", "思维实践", "数学能力拓展"]:
        assert label in course_text, label
    assert "二年级核心课程" not in page.locator("body").inner_text()
    assert "二年级下册预备选学" in course_text

    page.evaluate("showPage('textbook')")
    assert page.locator(".tb-unit").count() == 9
    assert page.locator(".tb-lesson").count() == 45
    textbook_text = page.locator("#ct").text_content()
    for label in ["统编版语文", "2024新教材", "1 ɑ o e", "14 ɑng eng ing ong", "秋天", "乌鸦喝水"]:
        assert label in textbook_text, label
    assert "不复制教材课文" in textbook_text
    page.evaluate("playTextbookV43(0,0)")
    assert any("assets/textbook/tb_00_01.mp3" in x for x in page.evaluate("window.__media"))

    page.evaluate("textbookSubjectSetV44('数学上册')")
    assert page.locator(".tb-unit").count() == 7
    assert page.locator(".tb-lesson").count() == 42
    math_book_text = page.locator("#ct").text_content()
    for label in ["人教版数学", "5以内数", "6～10", "认识立体图形", "20以内的进位加法"]:
        assert label in math_book_text, label
    page.evaluate("bookNodeV44('数学上册',0,0)")
    assert any("assets/textbook-v44/math_unit_01.mp3" in x for x in page.evaluate("window.__media"))

    page.evaluate("textbookSubjectSetV44('数学下册')")
    assert page.locator(".tb-unit").count() == 8
    assert page.locator(".tb-lesson").count() == 37
    lower_book_text = page.locator("#ct").text_content()
    for label in ["一年级下册", "认识平面图形", "20以内的退位减法", "100以内数的认识", "欢乐购物街"]:
        assert label in lower_book_text, label
    page.evaluate("bookNodeV44('数学下册',0,0)")
    assert any("assets/textbook-v45/math_lower_unit_01.mp3" in x for x in page.evaluate("window.__media"))

    page.evaluate("textbookSubjectSetV44('英语')")
    assert page.locator(".tb-unit").count() == 8
    assert page.locator(".tb-lesson").count() == 40
    english_book_text = page.locator("#ct").text_content()
    for label in ["北京版英语", "HELLO! I'M MAOMAO", "GOOD MORNING", "I CAN SING", "HAPPY CHINESE NEW YEAR"]:
        assert label in english_book_text, label

    page.evaluate("showPage('pinyin');playPinyinV42('fo2','f');playPinyinV42('a2','á')")
    media = page.evaluate("window.__media")
    assert any("assets/pinyin/fo2.mp3" in x for x in media)
    assert any("assets/pinyin/a2.wav" in x for x in media)
    page.evaluate("window.__media=[];playPinyinV42('ke1','k');playPinyinV42('ying1','ing');playPinyinV42('zhong1','ong')")
    special_media = page.evaluate("window.__media")
    assert special_media == ["assets/pinyin-v46/k-ke1.mp3", "assets/pinyin-v46/ing-ying1.mp3", "assets/pinyin-v46/ong-zhong1.mp3"], special_media
    assert not any("greeting_" in x or "textbook" in x for x in special_media)

    page.evaluate("showPage('dog');window.__media=[]")
    assert page.locator(".pet-listen").count() == 1
    assert page.locator(".dog-btn").count() == 4
    assert page.locator(".pet-stage").count() == 4
    assert page.evaluate("Object.keys(PET_VOICE).length >= 100")
    pet_line = page.evaluate("SPEECH_DATA[3][1][0]")
    expected_pet = page.evaluate("(line)=>'assets/voice/'+PET_VOICE[line]+'.mp3'", pet_line)
    page.evaluate("line=>speakPet(line)", pet_line)
    page.wait_for_timeout(10)
    assert expected_pet in page.evaluate("window.__media")
    assert page.locator(".pet-listen").evaluate("e=>e.getBoundingClientRect().height") >= 60
    assert page.locator(".dog-btn").first.evaluate("e=>e.getBoundingClientRect().height") >= 100

    page.evaluate("showPage('chars');playCharV42(0,false)")
    assert page.locator(".v42-char").count() == 12
    assert any("assets/chars/u4e00.mp3" in x for x in page.evaluate("window.__media"))
    assert page.get_by_role("button", name="学会", exact=True).count() == 0
    assert page.locator(".v42-char .glyph").first.evaluate("e=>parseFloat(getComputedStyle(e).fontSize)") >= 70
    assert page.locator(".v42-char .cbtn").first.evaluate("e=>e.getBoundingClientRect().height") >= 56
    assert "听一听" in page.locator(".v42-char .cbtn").first.inner_text()

    page.evaluate("window.__media=[];eyeOpen('rest')")
    assert page.locator("#eyeLock").evaluate("e=>getComputedStyle(e).display") == "flex"
    assert page.locator(".eye-t").evaluate("e=>parseFloat(getComputedStyle(e).fontSize)") >= 28
    assert page.locator(".eye-p").evaluate("e=>parseFloat(getComputedStyle(e).fontSize)") >= 17
    assert any("assets/voice/eye_rest.mp3" in x for x in page.evaluate("window.__media"))
    page.evaluate("_eyeMode=null;eyeRender()")

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

    page.evaluate("showPage('mathsync');v44MathQ=V44_MATH[0];renderMath44()")
    page.evaluate("answerMath44('3',document.querySelector('#math44Task .v42-answer'))")
    assert "math44_1" in page.evaluate("v42State().wrong")
    page.evaluate("v44MathQ=V44_MATH[0];renderMath44();answerMath44('4',document.querySelectorAll('#math44Task .v42-answer')[1])")
    assert page.evaluate("v42State().mastery['math44_1'].score") == 1
    assert "math44_1" not in page.evaluate("v42State().wrong")

    page.evaluate("showPage('mathlower');v45MathLowerQ=V45_MATH_LOWER[0];renderMathLower45()")
    assert "一年级下册数学" in page.locator("#ct").inner_text()
    page.evaluate("answerMathLower45('2条',document.querySelector('#math45LowerTask .v42-answer'))")
    assert "math45l_1" in page.evaluate("v42State().wrong")
    page.evaluate("v45MathLowerQ=V45_MATH_LOWER[0];renderMathLower45();answerMathLower45('4条',document.querySelectorAll('#math45LowerTask .v42-answer')[2])")
    assert page.evaluate("v42State().mastery['math45l_1'].score") == 1
    page.evaluate("playMathLower45()")
    assert any("assets/math-v45-lower/question_01.mp3" in x for x in page.evaluate("window.__media"))

    page.evaluate("showPage('timeextra');v45TimeQ=V45_TIME[0];renderTime45()")
    time_text = page.locator("#ct").inner_text()
    assert "二年级下册预备知识" in time_text and "不计入一年级教材同步完成率" in time_text
    page.evaluate("answerTime45('分针',document.querySelectorAll('#time45Task .v42-answer')[1])")
    assert "time45_1" in page.evaluate("v42State().wrong")
    page.evaluate("v45TimeQ=V45_TIME[0];renderTime45();answerTime45('时针',document.querySelector('#time45Task .v42-answer'))")
    assert page.evaluate("v42State().mastery['time45_1'].score") == 1
    page.evaluate("playTime45()")
    assert any("assets/time-v45/question_01.mp3" in x for x in page.evaluate("window.__media"))

    page.evaluate("showPage('englishsync')")
    before_cn = page.evaluate("window.__media.filter(x=>x.includes('english-v44-cn')).length")
    page.evaluate("playEnglish44(0,0)")
    assert any("assets/english-v44/u01_01.mp3" in x for x in page.evaluate("window.__media"))
    assert page.evaluate("window.__media.filter(x=>x.includes('english-v44-cn')).length") == before_cn
    page.evaluate("translateEnglish44(0,0)")
    assert any("assets/english-v44-cn/u01_01.mp3" in x for x in page.evaluate("window.__media"))
    page.evaluate("v44EnglishQuiz={u:0,i:0,a:'你好！',opts:['再见。','你好！','谢谢你。']};renderEnglishQuiz44()")
    page.evaluate("answerEnglish44('再见。',document.querySelector('#englishQuiz44 .v42-answer'))")
    assert "english44_0_0" in page.evaluate("v42State().wrong")
    page.evaluate("answerEnglish44('你好！',document.querySelectorAll('#englishQuiz44 .v42-answer')[1])")
    assert page.evaluate("v42State().mastery['english44_0_0'].score") == 1
    assert page.evaluate("""()=>{for(let u=0;u<8;u++){v42State().english44Unit=u;for(let n=0;n<30;n++){startEnglishQuiz44();if(new Set(v44EnglishQuiz.opts).size!==3||!v44EnglishQuiz.opts.includes(v44EnglishQuiz.a))return false}}return true}""")

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
        ...V42_INITIALS.map(x=>V46_PINYIN_AUDIO[x[0]]||('assets/pinyin/'+x[2]+'.mp3')),
        ...V42_TONES.map(x=>'assets/pinyin/'+x[1]+'.'+pinyinExtV42(x[1])),
        ...V42_FINALS.map(x=>V46_PINYIN_AUDIO[x[0]]||('assets/pinyin/'+x[1]+'.'+pinyinExtV42(x[1])))
        ,...POEM_COURSE_V6.flatMap(p=>['assets/voice/'+p.key+'_info.mp3',...p.lns.map((_,i)=>'assets/voice/'+p.key+'_l'+(i+1)+(p.key==='poem_yong_e'&&i===0?'.wav':'.mp3'))]),
        ...V43_TEXTBOOK.flatMap((u,ui)=>u.items.map((_,i)=>'assets/textbook/tb_'+String(ui).padStart(2,'0')+'_'+String(i+1).padStart(2,'0')+'.mp3')),
        ...V44_MATH.map(q=>'assets/math-v44/question_'+String(q.id).padStart(2,'0')+'.mp3'),
        ...V45_MATH_LOWER.map(q=>'assets/math-v45-lower/question_'+String(q.id).padStart(2,'0')+'.mp3'),
        ...V45_TIME.map(q=>'assets/time-v45/question_'+String(q.id).padStart(2,'0')+'.mp3'),
        ...V44_MATHBOOK.map((_,i)=>'assets/textbook-v44/math_unit_'+String(i+1).padStart(2,'0')+'.mp3'),
        ...V45_MATHBOOK_LOWER.map((_,i)=>'assets/textbook-v45/math_lower_unit_'+String(i+1).padStart(2,'0')+'.mp3'),
        ...V44_ENGLISHBOOK.map((_,i)=>'assets/textbook-v44/english_unit_'+String(i+1).padStart(2,'0')+'.mp3'),
        ...V44_ENGLISH.flatMap((u,ui)=>u.items.flatMap((_,i)=>['assets/english-v44/u'+String(ui+1).padStart(2,'0')+'_'+String(i+1).padStart(2,'0')+'.mp3','assets/english-v44-cn/u'+String(ui+1).padStart(2,'0')+'_'+String(i+1).padStart(2,'0')+'.mp3'])),
        'assets/voice/eye_rest.mp3','assets/voice/eye_limit.mp3','assets/voice/eye_done.mp3'
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
    print(f"v46 acceptance: PASS ({len(routes)} routes, 4 viewports, 164 textbook nodes, pet/pinyin/eye audio, offline reload)")
