"""Decode all packaged local audio; check actual media, not mocked play promises."""
import os,json,subprocess,sys,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
files=[x.replace('\\','/') for x in subprocess.check_output(['rg','--files','assets'],cwd=ROOT,text=True).splitlines() if Path(x).suffix.lower() in ['.mp3','.wav','.ogg','.m4a']]
with sync_playwright() as p:
 launch={'headless':True,'executable_path':os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe')}
 if BASE.startswith('https:'):
  proxy=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{proxy.scheme}://{proxy.hostname}:{proxy.port}'}
 else:launch['args']=['--no-proxy-server']
 browser=p.chromium.launch(**launch);page=browser.new_page(service_workers='block');page.goto(BASE,wait_until='networkidle',timeout=60000)
 result=page.evaluate("""async files=>{const c=new AudioContext(),queue=files.slice(),bad=[];let count=0;await Promise.all([0,1,2,3].map(async()=>{while(queue.length){const f=queue.shift();try{const r=await fetch(f);if(!r.ok)throw Error('HTTP '+r.status);const b=await c.decodeAudioData(await r.arrayBuffer());if(!Number.isFinite(b.duration)||b.duration<.05)throw Error('empty recording');count++}catch(e){bad.push({file:f,error:e.message})}}}));await c.close();return {count,bad}}""",files)
 print(json.dumps(result,ensure_ascii=False),flush=True);assert result['count']==len(files) and not result['bad'];browser.close()
