"""Guard regressions: persistence, caps, parent verification, audio failure and layout."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4211/')
CHROME=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=CHROME,args=['--no-proxy-server'])
    context=browser.new_context(service_workers='block');page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install();page.goto(BASE,wait_until='networkidle')
    page.evaluate("S._setup={done:true,name:'测试',grade:'一年级'};S.dog={type:'labrador',name:'小拉',xp:0,hu:80,hy:80,en:80,tasks:0};S.parentPin='5678';S.scr.on=true;S.scr.cont=0;S.scr.used=0;R();showPage('home')")
    page.evaluate("window.plays=[];HTMLMediaElement.prototype.play=function(){plays.push(this.src);return Promise.reject(new Error('test blocked'))};S.scr.cont=1199;R()")
    page.clock.run_for(2000)
    assert page.locator('#eyeLock').is_visible(),(errors,page.evaluate('({scr:S.scr,mode:_eyeMode,guard:Eye70.state()})'))
    assert page.evaluate("Eye70.state().plays")==1
    assert page.evaluate('!!document.getElementById("ct").closest("[inert]")')
    assert '计时继续' in page.locator('.eye70-card').inner_text() or '点“开始' in page.locator('.eye70-card').inner_text()
    until=page.evaluate('Eye70.state().until')
    page.evaluate("showPage('dog')");assert page.evaluate('CP')=='home'
    page.reload(wait_until='networkidle');assert page.locator('#eyeLock').is_visible()
    assert page.evaluate('Eye70.state().until')==until
    assert page.evaluate('Eye70.state().plays')==1
    page.locator('.eye70-parent summary').click();page.locator('#eye70Pin').fill('0000');page.locator('[data-eye70=parent]').click()
    assert page.locator('#eyeLock').is_visible();assert '不正确' in page.locator('#eye70PinStatus').inner_text()
    page.locator('#eye70Pin').fill('5678');page.locator('[data-eye70=parent]').click()
    assert page.evaluate('CP')=='parent';assert page.locator('#eyeLock').is_hidden()
    page.evaluate("showPage('home')");assert page.locator('#eyeLock').is_visible()
    # Reload persistence uses wall-clock deadline, not decrement counters.
    page.clock.run_for(600000)
    assert page.locator('[data-eye70=continue]').is_visible()
    page.locator('[data-eye70=continue]').click();assert page.locator('#eyeLock').is_hidden()
    assert page.evaluate('S.scr.used')<1210
    for expected in [2,3]:
        page.evaluate("S.scr.used=0;eyeOpen('rest')")
        assert page.evaluate('Eye70.state().plays')==expected
        page.clock.run_for(600000);page.locator('[data-eye70=continue]').click()
    assert page.locator('#eyeLock').is_visible();assert '今天先学到这里' in page.locator('#eye70Title').inner_text()
    for width,height in [(320,740),(375,812),(390,844),(768,1024),(844,390),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
        for b in page.locator('#eyeLock button:visible').all():assert b.bounding_box()['height']>=48
    shots=Path('.visual-eye70');shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots/'lock.png'),full_page=True)
    # Separate profile proves daily limit takes precedence at simultaneous thresholds.
    page.add_init_script("localStorage.removeItem('grade1_eye_rest_v70')");page.reload(wait_until='networkidle')
    page.evaluate("S._parentAuth=false;S.scr.on=true;S.scr.cont=1199;S.scr.used=1799;S.scr.dayMin=30;S.scr.extMin=0;R();showPage('home')")
    page.clock.run_for(2000)
    assert page.evaluate('Eye70.state().plays')==0
    assert '今天先学到这里' in page.locator('#eye70Title').inner_text()
    assert not errors,errors
    browser.close()
print('PASS persistent reload, failed audio, 10-minute rest, 3/day cap, daily limit priority, PIN, route blocking, 6 viewport sizes')
