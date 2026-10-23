/* v69: coherent cached shell, two-wide warmup, reusable bounded teaching assets. */
/* v74: 所有 CSS/JS 引用统一带 ?v= 版本号，SW 对带版本号的资源强制走网络，
   避免 force-cache 命中浏览器 HTTP 缓存里的旧副本（曾导致"JS 新版 + CSS 旧版"
   → 拼音退化成和汉字并排）。
   v74-3: 另加一道根本保险 —— 关键版式 CSS 由 g1-ruby.js 自己注入 <style id="g1r-style">，
   即使外部 CSS 是旧的，拼音也一定在汉字上方。CACHE 再进一位以强制旧客户端换壳。 */
const CACHE='grade1-island-v74-3',MEDIA='grade1-island-media-v69',PREVIOUS='grade1-island-v74-2';
const BASE=self.registration.scope,INDEX=new URL('index.html',BASE).href;
const PRECACHE=['index.html','manifest.webmanifest',
  'game-v59.css?v=74','learning-v66.css?v=74','question-art-v67.css?v=74','curriculum-v61.css?v=74','pinyin-v63.css?v=74','practice-v68.css?v=74','eye-v70.css?v=74','reading-v71.css?v=74',
  'curriculum-v61.js?v=74','pinyin-v63.js?v=74','g1-ruby.js?v=74','game-v59.js?v=74','learning-v66.js?v=74','question-art-v67.js?v=74','pitch-v68.js?v=74','practice-v68.js?v=74','eye-v70.js?v=74','fast-v69.js?v=74','reading-v71.js?v=74','reading-ui-v71.js?v=74',
  'pet_voice_map.json'];
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
