/* Persisted, audio-led screen breaks. Device App restrictions remain OS-owned. */
(()=>{
  'use strict';
  const KEY='grade1_eye_rest_v70',DURATION=600000,MAX=3;
  let data={},audio=null,lastTick=performance.now(),pinUntil=0,pinWrong=0,screen='',restoreFocus=null;
  const inertSaved=new Map(),basePage=showPage,baseFix=scrFix;
  try{data=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(_){}}
  function normalize(){
    if(typeof data!=='object'||Array.isArray(data))data={};
    const day=tCN();if(data.day!==day){data.day=day;data.plays=0;data.lock=false;save()}
    data.plays=Math.max(0,Math.min(MAX,Number(data.plays)||0));
    if(!Number.isFinite(data.until)||data.until<Date.now()-86400000||data.until>Date.now()+DURATION)data.until=0;
    baseFix();S.scr.restMin=10;S.scr.used=Math.max(0,Number(S.scr.used)||0);S.scr.cont=Math.max(0,Number(S.scr.cont)||0);
  }
  function limit(){return (Number(S.scr.dayMin)||30)+(Number(S.scr.extMin)||0)}
  function stopMusic(){if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null}}
  function stopLearning(){
    try{v46StopAudio()}catch(_){}
    try{stopDogIdle();_queuedCue=null}catch(_){}
    try{Piano68.pause();Piano68.closeDialog()}catch(_){}
    if(typeof g1SportTimer!=='undefined'&&g1SportTimer){clearInterval(g1SportTimer);g1SportTimer=null}
    if(typeof _pAudio!=='undefined'&&_pAudio){clearInterval(_pAudio);_pAudio=null}
    if(typeof _pianoTimer!=='undefined'&&_pianoTimer){clearInterval(_pianoTimer);_pianoTimer=null}
  }
  function setInert(on){
    for(const el of document.body.children){if(el.id==='eyeLock'||/^(SCRIPT|STYLE|LINK)$/.test(el.tagName))continue;
      if(on){if(!inertSaved.has(el))inertSaved.set(el,el.inert);el.inert=true}
    }
    if(!on){for(const [el,value]of inertSaved)el.inert=value;inertSaved.clear()}
    document.body.classList.toggle('eye70-active',on);
  }
  function mode(){if(data.until>Date.now())return'rest';if(data.until)return'ready';if(data.lock||S.scr.used>=limit()*60)return'lock';return''}
  function durationText(){const s=Math.max(0,Math.ceil((data.until-Date.now())/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
  function render(){
    const ov=document.getElementById('eyeLock');if(!ov)return;
    const m=mode();_eyeMode=m==='ready'?'rest':m||null;
    if(!m){ov.style.display='none';setInert(false);screen='';return}
    ov.style.display='flex';setInert(true);
    if(screen!==m){
      screen=m;ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby','eye70Title');
      const title=m==='lock'?'今天先学到这里':m==='ready'?'这一段休息结束啦':'眼睛去散散步';
      const message=m==='lock'?'今天的学习额度或三次休息安排已结束。伙伴明天再陪你挑战。':m==='ready'?'回来前先感受一下，眼睛舒服吗？不舒服就告诉爸爸妈妈。':'放下屏幕，听声音就好。看看远处，轻轻闭目休息，再伸伸手臂。';
      ov.innerHTML=`<section class="eye70-card"><div class="eye70-icon" aria-hidden="true">${m==='lock'?'🌙':'🌿'}</div><h1 id="eye70Title" tabindex="-1">${title}</h1><p>${message}</p>${m==='rest'?'<p class="eye70-clock" id="eye70Clock"></p><p class="eye70-small">不用盯着倒计时。音乐停止后也请继续离屏休息。</p><button data-eye70="music" id="eye70Music">🔊 开始 / 继续声音引导</button><button data-eye70="quiet">🔈 安静休息</button><p id="eye70AudioStatus" role="status"></p>':m==='ready'?'<button data-eye70="continue">休息好了，继续</button>':''}<details class="eye70-parent"><summary>家长帮助</summary><p>此页只能暂停学习工具。限制切换其他App，请在设备上设置引导式访问或固定应用。</p><label>家长PIN<input id="eye70Pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></label><button data-eye70="parent">验证并进入家长设置</button><p id="eye70PinStatus" role="status"></p></details></section>`;
      document.getElementById('eye70Title').focus({preventScroll:true});
    }
    const clock=document.getElementById('eye70Clock');if(clock)clock.textContent='还需休息 '+durationText();
  }
  function playMusic(){
    if(mode()!=='rest'||document.hidden)return;
    if(!audio){audio=new Audio('assets/eye-v70/guided-rest.mp3');audio.preload='auto';audio.volume=.65;
      audio.onloadedmetadata=()=>{if(mode()==='rest')audio.currentTime=Math.max(0,Math.min(audio.duration||600,(Date.now()-data.started)/1000))};
      audio.onerror=()=>{const el=document.getElementById('eye70AudioStatus');if(el)el.textContent='声音暂时不可用，请安静休息；计时继续。'};
    }
    const el=document.getElementById('eye70AudioStatus');
    if(audio.readyState>0)audio.currentTime=Math.max(0,Math.min(audio.duration||600,(Date.now()-data.started)/1000));
    audio.play().then(()=>{if(el)el.textContent='声音引导已开启，放下屏幕就好。'}).catch(()=>{if(el)el.textContent='点“开始 / 继续声音引导”开启声音，也可以安静休息。'});
  }
  function open(m){
    normalize();if(mode()){render();return}
    restoreFocus=document.activeElement;stopLearning();
    if(m==='lock'||S.scr.used>=limit()*60||data.plays>=MAX){data.lock=true;data.until=0;stopMusic()}
    else{data.plays++;data.started=Date.now();data.until=data.started+DURATION;data.lock=false}
    save();R();screen='';render();if(mode()==='rest'&&!v41EnsureAudio().muted)playMusic();
  }
  function resume(){
    normalize();if(mode()!=='ready')return;
    data.until=0;S.scr.cont=0;data.lock=data.plays>=MAX||S.scr.used>=limit()*60;
    stopMusic();save();R();screen='';render();scrBadge();
    if(!data.lock){if(CP==='parent')basePage('home');if(restoreFocus?.isConnected)restoreFocus.focus();else document.getElementById('hLogo')?.focus()}
  }
  function parent(){
    const status=document.getElementById('eye70PinStatus');
    if(Date.now()<pinUntil){status.textContent='请稍后再试。';return}
    if(!S.parentPin||document.getElementById('eye70Pin')?.value!==S.parentPin){if(++pinWrong>=3){pinWrong=0;pinUntil=Date.now()+60000}status.textContent='PIN不正确，请家长输入。';return}
    stopMusic();S._parentAuth=true;R();document.getElementById('eyeLock').style.display='none';setInert(false);screen='';basePage('parent');
    // Limits remain saved. Returning to a child route reinstates the guard.
  }
  eyeOpen=open;eyeRender=render;
  scrFix=function(){normalize()};
  eyeParentSkip=parent;eyeParentAdd=parent;eyeGoParent=function(){render();document.querySelector('.eye70-parent')?.setAttribute('open','')};
  showPage=function(id){if(mode()&&!(id==='parent'&&S._parentAuth)){if(id!=='parent')S._parentAuth=false;render();return}stopMusic();return basePage(id)};
  scrTick=function(){
    const now=performance.now(),delta=Math.min(1.5,Math.max(0,(now-lastTick)/1000));lastTick=now;normalize();
    if(mode()){if(mode()!=='rest')stopMusic();if(CP!=='parent'||!S._parentAuth)render();return}
    if(document.hidden||!S.scr.on||CP==='parent')return;
    S.scr.used+=delta;S.scr.cont+=delta;_eyeDirty++;if(_eyeDirty%10===0)R();scrBadge();
    if(S.scr.used>=limit()*60)open('lock');else if(S.scr.cont>=S.scr.contMin*60)open('rest');
  };
  initScreenGuard=function(){
    // Replace both legacy timers, including the countdown that reset on reload.
    clearInterval(_eyeTimer);clearInterval(_restInt);normalize();lastTick=performance.now();
    _eyeTimer=setInterval(scrTick,1000);_restInt=null;scrBadge();if(mode()){stopLearning();render()}
  };
  const parentRender=PGS.parent.render;PGS.parent.render=function(){parentRender();if(!S._parentAuth)return;document.querySelectorAll('#ct button[onclick]').forEach(b=>{const x=b.getAttribute('onclick').match(/scrSet\('rest',(\d+)\)/);if(x&&Number(x[1])!==10)b.remove()});document.getElementById('ct').insertAdjacentHTML('beforeend',`<section class="l66-card"><h2>🌿 眼睛去散步</h2><p>连续学习默认20分钟，安排10分钟离屏休息。每日最多播放3次，今日已安排 ${data.plays||0} 次。休息不增加每日学习额度。</p><p>原创明亮配乐与合成男声引导。远眺、闭目休息和安全舒展；无需按压眼部。孩子可以静音休息，页面只记录休息时间。</p><button onclick="Eye70.preview()">🎵 试听30秒配乐</button><button onclick="Eye70.stopPreview()">停止试听</button><p>刷新或重开保留休息期限。家长可在本页调整每日额度；离开本页仍会检查休息期限。第三次休息后结束当日儿童学习。</p><a href="assets/eye-v70/SOURCES.md" target="_blank" rel="noopener">编排依据与音频说明</a></section>`)};
  const baseScrSet=scrSet;scrSet=function(k,v){return baseScrSet(k,k==='rest'?10:v)};
  document.getElementById('eyeLock').addEventListener('click',e=>{const a=e.target.closest('[data-eye70]')?.dataset.eye70;if(a==='music')playMusic();if(a==='quiet')stopMusic();if(a==='continue')resume();if(a==='parent')parent()});
  document.addEventListener('keydown',e=>{const ov=document.getElementById('eyeLock');if(ov.style.display!=='flex')return;if(e.key==='Escape'){e.preventDefault();return}if(e.key==='Tab'){const els=[...ov.querySelectorAll('button,input,summary')].filter(el=>el.getClientRects().length);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&(document.activeElement===first||!els.includes(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!els.includes(document.activeElement))){e.preventDefault();first.focus()}}});
  document.addEventListener('visibilitychange',()=>{R();save();lastTick=performance.now();if(document.hidden){stopMusic();stopLearning()}else if(mode())render()});
  window.addEventListener('pagehide',()=>{R();save();stopMusic()});
  const baseQueued=playQueuedCue;playQueuedCue=function(){if(!mode())return baseQueued()};
  const baseCue=playCue;playCue=function(...args){if(!mode())return baseCue(...args)};
  window.Eye70={version:70,state:()=>({...data}),preview:()=>{stopMusic();audio=new Audio('assets/eye-v70/warm-preview.mp3');audio.volume=.65;audio.play().catch(()=>toast('暂时无法播放，请重试'))},stopPreview:stopMusic};
})();
