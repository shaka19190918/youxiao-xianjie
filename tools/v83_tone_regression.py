"""Regression: source unchanged, noise excluded, eight real UI tone plays,
406-source decode coverage, and tone contour checks (not phonetic certification).
"""
import ast,json,hashlib,os,sys,subprocess,urllib.parse
from pathlib import Path
import numpy as np
from playwright.sync_api import sync_playwright
from analyze_pinyin_v83 import pcm,frames
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
reviews=json.loads((ROOT/'assets/pinyin-v63/reviewed-boundaries-v83.json').read_text('utf8'))
boundaries=json.loads((ROOT/'assets/pinyin-v63/segments-v83.json').read_text('utf8'))
assert len(boundaries['files'])==406 and not boundaries['unavailable']
for name,review in reviews['files'].items():
 path=f'assets/pinyin-v63/{name}.mp3';data=(ROOT/path).read_bytes()
 old=subprocess.check_output(['git','show','711cd8c:'+path],cwd=ROOT)
 assert data==old,name+' source recording changed'
 assert hashlib.sha256(data).hexdigest()==review['sha256']
 rows=frames(pcm(name));voiced=[]
 for a,b in review['excludedNoise']:
  assert sum(bool(r['hz']) for r in rows if a<=r['t']<=b)==0
 for a,b in review['spans']:
  pitch=[r['hz'] for r in rows if a<=r['t']<=b and r['hz']]
  assert len(pitch)>=20,(name,a,b,len(pitch))
  voiced.append([float(np.median(x)) for x in np.array_split(pitch,4)])
 assert max(voiced[0])-min(voiced[0])<35,(name,'level tone',voiced)
 assert voiced[1][-1]-voiced[1][0]>60,(name,'rising tone',voiced)
 assert min(voiced[2][1:3])+25<min(voiced[2][0],voiced[2][-1]),(name,'dipping tone',voiced)
 assert voiced[3][0]-voiced[3][-1]>70,(name,'falling tone',voiced)
 print('PASS original source + noise exclusion + four distinct tone contours:',name,flush=True)
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
with sync_playwright() as p:
 launch={'headless':True,'executable_path':os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe')}
 if BASE.startswith('https:'):
  pr=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{pr.scheme}://{pr.hostname}:{pr.port}'}
 else:launch['args']=['--no-proxy-server']
 browser=p.chromium.launch(**launch);ctx=browser.new_context(viewport={'width':390,'height':844},service_workers='block');ctx.add_init_script(seed)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
 assert page.locator('meta[name="app-version"]').get_attribute('content')=='v83-pinyin-tones'
 page.evaluate("window.sourcePlays=[];window.ttsCalls=0;const oldStart=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){sourcePlays.push(args);return oldStart.apply(this,args)};speechSynthesis.speak=()=>ttsCalls++;showPage('pinyin');pinyinV63Part('table')")
 page.wait_for_selector('.p63-card[data-py="niu"]')
 assert page.locator('#p63Syllables .p63-card').count()==406
 for name in ['niu','yang']:
  for tone in range(1,5):
   page.locator('.p63-tone').nth(tone-1).click()
   before=page.evaluate('sourcePlays.length');page.locator('.p63-card[data-py="'+name+'"]').click()
   page.wait_for_function('(n)=>sourcePlays.length===n+1',arg=before)
   actual=page.evaluate('sourcePlays.at(-1)');a,b=reviews['files'][name]['spans'][tone-1]
   assert abs(actual[1]-a)<.0001 and abs(actual[2]-(b-a))<.0001,(name,tone,actual)
   page.wait_for_function('!document.querySelector(".p63-card.playing")')
   assert '再听一遍' in page.locator('#p63Status').inner_text()
 print('PASS eight real tone-button plays with exact reviewed boundaries; both table entries restored',flush=True)
 assert page.evaluate('ttsCalls')==0
 # Every recording remains usable, not just the two fixed words.
 report=page.evaluate("""async()=>{const m=await __PINYIN_V63_TEST.getManifest();let count=0;for(const f of m.files){const n=f.file.replace('.mp3',''),b=await __PINYIN_V63_TEST.getBuffer(n);await __PINYIN_V63_TEST.approvedSpans(n,b);count++}return count}""")
 assert report==406;assert not errors,errors
 browser.close();print('PASS all 406 original recordings: SHA256, native decode, four-span playback eligibility, no TTS')
