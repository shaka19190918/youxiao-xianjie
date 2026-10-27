"""Inventory every registered page with isolated data; report all failures at once."""
import ast,json,os,sys,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
seed+=";let testState=JSON.parse(localStorage.getItem('grade1_island_state_v1'));testState.scr.on=false;localStorage.setItem('grade1_island_state_v1',JSON.stringify(testState));"
out=ROOT/'.visual-v85';out.mkdir(exist_ok=True)
with sync_playwright() as p:
 launch={'headless':True,'executable_path':os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe')}
 if BASE.startswith('https:'):
  proxy=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{proxy.scheme}://{proxy.hostname}:{proxy.port}'}
 else:launch['args']=['--no-proxy-server']
 browser=p.chromium.launch(**launch);ctx=browser.new_context(service_workers='block');ctx.add_init_script(seed)
 page=ctx.new_page();issues=[];http=[];where={'route':'bootstrap','width':0};rows=[]
 page.on('pageerror',lambda e:issues.append({**where,'error':str(e)}))
 page.on('response',lambda r:http.append({**where,'status':r.status,'url':r.url}) if r.status>=400 else None)
 page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
 routes=page.evaluate('Object.keys(PGS)');print('Registered routes:',len(routes),flush=True)
 for w,h in [(320,568),(390,844),(844,390),(768,1024),(1440,900)]:
  page.set_viewport_size({'width':w,'height':h})
  for route in routes:
   where.update(route=route,width=w)
   try:
    page.evaluate('(r)=>showPage(r)',route);page.wait_for_timeout(220)
    info=page.evaluate("""()=>({route:CP,chars:document.querySelector('#ct').innerText.length,sw:document.documentElement.scrollWidth,iw:innerWidth,broken:[...document.querySelectorAll('#ct img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),overflow:[...document.querySelectorAll('#ct *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.left<innerWidth&&r.right>innerWidth+2&&getComputedStyle(e).position!=='absolute'}).slice(0,5).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,30)}))})""")
    handlers=page.evaluate("""()=>[...document.querySelectorAll('#ct *')].flatMap(e=>[...e.attributes].filter(a=>a.name.startsWith('on')).flatMap(a=>{try{new Function('event',a.value);return []}catch(x){return [{tag:e.tagName,attribute:a.name,handler:a.value,error:x.message}]}}))""")
    if handlers:issues.append({**where,'error':'invalid event handler','handlers':handlers})
    if info['chars']<4 or info['sw']>w+1 or info['broken']:issues.append({**where,'error':'render/layout/image','info':info})
    rows.append({**where,**info})
   except Exception as e:issues.append({**where,'error':str(e)})
  print('Scanned',w,'x',h,flush=True)
 # All live level assets and audio tokens must point to existing local files.
 assets=page.evaluate("__G1_TEST.levels.flatMap(l=>l.tasks.map(t=>({level:l.id,type:t.type,id:t.id,audio:t.audio})))")
 for t in assets:
  a=t.get('audio')
  if not a:continue
  if a.startswith('p63|'):a='assets/pinyin-v63/'+a.split('|')[1]+'.mp3'
  if '://' not in a and not (ROOT/a).is_file():issues.append({'error':'missing level asset',**t})
 report={'base':BASE,'routes':routes,'rows':rows,'issues':issues,'http':http}
 (out/'route-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 browser.close()
 print(json.dumps({'checks':len(rows),'issues':issues,'http':http},ensure_ascii=False,indent=2),flush=True)
 assert not issues and not http,'See .visual-v85/route-audit.json'
