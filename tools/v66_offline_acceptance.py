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
    page.goto(BASE,wait_until='networkidle')
    page.evaluate("S._setup={done:true,name:'离线测试',grade:'一年级'};S.dog={type:'trex',xp:0,hu:80,hy:80,en:80,tasks:0};R()")
    page.evaluate('navigator.serviceWorker.ready')
    page.wait_for_function("navigator.serviceWorker.controller!==null")
    assert page.evaluate("caches.keys().then(x=>x.includes('grade1-island-v66'))")
    assert page.evaluate("caches.open('grade1-island-v66').then(c=>c.match('./learning-v66.js')).then(Boolean)")
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
    assert not errors,errors
    print('PASS: v66 service-worker cache, offline reload, preserved profile, actual cached pinyin playback and writing')
    b.close()
