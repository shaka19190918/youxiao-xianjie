"""Actual MP3 decode and offline cached shell/audio, no mocked media playback."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4212/')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'),args=['--no-proxy-server'])
    context=browser.new_context();page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("const NativeAudio=window.Audio;window.Audio=function(src){const a=new NativeAudio(src);window.testAudio=a;return a}")
    page.goto(BASE,wait_until='networkidle');page.wait_for_function('navigator.serviceWorker.controller',timeout=30000)
    page.evaluate("S.scr.used=0;S.scr.cont=0;S._setup.done=true;eyeOpen('rest')")
    page.locator('[data-eye70=music]').click()
    page.wait_for_function('testAudio.readyState>=2&&!testAudio.paused',timeout=20000)
    duration=page.evaluate('testAudio.duration');assert 599<=duration<=601,duration
    page.wait_for_function("async()=>{const c=await caches.open('grade1-island-media-v69');return !!(await c.match(new URL('assets/eye-v70/guided-rest.mp3',location.href).href))}",timeout=20000)
    context.set_offline(True);page.reload(wait_until='load');page.wait_for_function('window.Eye70?.version===70')
    assert page.locator('#eyeLock').is_visible()
    page.locator('[data-eye70=music]').click()
    page.wait_for_function('testAudio.readyState>=2&&!testAudio.paused',timeout=15000)
    assert not errors,errors
    browser.close()
print('PASS actual 600-second MP3 playback, cached offline reload and offline replay')
