"""Six-module media and hit-testing audit. No real microphone or expert listening."""
import ast,json,os,sys,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
seed+=";const s=JSON.parse(localStorage.getItem('grade1_island_state_v1'));s.scr.on=false;localStorage.setItem('grade1_island_state_v1',JSON.stringify(s));speechSynthesis.speak=()=>{};"
with sync_playwright() as p:
 launch=dict(headless=True,executable_path=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'),args=['--autoplay-policy=no-user-gesture-required'])
 if BASE.startswith('https:'):
  proxy=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{proxy.scheme}://{proxy.hostname}:{proxy.port}'}
 else:launch['args'].append('--no-proxy-server')
 browser=p.chromium.launch(**launch);results=[]
 def case(name,fn):
  ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block');ctx.add_init_script(seed)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
  page.evaluate("window.plays89=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...a){plays89.push(this);return play.apply(this,a)};void 0")
  try:fn(page);assert not errors,errors;results.append((name,True));print('PASS',name,flush=True)
  except Exception as e:results.append((name,False));print('FAIL',name,str(e)[:1200],errors,flush=True)
  finally:ctx.close()
 def html_focus(page):
  page.evaluate("showPage('englishsync');playEnglish44(0,0)")
  page.wait_for_function('plays89.length&&plays89.at(-1).currentTime>0')
  page.evaluate("window.first89=plays89.at(-1);window.other89=new Audio('assets/voice/pet_hello.mp3');void other89.play().catch(()=>{})")
  assert page.evaluate('first89.paused'),'two HTML voices overlap'
 def tts_focus(page):
  page.evaluate("showPage('poems');playPoemV6(0)");page.wait_for_function('plays89.length&&plays89.at(-1).currentTime>0')
  page.evaluate("window.first89=plays89.at(-1);v47PlayOption('选项一')")
  assert page.evaluate('first89.paused'),'option speech overlaps poem'
 def repeat_player(page):
  assert page.evaluate("async()=>{const a=new Audio('assets/voice/pet_hello.mp3');const first=a.play().catch(()=>false),second=a.play().then(()=>true);await first;return await second&&!a.paused}")
 def referenced_audio(page):
  report=page.evaluate("""async()=>{await PET_VOICE_READY;const paths=[...POEM_COURSE_V6.flatMap(p=>['assets/voice/'+p.key+'_info.mp3',...p.lns.map((_,i)=>'assets/voice/'+p.key+'_l'+(i+1)+(p.key==='poem_yong_e'&&i===0?'.wav':'.mp3'))]),...V42_CHARS.map(x=>v42CharPath(x[0])),...Object.values(ENGLISH_V6).flat().flatMap(w=>['assets/english/'+w[1]+'.mp3','assets/english-cn/'+w[1]+'.mp3']),...V44_ENGLISH.flatMap((u,n)=>u.items.flatMap((_,i)=>[english44Path(n,i,false),english44Path(n,i,true)])),...Object.values(PET_VOICE).map(n=>'assets/voice/'+n+'.mp3')];const queue=[...new Set(paths)],count=queue.length,bad=[];await Promise.all([0,1,2].map(async()=>{while(queue.length){const path=queue.shift();try{const r=await fetch(path,{method:'HEAD'});if(!r.ok||!/(audio|octet-stream)/.test(r.headers.get('content-type')||''))bad.push({path,status:r.status})}catch(e){bad.push({path,error:e.message})}}}));return {count,bad}}""")
  print('Referenced teaching/pet audio:',report['count'],flush=True);assert not report['bad'],report['bad']
 def poem_error(page):
  page.evaluate("showPage('poems');playPoemV6(0);window.bad89=_poemCtl.audio.onerror;window.count89=plays89.length;bad89()")
  assert page.evaluate('plays89.length===count89&&!_poemCtl.playing'),'title failure skipped into body'
 def poem_stale(page):
  page.evaluate("showPage('poems');playPoemV6(0);window.bad89=_poemCtl.audio.onerror;showPage('home');window.count89=plays89.length;bad89()")
  assert page.evaluate('plays89.length===count89'),'departed poem callback started another line'
 def poem_background(page):
  page.evaluate("showPage('poems');playPoemV6(0);Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
  assert page.evaluate('!_poemCtl.playing&&!document.querySelector(".info-playing,.on-line")'),'poem state/highlight still running in background'
 def char_stale(page):
  page.evaluate("showPage('chars');playCharV42(0,true);window.charDone89=v42CharAudio?.onended;showPage('math');charDone89?.()")
  page.wait_for_timeout(100)
  assert page.locator('#hwM').is_hidden(),'old character opened writing over math'
 def pet_late(page):
  page.evaluate("showPage('dog');window.count89=plays89.length;speakPet('谢谢你，小主人！');Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
  page.wait_for_timeout(150)
  assert page.evaluate('plays89.length===count89'),'old pet reply played after returning'
 def piano_mute(page):
  page.evaluate("window.oscs89=0;const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(...a){oscs89++;return start.apply(this,a)};for(const l of G1Learning.levels)S.game.levels[l.id]={stars:3,tasks:[true,true,true]};const l=G1Learning.levels.find(l=>l.tasks[0].type==='piano');S.game.levels[l.id]={stars:0,tasks:[false,false,false]};g1StartLevel(l.id);S.audio.muted=true;g1PianoTap(0)")
  page.wait_for_timeout(100);assert page.evaluate('oscs89===0'),'piano sounded while muted'
 def piano_exit(page):
  page.evaluate("for(const l of G1Learning.levels)S.game.levels[l.id]={stars:3,tasks:[true,true,true]};const l=G1Learning.levels.find(l=>l.tasks[0].type==='piano');S.game.levels[l.id]={stars:0,tasks:[false,false,false]};g1StartLevel(l.id);for(const n of l.tasks[0].seq)g1PianoTap(n);showPage('home')")
  page.wait_for_timeout(850);assert page.locator('.g1-shell').count()==1,'piano completion rendered over home'
 def poem_complete(page):
  page.evaluate("showPage('poems');window.start89=plays89.length;playPoemV6(0)")
  page.wait_for_function("!_poemCtl.playing&&S.poems[POEM_COURSE_V6[0].ti]",timeout=60000)
  urls=page.evaluate("plays89.slice(start89).map(a=>new URL(a.src).pathname.split('/').at(-1))")
  expected=page.evaluate("[POEM_COURSE_V6[0].key+'_info.mp3',...POEM_COURSE_V6[0].lns.map((_,i)=>POEM_COURSE_V6[0].key+'_l'+(i+1)+(POEM_COURSE_V6[0].key==='poem_yong_e'&&i===0?'.wav':'.mp3'))]")
  assert urls==expected,(urls,expected)
  assert page.evaluate('S.pts===60'),'free recitation must not mint game diamonds'
 def char_complete(page):
  page.evaluate("showPage('chars');playCharV42(0,true)")
  page.wait_for_function("document.getElementById('hwM').style.display==='flex'&&!!window.HanziWriter",timeout=20000)
  assert page.evaluate("document.getElementById('hwTi').textContent.includes(V42_CHARS[0][0])")
 def char_muted(page):
  page.evaluate("showPage('chars');S.audio.muted=true;window.start89=plays89.length;playCharV42(0,true)")
  page.wait_for_function("document.getElementById('hwM').style.display==='flex'")
  assert page.evaluate('plays89.length===start89'),'muted visual writing played audio'
 def pet_actions(page):
  page.evaluate("showPage('dog');window.start89=plays89.length")
  for kind in ['feed','bath','pet']:
   page.locator('button[onclick="Pet82.act(\''+kind+'\')"]').tap()
   page.wait_for_function('plays89.length>start89&&plays89.at(-1).currentTime>0')
   assert page.evaluate("document.getElementById('pet82Status').textContent===document.getElementById('dogBub').textContent"),'pet caption differs from chosen reply'
   assert page.evaluate("plays89.at(-1).src.endsWith((PET_VOICE[document.getElementById('pet82Status').textContent]||'pet_hello')+'.mp3')")
   page.evaluate('window.start89=plays89.length');page.wait_for_timeout(1050)
  assert page.evaluate('S.pts===37&&S.dog.xp===0'),'care cost/XP regression'
 def english_translation(page):
  page.evaluate("showPage('englishsync');window.start89=plays89.length;playEnglish44(0,0)")
  page.wait_for_function('plays89.at(-1).currentTime>0')
  assert page.evaluate("plays89.slice(start89).every(a=>a.src.includes('/english-v44/'))")
  page.evaluate('translateEnglish44(0,0)');page.wait_for_function("plays89.at(-1).src.includes('/english-v44-cn/')&&plays89.at(-1).currentTime>0")
  assert page.evaluate('plays89.at(-2).paused')
 def option_no_answer(page):
  page.evaluate("showPage('mathsync');window.points89=S.pts;window.math89=S.mathC;window.spoken89=[];speechSynthesis.speak=u=>spoken89.push(u.text);void 0")
  page.wait_for_selector('.v47-choice-hear');page.locator('.v47-choice-hear').first.tap()
  assert page.evaluate('spoken89.length===1&&S.pts===points89&&S.mathC===math89')
 def piano_signal(page):
  page.evaluate("window.freqs89=[];window.nodes89=[];const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(...a){freqs89.push(this.frequency.value);nodes89.push(this);this.live89=true;this.addEventListener('ended',()=>this.live89=false);return start.apply(this,a)};for(const l of G1Learning.levels)S.game.levels[l.id]={stars:3,tasks:[true,true,true]};const l=G1Learning.levels.find(l=>l.tasks[0].type==='piano');S.game.levels[l.id]={stars:0,tasks:[false,false,false]};g1StartLevel(l.id)")
  for n in range(3):
   page.evaluate('(n)=>g1PianoTap(n)',n);page.wait_for_function('(n)=>freqs89.length===n+1',arg=n)
  actual=page.evaluate('freqs89')
  assert all(abs(f-440*2**((m-69)/12))<.001 for f,m in zip(actual,[60,62,64])),actual
  page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
  # Closing an AudioContext may discard scheduled ended events; closed state is
  # the native resource/output invariant, not our event-only instrumentation flag.
  page.wait_for_function("nodes89.every(n=>n.context.state==='closed')")
  assert page.evaluate('new Set(nodes89.map(n=>n.context)).size===1'),'game key context was not reused'
 def follow_late(page):
  page.evaluate("showPage('follow79');window.after89=0;window.utterance89=null;speechSynthesis.speak=u=>utterance89=u;__FOLLOW89_TEST.speak('测试反馈',()=>after89++);window.done89=utterance89.onend;Follow79.stop();done89();showPage('home')")
  page.wait_for_timeout(2200);assert page.evaluate('after89===0'),'old feedback resumed after stop'
 def layouts(page):
  defects=[];checks=0
  for width,height in [(320,568),(375,667),(390,844),(568,320),(844,390),(768,1024),(1024,768)]:
   page.set_viewport_size({'width':width,'height':height})
   for route in ['chars','math','mathsync','mathlower','timeextra','english','englishsync','piano','dog','poems']:
    page.evaluate('(r)=>showPage(r)',route)
    if route=='englishsync':page.evaluate('startEnglishQuiz44()')
    # Include the longest existing answer set, not only default short options.
    if route in ['math','mathsync','mathlower']:
     bank,var,render={'math':('V42_MATH','v42MathQ','renderMathV42'),'mathsync':('V44_MATH','v44MathQ','renderMath44'),'mathlower':('V45_MATH_LOWER','v45MathLowerQ','renderMathLower45')}[route]
     page.evaluate(f"{var}={bank}.slice().sort((a,b)=>Math.max(...b.o.map(x=>String(x).length))-Math.max(...a.o.map(x=>String(x).length)))[0];{render}()")
    page.wait_for_timeout(30)
    buttons=page.locator('#ct .v42-answer,#ct .v47-choice-hear,#ct .moi,#ct .v82-pet-actions button,#ct .p68-actions button')
    for button in buttons.all():
     if not button.is_visible():continue
     button.scroll_into_view_if_needed()
     hit=button.evaluate('(b)=>{const r=b.getBoundingClientRect();return {ok:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),height:r.height,text:b.textContent.slice(0,30)}}')
     checks+=1
     if not hit['ok'] or hit['height']<44:defects.append(dict(width=width,height=height,route=route,button=hit))
    if page.evaluate('document.documentElement.scrollWidth>innerWidth+1'):defects.append(dict(width=width,route=route,overflow=True))
  print('Hit-tested controls:',checks,flush=True);assert not defects,json.dumps(defects,ensure_ascii=False)[:3000]
 for name,fn in [('single HTML learning voice',html_focus),('option TTS interrupts poem',tts_focus),('poem metadata failure stops sequence',poem_error),('old poem error cannot restart after navigation',poem_stale),('poem background resets state',poem_background),('old character cannot open tracing after navigation',char_stale),('pet pending voice cancelled by background',pet_late),('piano respects mute',piano_mute),('piano completion cannot overwrite home',piano_exit),('native poem title and every line complete in order',poem_complete),('native character completion opens correct tracing',char_complete),('muted character writing remains available',char_muted),('pet captions, original voices and care costs agree',pet_actions),('English first, Chinese only on translation',english_translation),('option voice never submits an answer',option_no_answer),('piano keys use A440 equal temperament',piano_signal),('old coaching callback cannot resume after stop',follow_late),('six-module controls/answer hit-testing',layouts)]:case(name,fn)
 case('repeated play on the same player keeps newest request audible',repeat_player)
 case('all referenced poem, character, English and pet audio available',referenced_audio)
 touch_launch={**launch,'args':[x for x in launch['args'] if not x.startswith('--autoplay-policy')]}
 touch_browser=p.chromium.launch(**touch_launch);touch=touch_browser.new_context(has_touch=True,service_workers='block',viewport={'width':390,'height':844});touch.add_init_script(seed);tp=touch.new_page()
 try:
  tp.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
  tp.evaluate("window.keyStarts89=0;const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(...a){keyStarts89++;return start.apply(this,a)};for(const l of G1Learning.levels)S.game.levels[l.id]={stars:3,tasks:[true,true,true]};const l=G1Learning.levels.find(l=>l.tasks[0].type==='piano');S.game.levels[l.id]={stars:0,tasks:[false,false,false]};g1StartLevel(l.id)")
  tp.locator('.g1-piano-keys button').first.tap();tp.wait_for_function('keyStarts89===1')
  results.append(('first piano touch without autoplay bypass',True));print('PASS first piano touch without autoplay bypass',flush=True)
 finally:touch_browser.close()
 browser.close();assert '--diagnose' in sys.argv or all(ok for _,ok in results),results
