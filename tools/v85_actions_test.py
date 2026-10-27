"""Behavioral tests with synthetic media streams; never record a real microphone."""
import ast,json,os,sys,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
seed+=";let t=JSON.parse(localStorage.getItem('grade1_island_state_v1'));t.scr.on=false;localStorage.setItem('grade1_island_state_v1',JSON.stringify(t));HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.onended?.(),0);return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){};"
def solutions(puzzle):
 n=len(puzzle);g=[r[:] for r in puzzle];bh=2;bw=n//bh;count=0
 def visit():
  nonlocal count
  if count>=2:return
  best=None;options=None
  for r in range(n):
   for c in range(n):
    if g[r][c]:continue
    used=set(g[r])|{g[i][c] for i in range(n)}|{g[i][j] for i in range(r//bh*bh,r//bh*bh+bh) for j in range(c//bw*bw,c//bw*bw+bw)}
    opts=set(range(1,n+1))-used
    if not opts:return
    if options is None or len(opts)<len(options):best=(r,c);options=opts
  if best is None:count+=1;return
  r,c=best
  for v in options:g[r][c]=v;visit();g[r][c]=0
 visit();return count
with sync_playwright() as p:
 launch={'headless':True,'executable_path':os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe')}
 if BASE.startswith('https:'):
  proxy=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{proxy.scheme}://{proxy.hostname}:{proxy.port}'}
 else:launch['args']=['--no-proxy-server']
 browser=p.chromium.launch(**launch);failures=[]
 def case(name,fn):
  ctx=browser.new_context(service_workers='block');ctx.add_init_script(seed);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:d.accept());page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
  try:fn(page);assert not errors,errors;print('PASS',name,flush=True)
  except Exception as e:failures.append({'case':name,'error':str(e),'pageErrors':errors});print('FAIL',name,str(e),flush=True)
  finally:ctx.close()
 def sudoku(page):
  for item in page.evaluate('SUDOKU_V6'):
   assert solutions(item['puzzle'])==1,('nonunique sudoku',item['n'],item['puzzle'])
  for n in [4,6]:
   page.evaluate('(n)=>{sudokuSizeV6=n;showPage("sudoku")}',n)
   page.evaluate('sudokuV6.grid=sudokuV6.solution.map(r=>r.slice());checkSudokuV6()');pts=page.evaluate('S.pts')
   page.evaluate('checkSudokuV6()');assert page.evaluate('S.pts')==pts
 def generators(page):
  assert page.evaluate('[V42_MATH,V44_MATH,V45_MATH_LOWER,V45_TIME,V42_READINGS].every(a=>a.every(q=>q.o.includes(q.a)&&new Set(q.o).size===q.o.length))')
  for route,generate in [('math','nextMathV42'),('mathsync','nextMath44'),('mathlower','nextMathLower45'),('timeextra','nextTime45'),('sudoku','newSudokuV6')]:
   page.evaluate('(r)=>showPage(r)',route);page.evaluate('(f)=>{for(let i=0;i<100;i++)window[f]()} ',generate)
 def thinking(page):
  page.evaluate("showPage('thinking');answerThinkV6(THINK_V6[thinkV6].answer,document.querySelector('#thinkTaskV6 .moi'));showPage('home')")
  page.wait_for_timeout(900);assert page.locator('.g1-shell').count()==1
 def reading(page):
  page.evaluate("showPage('readhome');R71UI.open(R71.BOOKS[0].id);showPage('home')")
  page.wait_for_timeout(500);assert page.locator('#r71Sheet').count()==0,'a departed book displayed a strategy overlay on home'
 def malformed_backup(page):
  page.evaluate('S._parentAuth=true;window.originalState=JSON.stringify(S);importData({target:{files:[new File([JSON.stringify({schema:"grade1-game-v1",s:{schema:"grade1-game-v1",_setup:null,game:null}})],"bad.json")],value:"bad.json"}})')
  page.wait_for_timeout(300);assert page.evaluate('S._setup!==null&&S.game!==null'),'invalid backup overwrote valid state'
 def full_backup(page):
  page.evaluate('S._parentAuth=true;localStorage.setItem("readV71",JSON.stringify({book:{read:2}}));localStorage.setItem("g1_follow_state_v1",JSON.stringify({last:{correct:4}}))')
  with page.expect_download() as download:page.evaluate('exportData()')
  data=json.loads(Path(download.value.path()).read_text('utf8'))
  assert data.get('extras',{}).get('readV71'), 'reading progress absent from backup'
  page.evaluate('localStorage.removeItem("readV71");localStorage.removeItem("g1_follow_state_v1")')
  page.locator('#impFile').set_input_files({'name':'roundtrip.json','mimeType':'application/json','buffer':json.dumps(data).encode()})
  page.wait_for_timeout(300);assert page.evaluate('JSON.parse(localStorage.getItem("readV71")).book.read')==2
  assert not page.evaluate('S._parentAuth')
 def prepare_record(page):
  page.evaluate("""window.trackStops=0;window.recorders=0;window.recorderTypes=[];window.micRequests=0;
  window.fakeStream=()=>{const track={readyState:'live',stop(){if(this.readyState!=='ended'){trackStops++;this.readyState='ended'}},addEventListener(){}};return{getTracks:()=>[track]}};
  window.MediaRecorder=class{static isTypeSupported(t){return t==='audio/mp4'}constructor(s,options){if(options?.mimeType&&options.mimeType!=='audio/mp4')throw Error('Unsupported type');this.mimeType='audio/mp4';this.state='inactive';recorders++;recorderTypes.push(options?.mimeType||'')}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['sample'],{type:this.mimeType})});this.onstop?.()}};
  showPage('follow79');""")
 def active_record(page):
  prepare_record(page);page.evaluate('navigator.mediaDevices.getUserMedia=async()=>{micRequests++;return fakeStream()};void 0')
  page.evaluate('Follow79.startRecord()');assert page.evaluate('recorders')==1,'recorder failed on an MP4-only browser'
  page.evaluate("showPage('home')");page.wait_for_timeout(50);assert page.evaluate('trackStops')==1,'recording microphone survived navigation'
 def late_record(page):
  prepare_record(page);page.evaluate('navigator.mediaDevices.getUserMedia=()=>{micRequests++;return new Promise(r=>window.resolveRecording=r)};void 0')
  page.evaluate('void Follow79.startRecord()');page.wait_for_function('!!window.resolveRecording');page.evaluate("showPage('home');resolveRecording(fakeStream())")
  page.wait_for_timeout(50);assert page.evaluate('trackStops')==1 and page.evaluate('recorders')==0,'late permission reopened microphone after leaving'
 def double_record(page):
  prepare_record(page);page.evaluate('navigator.mediaDevices.getUserMedia=()=>{micRequests++;return new Promise(()=>{})};void 0')
  page.evaluate('void Follow79.startRecord();void Follow79.startRecord()');page.wait_for_timeout(50);assert page.evaluate('micRequests')==1,'double click created two permission requests'
 def quota(page):
  assert page.evaluate("""()=>{S._parentAuth=true;const b=__DATA85.snapshot();b.s.pts=999;localStorage.setItem('readV71','{"existing":1}');const previous=localStorage.getItem(G1_STORAGE),extras=localStorage.getItem('readV71'),pts=S.pts,original=Storage.prototype.setItem;let once=true;Storage.prototype.setItem=function(k,v){if(k===G1_STORAGE&&once){once=false;throw new DOMException('quota','QuotaExceededError')}return original.call(this,k,v)};let rejected=false;try{__DATA85.restore(b)}catch(e){rejected=true}finally{Storage.prototype.setItem=original}return rejected&&S.pts===pts&&localStorage.getItem(G1_STORAGE)===previous&&localStorage.getItem('readV71')===extras}"""),'quota failure modified valid records'
 def pin(page):
  page.evaluate("S._parentAuth=true;showPage('parent')");old=page.evaluate('S.parentPin')
  page.locator('#pPin').fill('abcd');page.locator('#pTasks').fill('999');page.evaluate('saveParent()');assert page.evaluate('S.parentPin')==old
  page.locator('#pPin').fill('9876');page.evaluate('saveParent()');assert page.evaluate('S.parentPin')=='9876' and page.evaluate('S.dailyGoal.tasks')==8
 def sport(page):
  page.evaluate("showPage('sport');window.speechSynthesis.speak=()=>{}")
  page.locator('.sp button').first.click();assert page.evaluate("S.sport['spt_'+T()]") is True
  page.evaluate("showPage('science');window.scoreBefore=S.pts;recordScience85()");assert page.evaluate("S.vR['sci_'+T()]") is True and page.evaluate('S.pts===scoreBefore')
  assert '阅读已记录' in page.locator('#ct').inner_text()
 def focus(page):
  page.evaluate("showPage('focus');iSc();iSc();showPage('home')");page.wait_for_timeout(150);assert page.evaluate('scTimer') is None
 def reset(page):
  page.evaluate('S._parentAuth=true;localStorage.setItem("readV71","{}");localStorage.setItem("g1_follow_state_v1","{}");localStorage.setItem("unrelated-test-data","keep")')
  with page.expect_navigation(wait_until='networkidle'):page.evaluate('confirmClearData()')
  assert page.evaluate('S._setup.done') is False and page.evaluate('S.dog') is None
  assert page.evaluate('localStorage.getItem("readV71")') is None and page.evaluate('localStorage.getItem("g1_follow_state_v1")') is None
  assert page.evaluate('localStorage.getItem("unrelated-test-data")')=='keep'
 def parent_reload(page):
  page.evaluate('S._parentAuth=true;R()');page.reload(wait_until='networkidle');assert not page.evaluate('S._parentAuth')
  page.evaluate("showPage('parent')");assert page.locator('.wiz-num').count()>0
 def quoted_fields(page):
  page.evaluate('S._setup.name=\'小"豆\';S.parentQA={q:\'问题"一\',a:\'答案"二\'};S._parentAuth=true;showPage("parent")')
  assert page.locator('#pName').input_value()=='小"豆'
  assert page.locator('#pQaQ').input_value()=='问题"一' and page.locator('#pQaA').input_value()=='答案"二'
 def legacy_backup(page):
  assert page.evaluate("""()=>{localStorage.setItem('readV71','{"kept":1}');const b=__DATA85.snapshot();b.v=2;delete b.extras;b.s.pts=73;__DATA85.restore(b);return S.pts===73&&JSON.parse(localStorage.getItem('readV71')).kept===1}""")
 def books(page):
  count=page.evaluate("""()=>{showPage('readhome');let pages=0;for(const b of R71.BOOKS){R71UI.open(b.id);for(let i=0;i<b.pages.length;i++){if(!document.querySelector('#r71Stage'))throw Error(b.id+' missing page '+i);pages++;R71UI.go(1)}R71UI.sample();R71UI.showSample();R71UI.finish();if(!document.querySelector('.r71-done-wrap'))throw Error(b.id+' missing completion');R71UI.shelf()}return pages}""")
  assert count>0;print('Rendered all interactive book pages:',count,flush=True)
 def math_exit(page):
  page.evaluate("showPage('mathsync');const b=document.querySelector('#math44Task .v42-answer-grid');const q=v44MathQ;const el=[...b.children].find(x=>x.getAttribute('onclick').includes(\"'\"+q.a+\"'\"));answerMath44(q.a,el);window.nextQuestion=v44MathQ;showPage('home')")
  page.wait_for_timeout(1000);assert page.evaluate('v44MathQ===nextQuestion') and page.locator('.g1-shell').count()==1
 def record_failure(page):
  prepare_record(page);page.evaluate('navigator.mediaDevices.getUserMedia=async()=>fakeStream();window.MediaRecorder=class{static isTypeSupported(){return false}constructor(){throw Error("unsupported")}};void 0')
  page.evaluate('Follow79.startRecord()');assert page.evaluate('trackStops')==1
 def record_manual(page):
  prepare_record(page);page.evaluate('navigator.mediaDevices.getUserMedia=async()=>fakeStream();void 0');page.evaluate('Follow79.startRecord()')
  with page.expect_download() as download:page.evaluate('Follow79.stopRecord()')
  assert download.value.suggested_filename.endswith('.m4a') and page.evaluate('trackStops')==1
 for name,fn in [('unique sudoku + duplicate reward',sudoku),('100-generation loops + answer membership',generators),('thinking delayed-navigation safety',thinking),('reading delayed-overlay safety',reading),('malformed backup is atomic',malformed_backup),('all-module backup roundtrip',full_backup),('quota rollback',quota),('parent numeric PIN + bounds',pin),('parent authorization expires on reload',parent_reload),('quoted family fields',quoted_fields),('v2 backup compatibility',legacy_backup),('all interactive book pages',books),('math navigation cancels delayed question',math_exit),('sport check-in handler',sport),('focus timer cleanup',focus),('explicit full reset scope',reset),('recording format + route cleanup',active_record),('late recording permission cleanup',late_record),('recording double-click protection',double_record),('recording constructor failure releases mic',record_failure),('manual recording download format',record_manual)]:case(name,fn)
 browser.close();print(json.dumps(failures,ensure_ascii=False,indent=2));assert not failures,'Functional regression failures'
