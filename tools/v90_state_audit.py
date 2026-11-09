"""State-machine audit with controlled clocks/audio. Not proof of off-screen work."""
import ast,json,os,sys,urllib.parse
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
seed+=";const s=JSON.parse(localStorage.getItem('grade1_island_state_v1'));s.scr.on=false;localStorage.setItem('grade1_island_state_v1',JSON.stringify(s));HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.onended?.(),0);return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){};"
with sync_playwright() as p:
 launch=dict(headless=True,executable_path=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
 if BASE.startswith('https:'):
  u=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{u.scheme}://{u.hostname}:{u.port}'}
 else:launch['args']=['--no-proxy-server']
 browser=p.chromium.launch(**launch);results=[]
 def case(name,fn):
  c=browser.new_context(timezone_id='Asia/Shanghai',service_workers='block');c.add_init_script(seed);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.clock.install(time=datetime(2026,11,9,4,tzinfo=timezone.utc));page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
  page.evaluate("pinyinV63PlayToken=async(v,done)=>{done?.();return true};void 0")
  try:fn(page);assert not errors,errors;results.append((name,True));print('PASS',name,flush=True)
  except Exception as e:results.append((name,False));print('FAIL',name,str(e)[:2000],errors,flush=True)
  finally:c.close()
 def sport(page):
  page.evaluate("for(const l of G1Learning.levels)S.game.levels[l.id]={stars:3,tasks:[true,true,true]};S.game.levels['interest-sport']={stars:0,tasks:[false,false,false]};g1StartLevel('interest-sport');g1SportStart()")
  page.clock.run_for(10000);page.locator('#g1SportPin').fill('5678')
 def sport_double(page):
  sport(page);page.evaluate('g1SportConfirm();g1SportConfirm();g1SportConfirm()')
  assert page.evaluate("S.game.levels['interest-sport'].stars")==1,'one elapsed timer confirmed multiple tasks'
 def sport_hidden(page):
  page.evaluate("for(const l of G1Learning.levels)S.game.levels[l.id]={stars:3,tasks:[true,true,true]};S.game.levels['interest-sport']={stars:0,tasks:[false,false,false]};g1StartLevel('interest-sport');g1SportStart();Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
  page.clock.run_for(20000);assert page.locator('#g1SportPin').count()==0,'background time completed sport timer'
 def sport_lock(page):
  sport(page);page.evaluate("eyeOpen('lock');g1SportConfirm()")
  assert page.evaluate("S.game.levels['interest-sport'].stars")==0,'lock allowed confirmation'
 def legacy_ledger(page):
  page.evaluate("const l=G1Learning.levels.find(l=>l.id==='start-1');S.game.levels[l.id]={stars:0,tasks:[false,false,false]};for(let i=0;i<3;i++)S.game.rewardLedger[l.id+':star:'+i]=Date.now()-10000;S.game.rewardLedger[l.id+':complete']=Date.now()-10000;S.dog.xp=48;for(let i=0;i<3;i++)G1Learning.awardTask(l,i)")
  assert page.evaluate('S.dog.xp')==48,'existing completion ledger granted XP again'
 def add_review(page,count=1):
  page.evaluate("n=>{for(let i=0;i<n;i++)S.game.reviewQueue['audit-'+i]={id:'audit-'+i,levelId:'start-1',title:'测试复习'+i,step:0,dueAt:Date.now()-1000,lapses:1,task:{id:'q'+i,type:'choice',prompt:'1+1等于几',options:['2','3'],answer:'2',key:'audit'+i}};R();showPage('review')}",count)
 def answer(page,idx=0):
  page.locator('.g1-answer').nth(idx).click();page.clock.fast_forward(800)
 def review_future(page):
  add_review(page);page.evaluate("g1AnswerReview('audit-0',0,document.querySelector('.g1-answer'))");page.clock.fast_forward(800)
  page.evaluate("window.step90=S.game.reviewQueue['audit-0'].step;g1AnswerReview('audit-0',0,document.createElement('button'))")
  assert page.evaluate("S.game.reviewQueue['audit-0'].step===step90"),'not-due review advanced again'
 def review_correction(page):
  add_review(page);page.locator('.g1-answer').nth(1).click();page.clock.fast_forward(800);page.locator('.g1-answer').first.click()
  assert page.evaluate("S.game.reviewQueue['audit-0'].step===0&&S.game.reviewQueue['audit-0'].dueAt-Date.now()<=600000"),'correction skipped the ten-minute revisit'
 def review_batch(page):
  add_review(page,5)
  for _ in range(3):answer(page)
  assert page.locator('.g1-answer').count()==0,'a fourth due review was offered in same visit'
 def review_intervals(page):
  add_review(page)
  for ms in [86400000,3*86400000,7*86400000,14*86400000]:
   answer(page)
   actual=page.evaluate("S.game.reviewQueue['audit-0'].dueAt-Date.now()")
   assert abs(actual-(ms-800))<2000,(ms,actual,'clock/IPC tolerance is two seconds, not a changed review interval')
   page.clock.fast_forward(ms);page.evaluate("showPage('review')")
  answer(page);assert page.evaluate("!S.game.reviewQueue['audit-0']")
 def daily_hidden(page):
  page.evaluate('L66.startDaily();L66.dailyListen()');page.clock.fast_forward(20)
  page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));const item=S.learning66.daily.items[0],l=G1Learning.levels.find(l=>l.id===item.levelId);L66.dailyAnswer(l.tasks[item.index].options.indexOf(l.tasks[item.index].answer))")
  assert page.evaluate('!S.learning66.daily.items[0].primaryPassedAt'),'hidden input passed a daily task'
 def locked_entry(page):
  page.evaluate("S.game.levels={};g1StartLevel('english-1')")
  assert page.evaluate("CP==='home'")
 def quota(page):
  page.evaluate("window.oldWrite90=Storage.prototype.setItem;window.stored90=localStorage.getItem(G1_STORAGE);Storage.prototype.setItem=function(k,v){if(k===G1_STORAGE)throw new DOMException('full','QuotaExceededError');return oldWrite90.call(this,k,v)};S.pts=77;R()")
  assert page.locator('#save90Status').is_visible(),'write failure was silent'
  assert page.evaluate('localStorage.getItem(G1_STORAGE)===stored90')
  page.evaluate('Storage.prototype.setItem=oldWrite90;R()')
  assert page.evaluate('JSON.parse(localStorage.getItem(G1_STORAGE)).pts')==77
 def normal_reward(page):
  page.evaluate("g1StartLevel('start-1')")
  for _ in range(3):page.evaluate('__G1_TEST.correct()');page.clock.fast_forward(800)
  assert page.evaluate('S.pts===69&&S.dog.xp===12&&S.dog.tasks===1')
  page.evaluate("document.getElementById('g1Celebrate')?.remove();g1StartLevel('start-1')")
  page.locator('.g1-task-done button').click()
  assert page.locator('#g1Celebrate').count()==1
  page.reload(wait_until='networkidle');page.evaluate("g1StartLevel('start-1')")
  assert page.evaluate('S.pts===69&&S.dog.xp===12&&S.game.levels["start-1"].stars===3')
 def daily_refresh(page):
  page.evaluate('L66.startDaily();L66.dailyListen()');page.clock.fast_forward(20)
  page.evaluate("const item=S.learning66.daily.items[0],l=G1Learning.levels.find(l=>l.id===item.levelId);L66.dailyAnswer(l.tasks[item.index].options.indexOf(l.tasks[item.index].answer))");page.clock.fast_forward(800)
  assert page.evaluate('!!S.learning66.daily.items[0].confirmTask&&S.pts===60')
  page.reload(wait_until='networkidle');page.evaluate("pinyinV63PlayToken=async(v,done)=>{done?.();return true};L66.startDaily()")
  assert page.evaluate('!!S.learning66.daily.items[0].confirmTask')
  page.evaluate('L66.dailyListen()');page.clock.fast_forward(20)
  page.evaluate("const t=S.learning66.daily.items[0].confirmTask;L66.dailyAnswer(t.options.indexOf(t.answer));L66.dailyAnswer(t.options.indexOf(t.answer))")
  assert page.evaluate('S.learning66.daily.items[0].done&&S.pts===63&&S.dog.xp===0')
  page.reload(wait_until='networkidle');assert page.evaluate('S.learning66.daily.items[0].done&&S.pts===63')
 def fractional_timers(page):
  page.evaluate("showPage('piano');Piano68.start()");page.clock.run_for(120);page.evaluate('Piano68.pause()')
  assert page.evaluate('S.piano68.ms')>=100,'fractional practice time was discarded'
  page.evaluate("L66.startDaily()");page.clock.run_for(120);page.evaluate("dispatchEvent(new Event('pagehide'))")
  assert page.evaluate('S.learning66.daily.coreMs')>=100,'fractional core time was discarded'
  page.reload(wait_until='networkidle');assert page.evaluate('S.piano68.ms>=100&&S.learning66.daily.coreMs>=100')
 def corrupted_backup(page):
  assert page.evaluate("()=>{const b=__DATA85.snapshot();b.s.game.levels['start-1']={stars:3,tasks:[false,false,false]};try{__DATA85.validate(b);return false}catch(_){return true}}")
 def retired_stars(page):
  page.evaluate("for(let n=0;n<10;n++)S.game.levels['retired-'+n]={stars:3,tasks:[true,true,true]};g1StartLevel('english-1')")
  assert page.evaluate("CP==='home'&&Object.keys(S.game.levels).some(x=>x.startsWith('retired-'))")
 def adventure(page):
  page.evaluate("showPage('adventure')")
  assert page.evaluate("CP==='level'"),'adventure showed level UI under the wrong route'
  page.locator('#g1Listen').click();page.clock.fast_forward(20)
  assert '已听完' in page.locator('#g1Listen').inner_text()
 def sport_complete(page):
  page.evaluate("for(const l of G1Learning.levels)S.game.levels[l.id]={stars:3,tasks:[true,true,true]};S.game.levels['interest-sport']={stars:0,tasks:[false,false,false]};g1StartLevel('interest-sport')")
  for _ in range(3):
   page.evaluate('g1SportStart()');page.clock.run_for(10000);page.locator('#g1SportPin').fill('5678');page.evaluate('g1SportConfirm()');page.clock.fast_forward(800)
  assert page.evaluate('S.pts===69&&S.dog.xp===12&&S.dog.tasks===1')
  page.reload(wait_until='networkidle');assert page.evaluate('S.pts===69&&S.dog.xp===12')
 def no_listen(page):
  page.evaluate("g1StartLevel('start-1');const c=G1Learning.current();g1AnswerTask(c.task.options.indexOf(c.task.answer))")
  assert page.evaluate("S.game.levels['start-1'].stars===0&&S.pts===60")
 def stale_tab(page):
  other=page.context.new_page();other.clock.install(time=datetime(2026,11,9,4,tzinfo=timezone.utc));other.goto(BASE+'?test=1',wait_until='networkidle')
  # The first tab reloads to synchronize any startup defaults from the second.
  page.reload(wait_until='networkidle');page.evaluate('S.pts=77;R()')
  other.evaluate('S.pts=60;R()')
  assert other.evaluate("JSON.parse(localStorage.getItem(G1_STORAGE)).pts===77&&G1SaveStatus90.reason==='conflict'"),'stale tab overwrote newer points'
  other.reload(wait_until='networkidle');assert other.evaluate('S.pts')==77
  page.evaluate("eyeOpen('rest')");deadline=page.evaluate('Eye70.state().until')
  other.close()
  assert page.evaluate("JSON.parse(localStorage.getItem('grade1_eye_rest_v70')).until")==deadline,'stale tab reset the active rest deadline'
 def actual_day_lock(page):
  page.evaluate("showPage('follow79');window.followStops90=0;const stop=Follow79.stop;Follow79.stop=function(){followStops90++;return stop.apply(this,arguments)};S.scr.on=true;S.scr.used=1799.9;S.scr.cont=0;R()")
  page.clock.run_for(1100)
  assert page.evaluate("followStops90>0&&_eyeMode==='lock'"),'real daily threshold did not stop follow analysis'
 for name,fn in [('sport one timer only one star',sport_double),('sport background never finishes',sport_hidden),('sport confirmation blocked by eye limit',sport_lock),('old completion ledger prevents duplicate pet XP',legacy_ledger),('future review cannot be replayed',review_future),('review correction retains ten-minute interval',review_correction),('review visit stops after three',review_batch),('review 1/3/7/14-day progression',review_intervals),('daily hidden input rejected',daily_hidden),('locked region cannot start',locked_entry),('storage failure explicit and recoverable',quota)]:case(name,fn)
 for name,fn in [('one real level persists exact diamonds and pet XP',normal_reward),('daily two-step confirmation survives refresh without duplicate reward',daily_refresh),('fractional timers survive pause and reload',fractional_timers),('inconsistent stars in a backup rejected',corrupted_backup),('retired records preserved but do not unlock regions',retired_stars),('adventure menu opens a functional level route',adventure)]:case(name,fn)
 for name,fn in [('three distinct sport timers earn one completion only',sport_complete),('unheard lesson cannot earn a star',no_listen)]:case(name,fn)
 case('stale second tab cannot overwrite newer saved records',stale_tab)
 case('actual daily threshold stops follow analysis immediately',actual_day_lock)
 browser.close();assert '--diagnose' in sys.argv or all(ok for _,ok in results),results
