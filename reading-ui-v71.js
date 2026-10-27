/* ==========================================================================
   reading-ui-v71.js — 中文分级绘本阅读 · 交互层（低年级每日学习搭子 新版块）
   复用英语馆 v9「看图 → 听 → 说」范式，改为中文，并加中文特有的：
     · 逐字点读高亮（音形同步，Ehri 2005 正字法映射）
     · 超纲字自动注音（读前预教 + 支架注音双保险）
     · 五要素复述脚手架（Vygotsky 1978，用完可撤）
     · 家长共读脚本（Epstein 2001）
   依赖：reading-v71.js（数据层，window.R71）
   ========================================================================== */
(function () {
  'use strict';

  var R = window.R71;
  if (!R) { console.warn('[reading-v71] 数据层 R71 未加载'); return; }

  var LS_KEY = 'readV71';
  /* ⚠️ 此处禁止声明名为 CP 的变量：index.html 已有全局 let CP='home'，
     在 IIFE 内写 var CP 会遮蔽它，导致读到的永远是本地值。
     判断当前页请统一用 window.CP。 */
  var cur = { book: null, page: 0, mode: 'read', py: [] };   // mode: read | ask | retell；py = 当前页逐字拼音
  var seq = 0, speaking = false, highlighted = -1;
  var stageCache = { bookId: '', page: -1, html: '' };
  var strategyTimer=null;
  function leaveReading(){clearTimeout(strategyTimer);clearTimeout(strategySheet._tm);strategyTimer=null;stopSpeak();var el=$('r71Sheet');if(el)el.remove();}

  /* ---------------- 进度存储 ---------------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  }
  function save(o) { try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) {} }
  function bk(id) { var d = load(); if (!d[id]) d[id] = { heard: 0, read: 0, retold: 0, stars: 0, last: 0 }; return d[id]; }
  function setBk(id, patch) {
    var d = load(); if (!d[id]) d[id] = { heard: 0, read: 0, retold: 0, stars: 0, last: 0 };
    for (var k in patch) d[id][k] = patch[k];
    d[id].last = Date.now(); save(d);
  }
  function pct(id) { var b = bk(id); return Math.min(100, Math.round((b.read / 3) * 100)); }

  /* ---------------- 工具 ---------------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var t = $('r71Toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'r71Toast'; t.className = 'r71-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  /* 把正文按「字」拆成可点读的 span，并在每个字上方标注拼音与声调。
     拼音来源优先级：
       ① 页级 p.py[i]（由 pinyin-pro 离线生成的逐字拼音，含声调，最准）
       ② R.RUBY[ch]（人工维护的支架注音表，用于超纲字兜底）
     依据 Ehri(2005) 正字法映射：音形同步对齐才能形成自主解码。 */
  function rubyHTML(text, book) {
    var out = '';
    var pre = {};
    (book.vocab || []).forEach(function (v) { (v.w || '').split('').forEach(function (c) { pre[c] = 1; }); });
    /* 取当前页的拼音数组（renderBook 会把 p.py 挂到 cur 上） */
    var pyArr = (cur && cur.py) || [];
    var hi = 0;   // 第几个汉字（与 py 数组下标对齐，标点不占位）
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (!/[\u4e00-\u9fa5]/.test(ch)) { out += esc(ch); continue; }
      var isNew = !R.SIGHT[ch];
      /* ① 页级拼音（有就用） ② 支架注音表兜底 */
      var py = pyArr[hi] || R.RUBY[ch] || '';
      hi++;
      var cls = 'r71-ch' + (isNew ? ' r71-new' : '') + (pre[ch] ? ' r71-taught' : '');
      out += '<span class="' + cls + '" data-i="' + i + '" data-py="' + esc(py) + '" role="button" tabindex="-1" aria-label="' + esc(ch + (py ? '，' + py : '')) + '">' +
        '<span class="r71-py">' + esc(py) + '</span>' +
        '<span class="r71-hz">' + esc(ch) + '</span>' +
        '</span>';
    }
    return out;
  }

  /* ---------------- 语音 ---------------- */
  /* 音色缓存：getVoices() 在页面刚加载时常常返回空数组（浏览器异步加载），
     如果每次都重新查，用户第一次点字就可能拿不到音色而「无声」。
     这里做两件事：① 缓存首次非空结果；② 监听 voiceschanged 主动刷新。
     ⚠️ 不能用 `var voicesCache = getVoices()` 直接初始化——那样缓存的是空数组。 */
  var voiceCache = null;
  function refreshVoices() {
    if (!window.speechSynthesis) return;
    var vs = speechSynthesis.getVoices();
    if (vs && vs.length) voiceCache = vs;
  }
  if (window.speechSynthesis) {
    refreshVoices();
    if (typeof speechSynthesis.addEventListener === 'function') {
      speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    } else {
      speechSynthesis.onvoiceschanged = refreshVoices;
    }
    /* 兜底轮询：部分浏览器不派发 voiceschanged */
    var _vt = 0;
    var _vp = setInterval(function () {
      refreshVoices();
      if (voiceCache || ++_vt > 20) clearInterval(_vp);
    }, 250);
  }

  function zhVoice() {
    var vs = voiceCache || (window.speechSynthesis ? speechSynthesis.getVoices() : []);
    if (!vs || !vs.length) return null;
    var prefer = ['Xiaoxiao', 'Huihui', 'Yaoyao', 'Kangkang', 'Tingting', 'Chinese', 'zh-CN', 'zh_CN'];
    var best = null, score = -1;
    vs.forEach(function (v) {
      if (!/^zh/i.test(v.lang) && !/Chinese/i.test(v.name)) return;
      var s = 0;
      prefer.forEach(function (k, i) { if (v.name.indexOf(k) >= 0) s += (prefer.length - i) * 10; });
      if (/Xiaoxiao/i.test(v.name)) s += 40;   // 中文童声首选
      if (/Natural|Online/i.test(v.name)) s += 8;
      if (s > score) { score = s; best = v; }
    });
    return best;
  }

  /* 是否有可用中文音色（供 UI 给出明确提示） */
  function hasZhVoice() { return !!zhVoice(); }

  /* 逐字高亮朗读：把文本切句，每句用 utterance 的 onboundary 推进高亮 */
  function speakText(text, book, startIdx, onDone, _wait) {
    if (!window.speechSynthesis) { toast('这台设备不能朗读，请家长读给孩子听'); onDone && onDone(); return; }
    /* 音色还没加载完时，等一小会儿再开始，避免首次朗读静默失败。
       最多等 6 轮（约 1.5s），超时就带空音色继续——让浏览器用默认音色念。 */
    if (!voiceCache && (_wait || 0) < 6) {
      refreshVoices();
      if (!voiceCache) {
        setTimeout(function () { speakText(text, book, startIdx, onDone, (_wait || 0) + 1); }, 260);
        return;
      }
    }
    var mySeq = ++seq;
    speechSynthesis.cancel();
    var v = zhVoice();
    // 按标点切句，让节奏有起伏
    var parts = [], buf = '', base = startIdx || 0, pos = base;
    for (var i = 0; i < text.length; i++) {
      buf += text[i];
      if (/[，。！？；：]/.test(text[i])) { parts.push({ t: buf, s: pos }); pos += buf.length; buf = ''; }
    }
    if (buf) parts.push({ t: buf, s: pos });

    var pi = 0;
    function next() {
      if (mySeq !== seq) return;
      if (pi >= parts.length) { clearHi(); speaking = false; onDone && onDone(); return; }
      var p = parts[pi++];
      var u = new SpeechSynthesisUtterance(p.t);
      u.lang = 'zh-CN';
      if (v) u.voice = v;
      u.rate = 0.86;          // 儿童向：比常速慢，但不拖
      u.pitch = 1.05;
      var local = 0;
      u.onboundary = function (e) {
        if (mySeq !== seq) return;
        var idx = p.s + (e.charIndex || local);
        hi(idx);
      };
      u.onend = function () { if (mySeq === seq) next(); };
      u.onerror = function () { if (mySeq === seq) { clearHi(); speaking = false; onDone && onDone(); } };
      speaking = true;
      speechSynthesis.speak(u);
    }
    next();
  }
  function hi(i) {
    var host = document.querySelector('.r71-passage');
    if (!host) return;
    if (highlighted >= 0) {
      var old = host.querySelector('.r71-ch[data-i="' + highlighted + '"]');
      if (old) old.classList.remove('on');
    }
    var el = host.querySelector('.r71-ch[data-i="' + i + '"]');
    if (el) { el.classList.add('on'); highlighted = i; }
  }
  function clearHi() {
    var host = document.querySelector('.r71-passage');
    if (host) host.querySelectorAll('.r71-ch.on').forEach(function (e) { e.classList.remove('on'); });
    highlighted = -1;
  }
  function stopSpeak() { seq++; try { speechSynthesis.cancel(); } catch (e) {} speaking = false; clearHi(); }

  /* ---------------- 页面：书架 ---------------- */
  function renderShelf() {
    stopSpeak();
    var bands = R.BANDS.map(function (b) {
      var books = R.BOOKS.filter(function (x) { return x.band === b.id; });
      if (!books.length) return '';
      return '<div class="r71-band">' +
        '<div class="r71-band-hd" style="--bc:' + b.color + ';--bb:' + b.bg + '">' +
        '<b>' + b.ic + ' ' + b.n + '</b><span>' + b.chars + ' · ' + b.sent + ' · ' + b.pinyin + '</span></div>' +
        '<p class="r71-band-desc">' + esc(b.desc) + '<em>' + esc(b.mode) + '</em></p>' +
        '<div class="r71-shelf">' + books.map(cardHTML).join('') + '</div></div>';
    }).join('');

    var total = R.BOOKS.length;
    var doneN = R.BOOKS.filter(function (b) { return bk(b.id).read >= 3; }).length;
    $('ct').innerHTML =
      '<button class="back" onclick="showPage(\'home\')">← <span>返回</span></button>' +
      '<section class="r71-hero">' +
      '<span class="r71-tag">📖 中文分级绘本 · 和大人一起读</span>' +
      '<h1>读一本，讲一个</h1>' +
      '<p>每本 6–12 分钟。先认几个词，再听一遍，然后自己读，最后讲给大人听。</p>' +
      '<div class="r71-prog"><i style="width:' + Math.round(doneN / total * 100) + '%"></i></div>' +
      '<small>已读完 ' + doneN + ' / ' + total + ' 本</small>' +
      '</section>' +
      '<section class="r71-howto">' +
      '<div><b>1</b><span>认词</span><small>读前 4 个词，看图猜意思</small></div>' +
      '<div><b>2</b><span>听读</span><small>听一遍，字会跟着亮</small></div>' +
      '<div><b>3</b><span>自己读</span><small>点字听音，卡住点一下</small></div>' +
      '<div><b>4</b><span>说一说</span><small>用五张卡把故事讲出来</small></div>' +
      '</section>' + bands + catalogHTML();
  }

  /* ---------------- 官方书目（快乐读书吧） ---------------- */
  function catalogHTML() {
    var C = R.CATALOG; if (!C) return '';
    var st = R.catalogStat();
    var sets = C.sets.map(function (s) {
      var vols = s.books.map(function (b) {
        var items = b.items.map(function (it) {
          var tag = it.on
            ? '<button class="r71-cit r71-cit-on" onclick="R71UI.open(\'' + it.on + '\')" title="有互动版，点开就能读">' +
              esc(it.t) + '<i>▶</i></button>'
            : '<span class="r71-cit">' + esc(it.t) + '</span>';
          return '<li>' + tag + '<em>' + esc(it.type) + (it.by ? ' · ' + esc(it.by) : '') + '</em></li>';
        }).join('');
        return '<details class="r71-cvol">' +
          '<summary><b>' + esc(b.vol) + '</b><span>' + esc(b.theme) + '</span>' +
          '<i>' + b.items.length + ' 篇</i></summary>' +
          '<ul class="r71-clist">' + items + '</ul></details>';
      }).join('');
      return '<section class="r71-cset">' +
        '<div class="r71-chd"><b>📚 ' + esc(s.grade) + '《' + esc(s.title) + '》</b>' +
        '<span>' + s.vols + ' 册 · ' + esc(s.publisher) + '</span></div>' +
        '<p class="r71-chowto">' + esc(s.howto) + '</p>' +
        '<div class="r71-cvols">' + vols + '</div></section>';
    }).join('');
    return '<details class="r71-catalog" open>' +
      '<summary><span class="r71-cic">📚</span><b>课本指定书目：快乐读书吧</b>' +
      '<i>' + st.vols + ' 册 · ' + st.items + ' 篇</i></summary>' +
      '<p class="r71-cnote">' + esc(C.note) + '</p>' +
      '<div class="r71-ctags"><i class="r71-ct-on">▶ 有互动版，点开就能读</i>' +
      '<i class="r71-ct-paper">其余篇目：建议用纸质书和大人一起读</i></div>' +
      sets + '</details>';
  }

  function cardHTML(b) {
    var st = bk(b.id);
    var p = pct(b.id);
    var r = R.rate(b);
    var betts = r.betts;
    return '<button class="r71-card" onclick="R71UI.open(\'' + b.id + '\')">' +
      '<span class="r71-cover">' + R.scene(b.art, b.artBg, { alt: b.title }) +
      '<i class="r71-emoji">' + b.emoji + '</i>' +
      (st.read >= 3 ? '<i class="r71-done">✓</i>' : '') + '</span>' +
      '<strong>' + esc(b.title) + '</strong>' +
      '<small class="r71-sub">' + esc(b.sub) + ' · ' + b.minutes + ' 分钟</small>' +
      '<small class="r71-theme">' + esc(b.theme) + '</small>' +
      '<span class="r71-meta"><i>' + R.STRATEGIES[b.strategy].ic + ' ' + R.STRATEGIES[b.strategy].n + '</i>' +
      '<i>' + b.pages.length + ' 页</i><i>' + (r.rate * 100).toFixed(1) + '% 生字</i></span>' +
      '<span class="r71-bar"><i style="width:' + p + '%"></i></span>' +
      '</button>';
  }

  /* ---------------- 页面：单本阅读（看图 → 听 → 说） ---------------- */
  function renderBook() {
    var b = cur.book; if (!b) { renderShelf(); return; }
    var p = b.pages[cur.page];
    var band = R.band(b.band);
    var st = bk(b.id);
    /* 当前页逐字拼音（全文注音用），与 rubyHTML 的汉字计数一一对应 */
    cur.py = p.py || [];

    /* 舞台：只在换页时重建（避免每帧重排） */
    var key = b.id + '#' + cur.page;
    var stage;
    if (stageCache.html && stageCache.page === key) {
      stage = $('r71Stage');
    } else {
      stage = null;
    }

    $('ct').innerHTML =
      '<button class="back" onclick="R71UI.shelf()">← <span>书架</span></button>' +
      '<div class="r71-reader" style="--bc:' + band.color + ';--bb:' + band.bg + '">' +
      '<header class="r71-rhd">' +
      '<span class="r71-badge">' + band.ic + ' ' + band.n + '</span>' +
      '<b>' + esc(b.title) + '</b>' +
      '<span class="r71-page">' + (cur.page + 1) + ' / ' + b.pages.length + '</span>' +
      '</header>' +

      /* 读前预教条（只在第 1 页显示，读完可收起） */
      (cur.page === 0 && !st.taught ? vocabStrip(b) : '') +

      '<div class="r71-stage" id="r71Stage">' +
      '<div class="r71-art">' + R.scene(p.art, p.bg, { alt: b.title + ' 第' + p.n + '页', extra: p.extra ? R.PROP[p.extra] : '' }) + '</div>' +
      '<div class="r71-passage" id="r71Passage">' + rubyHTML(p.text, b) + '</div>' +
      '<p class="r71-taptip"><i>👆</i>哪个字不认识，点一下它，会读给你听</p>' +
      '<div class="r71-ctrls">' +
      '<button class="r71-btn r71-play" onclick="R71UI.listen()">🔊 听这一页</button>' +
      '<button class="r71-btn" onclick="R71UI.slow()">🐢 慢慢读</button>' +
      '</div>' +
      '</div>' +

      /* 理解提问（每页一问，四策略轮转） */
      askHTML(p, b) +

      '<div class="r71-nav">' +
      '<button ' + (cur.page === 0 ? 'disabled' : '') + ' onclick="R71UI.go(-1)">← 上一页</button>' +
      '<button class="r71-primary" onclick="R71UI.go(1)">' + (cur.page === b.pages.length - 1 ? '读完，去复述 →' : '下一页 →') + '</button>' +
      '</div>' +
      '</div>';
  }

  function vocabStrip(b) {
    return '<section class="r71-vocab"><div class="r71-vhd">' +
      '<b>🔍 读前认一认</b><span>先认 4 个词，读的时候就不卡了</span></div>' +
      '<div class="r71-vgrid">' + b.vocab.map(function (v, i) {
        return '<button class="r71-vcard" onclick="R71UI.sayWord(' + i + ')">' +
          '<span class="r71-vem">' + v.emoji + '</span>' +
          '<strong>' + esc(v.w) + '</strong>' +
          '<small class="r71-vpy">' + esc(v.py) + '</small>' +
          '<small class="r71-vdef">' + esc(v.def) + '</small>' +
          '</button>';
      }).join('') + '</div>' +
      '<button class="r71-vok" onclick="R71UI.taught()">我认好了，开始读 →</button></section>';
  }

  function askHTML(p, b) {
    var s = R.STRATEGIES[p.ask.t];
    return '<section class="r71-ask" style="--sc:' + s.color + ';--sb:' + s.bg + '">' +
      '<div class="r71-ahd"><span class="r71-sic">' + s.ic + '</span><b>' + s.n + '</b>' +
      '<small>' + s.steps[0] + '</small></div>' +
      '<p class="r71-aq">' + esc(p.ask.q) + '</p>' +
      '<details class="r71-ahint"><summary>想不出来？点一下提示</summary>' +
      '<p>' + esc(p.ask.hint) + '</p></details>' +
      '<div class="r71-afoot"><button class="r71-btn" onclick="R71UI.strategy()">看看「' + s.n + '」怎么做</button></div>' +
      '</section>';
  }

  /* ---------------- 页面：复述脚手架 ---------------- */
  function renderRetell() {
    var b = cur.book; stopSpeak();
    var st = bk(b.id);
    $('ct').innerHTML =
      '<button class="back" onclick="R71UI.shelf()">← <span>书架</span></button>' +
      '<div class="r71-retell">' +
      '<header class="r71-rhd2"><b>🗣️ 讲给大人听</b><span>' + esc(b.title) + '</span></header>' +
      '<p class="r71-rintro">不用背，看着下面五张卡，用自己的话说。说错了也没关系。</p>' +
      '<div class="r71-frames">' + b.retell.frame.map(function (f, i) {
        return '<button class="r71-frame" onclick="R71UI.frameSay(' + i + ')">' +
          '<i>' + (i + 1) + '</i><strong>' + esc(f) + '</strong>' +
          '<small>' + esc(b.retell.prompts[i]) + '</small></button>';
      }).join('') + '</div>' +
      '<div class="r71-rbtns">' +
      '<button class="r71-btn" onclick="R71UI.sample()">🙋 我讲完了</button>' +
      '<button class="r71-btn" onclick="R71UI.showSample()">看看别人怎么讲</button>' +
      '</div>' +
      '<div class="r71-sample" id="r71Sample" hidden><b>一个小朋友是这样讲的：</b><p>' + esc(b.retell.sample) + '</p>' +
      '<small>这不是标准答案。你的讲法，只要说清楚了「谁、在哪、发生了什么、最后怎样」，就很好。</small></div>' +
      parentCard(b) +
      '<div class="r71-nav"><button onclick="R71UI.backToBook()">← 再读一遍</button>' +
      '<button class="r71-primary" onclick="R71UI.finish()">完成这一本 ✓</button></div>' +
      '</div>';
  }

  function parentCard(b) {
    return '<details class="r71-parent"><summary>👨‍👩‍👧 给大人：怎么陪孩子读这一本</summary>' +
      '<div class="r71-prow"><b>读前</b><p>' + esc(b.parent.before) + '</p></div>' +
      '<div class="r71-prow"><b>读中</b><p>' + esc(b.parent.during) + '</p></div>' +
      '<div class="r71-prow"><b>读后</b><p>' + esc(b.parent.after) + '</p></div>' +
      '<div class="r71-prow r71-watch"><b>注意</b><p>' + esc(b.parent.watch) + '</p></div>' +
      '<p class="r71-pnote">这本书想让孩子明白的一件事：' + esc(b.bigIdea) + '</p>' +
      '</details>';
  }

  /* ---------------- 策略微课弹层 ----------------
     ⚠️ 曾经的问题：这个弹层是 position:fixed; inset:0; z-index:9999 的全屏遮罩，
     打开绘本 320ms 后自动弹出，把正文整个盖住 —— 用户点字「完全没反应」，
     实际是点在了遮罩上。实测 elementFromPoint 命中的是 DIV.r71-sheet 而非 .r71-ch。
     现在改为：① 只在首次打开该策略时弹一次；② 弹层出现 4 秒后自动收起；
     ③ 点击遮罩任意处即关；④ 弹层打开期间给正文区加 pointer-events:none 之外的
     显式提示（右下角「点这里继续」），避免用户以为坏了。 */
  function strategySheet(key) {
    var s = R.STRATEGIES[key]; if (!s) return;
    var old = $('r71Sheet'); if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'r71Sheet'; d.className = 'r71-sheet';
    d.innerHTML = '<div class="r71-sheet-in" style="--sc:' + s.color + ';--sb:' + s.bg + '">' +
      '<span class="r71-sic">' + s.ic + '</span><h3>' + s.n + '</h3>' +
      '<p class="r71-swhy">' + esc(s.why) + '</p>' +
      '<ol class="r71-ssteps">' + s.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      '<p class="r71-sline">「' + esc(s.line) + '」</p>' +
      '<button class="r71-primary" onclick="R71UI.closeSheet()">好，我试试</button>' +
      '<p class="r71-sauto">4 秒后自动关闭</p></div>';
    d.addEventListener('click', function (e) { if (e.target === d) d.remove(); });
    document.body.appendChild(d);
    /* 自动收起：不让孩子卡在弹层上 */
    clearTimeout(strategySheet._tm);
    strategySheet._tm = setTimeout(function () { var x = $('r71Sheet'); if (x) x.remove(); }, 4000);
  }

  /* 逐字点读的事件委托：正文区是 innerHTML 重建的，
     逐个绑事件会在每次翻页后丢失，故用委托挂在 #ct 上一次性处理。 */
  function bindTapRead() {
    var ct = document.getElementById('ct');
    if (!ct || ct._r71tap) return;
    ct._r71tap = true;
    ct.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('.r71-passage .r71-ch') : null;
      if (!el) return;
      var i = parseInt(el.getAttribute('data-i'), 10);
      if (isNaN(i)) return;
      e.preventDefault();
      window.R71UI.sayChar(i);
    });
  }

  /* ---------------- 对外接口 ---------------- */
  window.R71UI = {
    shelf: function () { cur.book = null; cur.page = 0; renderShelf(); },

    open: function (id) {
      var b = R.book(id); if (!b) return;
      cur.book = b; cur.page = 0;
      stageCache = { bookId: '', page: -1, html: '' };
      renderBook();
      // 先播一遍策略微课提示（首次打开时）
      if (!bk(id).seenStrategy) {
        setBk(id, { seenStrategy: 1 });
        clearTimeout(strategyTimer);
        strategyTimer=setTimeout(function () { if(cur.book===b && $('r71Stage') && (typeof CP==='undefined'||CP==='readhome') && (typeof _eyeMode==='undefined'||!_eyeMode))strategySheet(b.strategy); }, 320);
      }
    },

    go: function (d) {
      var b = cur.book; if (!b) return;
      stopSpeak();
      var n = cur.page + d;
      if (n < 0) return;
      if (n >= b.pages.length) { renderRetell(); return; }
      cur.page = n;
      renderBook();
    },

    listen: function () {
      var b = cur.book; if (!b) return;
      var p = b.pages[cur.page];
      setBk(b.id, { heard: (bk(b.id).heard || 0) + 1 });
      speakText(p.text, b, 0);
    },

    /* 逐字点读：点哪个字就读哪个字，并高亮它（Ehri 2005 音形同步映射）。
       这是「自己读」环节的核心——孩子卡住时点一下，不用等家长。
       ⚠️ 曾踩的坑：设备无中文音色时，speak() 会异步触发 onerror，
       高亮随即被清掉，用户看到的是「点了没反应、也没声音」，无法判断是坏了还是没音色。
       现在：onerror 时给出明确文案提示，并保留高亮 1.2 秒，让用户看到点击已被接收。 */
    sayChar: function (i) {
      var b = cur.book; if (!b) return;
      var p = b.pages[cur.page]; if (!p) return;
      var ch = p.text.charAt(i); if (!ch) return;
      hi(i);
      if (!window.speechSynthesis) { toast('这台设备不能朗读，请家长读给孩子听'); return; }
      var mySeq = ++seq;
      try { speechSynthesis.cancel(); } catch (e) {}
      var v = zhVoice();
      var u = new SpeechSynthesisUtterance(ch);
      u.lang = 'zh-CN'; if (v) u.voice = v;
      u.rate = 0.55;            // 单字要更慢，孩子才听得出声调
      u.pitch = 1.04;
      u.onstart = function () { if (mySeq === seq) hi(i); };
      u.onend = function () { if (mySeq === seq) setTimeout(function () { if (mySeq === seq) clearHi(); }, 420); };
      u.onerror = function () {
        if (mySeq !== seq) return;
        /* 音色缺失/被拦截：保留高亮 1.2s，并明确告诉用户原因 */
        setTimeout(function () { if (mySeq === seq) clearHi(); }, 1200);
        if (!zhVoice()) toast('这台设备还没装中文语音，暂时读不出来（字已高亮）');
        else toast('语音被浏览器拦住了，再点一次试试');
      };
      speechSynthesis.speak(u);
    },

    /* 点词：连读「这个词 + 它所在的半句」，让孩子听到词在句子里的样子 */
    saySpan: function (from, to) {
      var b = cur.book; if (!b) return;
      var p = b.pages[cur.page]; if (!p) return;
      var seg = p.text.slice(from, to + 1);
      if (!/[\u4e00-\u9fa5]/.test(seg)) { this.sayChar(from); return; }
      if (!window.speechSynthesis) { toast(seg); return; }
      var mySeq = ++seq;
      try { speechSynthesis.cancel(); } catch (e) {}
      var v = zhVoice();
      var u = new SpeechSynthesisUtterance(seg);
      u.lang = 'zh-CN'; if (v) u.voice = v;
      u.rate = 0.68; u.pitch = 1.04;
      u.onstart = function () { if (mySeq === seq) hi(from); };
      u.onend = function () { if (mySeq === seq) setTimeout(function () { if (mySeq === seq) clearHi(); }, 260); };
      u.onerror = function () { if (mySeq === seq) clearHi(); };
      speechSynthesis.speak(u);
    },

    slow: function () {
      var b = cur.book; if (!b) return;
      var p = b.pages[cur.page];
      if (!window.speechSynthesis) { toast('这台设备不能朗读'); return; }
      var mySeq = ++seq; speechSynthesis.cancel();
      var v = zhVoice();
      p.lines.forEach(function (ln, i) {
        var u = new SpeechSynthesisUtterance(ln);
        u.lang = 'zh-CN'; if (v) u.voice = v;
        u.rate = 0.62; u.pitch = 1.02;    // 明显更慢，逐行停顿
        u.onstart = function () {
          if (mySeq !== seq) return;
          var host = document.querySelector('.r71-passage');
          if (host) host.querySelectorAll('.r71-ch.on').forEach(function (e) { e.classList.remove('on'); });
        };
        speechSynthesis.speak(u);
      });
      toast('慢慢读：一句一句跟着看');
    },

    sayWord: function (i) {
      var b = cur.book; if (!b) return;
      var v = b.vocab[i]; if (!v) return;
      if (!window.speechSynthesis) { toast(v.w + '：' + v.def); return; }
      var mySeq = ++seq; speechSynthesis.cancel();
      var vc = zhVoice();
      [v.w, v.sent].forEach(function (t) {
        var u = new SpeechSynthesisUtterance(t);
        u.lang = 'zh-CN'; if (vc) u.voice = vc;
        u.rate = 0.78; u.pitch = 1.04;
        speechSynthesis.speak(u);
      });
    },

    taught: function () {
      var b = cur.book; if (!b) return;
      setBk(b.id, { taught: 1 });
      renderBook();
      toast('认好了！现在听一遍，字会跟着亮');
    },

    strategy: function () {
      var b = cur.book; if (!b) return;
      var p = b.pages[cur.page];
      strategySheet(p.ask.t);
    },

    closeSheet: function () { var d = $('r71Sheet'); if (d) d.remove(); },

    frameSay: function (i) {
      var b = cur.book; if (!b) return;
      if (!window.speechSynthesis) { toast(b.retell.prompts[i]); return; }
      var mySeq = ++seq; speechSynthesis.cancel();
      var v = zhVoice();
      var u = new SpeechSynthesisUtterance(b.retell.prompts[i]);
      u.lang = 'zh-CN'; if (v) u.voice = v; u.rate = 0.82; u.pitch = 1.05;
      speechSynthesis.speak(u);
    },

    sample: function () {
      var b = cur.book; if (!b) return;
      setBk(b.id, { retold: (bk(b.id).retold || 0) + 1 });
      toast('说完了，真棒！可以点「看看别人怎么讲」对一对');
    },

    showSample: function () {
      var s = $('r71Sample'); if (s) { s.hidden = false; s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    },

    backToBook: function () { cur.page = 0; renderBook(); },

    finish: function () {
      var b = cur.book; if (!b) return;
      var st = bk(b.id);
      setBk(b.id, { read: (st.read || 0) + 1, stars: Math.min(3, (st.stars || 0) + 1) });
      try {
        if (typeof awd === 'function') awd('read71_' + b.id, 6, '读完《' + b.title + '》，获得 6 💎');
        else if (typeof toast === 'function') toast('读完《' + b.title + '》');
      } catch (e) {}
      var n = bk(b.id).read;
      stopSpeak();
      $('ct').innerHTML =
        '<div class="r71-done-wrap">' +
        '<div class="r71-done-ic">🎉</div>' +
        '<h1>《' + esc(b.title) + '》读完啦</h1>' +
        '<p>' + (n >= 3 ? '这是第 ' + n + ' 次读了。你已经很熟这个故事了。' : '第一次读完，很棒。过两天再读一次，会更顺。') + '</p>' +
        '<div class="r71-done-big"><b>这本书想告诉你</b><p>' + esc(b.bigIdea) + '</p></div>' +
        '<div class="r71-done-btns">' +
        '<button class="r71-primary" onclick="R71UI.open(\'' + b.id + '\')">再读一遍</button>' +
        '<button class="r71-btn" onclick="R71UI.shelf()">选下一本 →</button>' +
        '</div>' +
        '<p class="r71-done-tip">🌿 读了这么久，站起来看看窗外吧。</p>' +
        '</div>';
      try { if (typeof window.Eye70 !== 'undefined' && window.Eye70.nudge) window.Eye70.nudge(); } catch (e) {}
    },

    /* 供外部（首页卡片）调用 */
    stats: function () {
      var d = load(), n = 0, t = 0;
      R.BOOKS.forEach(function (b) { t++; if ((d[b.id] || {}).read >= 3) n++; });
      return { done: n, total: t };
    }
  };

  // Delayed narration/strategy overlays belong to the reading route only.
  const previousPage=showPage;showPage=function(id){if(id!=='readhome')leaveReading();return previousPage.apply(this,arguments)};
  const previousEye=eyeOpen;eyeOpen=function(){leaveReading();return previousEye.apply(this,arguments)};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)leaveReading()});
  window.addEventListener('pagehide',leaveReading);

  /* ---------------- 首页版块入口卡 ---------------- */
  function entryHTML() {
    var st = window.R71UI.stats();
    var p = st.total ? Math.round(st.done / st.total * 100) : 0;
    var bands = [];
    R.BOOKS.forEach(function (b) { if (bands.indexOf(b.band) < 0) bands.push(b.band); });
    return '<button class="r71-entry" onclick="showPage(\'readhome\')">' +
      '<div class="r71-entry-hd"><span class="r71-eic">📖</span><b>分级绘本阅读</b>' +
      '<span class="r71-etag">新</span></div>' +
      '<p>和大人一起读：先认词，再听读，然后自己读，最后讲给大人听。每本 6–12 分钟。</p>' +
      '<div class="r71-entry-ft"><i>' + st.total + ' 本</i><i>' + bands.join(' · ') + '</i>' +
      '<i>逐字点读</i><i>复述脚手架</i>' +
      '<span class="r71-go">去读书 · ' + p + '%</span></div></button>';
  }

  /* ---------------- 注册到 PGS ---------------- */
  /* 注意：index.html 里的 PGS 是词法全局（const/let），不是 window 属性，
     因此必须用 typeof PGS 探测，不能写 window.PGS。 */
  function register() {
    if (typeof PGS !== 'object' || !PGS) return false;
    PGS.readhome = { title: '📖 分级绘本', render: renderShelf };
    return true;
  }

  /* 首页入口卡：按项目既有惯例包装 PGS.home.render。

     ⚠️ v77 位置变更（重要，勿改回 beforebegin）：
     原先把入口卡插到 .g1-map（成长地图）**之前**。但 v77 把成长地图前移到
     「继续闯关」之后（为了让孩子一进来就看到自己的岛和进度），
     此时若仍插在地图之前，这张 148px 高的入口卡会把地图重新顶出首屏 ——
     实测：插在地图前 → 地图 top=631px（刚好掉出 630px 首屏线）；
           插在地图后 → 地图 top=483px（稳稳在首屏内）。
     所以改为插到 .g1-map 之后（beforeend 到地图后面），
     语义上仍是"探索完地图，再去读书"，位置也稳定。 */
  function wrapHome() {
    if (typeof PGS !== 'object' || !PGS || !PGS.home || typeof PGS.home.render !== 'function') return false;
    if (PGS.home._r71wrapped) return true;
    var old = PGS.home.render;
    PGS.home.render = function () {
      old.apply(this, arguments);
      var map = document.querySelector('#ct .g1-map');
      if (map) map.insertAdjacentHTML('afterend', entryHTML());
      else {
        var shell = document.querySelector('#ct .g1-shell');
        if (shell) shell.insertAdjacentHTML('beforeend', entryHTML());
      }
    };
    PGS.home._r71wrapped = true;
    return true;
  }

  /* 把入口卡插到成长地图之后（首页尚未渲染时退化为插到 shell 末尾） */
  function injectEntry() {
    try {
      if (document.querySelector('.r71-entry')) return true;   // 已插入
      /* 注意：此处必须读全局的 CP（index.html 里的 let CP），
         且本文件内绝不能声明同名变量，否则会被遮蔽。 */
      var nowPage;
      try { nowPage = CP; } catch (e) { nowPage = undefined; }
      if (nowPage !== undefined && nowPage !== 'home') return false;
      var ct = document.getElementById('ct');
      if (!ct) return false;
      var map = ct.querySelector('.g1-map');
      if (map) { map.insertAdjacentHTML('afterend', entryHTML()); return true; }
      var shell = ct.querySelector('.g1-shell');
      if (shell) { shell.insertAdjacentHTML('beforeend', entryHTML()); return true; }
    } catch (e) {}
    return false;
  }

  /* 首屏可能在本脚本执行前就已渲染完（game-v59.js 先跑），
     包装函数不会回头补插；且首页渲染时机不确定（依赖 init 与异步数据），
     故用 MutationObserver 持续守望，一出现容器就插入。 */
  function watchHome() {
    var tries = 0;
    (function poll() {
      if (injectEntry()) return;
      if (++tries > 40) return;          // ~6s 后放弃轮询
      setTimeout(poll, 150);
    })();
    if (typeof MutationObserver !== 'function') return;
    var ct = document.getElementById('ct');
    if (!ct) return;
    if (ct._r71obs) ct._r71obs.disconnect();
    ct._r71obs = new MutationObserver(function () { injectEntry(); });
    ct._r71obs.observe(ct, { childList: true, subtree: true });
  }

  var tries = 0;
  (function boot() {
    if (register() && wrapHome()) { bindTapRead(); watchHome(); return; }
    if (++tries > 60) { console.warn('[reading-v71] PGS 未就绪，阅读版块未注册'); return; }
    setTimeout(boot, 120);
  })();
})();
