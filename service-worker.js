/* v69: coherent cached shell, two-wide warmup, reusable bounded teaching assets. */
/* v74: 所有 CSS/JS 引用统一带 ?v= 版本号，SW 对带版本号的资源强制走网络，
   避免 force-cache 命中浏览器 HTTP 缓存里的旧副本（曾导致"JS 新版 + CSS 旧版"
   → 拼音退化成和汉字并排）。
   v74-3: 另加一道根本保险 —— 关键版式 CSS 由 g1-ruby.js 自己注入 <style id="g1r-style">，
   即使外部 CSS 是旧的，拼音也一定在汉字上方。CACHE 再进一位以强制旧客户端换壳。
   v75-1: 拼音字号放大（题面 19→28px，选项 16→24px，逐档收窄），
   并修掉 `.g1-answer` 的 flex-wrap:nowrap —— 它让拼音单元无法在按钮内换行，
   既撑破按钮边框、又让窄屏整页横向溢出。
   v76-1: 品牌名由「一年级成长岛」改为「低年级每日学习搭子」（标题/logo/PWA 清单/报告页脚）。
   注意：`short_name` 与地图里的「成长岛」保留（它是游戏世界名，不是品牌名）；
   存储键 `grade1-island-*` 一律未动（改了会丢用户数据）。CACHE 进一位以强制旧客户端换壳。
   v77-1: 首页信息架构改进 —— 成长地图前移到「继续闯关」之后（实测 top 1024px → 483px，
   进首屏），今日计划卡在矮屏（<720px）默认折叠成一行摘要（313px → 84px），
   修掉"看得见摸不着"；绘本入口让位到地图之后（它 148px 高，挡在前面会把地图顶出首屏）。
   v78-1: 矮屏紧凑模式（方案 3）—— 视口高 <720px 时压扁"问候区"（175px → 82px）
   与"伙伴小屋"（345px → 204px），省出的空间全给成长地图（top 483px → 342px）。
   样式由 game-v59.js 自带注入 <style id="g1-compact-style">（铁律：关键版式 CSS 跟着 JS 走）。
   另把家长端两处催办措辞（"还差 N 个任务"）改为中性表述（"已完成 N 项，可以继续也可以收工"），
   减轻"必须做完"的隐形压力 —— 代码本就没有强制，措辞不该制造压力。
   v79-1: 钢琴跟弹模式 —— 用**引导式检测**（问"该弹的这个音在不在"，而不是"弹的是什么音"）。
   实测（_pitch_real.js）现有单音盲检测在**双手同弹**时必然失败（报左手音或完全检测不到），
   因为"两个音叠加时哪个是主音"没有答案；而拜厄/小汤3 从第 1 课起就是双手。
   follow-v79.js 提供三个判据：presence（引导式存在性，对复音免疫）、bestInRange（受限
   argmax，能指出错音）、finePitch（±5 音分扫描 + 抛物线插值）。
   谐波重合（C3 的 3 次谐波 ≈ G4 基频、4 次谐波 = C5 基频）用**能量比值法**处理 ——
   测低音基频、按 k^(-α) 外推其第 k 次谐波，与重合点实测幅度比：
     没弹 0.00~0.87，真弹 1.47~5.65 → 三段式判据（0.6 / 2.0）
   中间模糊带判 uncertain，提示"先分手弹一次"（符合拜厄/小汤教学法）。
   语音反馈用**时分复用**（暂停拾音 → 播语音 → 延迟 250ms 恢复）——
   不能开回声消除（AEC 会削掉钢琴谐波，音高精度会掉）。
   采样参数由 125ms/3 帧改为 **60ms/2 帧**（实测 200ms/音 从 0% → 100%）。
v80-1: 曲库扩充 + 录音模式 —— 拜厄 Op.101 第 1-30 课右手旋律加入（共 37 首曲目），
  仅取公有领域内容（作者 1863 年卒，版权已过保护期）。
  新增"录音模式"按钮：整曲录制 .webm，不做实时判定，文件可下载发给老师/离线分析。
  录音用独立 MediaRecorder（不共用检测 stream），避免 AEC/采样率冲突。
  v81-1: 双手全听模式 —— follow-v79.js 新增 judgeBoth() 双手并行判定，每帧同时给右手/左手期望音打分；
  组合结论：correct/right-only/left-only/wrong/uncertain/silent/unclear，细粒度反馈。
  所有 37 首曲目（7 儿歌 + 30 拜厄）补全 leftNotes/leftBeats（标准伴奏根音型）。
  UI：mode='both' 时显示双行音符带（🙋右手紫 / 🤚左手蓝）、双进度条、双手标题。
  切模式/重新开始自动同步重置两手进度。 */
