/* v69: coherent cached shell, two-wide warmup, reusable bounded teaching assets. */
const CACHE='grade1-island-v69-2',MEDIA='grade1-island-media-v69',PREVIOUS='grade1-island-v68-1';
const BASE=self.registration.scope,INDEX=new URL('index.html',BASE).href;
const PRECACHE=['index.html','manifest.webmanifest','game-v59.css','learning-v66.css','question-art-v67.css','curriculum-v61.css','pinyin-v63.css','practice-v68.css?v=69',
  'curriculum-v61.js','pinyin-v63.js?v=69','game-v59.js?v=69','learning-v66.js?v=69','question-art-v67.js','pitch-v68.js','practice-v68.js?v=69','fast-v69.js','pet_voice_map.json'];
const pending=new Map();let warmQueue=Promise.resolve();
function own(url){return url.startsWith(BASE)}
function asset(url){return own(url)&&new URL(url).pathname.includes('/assets/')}
async function parallel(items,fn){const q=items.slice(),results=[];await Promise.all([0,1].map(async()=>{while(q.length){const item=q.shift();results.push(await fn(item))}}));return results}
async function download(url,timeout=10000,reload=false){
  if(pending.has(url))return (await pending.get(url)).clone();
  const task=(async()=>{const control=new AbortController(),timer=setTimeout(()=>control.abort(),timeout);try{const r=await fetch(url,{cache:reload?'reload':'force-cache',signal:control.signal});if(!r.ok)throw Error('HTTP '+r.status);const body=await r.arrayBuffer(),headers=new Headers(r.headers);headers.delete('Content-Encoding');headers.set('Content-Length',String(body.byteLength));return new Response(body,{status:r.status,headers})}finally{clearTimeout(timer)}})();
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
