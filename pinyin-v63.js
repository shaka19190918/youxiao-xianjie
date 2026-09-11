/* 一年级成长岛 v63：MIT 真人拼音表，本地解码、四声切分、点读与分步拼读。 */
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
  const buffers=new Map(),segments=new Map();
  let ctx=null,active=null,part='initials',tone=1,manifest=null,current={name:'a',tone:1},challenge=null;
  const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function normalize(s){return String(s||'').toLowerCase().replaceAll('ü','v').replaceAll('ɑ','a').replace(/[1-5]$/,'')}
  function toneNumber(id){const m=String(id||'').match(/([1-4])$/);return m?Number(m[1]):1}
  function toneMark(raw,n){
    let s=String(raw).replaceAll('v','ü').replaceAll('ɑ','a');if(n===5||!n)return s;
    const marks={a:'āáǎà',o:'ōóǒò',e:'ēéěè',i:'īíǐì',u:'ūúǔù','ü':'ǖǘǚǜ'};
    let at=s.indexOf('a');if(at<0)at=s.indexOf('o');if(at<0)at=s.indexOf('e');
    if(at<0){const iu=Math.max(s.lastIndexOf('i'),s.lastIndexOf('u'),s.lastIndexOf('ü'));at=iu}
    return at<0?s:s.slice(0,at)+marks[s[at]][n-1]+s.slice(at+1)
  }
  function ensureContext(){if(!AudioContextCtor)throw new Error('此浏览器不支持本地点读');if(!ctx)ctx=new AudioContextCtor();return ctx.resume().then(()=>ctx)}
  async function getBuffer(name){
    name=normalize(name);if(buffers.has(name))return buffers.get(name);
    const promise=fetch(ROOT+encodeURIComponent(name)+'.mp3',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('音频未找到');return r.arrayBuffer()}).then(b=>ensureContext().then(c=>c.decodeAudioData(b)));
    buffers.set(name,promise);try{return await promise}catch(e){buffers.delete(name);throw e}
  }
  function findSegments(buffer){
    const key=buffer.duration+'-'+buffer.length;if(segments.has(key))return segments.get(key);
    const data=buffer.getChannelData(0),rate=buffer.sampleRate,step=Math.max(128,Math.floor(rate*.012));let levels=[],max=0;
    for(let i=0;i<data.length;i+=step){let sum=0,end=Math.min(data.length,i+step);for(let j=i;j<end;j++)sum+=Math.abs(data[j]);const v=sum/(end-i);levels.push(v);if(v>max)max=v}
    const sorted=levels.slice().sort((a,b)=>a-b),noise=sorted[Math.floor(sorted.length*.2)]||0,threshold=Math.max(.003,noise*4,max*.055);let raw=[],start=-1;
    levels.forEach((v,i)=>{if(v>threshold&&start<0)start=i;if(v<=threshold&&start>=0){raw.push([start*step/rate,i*step/rate]);start=-1}});if(start>=0)raw.push([start*step/rate,buffer.duration]);
    const merged=[];raw.forEach(x=>{const last=merged[merged.length-1];if(last&&x[0]-last[1]<.23)last[1]=x[1];else merged.push(x.slice())});
    let spans=merged.filter(x=>x[1]-x[0]>.16).map(x=>[Math.max(0,x[0]-.055),Math.min(buffer.duration,x[1]+.075)]);
    if(spans.length>4){while(spans.length>4){let best=0,gap=Infinity;for(let i=0;i<spans.length-1;i++){const g=spans[i+1][0]-spans[i][1];if(g<gap){gap=g;best=i}}spans.splice(best,2,[spans[best][0],spans[best+1][1]])}}
    if(spans.length!==4){const q=buffer.duration/4;spans=[0,1,2,3].map(i=>[i*q+.12,Math.max(i*q+.3,(i+1)*q-.12)])}
    segments.set(key,spans);return spans
  }
  async function play(name,n=1,options={}){
    const status=document.getElementById('p63Status');if(status){status.className='p63-status';status.textContent='正在准备真人发音…'}
    try{
      const c=await ensureContext(),buffer=await getBuffer(name),span=findSegments(buffer)[Math.max(0,Math.min(3,n-1))];if(active)try{active.stop()}catch(_){}
      const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.connect(gain).connect(c.destination);gain.gain.value=.95;active=source;
      const start=span[0]+(options.trimStart||0),duration=Math.max(.18,span[1]-start);source.start(0,start,duration);
      document.querySelectorAll('.p63-card.playing').forEach(x=>x.classList.remove('playing'));if(options.button)options.button.classList.add('playing');
      return await new Promise(resolve=>{source.onended=()=>{if(active===source)active=null;if(options.button)options.button.classList.remove('playing');if(status)status.textContent='点一下可以再听一遍';options.onEnd&&options.onEnd();resolve()}})
    }catch(e){if(status){status.className='p63-status p63-error';status.textContent='音频没有加载成功，请点一下重试；不会使用设备合成音代读。'}throw e}
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
  function setCurrent(name,n=tone){current={name:normalize(name),tone:n};const label=document.getElementById('p63Current');if(label)label.textContent=toneMark(current.name,n);const meta=document.getElementById('p63CurrentMeta');if(meta)meta.textContent='第 '+['一','二','三','四'][n-1]+' 声 · 真人点读'}
  window.pinyinV63Play=function(name,n,button){setCurrent(name,n);return play(name,n,{button})};
  window.pinyinV63ReplayCurrent=function(button){return play(current.name,current.tone,{button})};
  window.pinyinV63PlayToken=playToken;window.pinyinV63TaskToken=taskToken;
  function initialCards(){return INITIALS.map(x=>`<button class="p63-card" onclick="pinyinV63Play('${x[1]}',1,this)">${x[0]}<small>呼读音 ${toneMark(x[1],1)}<br>${x[2]}</small></button>`).join('')}
  function finalCards(){return FINALS.map(x=>`<button class="p63-card" onclick="pinyinV63Play('${x[1]}',1,this)">${x[0]}<small>标准韵母点读</small></button>`).join('')}
  function wholeCards(){return WHOLE.map(x=>`<button class="p63-card" onclick="pinyinV63Play('${x}',1,this)">${x}<small>${toneMark(x,1)}</small></button>`).join('')}
  function toneCards(){return ['a','o','e','yi','wu','yu'].flatMap(name=>[1,2,3,4].map(n=>`<button class="p63-card" onclick="pinyinV63Play('${name}',${n},this)">${toneMark(name==='yi'?'i':name==='wu'?'u':name==='yu'?'ü':name,n)}<small>第 ${['一','二','三','四'][n-1]} 声</small></button>`)).join('')}
  function reader(){return `<div class="p63-reader"><div><strong id="p63Current">${toneMark(current.name,current.tone)}</strong><span id="p63CurrentMeta">第 ${['一','二','三','四'][current.tone-1]} 声 · 真人点读</span></div><button class="p63-play" onclick="pinyinV63ReplayCurrent(this)">🔊 点读</button></div>`}
  async function getManifest(){if(manifest)return manifest;manifest=await fetch(ROOT+'manifest.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('拼音表清单未加载');return r.json()});return manifest}
  async function renderTable(){
    const body=document.getElementById('p63Body');body.innerHTML='<div class="p63-loading">正在打开完整拼音表…</div>';
    try{const m=await getManifest(),names=m.files.map(x=>x.file.replace('.mp3','')).filter(x=>!['hm','hng'].includes(x));window.P63_NAMES=names;body.innerHTML=`${reader()}<div class="p63-controls">${[1,2,3,4].map(n=>`<button class="p63-tone ${n===tone?'on':''}" onclick="pinyinV63Tone(${n})">${n}</button>`).join('')}<input id="p63Search" class="p63-search" placeholder="找拼音，如 ing" inputmode="search" oninput="pinyinV63Filter(this.value)"></div><div class="p63-grid p63-syllables" id="p63Syllables">${syllableCards(names)}</div>`}catch(e){body.innerHTML='<div class="p63-loading p63-error">拼音表没有加载成功，请检查网络后重试。</div>'}
  }
  function syllableCards(names){return names.slice(0,406).map(x=>`<button class="p63-card" data-py="${x}" onclick="pinyinV63Play('${x}',${tone},this)">${toneMark(x,tone)}<small>四声可切换</small></button>`).join('')}
  window.pinyinV63Tone=function(n){tone=n;document.querySelectorAll('.p63-tone').forEach((b,i)=>b.classList.toggle('on',i===n-1));const box=document.getElementById('p63Syllables');if(box)box.innerHTML=syllableCards((window.P63_NAMES||[]).filter(x=>!document.getElementById('p63Search')?.value||x.includes(normalize(document.getElementById('p63Search').value))));setCurrent(current.name,n)};
  window.pinyinV63Filter=function(q){const box=document.getElementById('p63Syllables'),needle=normalize(q);if(box)box.innerHTML=syllableCards((window.P63_NAMES||[]).filter(x=>x.includes(needle)))};
  function split(name){const n=normalize(name),ini=INITIALS.map(x=>x[0]).sort((a,b)=>b.length-a.length).find(x=>n.startsWith(x)&&!['y','w'].includes(x));if(!ini)return null;let fin=n.slice(ini.length);if(['j','q','x'].includes(ini)&&fin.startsWith('u'))fin='v'+fin.slice(1);const f=FINALS.find(x=>normalize(x[0])===fin||normalize(x[1])===fin);return f?{initial:INITIALS.find(x=>x[0]===ini),final:f}:null}
  window.pinyinV63Blend=async function(){const s=split(current.name),box=document.getElementById('p63BlendSteps');if(!s){box.textContent=toneMark(current.name,current.tone)+' 是整体读法';return play(current.name,current.tone)}box.innerHTML=`<span>${s.initial[0]}</span><span class="p63-plus">＋</span><span>${toneMark(s.final[0],current.tone)}</span><span class="p63-plus">→</span><span>${toneMark(current.name,current.tone)}</span>`;try{await play(s.initial[1],1);await new Promise(r=>setTimeout(r,180));await play(s.final[1],current.tone);await new Promise(r=>setTimeout(r,180));await play(current.name,current.tone)}catch(_){}}
  function renderBlend(){document.getElementById('p63Body').innerHTML=`${reader()}<p class="p63-note">先听声母，再听带调韵母，最后合起来读完整音节。可在“完整拼音表”中先选择任意音节。</p><div class="p63-blend-steps" id="p63BlendSteps">声母 ＋ 韵母 → 音节</div><button class="p63-blend" onclick="pinyinV63Blend()">▶ 分步拼读</button><div class="p63-grid">${['ba','pa','ma','fa','da','ta','na','la','ge','ke','he','ji','qi','xi','zhu','chu','shu','ren','zuo','cong','song','ying'].map(x=>`<button class="p63-card" onclick="pinyinV63ChooseBlend('${x}',this)">${toneMark(x,tone)}<small>选中并拼读</small></button>`).join('')}</div>`}
  window.pinyinV63ChooseBlend=function(name,button){setCurrent(name,tone);document.querySelectorAll('.p63-card.playing').forEach(x=>x.classList.remove('playing'));button.classList.add('playing');setTimeout(()=>button.classList.remove('playing'),300)};
  async function newChallenge(){const m=await getManifest(),pool=m.files.map(x=>x.file.replace('.mp3','')).filter(x=>x.length<7),answer=pool[Math.floor(Math.random()*pool.length)],n=1+Math.floor(Math.random()*4),opts=[answer];while(opts.length<4){const x=pool[Math.floor(Math.random()*pool.length)];if(!opts.includes(x))opts.push(x)}opts.sort(()=>Math.random()-.5);challenge={answer,tone:n,options:opts.map(x=>toneMark(x,n))};document.getElementById('p63Question').textContent='听一听，选出正确的拼音';document.getElementById('p63Answers').innerHTML=opts.map(x=>`<button onclick="pinyinV63Answer('${x}',this)">${toneMark(x,n)}</button>`).join('');document.getElementById('p63Status').textContent='';play(answer,n).catch(()=>{})}
  window.pinyinV63NewChallenge=()=>newChallenge();
  window.pinyinV63Answer=function(value,button){if(!challenge)return;if(value===challenge.answer){button.style.background='#dff7e8';document.getElementById('p63Status').textContent='答对啦！再来一道。';setTimeout(newChallenge,750)}else{button.disabled=true;button.style.background='#ffe3e3';document.getElementById('p63Status').textContent='再听一次，慢慢找。';play(challenge.answer,challenge.tone).catch(()=>{});try{const g=S.game||{},id='p63-'+challenge.answer+'-'+challenge.tone;g.reviewQueue=g.reviewQueue||{};g.reviewQueue[id]={source:'pinyin-v63',title:'拼音听辨 '+toneMark(challenge.answer,challenge.tone),step:0,dueAt:Date.now()+600000,lapses:(g.reviewQueue[id]?.lapses||0)+1,task:{type:'choice',prompt:'听音选拼音',options:challenge.options,answer:toneMark(challenge.answer,challenge.tone),audio:token(challenge.answer,challenge.tone),key:id}};S.game=g;typeof R==='function'&&R()}catch(_){}}
  };
  window.pinyinV63ReplayChallenge=function(button){if(challenge)return play(challenge.answer,challenge.tone,{button})};
  function renderChallenge(){document.getElementById('p63Body').innerHTML=`<div class="p63-challenge"><h2 id="p63Question">听一听，选出正确的拼音</h2><button class="p63-blend" onclick="pinyinV63ReplayChallenge(this)">🔊 再听一次</button><div class="p63-answers" id="p63Answers"></div></div>`;newChallenge().catch(()=>{document.getElementById('p63Status').textContent='题目没有加载成功，请重试'})}
  function renderPart(){const body=document.getElementById('p63Body');if(!body)return;const status=document.getElementById('p63Status');if(status)status.textContent='';if(part==='initials')body.innerHTML='<h2>23 个声母</h2><p class="p63-note">声母用小学课堂常见的短呼读音示范；重点听开头和送气差别。</p><div class="p63-grid">'+initialCards()+'</div>';else if(part==='finals')body.innerHTML='<h2>24 个韵母</h2><p class="p63-note">单韵母、复韵母、鼻韵母全部可点读，重点分清 in / ing、en / eng。</p><div class="p63-grid">'+finalCards()+'</div>';else if(part==='whole')body.innerHTML='<h2>16 个整体认读音节</h2><p class="p63-note">整体认读，不拆开拼。</p><div class="p63-grid">'+wholeCards()+'</div>';else if(part==='tones')body.innerHTML='<h2>六个单韵母的四声</h2><p class="p63-note">共 24 个带调读音；先听声调变化，再看调号。</p><div class="p63-grid">'+toneCards()+'</div>';else if(part==='table')renderTable();else if(part==='blend')renderBlend();else renderChallenge()}
  window.pinyinV63Part=function(next){part=next;document.querySelectorAll('.p63-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.part===part));renderPart()};
  function render(){document.getElementById('ct').innerHTML=`<main class="p63"><header class="p63-head"><button class="p63-back" onclick="showPage('curriculum')">← 返回</button><h1 class="p63-title">拼音点读发音</h1></header><section class="p63-hero"><strong>👂 听准 · 看清 · 拼出来</strong><p>对齐统编版一年级 14 课拼音范围。真人四声音频只播放当前拼音，不夹入汉字、网址或系统提示。</p><span class="p63-lock">🔒 本地真人音频 · 不使用设备 TTS</span></section><nav class="p63-tabs" aria-label="拼音学习功能">${[['initials','声母'],['finals','韵母'],['whole','整体认读'],['tones','四声'],['table','完整拼音表'],['blend','分步拼读'],['challenge','听音闯关']].map(x=>`<button data-part="${x[0]}" class="${part===x[0]?'on':''}" onclick="pinyinV63Part('${x[0]}')">${x[1]}</button>`).join('')}</nav><section class="p63-panel" id="p63Body"></section><div class="p63-status" id="p63Status"></div><p class="p63-source">音频：hotoo/pinyin（MIT），已本地化；课程顺序依据国家中小学智慧教育平台一年级语文。</p></main>`;renderPart()}
  if(typeof PGS!=='undefined')PGS.pinyin={title:'🔤 拼音点读发音',render};
  if(new URLSearchParams(location.search).has('test'))window.__PINYIN_V63_TEST={INITIALS,FINALS,WHOLE,toneMark,findSegments,parseToken,taskToken,getManifest,getBuffer,play,split,render};
})();
