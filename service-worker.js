/* Offline-first shell for the installed child-learning tool. */
const CACHE = 'child-learning-v48';
const PINYIN_KEYS = '';
const PINYIN = [];
const ENGLISH = ['bird','blue','brother','cat','dog','draw','ear','eat','eye','father','green','hand','mother','nose','rabbit','red','run','sister','sleep','yellow','hello','thank_you','how_are_you','i_am_fine'];
const MATH = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','equals','minus','plus','what'].map(x=>`./assets/math/${x}.mp3`);
const TEXTBOOK_COUNTS = [4,6,5,6,6,5,5,4,4];
const TEXTBOOK = TEXTBOOK_COUNTS.flatMap((count,u)=>Array.from({length:count},(_,i)=>`./assets/textbook/tb_${String(u).padStart(2,'0')}_${String(i+1).padStart(2,'0')}.mp3`));
const MATH_V44 = Array.from({length:42},(_,i)=>`./assets/math-v44/question_${String(i+1).padStart(2,'0')}.mp3`);
const MATH_V45_LOWER = Array.from({length:48},(_,i)=>`./assets/math-v45-lower/question_${String(i+1).padStart(2,'0')}.mp3`);
const TIME_V45 = Array.from({length:18},(_,i)=>`./assets/time-v45/question_${String(i+1).padStart(2,'0')}.mp3`);
const BOOK_V45 = Array.from({length:8},(_,i)=>`./assets/textbook-v45/math_lower_unit_${String(i+1).padStart(2,'0')}.mp3`);
const BOOK_V44 = [
  ...Array.from({length:7},(_,i)=>`./assets/textbook-v44/math_unit_${String(i+1).padStart(2,'0')}.mp3`),
  ...Array.from({length:8},(_,i)=>`./assets/textbook-v44/english_unit_${String(i+1).padStart(2,'0')}.mp3`)
];
const ENGLISH_V44 = [1,2,3,4,5,6,7,8].flatMap(u=>[1,2,3].flatMap(i=>[
  `./assets/english-v44/u${String(u).padStart(2,'0')}_${String(i).padStart(2,'0')}.mp3`,
  `./assets/english-v44-cn/u${String(u).padStart(2,'0')}_${String(i).padStart(2,'0')}.mp3`
]));
const POEM_KEYS = ['poem_yong_e','poem_hua','poem_min_nong','poem_jing_ye_si','poem_chun_xiao','poem_deng_guan_que_lou','poem_jiang_xue','poem_feng','poem_hua_ji','poem_xun_yin_zhe_bu_yu','poem_chi_shang','poem_xiao_chi'];
const POEM_LINES = POEM_KEYS.flatMap(k=>[1,2,3,4].map(n=>k+'_l'+n).concat([k+'_info']));
const PET_LINES = ['peta_01389bba','peta_018de43e','peta_03523f95','peta_0373a596','peta_04cd572a','peta_08734d08','peta_0b7b8a3d','peta_0d524779','peta_0e6a5526','peta_1150b376','peta_12a786b5','peta_13595166','peta_15c92c4f','peta_1aa01a45','peta_1da7dab7','peta_1f3ffa09','peta_210e4f1e','peta_22214cc8','peta_242e1fe4','peta_2a0531d3','peta_2b6de7e6','peta_2c750379','peta_2d01af04','peta_3247a6df','peta_333ff118','peta_351402a5','peta_37494143','peta_378339b8','peta_37fbd457','peta_381afec1','peta_3d013824','peta_40babada','peta_419a2825','peta_4281ebaf','peta_4304c72d','peta_436d1579','peta_47ef395f','peta_4d1c6893','peta_4dc20136','peta_4e2063ab','peta_4f45a09e','peta_500c2620','peta_501dc7c4','peta_5044bfac','peta_50f88d25','peta_516efa22','peta_55361f7c','peta_57593b7e','peta_58b90cb6','peta_58cd39b3','peta_5c637e58','peta_5e7c9b85','peta_5f9c1bec','peta_60db2121','peta_61002661','peta_63725b32','peta_66c17d56','peta_6a25f320','peta_6a2a7c0c','peta_6b42867c','peta_6d5c76bf','peta_713135eb','peta_75db20aa','peta_7b46f285','peta_7e7a0b07','peta_84715d8f','peta_872303a2','peta_8d30cfe1','peta_8fba1447','peta_922d5dcb','peta_98b5f48f','peta_9da0384c','peta_9e162fb4','peta_a1a7f2ad','peta_a1d757e6','peta_a414933a','peta_b0c58c0a','peta_b9f46f58','peta_ba3be981','peta_bbf95201','peta_bef41c18','peta_bfba5238','peta_c162cfde','peta_c3443675','peta_c448aaab','peta_cb680ab7','peta_cbae8d63','peta_cc1fa342','peta_ce2d1b99','peta_ce99ff2f','peta_cf150f2d','peta_d1e6fe0d','peta_d29aeb12','peta_d7e1852c','peta_d9a189ff','peta_db3a1dce','peta_db53285d','peta_e0d0de26','peta_e1370d2b','peta_e3191b91','peta_e43e5099','peta_e6dbc77a','peta_eaaee6b2','peta_ebefd556','peta_f05be1eb','peta_f1742fa0','peta_f6256c81','peta_f830c32d','peta_f84e2a99','peta_f8e37817','peta_f93d31f1','peta_fe15e6a7','peta_ffe9f6df'];
const VOICE = ['correct','greeting_afternoon','greeting_evening','greeting_late_morning','greeting_morning','greeting_night','greeting_noon','pet_bath','pet_hello','pet_hungry','pet_play','retry','trace_pass','trace_retry','trace_start',...POEM_LINES,...PET_LINES];
const PRECACHE = [
  './','./index.html','./manifest.webmanifest','./assets/vendor/hanzi-writer.min.js',
  './pet_voice_map.json','./assets/illustrations/curriculum-v46.webp',
  './assets/pets/labrador-cartoon.webp','./assets/voice/correct.mp3','./assets/voice/retry.mp3','./assets/voice/pet_hello.mp3',
  './assets/voice/eye_rest.mp3','./assets/voice/eye_limit.mp3','./assets/voice/eye_done.mp3',
  './assets/pinyin-v46/k-ke1.mp3','./assets/pinyin-v46/ing-ying1.mp3','./assets/pinyin-v46/ong-zhong1.mp3'
];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => {
  if (event.data !== 'prewarm-learning-audio') return;
  /* Keep first interaction fast: cache core teaching sounds and a small pet
     starter set now; the full replay library stays cache-on-demand. */
  const learningAudio = ['./assets/pinyin-v46/k-ke1.mp3','./assets/pinyin-v46/ing-ying1.mp3','./assets/pinyin-v46/ong-zhong1.mp3', ...MATH, ...TEXTBOOK, ...MATH_V44, ...MATH_V45_LOWER, ...TIME_V45, ...BOOK_V44, ...BOOK_V45, ...ENGLISH_V44, ...VOICE.slice(0, 36).map(x=>`./assets/voice/${x}.mp3`), './assets/voice/poem_yong_e_l1.wav', ...ENGLISH.flatMap(x => [
    `./assets/english/${x}.mp3`, `./assets/english-cn/${x}.mp3`
  ])];
  event.waitUntil(caches.open(CACHE).then(async cache => {
    for (let i = 0; i < learningAudio.length; i += 6) {
      await Promise.all(learningAudio.slice(i, i + 6).map(async asset => {
        if (await cache.match(asset)) return;
        try { const response = await fetch(asset); if (response.ok) await cache.put(asset, response); } catch (_) {}
      }));
    }
  }));
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
