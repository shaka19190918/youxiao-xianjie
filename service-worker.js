/* Offline-first shell for the installed child-learning tool. */
const CACHE = 'child-learning-v11';
const PINYIN = ['a1','a2','a3','a4','o1','o2','o3','o4','e1','e2','e3','e4','yi1','i2','i3','i4','wu1','u2','u3','u4','yu1','v2','v3','v4'].map(x=>`./assets/pinyin/${x}.mp3`);
const ENGLISH = ['bird','blue','brother','cat','dog','draw','ear','eat','eye','father','green','hand','mother','nose','rabbit','red','run','sister','sleep','yellow','hello','thank_you','how_are_you','i_am_fine'];
const MATH = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','equals','minus','plus','what'].map(x=>`./assets/math/${x}.mp3`);
const VOICE = ['correct','greeting_afternoon','greeting_evening','greeting_late_morning','greeting_morning','greeting_night','greeting_noon','pet_bath','pet_hello','pet_hungry','pet_play','poem_chun_xiao','poem_deng_guan_que_lou','poem_hua','poem_jiang_xue','poem_jing_ye_si','poem_min_nong','poem_yong_e','retry','trace_pass','trace_retry','trace_start'];
const PRECACHE = [
  './','./index.html','./manifest.webmanifest','./assets/vendor/hanzi-writer.min.js',
  './assets/pets/labrador-cartoon.png'
];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => {
  if (event.data !== 'prewarm-learning-audio') return;
  const learningAudio = [...PINYIN, ...MATH, ...VOICE.map(x=>`./assets/voice/${x}.mp3`), ...ENGLISH.flatMap(x => [
    `./assets/english/${x}.mp3`, `./assets/english-cn/${x}.mp3`
  ])];
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(learningAudio.map(async asset => {
    if (await cache.match(asset)) return;
    try { const response = await fetch(asset); if (response.ok) await cache.put(asset, response); } catch (_) {}
  }))));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('./index.html', copy)); return response; }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (new URL(request.url).origin === self.location.origin && response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
