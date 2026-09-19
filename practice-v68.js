/* Numbered answers + parent-supervised piano practice. Microphone is opt-in,
 * local analysis only; no MediaRecorder, speech recognition, or audio uploads. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id),G=G1Learning,LIMIT=1200000;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day=()=>G.localDay();
  let running=false,lastTick=0,runDay='',stream=null,context=null,source=null,analyser=null,buffer=null;
  let epoch=0,pending=false,sampling=null,target=60,mode='target',stable=0,lastMidi=null,lastEvent=-Infinity;
  let status='准备好琴谱，坐稳后再开始。',heard='等待单音',advice='先选一个目标音，在真钢琴或电子琴上弹。';
  function state(){if(S.piano68?.day!==day())S.piano68={day:day(),ms:0,done:false,checks:0,matches:0,pinWrong:0,pinUntil:0};return S.piano68}
  function mounted(){return !!$('p68Practice')&&(CP==='daily66'||CP==='piano')}
  function allowed(){return mounted()&&!document.hidden&&!_eyeMode&&!state().done&&state().ms<LIMIT}
  function time(ms){const s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
  function render(){
    pause();const s=state();
    $('ct').innerHTML=`<main class="p68-page" id="p68Practice"><button class="g1-back" onclick="showPage('home')">← 返回</button><section class="p68-hero"><span>今日成长计划 · 第5项</span><h1>🎹 每天练琴20分钟</h1><p>看琴键，慢慢弹。累了随时暂停。</p><div id="p68Clock" class="p68-clock" role="timer" aria-label="钢琴剩余练习时间">${time(LIMIT-s.ms)}</div><progress id="p68Progress" max="1200000" value="${s.ms}" aria-label="钢琴练习进度"></progress><div class="p68-actions"><button id="p68Start" onclick="Piano68.start()">▶ 开始 / 继续计时</button><button id="p68Pause" onclick="Piano68.pause()">Ⅱ 暂停</button></div><p id="p68Status" role="status"></p><p class="p68-note">只累计本页前台的练习时间。离开、锁屏或护眼休息会暂停，刷新后可继续。满20分钟后请家长确认实际练习。</p></section><section class="p68-card"><h2>👂 单音小耳朵 · 辅助练习</h2><p>请家长开启麦克风。只在本机分析声音，不录音、不上传。</p><div class="p68-actions"><button id="p68Mic" onclick="Piano68.askMic()">家长开启麦克风</button><button id="p68StopMic" onclick="Piano68.stopMic()">关闭麦克风</button></div><label class="p68-mode">练习方式 <select id="p68Mode" onchange="Piano68.mode(this.value)"><option value="target">找一找目标琴键</option><option value="free">自由弹单音</option></select></label><div class="p68-keys" aria-label="目标音选择">${[60,62,64,65,67,69,71,72].map((m,i)=>`<button data-midi="${m}" aria-pressed="${m===target}" onclick="Piano68.target(${m})"><strong>${PianoPitch68.name(m)}</strong><small>${['do','re','mi','fa','sol','la','si','do'][i]}</small></button>`).join('')}</div><p id="p68Target" class="p68-target"></p><div class="p68-listening"><strong id="p68Heard"></strong><p id="p68Advice" role="status"></p></div><p class="p68-note">范围C3–C6，标准A4=440Hz。一次弹一个音，松开延音踏板；不支持和弦、伴奏或整曲评分。环境、设备和泛音可能造成误差，结果请老师或家长复核，不作为调琴依据。</p></section><section class="p68-card"><h2>🧑‍🧒 今日练琴确认</h2><p id="p68Summary"></p><button id="p68Confirm" onclick="Piano68.askFinish()">家长确认完成20分钟</button><p class="p68-note">计时不等于证明一直在弹琴。此记录不自动兑换三星、钻石或宠物经验。</p></section></main>`;
    $('p68Mode').value=mode;update();
  }
  function update(){if(!mounted())return;const s=state();
    $('p68Clock').textContent=time(LIMIT-s.ms);$('p68Progress').value=s.ms;
    $('p68Status').textContent=s.done?'今天已完成，收好琴谱休息吧！':s.ms>=LIMIT?'20分钟到了，请家长确认。':status;
    $('p68Start').disabled=running||s.done||s.ms>=LIMIT||!!_eyeMode;
    $('p68Pause').disabled=!running;
    $('p68Mic').disabled=pending||!!stream||s.done||s.ms>=LIMIT;
    $('p68Mic').textContent=pending?'等待浏览器授权…':stream?'麦克风已开启':'家长开启麦克风';
    $('p68StopMic').disabled=!stream&&!pending;
    $('p68Confirm').disabled=s.ms<LIMIT||s.done||!!_eyeMode;
    $('p68Target').textContent=mode==='target'?'目标音：'+PianoPitch68.name(target)+(target===60?'（中央C）':''):'自由单音：显示听到的音，不判断曲谱对错';
    $('p68Heard').textContent=heard;$('p68Advice').textContent=advice;
    $('p68Summary').textContent='今天已计时 '+time(s.ms)+'；'+(s.checks?`目标模式收到 ${s.checks} 次稳定音候选，其中 ${s.matches} 次与目标音一致。仅供参考。`:'还没有单音参考记录，也可以由家长陪练确认。');
  }
  function stopAudio(){v46StopAudio();if(typeof pinyinV63Stop==='function')pinyinV63Stop();if(typeof stopPianoV6==='function')stopPianoV6()}
  function start(){if(!allowed())return;running=true;runDay=day();lastTick=performance.now();status='正在计时 · 看琴键，不必一直看屏幕';update()}
  function releaseMic(){epoch++;pending=false;clearInterval(sampling);sampling=null;stream?.getTracks().forEach(t=>t.stop());stream=null;source?.disconnect();source=null;analyser=null;buffer=null;const old=context;context=null;old?.close().catch(()=>{});stable=0;lastMidi=null}
  function pause(){const changed=running||!!stream||pending;running=false;releaseMic();status='已暂停 · 时间已保存，麦克风已关闭';if(changed)R();update()}
  function stopMic(){releaseMic();heard='麦克风已关闭';advice='可以继续计时，请家长陪伴练习。';update()}
  function dialog(kind){if(!mounted()||_eyeMode)return;if(kind==='finish'&&(state().ms<LIMIT||state().done))return;
    pause();$('p68Consent')?.remove();const el=document.createElement('div');el.id='p68Consent';el.className='l66-modal';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','p68ConsentTitle');
    el.innerHTML=`<section><h2 id="p68ConsentTitle">${kind==='mic'?'家长同意本机单音分析':'家长确认今天练琴'}</h2><p>${kind==='mic'?'会申请麦克风权限，仅在此页分析声音，不保存录音、不上传。关闭、离开或休息时立即释放麦克风。不授权也能使用计时。':'请确认孩子今天确实累计练琴20分钟。网页计时和音准反馈不能替代家长观察。'}</p><label>家长PIN<input id="p68Pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></label><label class="p68-check"><input id="p68Agree" type="checkbox">${kind==='mic'?'我同意开启麦克风进行本机分析':'我已观察并确认孩子完成了练习'}</label><p id="p68PinMessage" role="status"></p><div class="p68-actions"><button onclick="Piano68.authorize('${kind}')">${kind==='mic'?'同意并开启':'确认完成'}</button><button onclick="Piano68.closeDialog()">取消</button></div></section>`;document.body.append(el);$('p68Pin').focus();
  }
  function closeDialog(){$('p68Consent')?.remove();$('p68Start')?.focus()}
  async function authorize(kind){const s=state();if(!$('p68Consent')||!mounted()||_eyeMode)return;
    if(s.pinUntil>Date.now()){$('p68PinMessage').textContent='请稍后再试。';return}
    if(!$('p68Agree').checked){$('p68PinMessage').textContent='请家长先阅读并勾选同意。';return}
    if(!S.parentPin||$('p68Pin').value!==S.parentPin){s.pinWrong=(s.pinWrong||0)+1;if(s.pinWrong>=3){s.pinUntil=Date.now()+60000;s.pinWrong=0}R();$('p68PinMessage').textContent='PIN不正确，请家长输入。';return}
    s.pinWrong=0;closeDialog();
    if(kind==='finish'){
      if(s.ms<LIMIT||s.done)return;s.done=true;s.confirmedAt=Date.now();
      S.pianoLog=S.pianoLog||{};S.pianoLog['piano_'+day()]={sec:1200,time:Date.now(),verification:'parent',checks:s.checks,matches:s.matches};
      const p=L66.plan(),item=p.items.find(x=>x.id==='piano');if(item){item.done=true;item.doneAt=Date.now()}if(p.items.every(x=>x.done))p.doneAt=Date.now();
      G.recordActivity('daily-complete',{id:'piano20',region:'interest',title:'20分钟钢琴练习'},{subject:'piano'});R();update();return;
    }
    if(kind==='mic')await enableMic();
  }
  async function enableMic(){
    if(!allowed())return;
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){status='此浏览器无法开启麦克风，可用计时模式。';update();return}
    releaseMic();const id=epoch;pending=true;status='请在浏览器提示中选择允许；也可取消。';update();
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)throw new Error('Unsupported');
      context=new AudioCtx();await context.resume();
      if(id!==epoch||!allowed())return;
      const media=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(id!==epoch||!allowed()){media.getTracks().forEach(t=>t.stop());return}
      stream=media;pending=false;analyser=context.createAnalyser();analyser.fftSize=4096;buffer=new Float32Array(analyser.fftSize);source=context.createMediaStreamSource(stream);source.connect(analyser); // Never connect microphone to speakers.
      stream.getTracks().forEach(track=>track.addEventListener('ended',()=>{if(stream===media){pause();status='麦克风已断开，请重新开启或使用计时。';update()}},{once:true}));
      stopAudio();heard='正在听单音';advice='慢慢弹一个音，等它停下来再弹下一个。';sampling=setInterval(sample,125);start();
    }catch(error){if(id!==epoch)return;releaseMic();status=error.name==='NotAllowedError'?'没有获得麦克风权限，可以继续使用计时。':error.name==='NotFoundError'?'没有找到麦克风，可以继续使用计时。':'麦克风未就绪，请重试或使用计时。';update()}
  }
  function sample(){
    if(!allowed()||context?.state!=='running'){pause();return}
    analyser.getFloatTimeDomainData(buffer);const p=PianoPitch68.detect(buffer,context.sampleRate);
    if(!p){stable=0;lastMidi=null;heard='暂不能判断';advice='请一次弹一个音，松开踏板，尽量保持周围安静。';update();return}
    stable=p.midi===lastMidi?stable+1:1;lastMidi=p.midi;if(stable<3)return;
    heard='听到的候选音：'+p.name;
    if(mode==='free')advice='这是单音参考；自由练习不判断曲谱对错。';
    else if(p.midi!==target)advice='目标是 '+PianoPitch68.name(target)+'，请看看琴键位置，再慢慢试一次。';
    else if(Math.abs(p.cents)>25)advice='音名与目标一致，但音高估计有偏差，请家长复听；先不要调琴。';
    else advice='这个单音与目标很接近！保持放松，再稳稳地弹一次。';
    // Count one event after an onset/target change, not every sampled frame.
    if(mode==='target'&&stable===3&&performance.now()-lastEvent>700){const s=state();s.checks++;if(p.midi===target&&Math.abs(p.cents)<=25)s.matches++;lastEvent=performance.now()}
    update();
  }
  function chooseTarget(m){if(![60,62,64,65,67,69,71,72].includes(m))return;target=m;stable=0;lastMidi=null;document.querySelectorAll('.p68-keys button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.midi===target)));update()}
  const oldPage=showPage;showPage=function(id){pause();closeDialog();return oldPage(id)};
  const oldEye=eyeOpen;eyeOpen=function(...args){pause();return oldEye(...args)};
  const oldCue=playCue;playCue=function(...args){if(stream||pending)return;return oldCue(...args)};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});window.addEventListener('pagehide',pause);
  document.addEventListener('keydown',e=>{const modal=$('p68Consent');if(!modal)return;if(e.key==='Escape')closeDialog();if(e.key==='Tab'){const nodes=[...modal.querySelectorAll('input,button')].filter(x=>!x.disabled),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
  setInterval(()=>{
    if(!running)return;const now=performance.now(),delta=now-lastTick;lastTick=now;
    if(runDay!==day()||!allowed()){pause();return}
    // A throttled/suspended timer must not award an unobserved wall-clock gap.
    if(delta<=0||delta>1500){pause();return}
    const s=state(),previous=s.ms;s.ms=Math.min(LIMIT,s.ms+delta);
    if(Math.floor(previous/5000)!==Math.floor(s.ms/5000))R();
    if(s.ms>=LIMIT)pause();update();
  },250);
  PGS.piano={title:'🎹 20分钟钢琴练习',render};
  window.Piano68={render,start,pause,stopMic,askMic:()=>dialog('mic'),askFinish:()=>dialog('finish'),authorize,closeDialog,target:chooseTarget,mode:value=>{mode=value==='free'?'free':'target';stable=0;lastMidi=null;update()}};
  // CSS-generated ordinals leave answer text/option audio payloads unchanged.
  const groupSelector='.g1-answers,.l66-options,.p63-answers,.v42-answer-grid,.mopts';
  function numberOptions(){document.querySelectorAll(groupSelector).forEach(group=>{
    const options=Array.from(group.querySelectorAll('button,.moi')).filter(b=>!b.classList.contains('v47-choice-hear')&&b.closest(groupSelector)===group);
    options.forEach((b,i)=>{if(b.dataset.optionNumber!==String(i+1))b.dataset.optionNumber=String(i+1);const label='选项'+(i+1)+'：'+b.textContent.trim();if(b.getAttribute('aria-label')!==label)b.setAttribute('aria-label',label)})
  })}
  new MutationObserver(records=>{if(records.some(r=>r.target.closest?.(groupSelector)||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches(groupSelector)||n.querySelector(groupSelector)||n.closest(groupSelector)))))numberOptions()}).observe(document.body,{childList:true,subtree:true});numberOptions();
})();
