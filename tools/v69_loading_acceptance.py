"""Cache correctness, media ranges, lazy strokes, and hostile-network checks."""
import os,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4202/index.html')
CHROME=Path(os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'assets/strokes-v69/manifest.json').read_text('utf8'))
assert len(manifest['files'])==69
for item in manifest['files']:
    data=(ROOT/'assets/strokes-v69'/item['file']).read_bytes()
    assert hashlib.sha256(data).hexdigest()==item['sha256']
    shape=json.loads(data);assert len(shape['strokes'])==len(shape['medians'])>0
SEED="""
localStorage.setItem('grade1_island_reset_v1','1');
if(!localStorage.getItem('grade1_island_state_v1'))localStorage.setItem('grade1_island_state_v1',JSON.stringify({schema:'grade1-game-v1',pts:0,dog:{type:'trex',xp:0,hu:80,hy:80,en:80,tasks:0},_setup:{done:true,name:'速度测试',grade:'一年级'},parentPin:'1234',chars:{},poems:{},vR:{},dailyGoal:{tasks:2,chars:3},scr:{on:true,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activityLog:[]}}));
"""
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=str(CHROME),args=['--no-proxy-server'])
    ctx=browser.new_context(viewport={'width':390,'height':844});ctx.add_init_script(SEED)
    page=ctx.new_page();errors=[];external=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    ctx.on('request',lambda r:requests.append(r.url))
    page.goto(BASE+'?test=1',wait_until='networkidle')
    page.wait_for_function('window.Fast69?.ready')
    assert page.evaluate('typeof HanziWriter')=='undefined','stroke engine is not a home dependency'
    assert not any('hanzi-writer.min.js' in url for url in requests)
    page.evaluate("navigator.serviceWorker.register('service-worker.js')")
    page.wait_for_function('!!navigator.serviceWorker.controller',timeout=45000)
    keys=page.evaluate("caches.open('grade1-island-v69').then(c=>c.keys()).then(xs=>xs.map(x=>x.url))")
    assert len(keys)==17,len(keys)
    assert not any('.mp3' in k or 'hanzi-writer.min.js' in k for k in keys)
    # Reuse unchanged media from the previous release without a network download.
    page.evaluate("caches.open('grade1-island-v68-1').then(c=>c.put('assets/voice/cache-test.mp3',new Response(new Uint8Array([1,2,3,4,5,6]),{headers:{'Content-Type':'audio/mpeg'}})))")
    result=page.evaluate("fetch('assets/voice/cache-test.mp3',{headers:{Range:'bytes=1-3'}}).then(async r=>({status:r.status,range:r.headers.get('content-range'),bytes:[...new Uint8Array(await r.arrayBuffer())]}))")
    assert result=={'status':206,'range':'bytes 1-3/6','bytes':[2,3,4]},result
    assert page.evaluate("fetch('assets/voice/cache-test.mp3',{headers:{Range:'bytes=99-'}}).then(r=>r.status)")==416
    assert page.evaluate("fetch('assets/voice/cache-test.mp3',{headers:{Range:'bytes=-2'}}).then(r=>r.arrayBuffer()).then(b=>[...new Uint8Array(b)])")==[5,6]
    for route in ['englishsync','reading','poems','timeextra','mathsync','mathlower']:
        page.evaluate('(id)=>showPage(id)',route)
        warm=page.evaluate('Fast69.warmCurrent({force:true})')
        assert warm and all(x['ok'] for x in warm),(route,warm)
    # Actual local character engine and vector data, no CDN.
    before=len(requests)
    page.evaluate("showPage('chars');openTraceV42('一','yī')")
    page.wait_for_function("!!window.HanziWriter && !!document.querySelector('#hwTarget svg path')")
    assert any('assets/strokes-v69/u4e00.json' in u for u in requests[before:])
    assert not any('jsdelivr' in u or 'unpkg' in u for u in requests)
    page.evaluate('clHW();showPage("home")')
    assert page.evaluate('S.pts')==0
    prepared=page.evaluate('Fast69.warmCurrent({force:true})')
    assert prepared and all(x['ok'] for x in prepared),prepared
    # Cached navigation does not wait for a dead internet connection.
    ctx.set_offline(True)
    page.reload(wait_until='networkidle')
    page.wait_for_function('window.Fast69?.ready')
    nav=page.evaluate('performance.getEntriesByType("navigation")[0].responseStart')
    assert nav<1500,nav
    page.evaluate("showPage('chars');openTraceV42('一','yī')")
    page.wait_for_function("!!document.querySelector('#hwTarget svg path')")
    page.evaluate('clHW();L66.startDaily()');page.locator('#l66Listen').click()
    page.wait_for_function("document.querySelector('#l66Listen')?.textContent.includes('听完了')",timeout=15000)
    assert page.evaluate('S.pts')==0
    assert not errors,errors
    print('PASS 69 stroke hashes; 17-resource shell; no home handwriting engine; cached media ranges; prior media reuse; local/offline strokes; cached navigation '+str(round(nav))+'ms; offline teaching audio',flush=True)
    ctx.close()
    # A separate first-time visitor: audio failure cannot block shell installation.
    blocked=browser.new_context();blocked.add_init_script(SEED)
    blocked.route('**/*.mp3',lambda r:r.abort())
    slow=blocked.new_page();slow.goto(BASE,wait_until='networkidle');slow.evaluate("navigator.serviceWorker.register('service-worker.js')")
    slow.wait_for_function('!!navigator.serviceWorker.controller',timeout=45000)
    assert slow.locator('.l66-plan').count()==1
    print('PASS: blocked optional audio does not block usable shell',flush=True)
    blocked.close()
    saving=browser.new_context(service_workers='block');saving.add_init_script(SEED)
    saving.add_init_script("Object.defineProperty(navigator,'connection',{value:{saveData:true,effectiveType:'4g'}})")
    quiet=saving.new_page();quiet.goto(BASE,wait_until='networkidle')
    assert quiet.evaluate('Fast69.warmCurrent()')==[]
    assert not quiet.evaluate("performance.getEntriesByType('resource').some(x=>x.name.includes('/assets/pinyin-v63/'))")
    print('PASS: save-data mode skips speculative teaching-audio downloads',flush=True)
    saving.close();browser.close()