const CACHE='grade1-island-v84-2',MEDIA='grade1-island-media-v69',PREVIOUS='grade1-island-v84-1';
const BASE=self.registration.scope,INDEX=new URL('index.html',BASE).href;
const PRECACHE=['index.html','manifest.webmanifest',
  'game-v59.css?v=84.2','learning-v66.css?v=84.2','question-art-v67.css?v=84.2','curriculum-v61.css?v=84.2','pinyin-v63.css?v=84.2','practice-v68.css?v=84.2','eye-v70.css?v=84.2','reading-v71.css?v=84.2',
  'curriculum-v61.js?v=84.2','pinyin-rules-v82.js?v=84.2','pinyin-v63.js?v=84.2','g1-ruby.js?v=84.2','game-v59.js?v=84.2','learning-v66.js?v=84.2','question-art-v67.js?v=84.2','pitch-v68.js?v=84.2','practice-v68.js?v=84.2','eye-v70.js?v=84.2','fast-v69.js?v=84.2','reading-v71.js?v=84.2','reading-ui-v71.js?v=84.2','follow-v79.js?v=84.2','follow-ui-v79.js?v=84.2',
  'child-v82.css?v=84.2','child-v82.js?v=84.2','assets/pinyin-v63/segments-v83.json','assets/pinyin-v63/manifest.json','pet_voice_map.json'];
const pending=new Map();let warmQueue=Promise.resolve();
function own(url){return url.startsWith(BASE)}
function asset(url){return own(url)&&new URL(url).pathname.includes('/assets/')}
/* 带 ?v= 的构建产物视为"指纹化资源"：必须走网络拿最新，不能吃 HTTP 缓存 */
function fingerprinted(url){try{return new URL(url).searchParams.has('v')}catch(_){return false}}
async function parallel(items,fn){const q=items.slice(),results=[];await Promise.all([0,1].map(async()=>{while(q.length){const item=q.shift();results.push(await fn(item))}}));return results}
async function download(url,timeout=10000,reload=false){
  if(pending.has(url))return (await pending.get(url)).clone();
  /* fingerprinted 资源一律用 reload（绕过 HTTP 缓存），避免把旧副本塞进新 SW 缓存 */
  const mode=(reload||fingerprinted(url))?'reload':'force-cache';
  const task=(async()=>{const control=new AbortController(),timer=setTimeout(()=>control.abort(),timeout);try{const r=await fetch(url,{cache:mode,signal:control.signal});if(!r.ok)throw Error('HTTP '+r.status);const body=await r.arrayBuffer(),headers=new Headers(r.headers);headers.delete('Content-Encoding');headers.set('Content-Length',String(body.byteLength));return new Response(body,{status:r.status,headers})}finally{clearTimeout(timer)}})();
  pending.set(url,task);try{return (await task).clone()}finally{pending.delete(url)}
}
async function storeMedia(url,response){
  if(response.status!==200||!asset(url))return;
  try{const cache=await caches.open(MEDIA);await cache.put(url,response.clone());const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-160)).map(k=>cache.delete(k)))}catch(_){/* Quota failure must never prevent playback. */}
}
async function cachedAsset(url){
  const cache=await caches.open(MEDIA),hit=await cache.match(url);if(hit)return hit;
  // These assets are unchanged in v69. Keep one previous shell for lazy reuse.
  const old=await caches.open(PREVIOUS),prior=await old.match(url);
  if(prior?.status===200){await storeMedia(url,prior);return prior}
  return null;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await parallel(PRECACHE,async path=>{const url=new URL(path,BASE).href;let error;for(let n=0;n<2;n++)try{await cache.put(url,await download(url,10000,path==='index.html'));return}catch(e){error=e}throw error});
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('grade1-island-')&&![CACHE,MEDIA,PREVIOUS].includes(k)).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data==='skip-waiting'){self.skipWaiting();return}
  const data=event.data||{};if(data.type!=='prewarm-assets'||!Array.isArray(data.assets))return;
  const urls=[...new Set(data.assets.filter(p=>typeof p==='string').map(p=>new URL(p,BASE).href))].filter(asset).slice(0,8);
  const job=warmQueue.then(()=>parallel(urls,async url=>{try{if(!await cachedAsset(url))await storeMedia(url,await download(url,8000));return{url,ok:true}}catch(_){return{url,ok:false}}}));
  warmQueue=job.catch(()=>{});event.waitUntil(job.then(results=>event.ports[0]?.postMessage(results)));
});
async function ranged(response,header){
  const m=/^bytes=(\d*)-(\d*)$/.exec(header||'');if(!m)return response;
  const data=await response.arrayBuffer(),length=data.byteLength;
  const start=m[1]?Number(m[1]):Math.max(0,length-Number(m[2])),end=m[1]?(m[2]?Math.min(length-1,Number(m[2])):length-1):length-1;
  if(start>=length||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+length}});
  const headers=new Headers(response.headers);headers.set('Content-Range','bytes '+start+'-'+end+'/'+length);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');headers.delete('Content-Encoding');
  return new Response(data.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET'||!own(request.url))return;
  if(request.mode==='navigate'){
    if(![new URL(BASE).pathname,new URL(INDEX).pathname].includes(new URL(request.url).pathname))return;
    // HTML changes only with a complete new shell, never independently.
    event.respondWith(caches.open(CACHE).then(async c=>await c.match(INDEX)||fetch(request)));return;
  }
  event.respondWith((async()=>{
    const shell=await caches.open(CACHE),cached=await shell.match(request);
    if(cached)return cached;
    if(!asset(request.url))return fetch(request);
    const saved=await cachedAsset(request.url);
    if(saved)return request.headers.has('Range')?ranged(saved,request.headers.get('Range')):saved;
    // Partial responses must never masquerade as complete audio in the cache.
    if(request.headers.has('Range'))return fetch(request);
    const response=await download(request.url);await storeMedia(request.url,response);return response;
  })());
});
