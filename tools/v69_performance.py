"""Repeatable mobile performance probe, not a claim about all real devices.
1.6 Mbps down / 150ms latency / 4x CPU slowdown; identical seeded profile.
"""
import json,os,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4202/index.html')
LABEL=os.environ.get('PERF_LABEL','baseline')
CHROME=Path(os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
SEED="""
localStorage.setItem('grade1_island_reset_v1','1');
if(!localStorage.getItem('grade1_island_state_v1'))localStorage.setItem('grade1_island_state_v1',JSON.stringify({schema:'grade1-game-v1',pts:0,strk:0,dog:{type:'trex',xp:0,hu:80,hy:80,en:80,tasks:0},_setup:{done:true,name:'测速伙伴',grade:'一年级'},parentPin:'1234',chars:{},poems:{},vR:{},dailyGoal:{tasks:2,chars:3},scr:{on:true,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activityLog:[]}}));
window.perfWrites=0;const store=Storage.prototype.setItem;Storage.prototype.setItem=function(...a){perfWrites++;return store.apply(this,a)};
window.perfStarts=[];const sourceStart=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){perfStarts.push(performance.now());return sourceStart.apply(this,a)};
document.addEventListener('click',e=>{if(e.target.closest('.p63-card'))window.perfGesture=performance.now()},true);
window.perfLong=[];new PerformanceObserver(l=>perfLong.push(...l.getEntries().map(x=>x.duration))).observe({type:'longtask',buffered:true});
"""
out=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=str(CHROME),args=['--no-proxy-server'])
    for run in range(int(os.environ.get('PERF_RUNS','3'))):
        ctx=browser.new_context(viewport={'width':390,'height':844},service_workers='block')
        ctx.add_init_script(SEED);page=ctx.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        cdp=ctx.new_cdp_session(page);cdp.send('Network.enable')
        cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':150,'downloadThroughput':200000,'uploadThroughput':100000})
        cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
        page.goto(BASE+'?test=1',wait_until='domcontentloaded')
        page.wait_for_function("window.Piano68 && document.querySelector('.l66-plan') && (!window.Fast69 || Fast69.ready)")
        ready=page.evaluate('performance.now()')
        page.wait_for_load_state('networkidle')
        cold=page.evaluate("({requests:performance.getEntriesByType('resource').length,bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0),fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,writes:perfWrites,long:perfLong})")
        cold['readyMs']=ready
        routes={}
        for route in ['home','pinyin','chars','mathsync','englishsync','piano']:
            rows=[]
            for _ in range(7):
                rows.append(page.evaluate("r=>new Promise(resolve=>{const t=performance.now();showPage(r);requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-t)))})",route))
            routes[route]=round(statistics.median(rows),1)
        page.evaluate("showPage('pinyin');pinyinV63Part('tones')")
        page.wait_for_load_state('networkidle')
        audio=[]
        for _ in range(2):
            count=page.evaluate('perfStarts.length');start=page.evaluate('performance.now()')
            page.locator('.p63-card').first.click()
            page.wait_for_function('(n)=>perfStarts.length>n',arg=count)
            audio.append(round(page.evaluate('perfStarts.at(-1)-perfGesture'),1))
        assert not errors,errors
        result={'run':run+1,'cold':cold,'routeMedianMs':routes,'audioColdWarmMs':audio}
        out.append(result);print(json.dumps(result,ensure_ascii=False),flush=True);ctx.close()
    browser.close()
dest=Path('.visual-v69');dest.mkdir(exist_ok=True)
(dest/(LABEL+'.json')).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
