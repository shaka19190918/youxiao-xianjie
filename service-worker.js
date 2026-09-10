/* 一年级成长岛 v61：全科清单与已核验拼音的离线优先应用外壳。 */
const CACHE='grade1-island-v62';
const TONE_AUDIO=['ma','bo','ge','yi','wu','yu'].flatMap(v=>[1,2,3,4].map(t=>`./assets/pinyin-v61/${v}${t}.mp3`));
const PRECACHE=[
  './','./index.html','./manifest.webmanifest','./game-v59.css','./game-v59.js',
  './curriculum-v61.css','./curriculum-v61.js',
  './assets/vendor/hanzi-writer.min.js','./pet_voice_map.json',
  './assets/voice/correct.mp3','./assets/voice/retry.mp3','./assets/voice/greeting_morning.mp3',
  './assets/voice/pet_hello.mp3','./assets/voice/eye_rest.mp3','./assets/voice/eye_limit.mp3','./assets/voice/eye_done.mp3',
  './assets/pinyin-v60/yin1.mp3','./assets/pinyin-v60/wen1.mp3',
  ...TONE_AUDIO
];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));

self.addEventListener('message',event=>{
  if(event.data==='skip-waiting'){self.skipWaiting();return}
  const data=event.data||{};
  if(data.type!=='prewarm-assets'||!Array.isArray(data.assets))return;
  const assets=[...new Set(data.assets)].filter(path=>typeof path==='string'&&!path.includes('://')).slice(0,12);
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await Promise.all(assets.map(async path=>{
      const request=new Request(path,{credentials:'same-origin'});
      if(await cache.match(request))return;
      try{const response=await fetch(request);if(response.ok)await cache.put(request,response)}catch(_){ }
    }));
  }));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const request=event.request;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(new URL(request.url).origin===self.location.origin&&response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
    return response;
  })));
});
