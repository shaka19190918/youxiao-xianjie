"""Native Web Audio coverage, UI races, lesson coverage, and v83 compatibility.
Offline rendering verifies 1624 segment requests, not pronunciation semantics.
"""
import ast,json,os,subprocess,sys,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
seed+=";const testState=JSON.parse(localStorage.getItem('grade1_island_state_v1'));testState.scr.on=false;localStorage.setItem('grade1_island_state_v1',JSON.stringify(testState));"
with sync_playwright() as p:
 launch={'headless':True,'executable_path':os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe')}
 if BASE.startswith('https:'):
  proxy=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{proxy.scheme}://{proxy.hostname}:{proxy.port}'}
 else:launch['args']=['--no-proxy-server']
 browser=p.chromium.launch(**launch)
 old=browser.new_context(service_workers='block');old.add_init_script(seed)
 old.route('**/game-v59.js*',lambda route:route.fulfill(status=200,content_type='application/javascript',body=subprocess.check_output(['git','show','3c55e87:game-v59.js'],cwd=ROOT).decode('utf8')))
 legacy=old.new_page();legacy.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
 baseline=legacy.evaluate('__G1_TEST.levels');old.close()
 ctx=browser.new_context(viewport={'width':390,'height':844},service_workers='block');ctx.add_init_script(seed)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
 assert page.locator('meta[name="app-version"]').get_attribute('content')=='v84-pinyin-audit'
 current=page.evaluate('__G1_TEST.levels');byid={l['id']:l for l in current}
 assert all(byid[l['id']]==l for l in baseline),'historical task or reward identity changed'
 assert len(current)==len(baseline)+2 and all(len(l['tasks'])==3 for l in current)
 answers={t['answer'] for l in current if l['id'].startswith('zh-final-') for t in l['tasks']}
 assert {'ui','iu','ie','üe'}<=answers
 page.evaluate("S.game.levels['zh-final-12']={stars:3,tasks:[true,true,true]};S.game.levels['start-1']={stars:3,tasks:[true,true,true]}")
 page.evaluate("g1StartLevel('zh-char-1')");assert page.evaluate('CP')=='level','old writing path relocked'
 print('PASS v83 historical levels unchanged; missing four finals covered; old progress remains accessible',flush=True)
 page.evaluate("window.starts=[];window.ttsCalls=0;speechSynthesis.speak=()=>ttsCalls++;const nativeStart=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){starts.push(args);return nativeStart.apply(this,args)};showPage('pinyin');pinyinV63Part('table')")
 page.wait_for_function('document.querySelectorAll("#p63Syllables .p63-card").length===406')
 assert page.evaluate("P63_NAMES.every(n=>[1,2,3,4].every(t=>PinyinRules82.normalize(__PINYIN_V63_TEST.toneMark(n,t))===n))")
 assert page.evaluate("['a','o','e','i','u','ü'].map(n=>[1,2,3,4].map(t=>__PINYIN_V63_TEST.toneMark(n,t)).join(''))")==['āáǎà','ōóǒò','ēéěè','īíǐì','ūúǔù','ǖǘǚǜ']
 for query,name in [('nǚ','nv'),('nǐ','ni'),(' LÜÈ ','lve'),('niu','niu'),('yang','yang')]:
  page.locator('#p63Search').fill(query);assert page.locator(f'[data-py="{name}"]').count()==1,(query,name)
 page.locator('#p63Search').fill('')
 # Each actual source is hash-verified and decoded through the production loader.
 report=page.evaluate("""async()=>{const api=__PINYIN_V63_TEST,m=await api.getManifest(),queue=m.files.slice();let sources=0,tones=0;await Promise.all([0,1,2,3].map(async()=>{while(queue.length){const f=queue.shift(),n=f.file.slice(0,-4),b=await api.getBuffer(n),spans=await api.approvedSpans(n,b);for(const [a,z]of spans){const c=new OfflineAudioContext(1,Math.ceil((z-a)*b.sampleRate),b.sampleRate),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0,a,z-a);const out=(await c.startRendering()).getChannelData(0);let energy=0;for(const x of out)energy+=x*x;if(energy/out.length<.000001)throw Error(n+' empty segment');tones++}sources++}}));return {sources,tones}}""")
 assert report=={'sources':406,'tones':1624};print('PASS 406 SHA/native decodes and 1624 native OfflineAudioContext four-tone renders',flush=True)
 for oldid,label,name,t in [('o4','ò','o',4),('a2','á','a',2),('ke1','k','ke',1),('ing1','ing','ying',1)]:
  assert page.evaluate('async x=>{const api=__PINYIN_V63_TEST,b=await api.getBuffer(x.name),s=(await api.approvedSpans(x.name,b))[x.t-1],ok=await playPinyinV42(x.oldid,x.label),call=starts.at(-1);return ok&&Math.abs(call[1]-s[0])<1e-6&&Math.abs(call[2]-(s[1]-s[0]))<1e-6}',{'oldid':oldid,'label':label,'name':name,'t':t})
 print('PASS four legacy point-read entry points use identical verified recordings',flush=True)
 # Real-time production playback, not a mocked onended completion.
 groups=[('initials','__PINYIN_V63_TEST.INITIALS.map(x=>[x[1],1])'),('finals','__PINYIN_V63_TEST.FINALS.map(x=>[x[1],1])'),('whole','__PINYIN_V63_TEST.WHOLE.map(n=>[n,1])'),('tones',"['a','o','e','yi','wu','yu'].flatMap(n=>[1,2,3,4].map(t=>[n,t]))"),('regression',"['niu','yang'].flatMap(n=>[1,2,3,4].map(t=>[n,t]))")]
 if '--interaction-only' in sys.argv:groups=[]
 for group,expression in groups:
  count=page.evaluate("""async cases=>{const a=__PINYIN_V63_TEST;for(const [n,t]of cases){const b=await a.getBuffer(n),span=(await a.approvedSpans(n,b))[t-1],before=starts.length;if(!await a.play(n,t))throw Error(n+' did not complete');const call=starts.at(-1);if(starts.length!==before+1||Math.abs(call[1]-span[0])>1e-6||Math.abs(call[2]-(span[1]-span[0]))>1e-6)throw Error(n+' wrong tone mapping')}return cases.length}""",page.evaluate(expression))
  print('PASS real-time production playback:',group,count,flush=True)
 assert page.evaluate('ttsCalls')==0
 # Switching a visible tone cancels the old sound, then next play uses new tone.
 page.evaluate("pinyinV63Part('table');window.cancelled=pinyinV63Play('a',1);void 0")
 page.wait_for_function('document.querySelector("#p63Status")?.textContent.includes("正在准备")||!!document.querySelector("#p63Syllables")')
 page.evaluate('pinyinV63Tone(4)');assert page.evaluate('cancelled') is False
 assert page.evaluate("__PINYIN_V63_TEST.play('a',9).then(()=>false).catch(()=>true)")
 # Interrupting the first model cannot enable answers or create a wrong attempt.
 page.evaluate("pinyinV63Part('challenge')")
 page.wait_for_selector('#p63Answers button');page.evaluate('pinyinV63Stop()')
 assert page.evaluate('pinyinV66Question()') is None
 assert page.locator('#p63Answers button:disabled').count()==4
 page.locator('.p63-challenge .p63-blend').click()
 page.wait_for_function('document.querySelectorAll("#p63Answers button:not(:disabled)").length===4')
 q=page.evaluate('pinyinV66Question()');button=page.locator('#p63Answers button[onclick="pinyinV63Answer(\''+q['rawAnswer']+'\',this)"]')
 assert q['task']['answer'] in button.inner_text()
 button.click();assert page.evaluate('pinyinV66Question()') is None
 page.evaluate("pinyinV63Part('tones')");page.wait_for_timeout(1000)
 assert page.locator('#p63Answers').count()==0 and page.locator('.p63-card').count()==24
 # Faults keep teaching silent and answers locked; retry must recover.
 page.evaluate("__PINYIN_V63_TEST.clearDecodedCache();window.fetchOriginal=Fast69.fetchAsset;Fast69.fetchAsset=async()=>{throw Error('network test')};pinyinV63Part('challenge')")
 page.wait_for_selector('#p63Answers button');page.wait_for_timeout(150)
 assert page.locator('#p63Answers button:disabled').count()==4
 page.evaluate('Fast69.fetchAsset=fetchOriginal;void 0');page.locator('.p63-challenge .p63-blend').click()
 page.wait_for_function('document.querySelectorAll("#p63Answers button:not(:disabled)").length===4')
 assert page.evaluate('ttsCalls')==0 and not errors,errors
 print('PASS tone cancellation, accented search, interrupted/failed playback gates, retry, no delayed page corruption, no TTS',flush=True)
 browser.close()
