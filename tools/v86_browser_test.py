"""Desktop Chromium/WebKit, real audio taps and local recording recovery.
Not iPad/iPhone/Android hardware certification or professional listening.
"""
import ast,os,sys,json,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='SEED' for t in n.targets))
seed+=";let v=JSON.parse(localStorage.getItem('grade1_island_state_v1'));v.scr.on=false;localStorage.setItem('grade1_island_state_v1',JSON.stringify(v));"
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  launch={'headless':True}
  if engine=='chromium':launch['executable_path']=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe')
  if BASE.startswith('https:'):
   proxy=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{proxy.scheme}://{proxy.hostname}:{proxy.port}'}
  elif engine=='chromium':launch['args']=['--no-proxy-server']
  browser=getattr(p,engine).launch(**launch);ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block');ctx.add_init_script(seed)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
  assert page.locator('.a86-world').is_visible() and page.locator('.a86-path>span').count()==5
  assert page.evaluate('S.pts')==60 and page.evaluate('S.dog.xp')==0
  page.evaluate("showPage('pinyin')");assert page.locator('.p63-card').count()==23
  assert '21' in page.locator('#p63Body h2').inner_text()
  if page.evaluate('!!(window.AudioContext||window.webkitAudioContext)'):
   page.locator('.p63-card').first.click();page.wait_for_function('document.querySelector("#p63Status").textContent.includes("再听一遍")',timeout=12000)
   assert '完整音节' in page.locator('#p86Model').inner_text()
   page.evaluate("void(window.interrupted=pinyinV63PlayToken('p63|a|1'))");page.wait_for_timeout(100)
   page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
   assert page.evaluate('interrupted') is False
   page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
   page.locator('.p63-card').first.click();page.wait_for_function('document.querySelector("#p63Status").textContent.includes("再听一遍")')
   page.evaluate('pinyinV86ResetAudio()');page.locator('.p63-card').first.click();page.wait_for_function('document.querySelector("#p63Status").textContent.includes("再听一遍")')
   print('PASS',engine,'first real tap, background interruption, tap-to-resume and explicit audio reset',flush=True)
  else:
   page.locator('.p63-card').first.click();assert 'Web Audio' in page.locator('#p63Status').inner_text();page.evaluate('pinyinV86ResetAudio()')
   print(engine,'NOT VERIFIED: desktop build lacks Web Audio; unsupported UI tested, not Safari hardware',flush=True)
  page.evaluate("S._parentAuth=true;showPage('pinyinReview86')")
  page.wait_for_selector('#p86Rows select');page.locator('#p86Rows select').first.select_option('pass')
  assert page.locator('#p86Rows select').first.input_value()=='pending'
  catalog=page.evaluate("fetch('assets/pinyin-v86/review-catalog.json').then(r=>r.json())")
  assert len(catalog['items'])==87 and len(catalog['recordings'])==406
  assert not catalog['professionalListeningComplete'] and all(r['phoneticReview']=='pending' for r in catalog['recordings'])
  # A real packaged MP3 tests preview/storage/download, not a child's microphone.
  page.evaluate("showPage('follow79')")
  page.evaluate("async()=>{const r=await fetch('assets/pinyin-v63/a.mp3');await MediaTake86.remember(new Blob([await r.arrayBuffer()],{type:'audio/mpeg'}),'audio-fixture.mp3')}")
  assert page.locator('#take86 audio').count()==1
  if engine=='chromium':
   page.evaluate("window.preview86=document.querySelector('#take86 audio');preview86.play()")
   page.evaluate("showPage('home')");assert page.evaluate('preview86.paused')
   page.evaluate("showPage('follow79')")
  with page.expect_download() as download:page.locator('#take86').get_by_role('button',name='保存音频',exact=True).click()
  assert download.value.suggested_filename=='audio-fixture.mp3'
  page.reload(wait_until='networkidle');page.wait_for_function('MediaTake86.has()');page.evaluate("showPage('follow79')");page.wait_for_selector('#take86 audio')
  assert page.evaluate('document.querySelector("#take86 audio").src.startsWith("blob:")')
  # Sharing is explicitly simulated: no OS share sheet or real device claim.
  page.evaluate("window.shareCount=0;navigator.canShare=()=>true;navigator.share=async()=>{shareCount++;throw new DOMException('cancel','AbortError')};void 0")
  page.locator('#take86').get_by_role('button',name='分享 / 存储到文件',exact=True).click();page.wait_for_function('shareCount===1')
  assert page.evaluate('MediaTake86.has()')
  page.evaluate('MediaTake86.clear()');page.reload(wait_until='networkidle');page.wait_for_timeout(200);assert not page.evaluate('MediaTake86.has()')
  assert not errors,errors
  print('PASS',engine,'pending audit protection, real blob download, IndexedDB reload/recovery/delete, simulated share cancel',flush=True)
  browser.close()
