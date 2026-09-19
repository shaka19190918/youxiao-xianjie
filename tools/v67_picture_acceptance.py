"""Verify deterministic illustrations against question givens and route integration."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4198/index.html')
URL=BASE+('&' if '?' in BASE else '?')+'test=1'
CHROME=Path(os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
OUT=Path(__file__).resolve().parents[1]/'.visual-v67'
OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=str(CHROME) if CHROME.exists() else None,args=['--no-proxy-server'])
    ctx=browser.new_context(viewport={'width':390,'height':844},service_workers='block')
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL,wait_until='networkidle')
    page.evaluate("S._setup={done:true,name:'图画测试',grade:'一年级'};S.dog={type:'trex',xp:0,hu:80,hy:80,en:80};R()")
    page.reload(wait_until='networkidle')
    page.wait_for_function("window.QuestionArt && document.documentElement.dataset.appVersion==='v68-focus-piano'")
    page.evaluate("""
      window.qTest=G1Learning.levels.flatMap(l=>l.tasks.map((t,i)=>({l,t,i})));
      window.qDraw=qTest.filter(x=>QuestionArt.get(x.t));
      window.testLevel=(key)=>{
        G1Learning.levels.forEach(l=>Object.assign(G1Learning.levelState(l.id),{stars:3,tasks:[true,true,true]}));
        const c=qTest.find(x=>x.t.key===key);
        Object.assign(G1Learning.levelState(c.l.id),{stars:c.i,tasks:c.l.tasks.map((_,i)=>i<c.i)});
        g1StartLevel(c.l.id);
      };
      true;
    """)
    count=page.evaluate('qDraw.length')
    assert count>=65,count
    unused=page.evaluate('QuestionArt.keys().filter(k=>!qDraw.some(x=>x.t.key===k))')
    assert not unused,unused
    # Changing an answer must not change the art; changing the prompt must remove stale art.
    assert page.evaluate("qDraw.every(({t})=>QuestionArt.html(t)===QuestionArt.html({...t,answer:'not the answer'}))")
    assert page.evaluate("qDraw.every(({t})=>QuestionArt.html({...t,prompt:'不同的题目'})==='')")
    assert page.evaluate("qTest.filter(x=>String(x.t.audio).startsWith('p63|')).every(x=>QuestionArt.html(x.t)==='')")
    counts=page.evaluate("""qDraw.flatMap(({t})=>{
      const node=document.createElement('div');node.innerHTML=QuestionArt.html(t);
      return [...node.querySelectorAll('[data-quantity]')].map(el=>({
        key:t.key,n:Number(el.dataset.quantity),actual:el.querySelectorAll('[data-ten]').length*10+el.querySelectorAll('[data-one]').length
      }));
    })""")
    assert all(x['n']==x['actual'] for x in counts),counts
    page.evaluate("testLevel('math44_1')")
    assert page.locator('.question-art [data-one]').count()==4
    assert page.locator('.question-art').count()==1
    before=page.evaluate('S.pts')
    page.locator('.question-art svg').first.click()
    assert page.evaluate('S.pts')==before,'viewing art does not award stars'
    page.screenshot(path=str(OUT/'flags-mobile.png'),full_page=True)
    page.evaluate("testLevel('math44_17')")
    assert page.locator('.question-art [data-one]').count()==9
    assert page.locator('.qa-operator').inner_text()=='+'
    page.screenshot(path=str(OUT/'fish-mobile.png'),full_page=True)
    page.evaluate("testLevel('time45_4')")
    minute=page.locator('[data-hand="minute"]').get_attribute('d')
    hour=page.locator('[data-hand="hour"]').get_attribute('d')
    assert minute.startswith('M100 100L100') and minute.endswith('165'),minute
    assert hour.startswith('M100 100L70.3015'),hour
    page.screenshot(path=str(OUT/'clock-mobile.png'),full_page=True)
    # Daily plan and review must use the identical diagram as the main level.
    page.evaluate("S.learning66.daily.items.forEach(x=>x.done=x.id!=='math');const i=S.learning66.daily.items.find(x=>x.id==='math');i.levelId='math-up-0-0';i.index=0;L66.startDaily()")
    daily=page.locator('.question-art').inner_html()
    page.evaluate("const q=qTest.find(x=>x.t.key==='math44_1');G1Learning.scheduleReview(q.l,q.t);Object.values(S.game.reviewQueue).forEach(x=>x.dueAt=Date.now()-1);showPage('review')")
    assert page.locator('.question-art').inner_html()==daily
    # Legacy free practice routes, and all generated SVGs at small and large widths.
    for route,setup in [('mathsync','v44MathQ=V44_MATH[0];renderMath44()'),('mathlower','v45MathLowerQ=V45_MATH_LOWER[0];renderMathLower45()'),('timeextra','v45TimeQ=V45_TIME[3];renderTime45()'),('reading','v42State().readingIndex=0;PGS.reading.render()')]:
        page.evaluate('(r)=>showPage(r)',route)
        page.evaluate(setup)
        assert page.locator('.question-art').count()==1,route
    for width,height in [(320,740),(375,812),(390,844),(768,1024),(1024,768),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate("document.getElementById('ct').innerHTML='<main id=qaAll></main>';document.getElementById('qaAll').innerHTML=qDraw.map(x=>QuestionArt.html(x.t)).join('')")
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
        assert page.evaluate("[...document.querySelectorAll('.qa-icon')].every(e=>e.getBoundingClientRect().width>=16)"),width
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("testLevel('math44_1');__G1_TEST.hear()")
    wrongs=page.evaluate("const t=__G1_TEST.current().task;t.options.map((x,i)=>x!==t.answer?i:-1).filter(i=>i>=0)")
    for i in wrongs:
        page.evaluate('(i)=>g1AnswerTask(i)',i)
        page.wait_for_timeout(750)
    assert page.locator('#l66Guard .question-art [data-one]').count()==4
    assert not errors,errors
    print(f'PASS: {count} illustrated tasks; {len(counts)} quantity groups exact; clocks, no answer-dependent art, daily/review/free-practice integration, 6 viewports')
    browser.close()
