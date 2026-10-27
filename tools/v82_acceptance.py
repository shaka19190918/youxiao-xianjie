"""Child journey regression. Signal and UI tests are not pronunciation certification."""
import os,json,sys,hashlib,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
OUT=ROOT/'.visual-v82';OUT.mkdir(exist_ok=True)
SEED="""
localStorage.setItem('grade1_island_reset_v1','1');
if(!localStorage.getItem('grade1_island_state_v1'))localStorage.setItem('grade1_island_state_v1',JSON.stringify({schema:'grade1-game-v1',pts:60,strk:0,dog:{type:'labrador',xp:0,hu:50,hy:50,en:80,tasks:0},_setup:{done:true,name:'小豆',grade:'一年级'},parentPin:'5678',chars:{},poems:{},vR:{},dailyGoal:{tasks:3,chars:3},scr:{on:true,contMin:20,restMin:10,dayMin:30,extMin:0,used:0,cont:0,day:''},game:{levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activityLog:[]}}));
"""
def rect(page,selector):return page.locator(selector).first.bounding_box()
def intersect(a,b):return a and b and a['x']<b['x']+b['width'] and a['x']+a['width']>b['x'] and a['y']<b['y']+b['height'] and a['y']+a['height']>b['y']
with sync_playwright() as p:
 launch={'headless':True,'executable_path':os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe')}
 if BASE.startswith('https:'):
  pr=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{pr.scheme}://{pr.hostname}:{pr.port}'}
 else:launch['args']=['--no-proxy-server']
 browser=p.chromium.launch(**launch);ctx=browser.new_context(viewport={'width':390,'height':844},service_workers='block');ctx.add_init_script(SEED)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000);page.wait_for_function('document.documentElement.dataset.release==="v84-pinyin-audit"')
 assert page.title()=='低年级每日学习搭子'
 print('PASS v82 loaded',flush=True)
 for w,h in [(320,568),(375,667),(390,844),(568,320),(667,375),(768,1024),(844,390),(1440,900)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate("showPage('home')")
  page.screenshot(path=str(OUT/f'home-{w}.png'))
  primary=rect(page,'.l66-primary');assert primary['y']+primary['height']<=h,(w,'daily start off screen',primary)
  page.evaluate("g1StartLevel('start-1')")
  for i in range(page.locator('.g1-answer').count()):
   answer=page.locator('.g1-answer').nth(i);answer.scroll_into_view_if_needed();a=answer.bounding_box()
   for sel in ['#eyeBar','#v41Sound']+(['#kidDock'] if w<=700 else []):assert not intersect(a,rect(page,sel)),(w,i,sel,a,rect(page,sel))
   assert page.evaluate('(b)=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}',answer.element_handle()),(w,'covered answer',i)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.evaluate("showPage('dog')")
  for el in page.locator('.v82-pet-actions button').all():
   a=el.bounding_box();assert 0<=a['y'] and a['y']+a['height']<=h,(w,'pet action off screen',a)
   assert not intersect(a,rect(page,'#kidDock')) if w<=700 else True
  assert page.evaluate('document.querySelector("#app>.main").scrollHeight<=document.querySelector("#app>.main").clientHeight+2') if w<=700 else True,(w,'pet requires scrolling')
  page.screenshot(path=str(OUT/f'pet-{w}.png'))
 print('PASS eight layouts: start visible, no covered answers, pet actions same screen',flush=True)
 page.set_viewport_size({'width':390,'height':844});page.evaluate("showPage('dog')")
 before=page.evaluate('({pts:S.pts,xp:S.dog.xp,hu:S.dog.hu,hy:S.dog.hy})')
 page.locator('button[onclick="Pet82.act(\'pet\')"]').click();page.wait_for_timeout(1100)
 assert page.evaluate('S.dog.xp')==before['xp'];assert page.evaluate('S.pts')==before['pts']
 page.locator('button[onclick="Pet82.act(\'feed\')"]').click();page.wait_for_timeout(1100)
 assert page.evaluate('S.pts')==before['pts']-15 and page.evaluate('S.dog.hu')>before['hu']
 page.locator('button[onclick="Pet82.act(\'bath\')"]').click();page.wait_for_timeout(1100)
 assert page.evaluate('S.pts')==before['pts']-23 and page.evaluate('S.dog.hy')>before['hy']
 assert page.evaluate('S.dog.xp')==before['xp'];assert page.evaluate('CP')=='dog'
 print('PASS same-page pet interactions and ledger unchanged by affection',flush=True)
 page.evaluate("showPage('pinyin');pinyinV63Part('table')")
 page.wait_for_selector('.p63-card[data-py="zhi"]')
 for name,kind,parts in [('zhi','whole',1),('gua','three',3),('juan','three',3),('ke','two',2)]:
  page.evaluate("pinyinV63Part('table')");page.locator('.p63-card[data-py="'+name+'"]').click();page.locator('[data-part="blend"]').click();page.locator('button[onclick="pinyinV63Blend()"]').click()
  assert page.locator('.p82-piece').count()==parts,(name,page.locator('#p63BlendSteps').inner_text())
  assert page.evaluate('(n)=>PinyinRules82.analyze(n).kind',name)==kind
 page.evaluate("showPage('pinyin');pinyinV63Part('finals')")
 assert '听 zhōng 中的韵母' in page.locator('.p63-card').filter(has_text='ong').inner_text()
 # Decode every approved source and ensure saved spans fit; no quarter guessing.
 report=page.evaluate("""async()=>{const m=await fetch('assets/pinyin-v63/segments-v83.json').then(r=>r.json());let count=0;for(const [name,row]of Object.entries(m.files)){if(row.spans.length!==4||row.spans.some(([a,b])=>a<0||b<=a||b>row.duration+.01))throw Error(name);count++}for(const n of ['a','o','ke','ying','zhong','eng']){const b=await __PINYIN_V63_TEST.getBuffer(n);await __PINYIN_V63_TEST.approvedSpans(n,b)}return {count,unavailable:Object.keys(m.unavailable)}}""")
 assert report['count']==406;assert report['unavailable']==[]
 print('PASS 406 approved boundary records, six decoded critical sounds, whole/three-part mappings',flush=True)
 # Faults must never become a TTS or a lesson completion.
 page.evaluate("window.ttsCalls=0;window.ttsLog=[];speechSynthesis.speak=u=>{ttsCalls++;ttsLog.push({text:u.text,stack:new Error().stack})};void 0")
 assert page.evaluate("__PINYIN_V63_TEST.play('notrecorded',1).then(()=>false).catch(()=>true)")
 assert page.evaluate('ttsCalls')==0,page.evaluate('ttsLog')
 assert page.evaluate("""async()=>{const original=Fast69.fetchAsset;Fast69.fetchAsset=async()=>new Uint8Array([1,2,3,4]).buffer;try{await __PINYIN_V63_TEST.getBuffer('pie');return false}catch(e){return e.message.includes('版本不匹配')}finally{Fast69.fetchAsset=original}}""")
 # Daily two-step completion: actual local pinyin audio ends before answers count.
 page.evaluate("showPage('home');L66.startDaily()")
 data=page.evaluate("(()=>{const i=L66.plan().items.find(x=>!x.done);return{item:i,t:G1Learning.levels.find(l=>l.id===i.levelId).tasks[i.index],pts:S.pts}})()")
 page.evaluate('(i)=>L66.dailyAnswer(i)',data['t']['options'].index(data['t']['answer']))
 assert page.evaluate('S.pts')==data['pts']
 page.locator('#l66Listen').click();page.wait_for_function('document.querySelector("#l66Listen").textContent.includes("✅")')
 page.evaluate('(i)=>L66.dailyAnswer(i)',data['t']['options'].index(data['t']['answer']));page.wait_for_timeout(800)
 assert not page.evaluate('L66.plan().items[0].done');assert page.evaluate('S.pts')==data['pts'];assert page.evaluate('!!L66.plan().items[0].confirmTask')
 page.reload(wait_until='networkidle');page.evaluate('L66.startDaily()')
 assert '② 变式巩固' in page.locator('body').inner_text()
 task=page.evaluate('L66.plan().items[0].confirmTask');page.locator('#l66Listen').click();page.wait_for_function('document.querySelector("#l66Listen").textContent.includes("✅")')
 page.evaluate('(i)=>L66.dailyAnswer(i)',task['options'].index(task['answer']));page.wait_for_timeout(800)
 assert page.evaluate('L66.plan().items[0].done');assert page.evaluate('S.pts')==data['pts']+3
 print('PASS daily primary + variation, reload persistence, no early/repeated reward',flush=True)
 assert not errors,errors;browser.close()
 print('PASS no page errors')
