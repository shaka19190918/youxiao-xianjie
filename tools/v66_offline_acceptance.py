"""Service-worker shell upgrade, real cached pinyin playback, and local writing."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4197/index.html')
CHROME=Path(os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=str(CHROME) if CHROME.exists() else None,args=['--no-proxy-server'])
    ctx=b.new_context(viewport={'width':390,'height':844})
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    ctx.on('requestfailed',lambda r:print('REQUEST FAILED:',r.url,r.failure,flush=True))
    ctx.on('response',lambda r:print('HTTP ERROR:',r.status,r.url,flush=True) if r.status>=400 else None)
    page.goto(BASE,wait_until='networkidle')
    page.evaluate("S._setup={done:true,name:'离线测试',grade:'一年级'};S.dog={type:'trex',xp:0,hu:80,hy:80,en:80,tasks:0};R()")
    registration=page.evaluate("navigator.serviceWorker.register('service-worker.js').then(r=>({installing:r.installing?.state,active:r.active?.state})).catch(e=>({error:e.message}))")
    assert 'error' not in registration,registration
    page.evaluate("Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Service-worker install timed out after 30s')),30000))])")
    page.wait_for_function("navigator.serviceWorker.controller!==null")
    assert page.evaluate("caches.keys().then(x=>x.includes('grade1-island-v68-1'))")
    assert page.evaluate("caches.open('grade1-island-v68-1').then(c=>c.match('./learning-v66.js?v=68')).then(Boolean)")
    # Old, unversioned cached scripts cannot mix with the new HTML release.
    page.evaluate("caches.open('grade1-island-v68-1').then(c=>Promise.all(['game-v59.js','learning-v66.js'].map(p=>c.put(p,new Response('throw new Error(\"stale cache loaded\")',{headers:{'Content-Type':'application/javascript'}})))))")
    page.reload(wait_until='networkidle')
    ctx.set_offline(True)
    page.reload(wait_until='networkidle')
    assert page.evaluate("S._setup.name")=='离线测试'
    assert page.locator('.l66-plan').count()==1
    page.locator('.l66-plan .l66-primary').click()
    page.locator('#l66Listen').click()
    page.wait_for_function("document.getElementById('l66Listen')?.textContent.includes('听完了')",timeout=15000)
    page.evaluate("L66.write('āgyp')")
    assert page.locator('#l66Pen').count()==1
    page.evaluate("L66.closeWriting();showPage('mathsync');v44MathQ=V44_MATH[0];renderMath44()")
    assert page.locator('.question-art [data-one]').count()==4
    page.evaluate("showPage('piano');Piano68.start()")
    assert page.locator('#p68Clock').count()==1
    assert page.evaluate('typeof PianoPitch68.detect')=='function'
    page.wait_for_timeout(1100)
    assert page.evaluate('S.piano68.ms')>0
    page.evaluate('Piano68.pause()')
    assert not errors,errors
    print('PASS: v68 service-worker cache, offline reload, profile, cached pinyin playback, writing, piano timer and local pitch module')
    b.close()
