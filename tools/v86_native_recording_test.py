"""Native encoders with a generated tone, NOT microphone hardware validation."""
import ast,json,os,sys,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8');ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
t=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'));seed=next(ast.literal_eval(n.value) for n in t.body if isinstance(n,ast.Assign)and any(isinstance(a,ast.Name)and a.id=='SEED'for a in n.targets))
with sync_playwright() as p:
 for name in ['chromium','webkit']:
  launch={'headless':True}
  if name=='chromium':launch.update(executable_path=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'),args=['--no-proxy-server'])
  if BASE.startswith('https:'):
   launch.pop('args',None);pr=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{pr.scheme}://{pr.hostname}:{pr.port}'}
  b=getattr(p,name).launch(**launch);ctx=b.new_context(service_workers='block');ctx.add_init_script(seed);page=ctx.new_page();page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
  types=page.evaluate("['audio/mp4','audio/webm;codecs=opus','audio/ogg;codecs=opus'].filter(t=>window.MediaRecorder?.isTypeSupported?.(t))")
  if not types or not page.evaluate('!!(window.AudioContext||window.webkitAudioContext)'):print(name,'NOT VERIFIED: native recording codecs or Web Audio unavailable in this desktop engine');b.close();continue
  page.evaluate("""()=>{const C=window.AudioContext||window.webkitAudioContext;window.toneContext=new C();const out=toneContext.createMediaStreamDestination(),osc=toneContext.createOscillator();osc.frequency.value=440;osc.connect(out);osc.start();navigator.mediaDevices.getUserMedia=async()=>{await toneContext.resume();return out.stream};showPage('follow79')}""")
  page.evaluate('Follow79.pick(G1Follow.MELODIES[0].id)');page.locator('#f79Rec').click();page.wait_for_function("document.querySelector('#f79Rec').textContent.includes('停止录音')")
  page.wait_for_timeout(1300)
  with page.expect_download() as download:page.locator('#f79Rec').click()
  page.wait_for_selector('#take86 audio')
  result=page.evaluate("""async()=>{const r=await fetch(document.querySelector('#take86 audio').src),data=await r.arrayBuffer(),buffer=await toneContext.decodeAudioData(data.slice(0));return {type:r.headers.get('content-type'),bytes:data.byteLength,duration:buffer.duration}}""")
  assert result['bytes']>100 and .3<result['duration']<10,result
  assert download.value.suggested_filename.endswith('.m4a' if 'mp4' in result['type'] else '.webm' if 'webm' in result['type'] else '.ogg')
  print('PASS native',name,json.dumps(result),'download',download.value.suggested_filename,flush=True)
  page.evaluate('toneContext.close()');b.close()
