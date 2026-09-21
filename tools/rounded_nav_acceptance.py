"""Five soft navigation buttons, real clicks and responsive hit areas."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4203/index.html')
CHROME=Path(os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=str(CHROME),args=['--no-proxy-server'])
    page=browser.new_page(service_workers='block')
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE,wait_until='networkidle')
    page.evaluate("S._setup={done:true,name:'小岛伙伴',grade:'一年级'};S.dog={type:'trex',xp:0,hu:80,hy:80,en:80,tasks:0};document.getElementById('wizWrap')?.remove();showPage('home')")
    Path('.visual-nav').mkdir(exist_ok=True)
    for width,height in [(320,740),(375,812),(390,844),(700,900),(701,900),(768,1024),(844,390),(1000,800),(1024,768),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate("showPage('home')")
        nav=page.locator('#kidDock' if width<=700 else '#wideNav')
        assert nav.is_visible()
        assert nav.locator('button').count()==5
        for button in nav.locator('button').all():
            box=button.bounding_box()
            assert box['width']>=48 and box['height']>=48,(width,box)
            assert 0<=box['x'] and box['x']+box['width']<=width,(width,box)
            assert button.evaluate('e=>e.scrollWidth<=e.clientWidth'),width
        for route in ['adventure','dog','review','parent','home']:
            nav.locator('[data-route="'+route+'"]').click()
            assert nav.locator('[data-route="'+route+'"].on').count()==1
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,route)
        if width in [390,1440]:page.screenshot(path=f'.visual-nav/nav-{width}.png',full_page=True)
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('#wideNav button').first.evaluate('e=>getComputedStyle(e).transitionDuration')=='0s'
    assert not errors,errors
    browser.close()
    print('PASS five buttons and routes, 10 viewport sizes, 48px targets, no overflow, reduced motion')
