"""Behavioral regression tests. Mocked audio tests completion gates, not pronunciation."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('SMOKE_URL', 'http://127.0.0.1:4196/index.html')
URL = BASE + ('&' if '?' in BASE else '?') + 'test=1'
CHROME = Path(os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
INIT = """
if(!localStorage.getItem('v66-test-seeded')){
localStorage.setItem('v66-test-seeded','1');
localStorage.setItem('grade1_island_reset_v1','1');
localStorage.setItem('grade1_island_state_v1',JSON.stringify({schema:'grade1-game-v1',
pts:0,strk:0,dog:{type:'trex',xp:0,hu:80,hy:80,en:80,tasks:0},
_setup:{done:true,name:'测试伙伴',grade:'一年级'},parentPin:'1234',_parentAuth:false,
chars:{},poems:{},vR:{},dailyGoal:{tasks:2,chars:3},
scr:{on:true,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},
game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activityLog:[]}}));}
HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.onended?.(),0);return Promise.resolve()};
HTMLMediaElement.prototype.pause=function(){};
"""
TASK = """(()=>{const i=S.learning66.daily.items.find(x=>!x.done),l=G1Learning.levels.find(x=>x.id===i.levelId);return {item:i,t:l.tasks[i.index]}})()"""

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=str(CHROME) if CHROME.exists() else None,args=['--no-proxy-server'])
    ctx=browser.new_context(viewport={'width':390,'height':844},service_workers='block')
    ctx.add_init_script(INIT)
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install()
    def load():
        page.goto(URL,wait_until='networkidle')
        page.wait_for_function("window.L66 && document.documentElement.dataset.appVersion==='v67-picture-support'")
        page.evaluate("pinyinV63PlayToken=async (token,cb)=>{cb?.()}")
    load()
    assert page.locator('.l66-subjects>span').count()==11
    assert page.evaluate('S.learning66.daily.items.every(x=>!!x.levelId)')
    page.locator('.l66-plan .l66-primary').click()
    c=page.evaluate(TASK)
    wrong=next(i for i,v in enumerate(c['t']['options']) if v!=c['t']['answer'])
    correct=c['t']['options'].index(c['t']['answer'])
    page.evaluate(f'L66.dailyAnswer({correct})')
    assert page.evaluate('S.pts')==0, 'audio must finish first'
    page.locator('#l66Listen').click()
    page.wait_for_timeout(50)
    for _ in range(3):
        page.evaluate(f'L66.dailyAnswer({wrong})')
        page.clock.fast_forward(800)
    assert page.locator('#l66Guard').count()==1
    assert page.evaluate('S.pts')==0
    assert page.locator('#l66VerifyStart').is_disabled()
    load()  # fresh document, same persisted intervention
    page.locator('.l66-plan .l66-primary').click()
    page.locator('#l66Listen').click()
    page.wait_for_timeout(50)
    page.evaluate(f'L66.dailyAnswer({correct})')
    assert page.locator('#l66Guard').count()==1
    assert page.evaluate('S.pts')==0
    page.clock.fast_forward(21000)
    assert page.locator('#l66VerifyStart').is_disabled(), 'elapsed time is not enough without audio'
    page.locator('#l66Guard button[onclick="L66.guardListen()"]').click()
    page.wait_for_timeout(50)
    page.locator('#l66VerifyStart').click()
    page.locator('#l66Guard .l66-options button').filter(has_text=c['t']['answer']).first.click()
    assert page.locator('#l66Guard').count()==0
    assert page.evaluate('S.pts')==0, 'guided example is not the scored task'
    page.clock.fast_forward(800)
    page.evaluate(f'L66.dailyAnswer({correct});L66.dailyAnswer({correct})')
    page.clock.fast_forward(800)
    assert page.evaluate('S.pts')==3
    assert page.evaluate('S.learning66.daily.items[0].done')
    # Every remaining subject: real gate, stroke scoring callbacks, offline time + PIN.
    for _ in range(10):
        c=page.evaluate(TASK)
        page.locator('#l66Listen').click()
        page.wait_for_timeout(50)
        if c['item']['offline']:
            page.locator('#l66OfflineStart').click()
            if c['item']['id']=='pe':
                started=page.evaluate('S.learning66.daily.items.find(x=>x.id==="pe").startedAt')
                load()
                page.locator('.l66-plan .l66-primary').click()
                assert page.evaluate('S.learning66.daily.items.find(x=>x.id==="pe").startedAt')==started
            before=page.evaluate('S.pts')
            page.evaluate('L66.offlineConfirm()')
            assert page.evaluate('S.pts')==before
            page.clock.fast_forward(c['item']['minutes']*60000+1000)
            page.locator('#l66ParentPin').fill('0000')
            page.evaluate('L66.offlineConfirm()')
            assert page.evaluate('S.pts')==before
            page.locator('#l66ParentPin').fill('1234')
            page.evaluate('L66.offlineConfirm()')
        elif c['t']['type']=='trace':
            page.evaluate('L66.dailyTrace()')
            page.wait_for_timeout(100)
            before=page.evaluate('S.pts')
            page.evaluate('_hw={quiz:cfg=>{window.traceTest=cfg}};startHQ();traceTest.onComplete({totalMistakes:3})')
            assert page.evaluate('S.pts')==before, '64 is below the 65 threshold'
            page.evaluate('startHQ();traceTest.onComplete({totalMistakes:0})')
        else:
            i=c['t']['options'].index(c['t']['answer'])
            page.evaluate(f'L66.dailyAnswer({i})')
        page.clock.fast_forward(1000)
    assert page.evaluate('S.learning66.daily.items.every(x=>x.done)')
    assert page.evaluate('S.pts')==33, 'one first-time task star per daily item'
    assert page.evaluate('S.dog.xp')==0, 'no XP until a real full level is complete'
    page.evaluate('showPage("home")')
    page.locator('.l66-plan .l66-primary').click()
    assert page.evaluate('S.pts')==33
    # Writing, local persistence and responsive layout.
    for width,height in [(320,740),(375,812),(390,844),(768,1024),(1024,768),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        for route in ['home','pinyin','chars','englishsync','daily66']:
            page.evaluate('(r)=>showPage(r)',route)
            page.wait_for_timeout(60)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,route)
        page.evaluate('L66.write("āgyp")')
        assert page.locator('#l66Pen').count()==1
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('#l66Writing header button').click()
    page.evaluate('L66.write("āgyp")')
    box=page.locator('#l66Pen').bounding_box()
    page.mouse.move(box['x']+30,box['y']+30)
    page.mouse.down()
    page.mouse.move(box['x']+100,box['y']+80,steps=8)
    page.mouse.up()
    assert page.evaluate('Object.values(S.learning66.drafts).some(x=>x.length>0)')
    page.locator('#l66Writing header button').click()
    load()
    assert page.evaluate('Object.values(S.learning66.drafts).some(x=>x.length>0)')
    # Thirty-minute cap stops unfinished plan; next local date carries it forward.
    page.evaluate('S.learning66.daily.items[0].done=false;S.learning66.daily.startedAt=Date.now()-1801000;R();L66.startDaily()')
    assert '今天先到这里' in page.locator('.l66-task').inner_text()
    old_id=page.evaluate('S.learning66.daily.items[0].levelId')
    page.clock.fast_forward(86400000)
    page.evaluate('showPage("home")')
    assert page.evaluate('S.learning66.daily.items[0].levelId')==old_id
    assert not page.evaluate('S.learning66.daily.items[0].done')
    # Two unsuccessful guided verification rounds defer the question, not punish rewards.
    page.evaluate("window.guardCase={prompt:'2 + 1 = ?',answer:'3',options:['1','2','3','4'],type:'choice'}")
    before=page.evaluate('S.pts')
    for _ in range(3):
        page.evaluate("L66.attempt('v66-rounds-test',guardCase,'1')")
        page.clock.fast_forward(800)
    for _ in range(2):
        page.clock.fast_forward(21000)
        page.locator('#l66VerifyStart').click()
        page.locator('#l66Guard .l66-options button').filter(has_text='4').click()
    assert page.evaluate("S.learning66.guards['v66-rounds-test'].phase")=='defer'
    assert page.evaluate('S.pts')==before
    assert '请大人陪你试一试' in page.locator('#l66Guard').inner_text()
    page.evaluate('L66.leaveGuard();L66.startDaily();S.learning66.daily.screenSeconds=599')
    page.clock.fast_forward(1100)
    assert page.locator('#l66BreakClock').count()==1
    until=page.evaluate('S.learning66.daily.breakUntil')
    load()
    page.locator('.l66-plan .l66-primary').click()
    assert page.evaluate('S.learning66.daily.breakUntil')==until
    assert page.locator('#l66BreakClock').count()==1
    page.clock.fast_forward(181000)
    assert page.locator('#l66Listen').count()==1
    assert not errors, errors
    print('PASS: third-error persistence, guided retry, 11 daily tasks, 65-point gate, offline PIN, duplicate rewards, 30-minute cap, carryover, writing, six viewports')
    browser.close()
