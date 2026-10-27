/* 低年级每日学习搭子 v63：MIT 真人拼音表，本地解码、四声切分、点读与分步拼读。 */
(function(){
  'use strict';
  const ROOT='assets/pinyin-v63/';
  const INITIALS=[
    ['b','bo','双唇闭合，不送气'],['p','po','双唇闭合，要送气'],['m','mo','双唇闭合，气流走鼻腔'],['f','fo','上齿轻碰下唇'],
    ['d','de','舌尖抵上齿龈，不送气'],['t','te','舌尖抵上齿龈，要送气'],['n','ne','舌尖抵上齿龈，气流走鼻腔'],['l','le','舌尖抵上齿龈，气流从两边出'],
    ['g','ge','舌根抬起，不送气'],['k','ke','舌根抬起，要送气'],['h','he','舌根靠近软腭，轻轻呼气'],
    ['j','ji','舌面抬起，不送气'],['q','qi','舌面抬起，要送气'],['x','xi','舌面靠近硬腭，轻轻摩擦'],
    ['zh','zhi','翘舌，不送气'],['ch','chi','翘舌，要送气'],['sh','shi','翘舌，气流摩擦'],['r','ri','翘舌，声带振动'],
    ['z','zi','平舌，不送气'],['c','ci','平舌，要送气'],['s','si','平舌，气流摩擦'],['y','yi','整体拼写字母'],['w','wu','整体拼写字母']
  ];
  const FINALS=[
    ['ɑ','a'],['o','o'],['e','e'],['i','yi'],['u','wu'],['ü','yu'],['ɑi','ai'],['ei','ei'],['ui','wei'],['ɑo','ao'],['ou','ou'],['iu','you'],
    ['ie','ye'],['üe','yue'],['er','er'],['ɑn','an'],['en','en'],['in','yin'],['un','wen'],['ün','yun'],['ɑng','ang'],['eng','eng'],['ing','ying'],['ong','zhong']
  ];
  const WHOLE=['zhi','chi','shi','ri','zi','ci','si','yi','wu','yu','ye','yue','yuan','yin','yun','ying'];
  const buffers=new Map(),segments=new WeakMap();
  let boundaries=null,boundaryPromise=null,sequence=0,renderEpoch=0;
  async function getBoundaries(){if(boundaries)return boundaries;if(!boundaryPromise)boundaryPromise=fetch(ROOT+'segments-v83.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('音频校验表未加载');return r.json()}).catch(e=>{boundaryPromise=null;throw e});boundaries=await boundaryPromise;return boundaries}
  async function approvedSpans(name,buffer){const table=await getBoundaries(),row=table.files[normalize(name)];if(!row||row.spans.length!==4||Math.abs(row.duration-buffer.duration)>.15)throw Error('此音频尚未通过分段检查');return row.spans}
  let ctx=null,active=null,part='initials',tone=1,manifest=null,current={name:'a',tone:1},challenge=null;
  const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function normalize(s){return PinyinRules82.normalize(s)}
  function toneNumber(id){const m=String(id||'').match(/([1-4])$/);return m?Number(m[1]):1}
  function toneMark(raw,n){
    let s=String(raw).replaceAll('v','ü').replaceAll('ɑ','a');if(n===5||!n)return s;
    const marks={a:'āáǎà',o:'ōóǒò',e:'ēéěè',i:'īíǐì',u:'ūúǔù','ü':'ǖǘǚǜ'};
    let at=s.indexOf('a');if(at<0)at=s.indexOf('o');if(at<0)at=s.indexOf('e');
    if(at<0){const iu=Math.max(s.lastIndexOf('i'),s.lastIndexOf('u'),s.lastIndexOf('ü'));at=iu}
    return at<0?s:s.slice(0,at)+marks[s[at]][n-1]+s.slice(at+1)
  }
  function ensureContext(){if(!AudioContextCtor)throw new Error('此浏览器不支持本地点读');if(!ctx)ctx=new AudioContextCtor();return ctx.state==='running'?Promise.resolve(ctx):ctx.resume().then(()=>ctx)}
  async function getBuffer(name){
    name=normalize(name);if(buffers.has(name)){const value=buffers.get(name);buffers.delete(name);buffers.set(name,value);return value}
    const path=ROOT+encodeURIComponent(name)+'.mp3';
    const request=window.Fast69?Fast69.fetchAsset(path):fetch(path,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('音频未找到');return r.arrayBuffer()});
    const promise=request.then(async b=>{const table=await getBoundaries(),row=table.files[name];if(!row||!crypto.subtle)throw Error('此录音尚未通过校验');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==row.sha256)throw Error('录音版本不匹配，请刷新重试');const decoded=await ensureContext().then(c=>c.decodeAudioData(b.slice(0)));segments.set(decoded,await approvedSpans(name,decoded));return decoded});
    buffers.set(name,promise);if(buffers.size>12)buffers.delete(buffers.keys().next().value);try{return await promise}catch(e){buffers.delete(name);throw e}
  }
  function findSegments(buffer){
    // Compatibility/debug helper must use the SAME reviewed table as playback.
    // Never run energy heuristics here or merge a fifth noise cluster into a tone.
    const spans=segments.get(buffer);if(!spans)throw Error('请先加载已校验的本地录音');return spans
  }
  let playGeneration=0;
  window.pinyinV63Stop=function(){sequence++;playGeneration++;document.querySelectorAll('.p63-card.playing').forEach(b=>b.classList.remove('playing'));if(active){try{active.stop()}catch(_){}active=null}};
  window.pinyinV69Prepare=name=>{Promise.all([getBoundaries(),ensureContext().then(()=>getBuffer(name))]).catch(()=>{})};
  async function play(name,n=1,options={}){
    const generation=++playGeneration;
    document.querySelectorAll('.p63-card.playing').forEach(b=>b.classList.remove('playing'));
    if(active){try{active.stop()}catch(_){}active=null}
    if(typeof v46StopAudio==='function')v46StopAudio();
    if(typeof v41EnsureAudio==='function'&&v41EnsureAudio().muted)throw Error('请先打开声音');
    const status=document.getElementById('p63Status');if(status){status.className='p63-status';status.textContent='正在准备真人发音…'}
    try{
      if(!Number.isInteger(n)||n<1||n>4)throw Error('请选择一至四声');
      const c=await ensureContext(),[buffer]=await Promise.all([getBuffer(name),getBoundaries()]),span=(await approvedSpans(name,buffer))[Math.max(0,Math.min(3,n-1))];if(generation!==playGeneration)return false;if(active)try{active.stop()}catch(_){}
      const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.connect(gain).connect(c.destination);gain.gain.value=.95;active=source;
      const start=span[0]+(options.trimStart||0),duration=Math.max(.18,span[1]-start);source.start(0,start,duration);
      document.querySelectorAll('.p63-card.playing').forEach(x=>x.classList.remove('playing'));if(options.button)options.button.classList.add('playing');
      return await new Promise(resolve=>{source.onended=()=>{if(active===source)active=null;if(generation===playGeneration){if(options.button)options.button.classList.remove('playing');if(status)status.textContent='点一下可以再听一遍';options.onEnd&&options.onEnd();resolve(true)}else resolve(false)}})
    }catch(e){if(generation!==playGeneration)return false;if(status){status.className='p63-status p63-error';status.textContent='音频没有加载成功，请点一下重试；不会使用设备合成音代读。'}throw e}
  }
  function token(name,n=1){return 'p63|'+normalize(name)+'|'+Math.max(1,Math.min(4,Number(n)||1))}
  function parseToken(value){const p=String(value||'').split('|');return p[0]==='p63'?{name:p[1],tone:Number(p[2])||1}:null}
  function taskToken(x){
    const label=String(x?.[0]||''),id=String(x?.[1]||'');let n=toneNumber(id),base=normalize(id),name=base;
    if(base==='i')name='yi';else if(base==='u')name='wu';else if(base==='v')name='yu';
    const initial=INITIALS.find(v=>v[0]===label);if(initial){name=initial[1];n=1}
    const final=FINALS.find(v=>normalize(v[0])===normalize(label));if(final)name=final[1];
    return token(name,n)
  }
  async function playToken(value,onEnd){const p=parseToken(value);if(!p)throw new Error('无效拼音音频');return play(p.name,p.tone,{onEnd})}
  function setCurrent(name,n=tone){sequence++;current={name:normalize(name),tone:n};const label=document.getElementById('p63Current');if(label)label.textContent=toneMark(current.name,n);const meta=document.getElementById('p63CurrentMeta');if(meta)meta.textContent='第 '+['一','二','三','四'][n-1]+' 声 · 真人点读'}
  window.pinyinV63Play=function(name,n,button){setCurrent(name,n);return play(name,n,{button}).catch(()=>false)};
  window.pinyinV63ReplayCurrent=function(button){sequence++;return play(current.name,current.tone,{button}).catch(()=>false)};
  window.pinyinV63PlayToken=playToken;window.pinyinV63TaskToken=taskToken;
  // Keep old saved/inline point-read entry points on this same verified engine.
  // The legacy v61 path used bo/ge/ma reference syllables for o/e/a tones.
  window.playPinyinV42=function(id,label){return playToken(taskToken([label,id])).catch(()=>false)};
  function initialCards(){return INITIALS.map(x=>`<button class="p63-card" onclick="pinyinV63Play('${x[1]}',1,this)">${x[0]}<small>呼读音 ${toneMark(x[1],1)}<br>${x[2]}</small></button>`).join('')}
  function finalCards(){return FINALS.map(x=>`<button class="p63-card" onclick="pinyinV63Play('${x[1]}',1,this)">${x[0]}<small>${normalize(x[0])===x[1]?'直接听韵母':'听 '+toneMark(x[1],1)+' 中的韵母'}</small></button>`).join('')}
  function wholeCards(){return WHOLE.map(x=>`<button class="p63-card" onclick="pinyinV63Play('${x}',1,this)">${x}<small>${toneMark(x,1)}</small></button>`).join('')}
  function toneCards(){return ['a','o','e','yi','wu','yu'].flatMap(name=>[1,2,3,4].map(n=>`<button class="p63-card" onclick="pinyinV63Play('${name}',${n},this)">${toneMark(name==='yi'?'i':name==='wu'?'u':name==='yu'?'ü':name,n)}<small>第 ${['一','二','三','四'][n-1]} 声</small></button>`)).join('')}
  function reader(){return `<div class="p63-reader"><div><strong id="p63Current">${toneMark(current.name,current.tone)}</strong><span id="p63CurrentMeta">第 ${['一','二','三','四'][current.tone-1]} 声 · 真人点读</span></div><button class="p63-play" onclick="pinyinV63ReplayCurrent(this)">🔊 点读</button></div>`}
  async function getManifest(){if(manifest)return manifest;const m=await fetch(ROOT+'manifest.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('拼音表清单未加载');return r.json()});const spans=await getBoundaries();if(!Array.isArray(m.files)||m.files.length!==m.count||new Set(m.files.map(x=>x.file)).size!==m.count)throw Error('拼音清单不完整，请刷新重试');for(const x of m.files){const row=spans.files?.[x.file.replace('.mp3','')];if(!row||row.sha256!==x.sha256||row.spans?.length!==4)throw Error('拼音四声校验表不完整，请刷新重试')}manifest=m;return manifest}
  async function renderTable(){
    const body=document.getElementById('p63Body');body.innerHTML='<div class="p63-loading">正在打开完整拼音表…</div>';
    try{const epoch=++renderEpoch,m=await getManifest();if(epoch!==renderEpoch||part!=='table'||!body.isConnected)return;const names=m.files.map(x=>x.file.replace('.mp3','')).filter(x=>!['hm','hng'].includes(x));window.P63_NAMES=names;body.innerHTML=`${reader()}<div class="p63-controls">${[1,2,3,4].map(n=>`<button class="p63-tone ${n===tone?'on':''}" onclick="pinyinV63Tone(${n})">${n}</button>`).join('')}<input id="p63Search" class="p63-search" placeholder="找拼音，如 ing" inputmode="search" oninput="pinyinV63Filter(this.value)"></div><div class="p63-grid p63-syllables" id="p63Syllables">${syllableCards(names)}</div>`}catch(e){body.innerHTML='<div class="p63-loading p63-error">拼音表没有加载成功，请检查网络后重试。</div>'}
  }
  function syllableCards(names){return names.map(x=>`<button class="p63-card" data-py="${x}" onclick="pinyinV63Play('${x}',${tone},this)">${toneMark(x,tone)}<small>四声可切换</small></button>`).join('')}
  window.pinyinV63Tone=function(n){if(!Number.isInteger(n)||n<1||n>4)return;pinyinV63Stop();tone=n;document.querySelectorAll('.p63-tone').forEach((b,i)=>b.classList.toggle('on',i===n-1));const box=document.getElementById('p63Syllables');if(box)box.innerHTML=syllableCards((window.P63_NAMES||[]).filter(x=>!document.getElementById('p63Search')?.value||x.includes(normalize(document.getElementById('p63Search').value))));setCurrent(current.name,n)};
  window.pinyinV63Filter=function(q){const box=document.getElementById('p63Syllables'),needle=normalize(q);if(box)box.innerHTML=syllableCards((window.P63_NAMES||[]).filter(x=>x.includes(needle)))};
  function split(name){return PinyinRules82.analyze(name)}
  window.pinyinV63Blend=async function(){
    const id=++sequence,s=split(current.name),box=document.getElementById('p63BlendSteps'),name=current.name,n=current.tone;
    if(!box)return;
    const kinds={whole:'整体认读 · 不拆拼',two:'两拼音节',three:'三拼音节',zero:'零声母音节',spelling:'音节拼写',unsupported:'完整音节示范'};
    const pieces=s.parts.map((x,i)=>'<span class="p82-piece">'+escapeHtml(toneMark(x,i===s.parts.length-1?n:0))+'</span>');
    box.innerHTML='<div class="p82-kind">'+kinds[s.kind]+'</div><div class="p82-pieces">'+pieces.join('<span class="p63-plus">＋</span>')+(pieces.length>1?'<span class="p63-plus">→</span><strong>'+toneMark(name,n)+'</strong>':'')+'</div><p>'+escapeHtml(s.note||'看清分解，再听完整音节。')+'</p>';
    // Never concatenate bo/ying/zhong recordings and pretend they are phonemes.
    // Structural steps are visual; the model is always the complete recorded syllable.
    try{const ok=await play(name,n);if(id===sequence&&box.isConnected&&ok)box.classList.add('p82-heard')}catch(_){}
  };
  function renderBlend(){document.getElementById('p63Body').innerHTML=`${reader()}<p class="p63-note">先看分解，再听完整真人音节。整体认读不拆拼；三拼显示声母、介母和韵母。不会把示范音节拼成错误的读音。</p><div class="p63-blend-steps" id="p63BlendSteps">选择一个音节，再点“看分解、听拼读”</div><button class="p63-blend" onclick="pinyinV63Blend()">▶ 看分解、听拼读</button><div class="p63-grid">${[['ba',1],['ma',1],['ke',1],['gua',1],['guo',2],['hua',1],['kuai',4],['xian',1],['jiang',1],['juan',1],['que',4],['zhi',1],['chi',1],['shi',1],['yuan',2],['ying',1],['ren',2],['zuo',4]].map(([x,n])=>`<button class="p63-card" onclick="pinyinV63ChooseBlend('${x}',this,${n})">${toneMark(x,n)}<small>选中再听</small></button>`).join('')}</div>`}
  window.pinyinV63ChooseBlend=function(name,button,n=tone){pinyinV63Stop();setCurrent(name,n);document.querySelectorAll('.p63-card.playing').forEach(x=>x.classList.remove('playing'));button?.classList.add('playing')};
  async function hearChallenge(button){const q=challenge;if(!q||q.solved||part!=='challenge')return false;const ok=await play(q.answer,q.tone,{button}).catch(()=>false);if(ok&&q===challenge&&part==='challenge'&&!q.solved){q.heard=true;document.querySelectorAll('#p63Answers button').forEach(b=>b.disabled=b.dataset.wrong==='1')}return ok}
  async function newChallenge(){pinyinV63Stop();challenge=null;const epoch=++renderEpoch,m=await getManifest();if(epoch!==renderEpoch||part!=='challenge'||!document.getElementById('p63Answers'))return;const pool=m.files.map(x=>x.file.replace('.mp3','')).filter(x=>x.length<7),answer=pool[Math.floor(Math.random()*pool.length)],n=1+Math.floor(Math.random()*4),opts=[answer];while(opts.length<4){const x=pool[Math.floor(Math.random()*pool.length)];if(!opts.includes(x))opts.push(x)}opts.sort(()=>Math.random()-.5);challenge={answer,tone:n,heard:false,solved:false,options:opts.map(x=>toneMark(x,n))};document.getElementById('p63Question').textContent='听完整发音，再选出正确的拼音';document.getElementById('p63Answers').innerHTML=opts.map(x=>`<button disabled onclick="pinyinV63Answer('${x}',this)">${toneMark(x,n)}</button>`).join('');document.getElementById('p63Status').textContent='';await hearChallenge()}
  function safeNewChallenge(){return newChallenge().catch(()=>{const s=document.getElementById('p63Status');if(part==='challenge'&&s)s.textContent='题目没有加载成功，请重新进入听音闯关'})}
  window.pinyinV63NewChallenge=safeNewChallenge;
  window.pinyinV66Question=()=>challenge?.heard&&!challenge.solved?{key:'p63-'+challenge.answer+'-'+challenge.tone,rawAnswer:challenge.answer,format:value=>toneMark(value,challenge.tone),task:{type:'choice',prompt:'听音选拼音',options:challenge.options,answer:toneMark(challenge.answer,challenge.tone),audio:token(challenge.answer,challenge.tone)}}:null;
  window.pinyinV63Answer=function(value,button){if(!challenge?.heard||challenge.solved||button?.disabled||!challenge.options.includes(toneMark(value,challenge.tone)))return;if(value===challenge.answer){challenge.solved=true;const done=challenge;document.querySelectorAll('#p63Answers button').forEach(b=>b.disabled=true);button.style.background='#dff7e8';document.getElementById('p63Status').textContent='答对啦！再来一道。';setTimeout(()=>{if(part==='challenge'&&challenge===done&&document.getElementById('p63Answers'))safeNewChallenge()},750)}else{button.disabled=true;button.dataset.wrong='1';button.style.background='#ffe3e3';document.getElementById('p63Status').textContent='再听一次，慢慢找。';hearChallenge();try{const g=S.game||{},id='p63-'+challenge.answer+'-'+challenge.tone;g.reviewQueue=g.reviewQueue||{};g.reviewQueue[id]={source:'pinyin-v63',title:'拼音听辨 '+toneMark(challenge.answer,challenge.tone),step:0,dueAt:Date.now()+600000,lapses:(g.reviewQueue[id]?.lapses||0)+1,task:{type:'choice',prompt:'听音选拼音',options:challenge.options,answer:toneMark(challenge.answer,challenge.tone),audio:token(challenge.answer,challenge.tone),key:id}};S.game=g;typeof R==='function'&&R()}catch(_){}}
  };
  window.pinyinV63ReplayChallenge=hearChallenge;
  function renderChallenge(){document.getElementById('p63Body').innerHTML=`<div class="p63-challenge"><h2 id="p63Question">听一听，选出正确的拼音</h2><button class="p63-blend" onclick="pinyinV63ReplayChallenge(this)">🔊 再听一次</button><div class="p63-answers" id="p63Answers"></div></div>`;safeNewChallenge()}
  function renderPart(){renderEpoch++;pinyinV63Stop();const body=document.getElementById('p63Body');if(!body)return;const status=document.getElementById('p63Status');if(status)status.textContent='';if(part==='initials')body.innerHTML='<h2>23 个声母</h2><p class="p63-note">声母用小学课堂常见的短呼读音示范；重点听开头和送气差别。</p><div class="p63-grid">'+initialCards()+'</div>';else if(part==='finals')body.innerHTML='<h2>24 个韵母</h2><p class="p63-note">直接韵母与示范音节分开标注。ui 听 wēi、in 听 yīn、ong 听 zhōng 中的韵母，不把完整音节当成独立韵母。</p><div class="p63-grid">'+finalCards()+'</div>';else if(part==='whole')body.innerHTML='<h2>16 个整体认读音节</h2><p class="p63-note">整体认读，不拆开拼。</p><div class="p63-grid">'+wholeCards()+'</div>';else if(part==='tones')body.innerHTML='<h2>六个单韵母的四声</h2><p class="p63-note">共 24 个带调读音；先听声调变化，再看调号。</p><div class="p63-grid">'+toneCards()+'</div>';else if(part==='table')renderTable();else if(part==='blend')renderBlend();else renderChallenge()}
  window.pinyinV63Part=function(next){part=next;document.querySelectorAll('.p63-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.part===part));renderPart()};
function render(){getBoundaries().catch(()=>{});document.getElementById('ct').innerHTML=`<main class="p63"><header class="p63-head"><button class="p63-back" onclick="showPage('curriculum')">← 返回</button><h1 class="p63-title">拼音点读发音</h1></header><section class="p63-hero"><strong>👂 听准 · 看清 · 拼出来</strong><p>对齐统编版一年级 14 课拼音范围。真人示范与拼写一一对应，不夹入网址或系统提示。借助音节示范的韵母会明确标注。</p><span class="p63-lock">🔒 本地真人音频 · 不使用设备 TTS</span></section><nav class="p63-tabs" aria-label="拼音学习功能">${[['initials','声母'],['finals','韵母'],['whole','整体认读'],['tones','四声'],['table','完整拼音表'],['blend','分步拼读'],['challenge','听音闯关']].map(x=>`<button data-part="${x[0]}" class="${part===x[0]?'on':''}" onclick="pinyinV63Part('${x[0]}')">${x[1]}</button>`).join('')}</nav><section class="p63-panel" id="p63Body"></section><div class="p63-status" id="p63Status"></div><p class="p63-source">音频：hotoo/pinyin（MIT），已本地化；课程顺序依据国家中小学智慧教育平台一年级语文。</p></main>`;renderPart()}
  if(typeof PGS!=='undefined')PGS.pinyin={title:'🔤 拼音点读发音',render};
  if(new URLSearchParams(location.search).has('test'))window.__PINYIN_V63_TEST={INITIALS,FINALS,WHOLE,toneMark,findSegments,approvedSpans,parseToken,taskToken,getManifest,getBuffer,play,split,render,clearDecodedCache:()=>buffers.clear()};
})();
