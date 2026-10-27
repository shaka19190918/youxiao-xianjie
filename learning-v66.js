/* Guided retry, an all-subject daily sampler, and local-only writing practice. */
(()=>{
  'use strict';
  const G=window.G1Learning, $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day=()=>G.localDay(), save=()=>R();
  function state(){return S.learning66||(S.learning66={guards:{},daily:null,drafts:{}})}
  let audio=null,audioEpoch=0,activeGuard='',dailyHeard='',dailyBusy=false,traceDaily=null;
  function stopAudio(){audioEpoch++;if(audio){audio.pause();audio=null}v46StopAudio();if(typeof pinyinV63Stop==='function')pinyinV63Stop()}
  async function listen(path,done,fail){
    if(v41EnsureAudio().muted){fail?.();toast('声音已关闭，请先打开声音');return}
    stopAudio();const epoch=audioEpoch;
    const finish=()=>{if(epoch===audioEpoch)done?.()},bad=()=>{if(epoch===audioEpoch){fail?.();toast('音频未播放完整，请重新播放')}};
    if(!path){bad();return}
    if(path.startsWith('p63|')){try{await pinyinV63PlayToken(path,finish)}catch(_){bad()}return}
    try{audio=typeof primeAudio==='function'?primeAudio(path):new Audio(path);audio.pause();audio.currentTime=0;audio.preload='auto';v46ActiveAudio=audio;audio.onended=finish;audio.onerror=bad;await audio.play()}catch(_){bad()}
  }
  function modal(id,html){$(id)?.remove();const el=document.createElement('div');el.id=id;el.className='l66-modal';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.innerHTML='<section>'+html+'</section>';document.body.append(el);el.querySelector('button')?.focus();return el}
  function recordWrong(key,t){const q=G.game().reviewQueue,old=q[key],l=G.levels.find(x=>key.startsWith(x.id+'::'));q[key]={...(old||{}),id:key,levelId:l?.id||old?.levelId,title:l?.title||t.prompt||'再练一次',task:JSON.parse(JSON.stringify(t)),step:0,dueAt:Date.now()+600000,lapses:(old?.lapses||0)+1,lastResult:'wrong'};save()}
  function guard(key,t){const all=state().guards;return all[key]||(all[key]={wrong:0,rounds:0,phase:'answer',task:JSON.parse(JSON.stringify(t)),lastAt:0})}
  function attempt(key,t,value,managesReview=false){
    if(_eyeMode)return false;
    const g=guard(key,t),now=Date.now();if(!t.options?.includes(value))return false;
    if(g.phase==='defer'&&now>=g.until){g.phase='answer';g.wrong=0;g.rounds=0}
    if(g.phase!=='answer'){openGuard(key);return false}
    if(now-g.lastAt<700)return false;
    g.lastAt=now;
    if(value===t.answer){g.wrong=0;g.rounds=0;save();return true}
    g.wrong++;if(!managesReview||g.wrong>=3)recordWrong(key,t);
    if(g.wrong>=3){g.phase='teach';g.until=now+20000;g.heard=!t.audio;save();openGuard(key);playCue('retry','');return false}
    save();return true;
  }
  function openGuard(key){
    const g=state().guards[key];if(!g)return;activeGuard=key;stopAudio();
    let body='';
    if(g.phase==='defer')body='<h2>🤝 请大人陪你试一试</h2><p>这道题先放进复习站。可以休息，或换一个学科，不扣星星和钻石。</p><p>10分钟后再来练这道题。</p>';
    else if(g.phase==='verify'){
      const opts=g.task.options.slice().reverse();
      body=`<h2>🌱 换个位置，再找一次</h2><p>${esc(g.task.prompt)}</p><button onclick="L66.guardListen()">🔊 再听示范</button><div class="l66-options">${opts.map((x,i)=>`<button onclick="L66.verify(${i})">${esc(x)}</button>`).join('')}</div>`;
    }else body=`<h2>🐾 慢一点，我们一起学</h2><p>${esc(g.task.prompt)}</p><p>先听、再看，留意这一项：</p><div class="l66-example">${esc(g.task.answer)}</div><div class="l66-actions"><button onclick="L66.guardListen()">🔊 听完整示范</button><button id="l66VerifyStart" onclick="L66.verifyStart()" disabled>看一看示范</button></div><p class="l66-note">看懂后，会换一换答案位置让你再试。重新答对原任务才得星。</p>`;
    const art=window.QuestionArt?.html(g.task)||'';
    if(art){const marker=g.phase==='verify'?'<div class="l66-options">':'<div class="l66-example">';body=body.replace(marker,art+marker)}
    modal('l66Guard',body+'<div class="l66-feedback" id="l66GuardFeedback" aria-live="polite"></div><div class="l66-actions"><button onclick="L66.leaveGuard()">先休息一下</button></div>');
    updateGuard();
  }
  function updateGuard(){const g=state().guards[activeGuard],b=$('l66VerifyStart');if(!g||!b)return;const left=Math.max(0,Math.ceil((g.until-Date.now())/1000));b.disabled=left>0||!g.heard;b.textContent=left?'一起看示范 '+left+' 秒':g.heard?'我来再试试':'先听完整示范'}
  function guardListen(){const key=activeGuard,g=state().guards[key];if(!g)return;listen(g.task.audio,()=>{g.heard=true;save();if(activeGuard===key){$('l66GuardFeedback').textContent='听完啦，对照示范看一看';updateGuard()}})}
  function verifyStart(){const g=state().guards[activeGuard];if(!g||Date.now()<g.until||!g.heard)return;g.phase='verify';save();openGuard(activeGuard)}
  function verify(i){
    const g=state().guards[activeGuard];if(!g||g.phase!=='verify'||_eyeMode)return;
    const value=g.task.options.slice().reverse()[i];if(value===undefined)return;
    if(value===g.task.answer){g.phase='answer';g.wrong=0;g.lastAt=Date.now();save();$('l66Guard')?.remove();activeGuard='';toast('找到啦！现在回到原任务再试一次');document.querySelectorAll('.g1-answer,.p63-answers button,.l66-options button').forEach(b=>{b.disabled=false;b.classList.remove('wrong')});return}
    g.rounds++;recordWrong(activeGuard,g.task);
    g.phase=g.rounds>=2?'defer':'teach';g.until=Date.now()+(g.phase==='defer'?600000:20000);g.heard=!g.task.audio;save();openGuard(activeGuard);
  }
  function leaveGuard(){stopAudio();$('l66Guard')?.remove();activeGuard='';showPage('home')}

  // Each subject contributes ONE verified micro-task, not a whole three-star level.
  // Low-star children may sample every subject here without unlocking the whole region.
  const SUBJECTS=[
    ['pinyin','🔤 拼音',2,'zh-tone-'],['writing','✏️ 汉字',2,'zh-char-'],
    ['math','🔢 数学',3,'math-up-'],['english','🔠 英语',2,'english-'],
    ['piano','🎹 钢琴',20,null,false]
  ];
  function chooseItem(spec,old){
    const [id,label,minutes,prefix,offline]=spec;
    if(id==='piano')return{id,label,minutes,offline:false,done:false};
    const candidates=G.levels.filter(l=>l.id.startsWith(prefix));
    if(id==='pinyin')candidates.push(...G.levels.filter(l=>/^zh-(initial|final)-/.test(l.id)));
    if(id==='math')candidates.push(...G.levels.filter(l=>l.id.startsWith('math-low-')));
    // Carry yesterday's unfinished task instead of skipping a difficult concept.
    const prior=old?.items?.find(x=>x.id===id&&!x.done);
    if(prior&&G.levels.some(l=>l.id===prior.levelId))return{...prior,startedAt:0,done:false};
    let l,index;
    for(const c of candidates){const s=G.levelState(c.id),indices=offline?[1]:c.id.startsWith('curr-')?[2,0,1]:c.tasks.map((_,i)=>i);const i=indices.find(i=>c.tasks[i]&&!s.tasks[i]);if(i!==undefined){l=c;index=i;break}}
    if(!l){l=candidates[(Number(state().rotation)||0)%candidates.length];index=offline?1:l?.id.startsWith('curr-')?2:0}
    return{id,label,minutes,offline:!!offline,levelId:l?.id,index,done:false,startedAt:0};
  }
  function plan(){const s=state();if(s.daily?.day!==day()){const prev=s.daily;s.rotation=(s.rotation||0)+1;s.daily={version:68,day:day(),startedAt:0,items:SUBJECTS.map(x=>chooseItem(x,prev)),breakUntil:0,screenSeconds:0,coreMs:0,doneAt:0};save()}else if(s.daily.version!==68){const p=s.daily;p.items=SUBJECTS.map(spec=>spec[0]==='piano'?chooseItem(spec):p.items.find(x=>x.id===spec[0])||chooseItem(spec));p.coreMs=Math.min(600000,(p.screenSeconds||0)*1000);p.version=68;p.doneAt=0;save()}return s.daily}
  function remaining(){return Math.max(0,Math.ceil((600000-(plan().coreMs||0))/1000))}
  function current(){const p=plan();return p.items.find(x=>!x.done&&(x.id==='piano'||remaining()>0))}
  function itemTask(item=current()){const l=G.levels.find(l=>l.id===item?.levelId);return l?{l,t:item.confirmTask||l.tasks[item.index],item}:null}
  function confirmation(c){
    const base=c.l.tasks[c.item.index];
    if(c.item.id==='english'){
      const m=base.id.match(/^en_(\d+)_(\d+)$/);if(m){const word=V44_ENGLISH[+m[1]].items[+m[2]],opts=V44_ENGLISH[+m[1]].items.map(x=>x[1]).slice(0,4);return {...base,id:base.id+'_confirm',prompt:'“'+word[2]+'”用英语怎么说？',options:opts,answer:word[1]}}
    }
    const other=c.l.tasks.find(t=>t!==base&&t.type==='choice'&&t.answer!==base.answer);
    return other?{...other,id:base.id+'_confirm'}:{...base,id:base.id+'_confirm',prompt:'再认一次：'+base.prompt,options:base.options.slice().reverse()};
  }
  /* ── v77：今日计划卡的"矮屏折叠"（修掉"看得见摸不着"）────────────────────
     问题（v76 实测）：这张卡高 313px，在 630px 高的窗口里从 y=499 开始，
     首屏只露出 131px，**「开始今日计划」按钮落在屏幕外** ——
     孩子看到卡片却点不到，是体验上最糟的一种。
     做法：视口高度 < 720px 时默认折叠成一行摘要（标题 + 进度 + 展开箭头），
     点击展开。展开状态记在 localStorage，尊重孩子的选择。
     ⚠️ 为什么用 JS 判断高度而不是纯 CSS：折叠态要改变 DOM（隐藏正文），
        且需要记住用户选择；纯 CSS 无法保存展开状态。
     ⚠️ 断点取 720px 而不是 630px：留出余量，避免"刚好卡在边界"时闪烁。 */
  const PLAN_KEY = 'g1_plan_expanded';
  /* 折叠样式由本文件自带注入 —— 遵循项目铁律：关键版式 CSS 跟着 JS 走，
     避免"新 JS + 缓存旧 CSS"导致折叠按钮点了没反应（那等于静默失效，
     而本项目明确要求"失败永远不要表现为静默无反应"）。 */
  (function injectPlanStyle() {
    if (typeof document === 'undefined' || document.getElementById('l66-fold-style')) return;
    var css = [
      /* 折叠按钮：触控 ≥44px（儿童友好下限），不抢标题视觉重心 */
      '.l66-fold-btn{margin-left:auto;display:inline-flex;align-items:center;gap:5px;',
      'min-height:44px;min-width:76px;padding:0 12px;border:2px solid #dcd0fa;border-radius:16px;',
      'background:#f4f0ff;color:#50319c;font:800 14px/1 inherit;cursor:pointer;flex:0 0 auto}',
      '.l66-fold-btn i{font-style:normal;font-size:13px;transition:transform .18s ease}',
      '.l66-folded .l66-fold-btn i{transform:rotate(-90deg)}',
      /* 折叠态：只留标题 + 进度 + 按钮，正文全隐 —— 首屏因此省下约 240px */
      '.l66-folded .l66-subjects,.l66-folded .l66-primary,.l66-folded>.l66-note{display:none}',
      '.l66-folded{padding:14px clamp(16px,3vw,22px)}',
      /* 窄屏（≤360px）header 本来就会换行，按钮占整行更清楚 */
      '@media(max-width:360px){.l66-fold-btn{margin-left:0;width:100%;justify-content:center}}',
    ].join('');
    var st = document.createElement('style');
    st.id = 'l66-fold-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  })();
  function planExpanded() {
    try { return localStorage.getItem(PLAN_KEY) === '1' } catch (_) { return false }
  }
  function planCollapsed() {
    if (planExpanded()) return false;
    return (window.innerHeight || 800) < 720;
  }
  window.g1TogglePlan = function () {
    const next = !planExpanded();
    try { localStorage.setItem(PLAN_KEY, next ? '1' : '0') } catch (_) { }
    // 只重渲染首页（R() 不重渲染页面，必须显式调用）
    if (typeof PGS !== 'object' || !PGS || !PGS.home) return;
    if (typeof CP !== 'undefined' && CP !== 'home') return;
    PGS.home.render();
    if (typeof toast === 'function') toast(next ? '已展开今日计划' : '已收起今日计划');
  };
  /* 渲染后再按需折叠（渲染时 innerHeight 已知，但折叠要动 DOM，故渲染后处理） */
  function applyPlanCollapse() {
    const card = document.querySelector('#ct .l66-plan');
    if (!card) return;
    const collapsed = planCollapsed();
    card.classList.toggle('l66-folded', collapsed);
    const btn = card.querySelector('.l66-fold-btn');
    if (btn) {
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.querySelector('span').textContent = collapsed ? '展开' : '收起';
    }
  }

  function dailyCard(){const p=plan(),done=p.items.filter(x=>x.done).length;const folded=planCollapsed();
    return `<section class="l66-card l66-plan${folded?' l66-folded':''}"><header><strong>🌈 今日全科成长计划</strong><span>${done} / ${p.items.length}</span><button class="l66-fold-btn" onclick="g1TogglePlan()" aria-expanded="${folded?'false':'true'}" title="展开或收起今日计划"><span>${folded?'展开':'收起'}</span><i aria-hidden="true">▾</i></button></header><p class="l66-note">拼音、汉字、数学、英语 · 听懂、动手、再巩固。</p><div class="l66-subjects">${p.items.map(x=>`<span class="${x.done?'done':''}">${x.done?'✓ ':''}${x.label}<br><small>${x.done?'今天完成':x.id==='piano'?'20分钟':'约'+x.minutes+'分钟'}</small></span>`).join('')}</div><button class="l66-primary" onclick="L66.startDaily()">${done===p.items.length?'查看今日收获':p.startedAt?'继续今天的小冒险':'开始今天的小冒险'}</button><p class="l66-note">基础学习最多10分钟，钢琴另计20分钟。时间到了先休息，没做完的明天继续，不赶进度。</p></section>`}
  const oldHome=PGS.home.render;
  PGS.home.render=function(){
    oldHome();
    const old=document.querySelector('.g1-daily');
    if(old)old.outerHTML=dailyCard();
    else document.querySelector('.g1-map')?.insertAdjacentHTML('afterend',dailyCard());
    applyPlanCollapse();
  };
  /* 窗口高度变化（横竖屏切换、拉窗口）时重算折叠态 —— 只改 class，不重渲染 */
  let _planRz;
  window.addEventListener('resize',()=>{clearTimeout(_planRz);_planRz=setTimeout(()=>{
    const card=document.querySelector('#ct .l66-plan');if(!card)return;
    const should=planCollapsed(),has=card.classList.contains('l66-folded');
    if(should!==has){card.classList.toggle('l66-folded',should);const b=card.querySelector('.l66-fold-btn');if(b){b.setAttribute('aria-expanded',should?'false':'true');b.querySelector('span').textContent=should?'展开':'收起'}}
  },180)});
  function startDaily(){const p=plan();if(!p.startedAt){p.startedAt=Date.now();save()}dailyHeard='';showPage('daily66')}
  function taskKey(c){return c.l.id+'::'+c.t.id}
  function mayDaily(){return CP==='daily66'&&remaining()>0&&!_eyeMode&&plan().breakUntil<=Date.now()}
  function renderDaily(){
    if(current()?.id==='piano'){window.Piano68?.render();return}
    dailyHeard='';dailyBusy=false;const p=plan(),c=itemTask(),left=remaining();
    const head='<button class="g1-back" onclick="showPage(\'home\')">← 返回</button>';
    let body;
    if(!c)body=p.items.every(x=>x.done)?'<h2>🌟 今天的五项计划完成啦</h2><p>收好工具，和伙伴一起休息吧！</p>':'<h2>👀 今天先到这里</h2><p>基础学习时间用完了。未完成的任务留到明天，不必赶时间。</p>';
    else if(left<=0)body='<h2>👀 基础学习先到这里</h2><p>没做完的任务留到明天。</p>';
    else if(p.breakUntil>Date.now())body='<h2>🌿 看看远处，离开屏幕</h2><p>站起来，看看窗外。休息结束后再继续。</p><div class="l66-clock" id="l66BreakClock"></div>';
    else{
      const {item,t}=c;
      body=`<p>${p.items.filter(x=>x.done).length+1} / ${p.items.length} · ${item.label} · ${t.type==='trace'?'按笔顺实践':item.confirmTask?'② 变式巩固':'① 听懂并尝试'}</p><h2>${esc(item.offline?t.answer:t.prompt)}</h2><button id="l66Listen" onclick="L66.dailyListen()">🔊 听完整示范</button>`;
      body+=window.QuestionArt?.html(t)||'';
      if(item.offline)body+=`<p>请家长先读清活动要求，在安全的地方陪伴完成。不必盯着屏幕。</p><button id="l66OfflineStart" onclick="L66.offlineStart()">开始离屏活动 · ${item.minutes}分钟</button><div class="l66-clock" id="l66OfflineClock"></div><div id="l66OfflineConfirm"></div>`;
      else if(t.type==='trace')body+=`<div class="v42-char"><div class="glyph">${esc(t.char)}</div><div class="pinyin">${esc(t.pinyin)}</div></div><button class="l66-write-btn" onclick="L66.dailyTrace()">✏️ 大田字格 · 按笔顺描红</button><p class="l66-note">65分及以上通过；低于65分重新练习。</p>`;
      else body+=`<div class="l66-options">${t.options.map((x,i)=>`<button onclick="L66.dailyAnswer(${i})">${esc(x)}</button>`).join('')}</div>${item.id==='pinyin'?'<button class="l66-write-btn" onclick="L66.writeDaily()">✏️ 四线三格练写</button>':''}${item.id==='english'?'<button class="l66-write-btn" onclick="L66.writeDaily()">✏️ 英文四线三格</button>':''}`;
      body+='<div class="l66-feedback" id="l66Feedback" aria-live="polite">先听清，再完成任务。</div><p class="l66-note">本项真正完成后才进入下一科；重复练习不重复领星。</p>';
    }
    $('ct').innerHTML=`<main class="l66-task">${head}<section class="l66-card"><div class="l66-clock" id="l66DailyClock"></div>${body}</section></main>`;updateDaily();
  }
  PGS.daily66={title:'🌈 今日全科成长计划',render:renderDaily};
  function dailyListen(){const c=itemTask();if(!c||!mayDaily())return;const key=taskKey(c);$('l66Listen').disabled=true;listen(c.t.audio,()=>{if(CP==='daily66'&&taskKey(itemTask()||{l:{},t:{}})===key){dailyHeard=key;$('l66Listen').disabled=false;$('l66Listen').textContent='✅ 听完了，可以试一试'}},()=>{if($('l66Listen')){$('l66Listen').disabled=false;$('l66Listen').textContent='🔁 重新播放'}})}
  function dailyAnswer(i){const c=itemTask();if(!c||!mayDaily()||dailyBusy)return;if(dailyHeard!==taskKey(c))return toast('先完整听一遍');const value=c.t.options?.[i];if(value===undefined)return;if(!attempt(taskKey(c),c.t,value,true))return;if(value!==c.t.answer){G.scheduleReview(c.l,c.t);$('l66Feedback').textContent='再想一想。第三次答错，我们会一起看示范。';return}finishDaily(c)}
  function finishDaily(c){
    if(!mayDaily()||dailyBusy||c.item!==current()||c.item.done)return;
    if(c.t.type==='choice'&&!c.item.confirmTask){
      dailyBusy=true;c.item.primaryPassedAt=Date.now();c.item.confirmTask=confirmation(c);save();
      if($('l66Feedback'))$('l66Feedback').textContent='第一次找对啦！换一种问法，再试一次。';
      setTimeout(()=>{if(CP==='daily66')renderDaily()},700);return;
    }
    dailyBusy=true;c.item.done=true;c.item.doneAt=Date.now();G.awardTask(c.l,c.item.index);G.recordActivity('daily-complete',c.l,{subject:c.item.id});
    if(!current())plan().doneAt=Date.now();save();playCue('correct','');
    if($('l66Feedback'))$('l66Feedback').textContent='完成啦！接下来见见另一个学科。';
    setTimeout(()=>{if(CP==='daily66')renderDaily()},700);
  }
  function offlineStart(){const c=itemTask();if(!c?.item.offline||!mayDaily())return;if(dailyHeard!==taskKey(c))return toast('请先听活动示范');if(!c.item.startedAt){c.item.startedAt=Date.now();save()}stopAudio();updateDaily()}
  function offlineConfirm(){const c=itemTask();if(!c?.item.offline||!mayDaily()||!c.item.startedAt||Date.now()-c.item.startedAt<c.item.minutes*60000)return;
    const p=plan(),now=Date.now();if(p.pinUntil>now)return toast('请稍后再请家长确认');
    if(!S.parentPin||$('l66ParentPin')?.value!==S.parentPin){p.pinWrong=(p.pinWrong||0)+1;if(p.pinWrong>=3){p.pinUntil=now+60000;p.pinWrong=0}save();return toast('请家长输入正确PIN')}
    p.pinWrong=0;p.screenSeconds=0;finishDaily(c);
  }
  function dailyTrace(){const c=itemTask();if(!c||!mayDaily()||c.t.type!=='trace')return;if(dailyHeard!==taskKey(c))return toast('先听完整字音');traceDaily=c;window.G1_TRACE_CONTEXT=null;openTraceV42(c.t.char,c.t.pinyin)}
    const previousQuiz=startHQ,previousClose=clHW;
  startHQ=function(){if(!traceDaily)return previousQuiz();const c=traceDaily;if(!_hw||!mayDaily())return;let mistakes=0;_hw.quiz({onMistake:()=>{mistakes++;$('hwFb').textContent='看清起笔、方向和笔顺，再试试'},onComplete:result=>{const score=Math.max(0,100-Math.max(mistakes,result.totalMistakes||0)*12);if(traceDaily!==c)return;$('hwFb').textContent='得分 '+score+(score<65?'，再按笔顺写一次':'，书写通过');if(score>=65){S.chars[c.t.char]=true;finishDaily(c);traceDaily=null;setTimeout(()=>clHW(),600)}else playCue('trace_retry','')}})};
  clHW=function(){traceDaily=null;previousClose()};
  function updateDaily(){
    if(CP!=='daily66'||$('p68Practice'))return;const p=plan(),left=remaining(),clock=$('l66DailyClock');if(clock)clock.textContent='基础学习可用 '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
    if(left<=0&&current()&&$('l66Listen')){stopAudio();clHW();renderDaily();return}
    if($('l66BreakClock')){const rest=Math.max(0,Math.ceil((p.breakUntil-Date.now())/1000));$('l66BreakClock').textContent=Math.floor(rest/60)+':'+String(rest%60).padStart(2,'0');if(rest===0){p.breakUntil=0;p.screenSeconds=0;save();renderDaily()}return}
    const c=itemTask();if(!c?.item.offline||!c.item.startedAt)return;
    const sec=Math.max(0,Math.ceil((c.item.startedAt+c.item.minutes*60000-Date.now())/1000));
    if($('l66OfflineStart'))$('l66OfflineStart').disabled=true;
    if($('l66OfflineClock'))$('l66OfflineClock').textContent=sec?'离屏活动 '+Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'):'活动时间到了';
    if(sec===0&&$('l66OfflineConfirm')&&!$('l66ParentPin'))$('l66OfflineConfirm').innerHTML='<p>家长确认孩子确实完成了活动</p><input id="l66ParentPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="家长PIN"><button onclick="L66.offlineConfirm()">家长确认完成</button>';
  }

  // Four evenly spaced guidelines: upper, middle, baseline, lower.
  // Fit x-height to the middle band; preserve ascenders/descenders and tone marks.
  let pen=null,writeText='',letterIndex=0,showModel=true;
  function write(text){writeText=String(text).normalize('NFC').replace(/[^a-zA-Zāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜüɑ\s'-]/g,'').slice(0,60).trim();if(!writeText)return;letterIndex=0;showModel=true;renderWriting()}
  function renderWriting(){
    modal('l66Writing',`<header><h2>✏️ 四线三格练写</h2><button onclick="L66.closeWriting()" aria-label="关闭练写">×</button></header><p class="l66-note">中间一格放主体，长笔向上或向下伸；调号写在上方。练写不自动计分。</p><div class="l66-letters">${Array.from(writeText).map((c,i)=>`<button onclick="L66.selectLetter(${i})" aria-label="练写${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="l66-paper"><canvas id="l66Model"></canvas><canvas id="l66Pen" aria-label="四线三格书写画布"></canvas></div><div class="l66-actions"><button onclick="L66.clearWriting()">🧽 擦掉重写</button><button onclick="L66.toggleModel()">显示 / 隐藏范字</button></div><p class="l66-note">笔迹仅保存在当前设备，不上传。</p>`);drawWriting();
  }
  function draftKey(){return writeText+'::'+letterIndex}
  function paths(){const d=state().drafts;return d[draftKey()]||(d[draftKey()]=[])}
  function drawWriting(){
    const model=$('l66Model'),canvas=$('l66Pen');if(!model||!canvas)return;
    model.width=canvas.width=900;model.height=canvas.height=450;
    const ctx=model.getContext('2d');ctx.strokeStyle='#d296ad';ctx.lineWidth=2;
    for(const y of [90,180,270,360]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke()}
    if(showModel){const ch=Array.from(writeText)[letterIndex]||'a';ctx.font='100px Arial';const xHeight=ctx.measureText('x').actualBoundingBoxAscent||52;const size=9000/xHeight;ctx.font=size+'px Arial';ctx.textAlign='center';ctx.fillStyle='#b5a3cf';ctx.fillText(ch==='ɑ'?'a':ch,450,270)}
    redrawPen();canvas.onpointerdown=e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);pen={id:e.pointerId,path:[]};addPoint(e)};
    canvas.onpointermove=e=>{if(pen&&pen.id===e.pointerId){addPoint(e);redrawPen(pen.path)}};
    canvas.onpointerup=e=>{if(!pen||pen.id!==e.pointerId)return;addPoint(e);const all=paths();if(all.length<100)all.push(pen.path);pen=null;const d=state().drafts;Object.keys(d).slice(0,Math.max(0,Object.keys(d).length-30)).forEach(k=>delete d[k]);save();redrawPen()};
    canvas.onpointercancel=()=>{pen=null;redrawPen()};
  }
  function addPoint(e){const r=$('l66Pen').getBoundingClientRect();if(pen.path.length<1500)pen.path.push([Math.max(0,Math.min(900,(e.clientX-r.left)/r.width*900)),Math.max(0,Math.min(450,(e.clientY-r.top)/r.height*450))])}
  function redrawPen(pending){const canvas=$('l66Pen');if(!canvas)return;const c=canvas.getContext('2d');c.clearRect(0,0,900,450);c.strokeStyle='#6944b0';c.lineWidth=6;c.lineCap='round';c.lineJoin='round';[...paths(),...(pending?[pending]:[])].forEach(path=>{c.beginPath();path.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()})}
  function selectLetter(i){if(i<0||i>=Array.from(writeText).length)return;letterIndex=i;pen=null;drawWriting()}
  function closeWriting(){$('l66Writing')?.remove();pen=null}
  function clearWriting(){state().drafts[draftKey()]=[];pen=null;save();redrawPen()}
  function toggleModel(){showModel=!showModel;drawWriting()}
  function writeDaily(){const c=itemTask();if(!c)return;let text=c.t.answer;if(c.item.id==='english'){const m=c.t.id.match(/^en_(\d+)_(\d+)$/);text=m?V44_ENGLISH[+m[1]].items[+m[2]][1]:''}write(text)}
  ['english','englishsync'].forEach(route=>{const old=PGS[route]?.render;if(!old)return;PGS[route].render=function(){old();document.querySelectorAll('.english-word').forEach(card=>{const b=document.createElement('button');b.className='l66-write-btn';b.textContent='✏️ 四线三格';b.onclick=()=>write(card.querySelector('strong').textContent);card.append(b)})}});
  let pinyinGlyph='a';const originalPlay=pinyinV63Play;
  pinyinV63Play=function(...args){const button=args.find(x=>x instanceof Element);if(button)pinyinGlyph=button.firstChild?.textContent.trim()||'a';return originalPlay(...args)};
  const originalPinyinRender=PGS.pinyin.render;PGS.pinyin.render=function(){originalPinyinRender();const b=document.createElement('button');b.className='l66-write-btn';b.textContent='✏️ 练写刚才点读的拼音 · 四线三格';b.onclick=()=>write(pinyinGlyph);document.querySelector('.p63-hero')?.after(b)};
  const reviewAnswer=g1AnswerReview;
  g1AnswerReview=function(id,i,el){const q=G.game().reviewQueue[id];if(!q||q.task.options[i]===undefined)return;if(!attempt(id,q.task,q.task.options[i],true))return;reviewAnswer(id,i,el)};
  const pinyinAnswer=pinyinV63Answer;
  pinyinV63Answer=function(value,button){const c=pinyinV66Question();if(!c||!attempt(c.key,c.task,c.format(value),true))return;pinyinAnswer(value,button)};
  // Apply the same intervention to the existing free-practice routes as well.
  function wrapAnswer(name,get){const old=window[name];if(!old)return;window[name]=function(...args){const c=get(...args);if(!c||!attempt(c.key,c.task,c.value))return;return old(...args)}}
  const normalized=(q,key,audio,value)=>q?{key,value,task:{type:'choice',prompt:q.q,options:q.o,answer:q.a,audio}}:null;
  wrapAnswer('answerMath44',v=>normalized(v44MathQ,'math44_'+v44MathQ?.id,'assets/math-v44/question_'+String(v44MathQ?.id).padStart(2,'0')+'.mp3',v));
  wrapAnswer('answerMathLower45',v=>normalized(v45MathLowerQ,'math45l_'+v45MathLowerQ?.id,'assets/math-v45-lower/question_'+String(v45MathLowerQ?.id).padStart(2,'0')+'.mp3',v));
  wrapAnswer('answerTime45',v=>normalized(v45TimeQ,'time45_'+v45TimeQ?.id,'assets/time-v45/question_'+String(v45TimeQ?.id).padStart(2,'0')+'.mp3',v));
  wrapAnswer('answerMathV42',v=>normalized(v42MathQ,'math_'+v42MathQ?.id,'assets/math-v42/question_'+String(v42MathQ?.id).padStart(2,'0')+'.mp3',v));
  wrapAnswer('answerReadingV42',(i,v)=>normalized(V42_READINGS[i],'read_'+i,'assets/reading/reading_'+String(i+1).padStart(2,'0')+'.mp3',v));
  wrapAnswer('answerEnglish44',v=>{const q=v44EnglishQuiz;return q?{key:'english44_'+q.u+'_'+q.i,value:v,task:{type:'choice',prompt:'听一听，选出它的意思',options:q.opts,answer:q.a,audio:'assets/english-v44/u'+String(q.u+1).padStart(2,'0')+'_'+String(q.i+1).padStart(2,'0')+'.mp3'}}:null});
  wrapAnswer('answerThinkV6',v=>{const q=THINK_V6[thinkV6];return{key:'think66_'+thinkV6,value:v,task:{type:'choice',prompt:q.prompt+' '+q.seq,options:q.options,answer:q.answer}}});

  const previousPage=showPage;
  showPage=function(id){stopAudio();dailyHeard='';return previousPage(id)};
  const parentRender=PGS.parent.render;
  PGS.parent.render=function(){parentRender();if(!S._parentAuth)return;const p=plan();$('ct').insertAdjacentHTML('beforeend',`<section class="l66-card"><h2>今日全科计划</h2><p>已完成 ${p.items.filter(x=>x.done).length} / ${p.items.length} 项。拼音、汉字、数学、英语各一个真实短任务，另有20分钟钢琴练习。</p><p>基础学习参考9分钟、最多10分钟，钢琴另计20分钟。暂停、隐藏页面及护眼休息不计入练琴时间；休息可能使实际结束时间超过30分钟。原有屏幕限额不关闭，未完成内容不强迫赶完。</p><p>第三次答错仍触发示范和再验证。钢琴需满20分钟并由家长PIN确认；麦克风只辅助单音识别，不独立证明孩子完成了练习，也不自动发三星。</p></section>`)};

  window.L66={attempt,openGuard,guardListen,verifyStart,verify,leaveGuard,startDaily,dailyListen,dailyAnswer,dailyTrace,offlineStart,offlineConfirm,write,writeDaily,selectLetter,closeWriting,clearWriting,toggleModel,plan};
  let coreTick=performance.now();
  setInterval(()=>{
    const now=performance.now(),delta=Math.max(0,now-coreTick);coreTick=now;
    updateGuard();updateDaily();
    if(CP==='daily66'&&remaining()>0&&!document.hidden&&!_eyeMode){const p=plan(),c=itemTask();if(p.breakUntil<=Date.now()&&c&&delta<=1500){p.coreMs=Math.min(600000,(p.coreMs||0)+delta);p.screenSeconds++;if(remaining()<=0){save();stopAudio();clHW();renderDaily()}}if(p.screenSeconds%10===0)save()}
  },1000);
  window.addEventListener('pagehide',()=>save());
})();
