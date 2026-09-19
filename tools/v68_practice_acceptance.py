"""Browser behavior tests; microphone paths use mocks, not acoustic certification."""
import os
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4201/index.html')
CHROME=Path(os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
INIT="""
if(!localStorage.getItem('v68-seeded')){
 localStorage.setItem('v68-seeded','1');localStorage.setItem('grade1_island_reset_v1','1');
 localStorage.setItem('grade1_island_state_v1',JSON.stringify({schema:'grade1-game-v1',pts:0,
 dog:{type:'trex',xp:0,hu:80,hy:80,en:80,tasks:0},_setup:{done:true,name:'测试',grade:'一年级'},parentPin:'1234',
 chars:{},poems:{},vR:{},dailyGoal:{tasks:2,chars:3},scr:{on:true,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},
 game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activityLog:[]}}));
}
HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.onended?.(),0);return Promise.resolve()};
HTMLMediaElement.prototype.pause=function(){};
"""
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=str(CHROME) if CHROME.exists() else None,args=['--no-proxy-server'])
    ctx=browser.new_context(viewport={'width':390,'height':844},service_workers='block')
    ctx.add_init_script(INIT)
    page=ctx.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    # Run the 20-minute case at noon, not across the real host's midnight reset.
    page.clock.install(time=datetime(2026,9,19,4,0,tzinfo=timezone.utc))
    def load():
        page.goto(BASE+'?test=1',wait_until='networkidle')
        page.wait_for_function('window.Piano68 && window.L66')
    def consent(kind):
        page.evaluate('Piano68.'+('askMic' if kind=='mic' else 'askFinish')+'()')
        page.locator('#p68Pin').fill('1234');page.locator('#p68Agree').check()
        page.locator('#p68Consent button').first.click()
    load()
    assert page.locator('.l66-subjects>span').count()==5
    assert page.evaluate('S.learning66.daily.items.map(x=>x.id)')==['pinyin','writing','math','english','piano']
    # Migration preserves current focus completion and scores, removes only sampler items.
    page.evaluate("S.learning66.daily.version=66;S.learning66.daily.items[0].done=true;S.learning66.daily.items.push({id:'science',done:true});R()")
    load()
    assert page.evaluate('S.learning66.daily.items.length')==5
    assert page.evaluate('S.learning66.daily.items[0].done')
    # Longest common syllables must not collide with the ordinal on a 320px phone.
    page.set_viewport_size({'width':320,'height':740})
    page.evaluate("showPage('pinyin');pinyinV63Part('challenge')")
    page.wait_for_selector('#p63Answers button')
    page.evaluate("document.querySelectorAll('#p63Answers button').forEach((b,i)=>b.textContent=['chuāng','shuāng','zhuāng','jiōng'][i])")
    page.wait_for_timeout(30)
    assert page.locator('#p63Answers button').evaluate_all("bs=>bs.every(b=>{const r=document.createRange();r.selectNodeContents(b);const t=r.getBoundingClientRect(),a=b.getBoundingClientRect();return t.left>=a.left&&t.right<=a.right&&b.scrollWidth<=b.clientWidth})")
    page.set_viewport_size({'width':390,'height':844})
    for route in ['mathsync','mathlower','timeextra','englishsync']:
        page.evaluate('(r)=>showPage(r)',route);page.wait_for_timeout(50)
        for group in page.locator('.v42-answer-grid').all():
            buttons=group.locator('.v42-answer')
            for i in range(buttons.count()):
                assert buttons.nth(i).get_attribute('data-option-number')==str(i+1)
                assert not buttons.nth(i).inner_text().startswith('选项')
    page.evaluate('S.learning66.daily.items[0].done=false;L66.startDaily()')
    page.wait_for_timeout(30)
    assert page.locator('.l66-options [data-option-number="1"]').count()==1
    # Time reserved for piano even if unfinished core tasks reach their ten minute cap.
    page.evaluate('S.learning66.daily.coreMs=600000;L66.startDaily()')
    assert page.locator('#p68Clock').inner_text()=='20:00'
    page.evaluate('Piano68.askFinish()');assert page.locator('#p68Consent').count()==0
    page.evaluate('Piano68.start();Piano68.start()');page.clock.run_for(1250)
    ms=page.evaluate('S.piano68.ms');assert 900<=ms<=1500,ms
    page.evaluate('Piano68.pause()');page.clock.run_for(1250)
    assert page.evaluate('S.piano68.ms')==ms
    load();page.evaluate('showPage("piano")')
    assert page.evaluate('S.piano68.ms')==ms
    page.evaluate('Piano68.start()');page.clock.fast_forward(600000)
    assert page.evaluate('S.piano68.ms')<ms+2000,'throttled wall time is not practice'
    page.evaluate('Piano68.start();showPage("home")');page.clock.run_for(1500)
    assert page.evaluate('S.piano68.ms')<ms+2000
    page.evaluate("showPage('piano');Piano68.start();Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    hidden_ms=page.evaluate('S.piano68.ms');page.clock.run_for(1500)
    assert page.evaluate('S.piano68.ms')==hidden_ms
    page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
    page.clock.run_for(1000);assert page.evaluate('S.piano68.ms')==hidden_ms
    # Parent and checkbox needed before any microphone request; denial has safe fallback.
    page.evaluate("showPage('piano');window.micCalls=0;navigator.mediaDevices.getUserMedia=async()=>{micCalls++;throw new DOMException('Denied','NotAllowedError')};void 0")
    page.locator('#p68Mic').click();page.locator('#p68Pin').fill('1234')
    page.locator('#p68Consent button').first.click();assert page.evaluate('micCalls')==0
    page.locator('#p68Agree').check();page.locator('#p68Consent button').first.click()
    page.wait_for_function('micCalls===1');page.wait_for_timeout(100)
    assert '没有获得' in page.locator('#p68Status').inner_text()
    assert page.locator('#p68Start').is_enabled()
    # Pending permission can be canceled; even a late resolution must stop its tracks.
    page.evaluate("navigator.mediaDevices.getUserMedia=()=>new Promise(r=>window.resolveMic=r);window.stops=0")
    consent('mic');page.wait_for_function('!!window.resolveMic')
    page.evaluate("showPage('home');resolveMic({getTracks:()=>[{stop:()=>stops++}]})")
    page.wait_for_function('stops===1')
    # Mock signal exercises full analyser integration and release on rest/navigation.
    page.evaluate("""window.AudioContext=class{
      constructor(){this.state='running';this.sampleRate=48000}resume(){return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}
      createAnalyser(){return{fftSize:4096,getFloatTimeDomainData(a){for(let i=0;i<a.length;i++)a[i]=.25*Math.sin(2*Math.PI*261.625565*i/48000)}}}
      createMediaStreamSource(){return{connect(){},disconnect(){}}}
    };navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{stop:()=>stops++,addEventListener(){}}]});showPage('piano')""")
    consent('mic');page.wait_for_timeout(30);page.clock.run_for(1000)
    assert 'C4' in page.locator('#p68Heard').inner_text()
    assert '很接近' in page.locator('#p68Advice').inner_text()
    page.evaluate('Piano68.target(62)');page.clock.run_for(750)
    assert '目标是 D4' in page.locator('#p68Advice').inner_text()
    before=page.evaluate('stops');page.evaluate("eyeOpen('rest')")
    assert page.evaluate('stops')==before+1
    saved=page.evaluate('S.piano68.ms');page.clock.run_for(1000)
    assert page.evaluate('S.piano68.ms')==saved
    page.evaluate("_eyeMode=null;document.getElementById('eyeLock')?.remove();showPage('piano')")
    # At 19:59 parent still cannot pass; after actual timer tick only PIN can finish.
    page.evaluate('S.piano68.ms=1199000;S.scr.cont=0;S.scr.used=0;Piano68.render();Piano68.askFinish()')
    assert page.locator('#p68Consent').count()==0
    page.evaluate('Piano68.start()');page.clock.run_for(1500)
    assert page.evaluate('S.piano68.ms')==1200000
    assert not page.evaluate('S.piano68.done')
    consent('finish');assert page.evaluate('S.piano68.done')
    assert page.evaluate('S.learning66.daily.items.find(x=>x.id==="piano").done')
    page.evaluate('Piano68.askFinish();Piano68.start()')
    assert page.locator('#p68Consent').count()==0
    assert page.evaluate('S.pts')==0
    assert page.evaluate('Object.keys(S.pianoLog).length')==1
    # Full 1,200 seconds of delivered ticks; this is distinct from jumping wall time.
    page.evaluate("S.piano68.ms=0;S.piano68.done=false;S.scr.contMin=30;S.scr.dayMin=30;S.scr.cont=0;S.scr.used=0;Piano68.render();Piano68.start()")
    page.clock.run_for(1199000)
    assert 1198000<=page.evaluate('S.piano68.ms')<1200000,page.evaluate('({piano:S.piano68,screen:S.scr,eye:_eyeMode,hidden:document.hidden,now:new Date().toString()})')
    assert page.locator('#p68Confirm').is_disabled()
    page.clock.run_for(1500)
    assert page.evaluate('S.piano68.ms')==1200000
    assert page.locator('#p68Confirm').is_enabled()
    for width,height in [(320,740),(375,812),(390,844),(768,1024),(1024,768),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        for route in ['home','piano','daily66']:
            page.evaluate('(r)=>showPage(r)',route)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,route)
        page.evaluate('showPage("piano")')
        assert page.locator('#p68Start').bounding_box()['height']>=48
        assert page.locator('.p68-page>.g1-back').evaluate('e=>e.scrollHeight<=e.clientHeight')
    page.evaluate('S.piano68.ms=0;S.piano68.done=false;S.scr.used=0;S.scr.cont=0;Piano68.render()')
    page.screenshot(path='.visual-v68/piano-desktop.png',full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path='.visual-v68/piano-mobile.png',full_page=True)
    assert not errors,errors
    print('PASS five-item migration, numbering, active timer, suspend/pause/reload, PIN, mic denial/cancel/signal/cleanup, parent-only completion, six viewports')
    browser.close()
