/* One bootstrap, demand-loaded stroke engine, small current-task warmup. */
(()=>{
  'use strict';
  const ROOT=new URL('./',location.href),requests=new Map(),jsons=new Map();
  let timer,routeEpoch=0,writerPromise=null,traceEpoch=0,lastTrace=null;
  const allowed=p=>{try{const u=new URL(p,ROOT);return u.origin===ROOT.origin&&u.pathname.startsWith(ROOT.pathname+'assets/')}catch(_){return false}};
  const conserve=()=>navigator.connection?.saveData||/^(slow-)?2g$/.test(navigator.connection?.effectiveType||'');
  async function fetchAsset(path){
    const url=new URL(path,ROOT).href;if(requests.has(url))return requests.get(url);
    const task=(async()=>{const controller=new AbortController(),t=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(url,{cache:'force-cache',signal:controller.signal});if(!r.ok)throw Error('resource '+r.status);return await r.arrayBuffer()}finally{clearTimeout(t)}})();
    requests.set(url,task);try{return await task}finally{requests.delete(url)}
  }
  async function prefetch(paths,{force=false}={}){
    if(!force&&(document.hidden||conserve()))return[];
    const list=[...new Set(paths.filter(p=>p&&allowed(p)))].slice(0,8);
    if(!list.length)return[];
    const controller=navigator.serviceWorker?.controller;
    if(controller)return new Promise(resolve=>{const ch=new MessageChannel(),t=setTimeout(()=>{ch.port1.close();resolve([])},20000);ch.port1.onmessage=e=>{clearTimeout(t);ch.port1.close();resolve(e.data)};controller.postMessage({type:'prewarm-assets',assets:list},[ch.port2])});
    const queue=list.slice(),results=[];await Promise.all([0,1].map(async()=>{while(queue.length){const path=queue.shift();try{await fetchAsset(path);results.push({url:path,ok:true})}catch(_){results.push({url:path,ok:false})}}}));return results;
  }
  function audioPath(task){const p=typeof task==='string'?task:task?.audio;if(!p)return null;if(p.startsWith('p63|'))return'assets/pinyin-v63/'+encodeURIComponent(p.split('|')[1])+'.mp3';return p}
  function warmTasks(tasks,opts){return prefetch(tasks.map(audioPath),opts)}
  function currentAssets(){
    const result=[];
    if(CP==='home'){
      if(S.dog)result.push('assets/pets/'+(PETS_V6[S.dog.type]||PETS_V6.labrador).img);
      const item=L66.plan().items.find(x=>!x.done&&x.levelId),level=G1Learning.levels.find(l=>l.id===item?.levelId);
      if(level)result.push(...level.tasks.slice(item.index,item.index+2).map(audioPath));
      result.push('assets/voice/eye_rest.mp3');
    }else if(CP==='level'){
      const c=G1Learning.current();if(c)result.push(...c.level.tasks.slice(c.index,c.index+2).map(audioPath));
    }else if(CP==='daily66'){
      const item=L66.plan().items.find(x=>!x.done&&x.levelId),l=G1Learning.levels.find(l=>l.id===item?.levelId);if(l)result.push(audioPath(l.tasks[item.index]));
    }else if(CP==='pinyin'){
      const parts={initials:['bo','po'],finals:['a','o'],whole:['zhi','chi'],tones:['a','o'],blend:['bo','a']},tab=document.querySelector('.p63-tabs .on')?.dataset.part;
      result.push(...(parts[tab]||[]).map(x=>'assets/pinyin-v63/'+x+'.mp3'));
    }else if(CP==='chars'){
      const start=(v42State().charPage||0)*12;
      result.push(...V42_CHARS.slice(start,start+2).map(x=>v42CharPath(x[0])));
    }else if(CP==='mathsync'&&v44MathQ)result.push('assets/math-v44/question_'+String(v44MathQ.id).padStart(2,'0')+'.mp3');
    else if(CP==='mathlower'&&v45MathLowerQ)result.push('assets/math-v45-lower/question_'+String(v45MathLowerQ.id).padStart(2,'0')+'.mp3');
    else if(CP==='timeextra'&&v45TimeQ)result.push('assets/time-v45/question_'+String(v45TimeQ.id).padStart(2,'0')+'.mp3');
    else if(CP==='englishsync'){
      const u=english44Unit();result.push(...V44_ENGLISH[u].items.slice(0,2).map((_,i)=>english44Path(u,i,false)));
    }else if(CP==='reading')result.push('assets/reading/reading_'+String((v42State().readingIndex||0)+1).padStart(2,'0')+'.mp3');
    else if(CP==='poems'){
      const i=Number(document.querySelector('[id^="poem-card-"]')?.id.replace('poem-card-','')),p=POEM_COURSE_V6[i];
      if(p)result.push('assets/voice/'+p.key+'_info.mp3','assets/voice/'+p.key+'_l1.'+(p.key==='poem_yong_e'?'wav':'mp3'));
    }
    return result.filter(Boolean);
  }
  function warmCurrent(options){return prefetch(currentAssets(),options)}
  function schedule(){clearTimeout(timer);const id=++routeEpoch;timer=setTimeout(()=>{if(id===routeEpoch&&!document.hidden)warmCurrent()},250)}
  function loadWriter(){
    if(window.HanziWriter)return Promise.resolve();if(writerPromise)return writerPromise;
    writerPromise=new Promise((resolve,reject)=>{const el=document.createElement('script');el.src='assets/vendor/hanzi-writer.min.js';const timeout=setTimeout(()=>fail(),12000);function fail(){clearTimeout(timeout);el.remove();writerPromise=null;reject(Error('笔顺引擎未加载'))}el.onload=()=>{clearTimeout(timeout);if(!window.HanziWriter){fail();return}const create=HanziWriter.create;HanziWriter.create=function(target,ch,options){return create.call(this,target,ch,{...options,charDataLoader:()=>strokeData(ch)})};resolve()};el.onerror=fail;document.head.append(el)});return writerPromise;
  }
  function strokePath(ch){if(!/^[\u3400-\u9fff]$/.test(ch))throw Error('Invalid character');return 'assets/strokes-v69/u'+ch.codePointAt(0).toString(16)+'.json'}
  async function strokeData(ch){
    if(jsons.has(ch))return jsons.get(ch);const bytes=await fetchAsset(strokePath(ch)),data=JSON.parse(new TextDecoder().decode(bytes));
    if(!data.strokes?.length||data.strokes.length!==data.medians?.length)throw Error('Invalid stroke data');
    jsons.set(ch,data);if(jsons.size>16)jsons.delete(jsons.keys().next().value);return data;
  }
  const open=openTraceV42,close=clHW;
  openTraceV42=async function(ch,py){
    const generation=++traceEpoch;lastTrace=[ch,py];_hw=null;
    document.getElementById('hwTi').textContent='田字格描红：'+ch+'（'+py+'）';document.getElementById('hwTarget').innerHTML='';document.getElementById('hwFb').textContent='正在准备本地笔顺…';document.getElementById('hwM').style.display='flex';
    try{await Promise.all([loadWriter(),strokeData(ch)]);if(generation!==traceEpoch||document.getElementById('hwM').style.display==='none')return;open(ch,py)}catch(_){if(generation===traceEpoch)document.getElementById('hwFb').innerHTML='笔顺暂未准备好，请重试。<br><button class="btn b1" onclick="Fast69.retryTrace()">重新加载笔顺</button>'}
  };
  clHW=function(){traceEpoch++;return close()};
  // Begin preparing a chosen character while its voice is playing, never all 69.
  const readChar=playCharV42;playCharV42=function(i,trace){if(trace&&V42_CHARS[i])Promise.all([loadWriter(),strokeData(V42_CHARS[i][0])]).catch(()=>{});return readChar(i,trace)};
  const page=showPage;showPage=function(id){traceEpoch++;const result=page(id);schedule();return result};
  const part=pinyinV63Part;pinyinV63Part=function(...args){const result=part(...args);schedule();return result};
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest('.p63-card');if(!button||conserve())return;
    const match=button.getAttribute('onclick')?.match(/pinyinV63Play\('([^']+)'/);if(match)window.pinyinV69Prepare?.(match[1]);
  },{passive:true});
  window.Fast69={ready:false,prefetch,warmTasks,warmCurrent,fetchAsset,strokeData,loadWriter,retryTrace:()=>{if(lastTrace)openTraceV42(...lastTrace)}};
  const parent=PGS.parent.render;PGS.parent.render=function(){parent();if(S._parentAuth)document.getElementById('ct').insertAdjacentHTML('beforeend','<section class="l66-card"><h2>加载与离线资源</h2><p>用过的教学资源会保存在本机。进入任务时只提前准备少量相关资源；系统省流量模式下不自动预取。</p><p>笔顺数据：Hanzi Writer Data 2.0.1 / Make Me A Hanzi / Arphic Technology，69个字原样保存。<a href="assets/strokes-v69/ARPHICPL.TXT" target="_blank" rel="noopener">原始许可</a> · <a href="assets/strokes-v69/manifest.json" target="_blank" rel="noopener">来源与校验清单</a></p></section>')};
  init();Fast69.ready=true;performance.mark('growth-island-ready');
  if('serviceWorker' in navigator){
    const register=()=>navigator.serviceWorker.register('service-worker.js').then(reg=>{if(reg.waiting)reg.waiting.postMessage('skip-waiting');reg.onupdatefound=()=>{const worker=reg.installing;worker.onstatechange=()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)toast('新版已准备好，下次打开生效')}}}).catch(()=>{});
    // Registration and optional downloads do not contend with the first render.
    setTimeout(register,900);navigator.serviceWorker.addEventListener('controllerchange',schedule);
  }
})();
