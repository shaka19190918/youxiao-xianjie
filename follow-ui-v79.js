/* 跟弹练习 UI v79（2026-10-26）
   ══════════════════════════════════════════════════════════════════════
   用户需求：打开麦克风，听孩子弹钢琴，判断弹得对不对、音准准不准，
             并给出语音反馈。
   孩子正在练：拜厄（Beyer Op.101）、小汤3（John Thompson Book 3）。

   本文件负责 UI 与音频调度，判定逻辑全在 follow-v79.js（已 93/93 验证）。

   ── 为什么不做"整曲评分" ──────────────────────────────────────────────
   实测（_pitch_real.js）确认：单音检测算法在**双手同弹**时必然失败
   （报左手音或完全检测不到），因为"两个音叠加时哪个是主音"没有答案。
   而拜厄/小汤3 从第 1 课起就是双手。
   → 解法不是换算法，而是**换问法**：
      不问"弹的是什么音"（盲检测），而问"该弹的这个音在不在"（引导式）。
      实测（_pitch_guided.js）引导式检测在双手场景 4/4 全部可用。

   ── 为什么保留 uncertain 状态 ────────────────────────────────────────
   谐波重合（八度/五度关系）时，"真弹的高音"与"低音的谐波"在单帧频谱上
   数学不可分。此时判 uncertain 并提示"先分手弹一次"，而不是硬猜。
   这不是妥协：**分手练习本就是拜厄/小汤的标准教学要求**，
   老师也是这么教的。产品顺着教学法走，比硬做一个不可靠的合手判定更好。

   ⚠️ 踩过的坑（写 UI 时注意）
   ──────────────────────────────────────────────────────────────────────
   1. **麦克风开启时必须静音 playCue**（practice-v68.js:89 的既有设计）。
      原因：扬声器放声音会被麦克风收进去，把"电脑说的话"当成"孩子弹的音"。
      解法：**时分复用** —— 听完一个音 → 停拾音 → 播语音 → 恢复拾音。
      不能开回声消除（AEC 会削掉钢琴谐波，音高精度会掉）。
   2. **本文件绝不可声明与 index.html 全局同名变量**（CP/PGS/S/_eyeMode）。
      踩过：reading-ui-v71.js 内 `var CP='readhome'` 遮蔽全局 →
      首页入口卡一次都没插入且无报错。
   3. **动态内容事件必须用委托**（挂 #ct 打标记），逐元素绑 onclick
      在 innerHTML 重建后静默失效。
   4. **关键版式 CSS 由本 JS 自带注入**（项目铁律）——
      外部 CSS 可能被缓存成旧版，导致"新 JS + 旧 CSS"版式错乱。
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ⚠️ 不声明 CP / PGS / S / _eyeMode —— 它们是 index.html 的全局 */
  const $ = (id) => document.getElementById(id);
  const G = window.G1Learning;
  const F = window.G1Follow;
  if (!G || !F) return;   /* 依赖缺失时静默退出，不阻塞页面 */

  /* ── 状态 ────────────────────────────────────────────────────────── */
  let stream = null, context = null, source = null, analyser = null, buffer = null;
  let sampling = null, epoch = 0, pending = false;
  let curMelody = null, noteIndex = 0, mode = 'right';   /* right | left | both */
  let lastVerdict = '', lastAdvice = '', heardNote = null;
  let stats = { correct: 0, wrong: 0, uncertain: 0 };
  let stableCount = 0, lastMidi = null, lastAdvance = 0;
  let speakQueue = null, micPaused = false;
  /* 录音模式状态 */
  let mediaRecorder = null, recordedChunks = [], recordingStream = null, isRecording = false;

  const KEY = 'g1_follow_state_v1';
  function loadState() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveState(o) {
    try { localStorage.setItem(KEY, JSON.stringify(Object.assign(loadState(), o))); } catch (_) {}
  }

  /* ── CSS 自带注入（项目铁律） ─────────────────────────────────────── */
  function injectStyle() {
    if ($('f79-style')) return;
    const css = [
      '.f79-page{max-width:1000px;margin:0 auto;display:grid;gap:18px;min-width:0;padding-bottom:40px}',
      '.f79-page>.g1-back{display:inline-flex;align-items:center;justify-content:center;justify-self:start;width:auto;min-width:112px;height:56px;padding:0 18px;white-space:nowrap}',
      '.f79-card{border-radius:26px;padding:22px;background:#fff;box-shadow:0 10px 28px #6747a018;min-width:0}',
      '.f79-page h1{font-size:clamp(24px,4.4vw,34px);margin:0 0 8px}',
      '.f79-page h2{font-size:21px;margin:0 0 14px}',
      '.f79-page p{font-size:17px;line-height:1.7;margin:6px 0}',
      /* ⚠️ 说明文字用 .f79-tip，**不能**用 .f79-note ——
         .f79-note 是"音符格"（display:grid + 62px 高 + 边框）。
         首版两者同名，说明文字被渲染成方块（后定义的规则覆盖前面的）。 */
      '.f79-tip{font-size:15px!important;color:#5c5673}',
      /* 曲目卡 */
      '.f79-songs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}',
      '.f79-song{display:grid;gap:4px;text-align:left;min-height:88px;padding:14px 16px;border-radius:18px;border:2px solid #d3c0f3;background:#f7f3ff;cursor:pointer;font-family:inherit;color:#50358d}',
      '.f79-song:hover{border-color:#a98fe0}',
      '.f79-song b{font-size:19px;font-weight:800}',
      '.f79-song small{font-size:14px;color:#6b6288}',
      '.f79-song i{font-style:normal;font-size:13px;color:#8a7fb0}',
      /* 音符带 */
      '.f79-strip{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0;padding:14px;background:#f7f3ff;border-radius:20px;min-height:80px;align-items:center}',
      '.f79-note{display:grid;place-items:center;gap:2px;min-width:62px;min-height:62px;padding:6px 8px;border-radius:14px;border:2px solid #ddd3f0;background:#fff;transition:transform .12s,background .12s}',
      '.f79-note b{font-size:19px;font-weight:800;color:#50358d;line-height:1.1}',
      '.f79-note small{font-size:12px;color:#7a719c;line-height:1}',
      '.f79-note.cur{border-color:#7150bc;background:#ede4ff;transform:translateY(-4px);box-shadow:0 6px 16px #7150bc33}',
      '.f79-note.ok{border-color:#4f9c72;background:#e6f7ee}',
      '.f79-note.bad{border-color:#c96a6a;background:#fdeaea}',
      '.f79-note.skip{border-color:#d8d2e6;background:#f2f0f6;opacity:.6}',
      /* 状态区 */
      '.f79-live{display:grid;gap:10px;padding:18px;border-radius:22px;background:#eef7ff;min-height:112px;align-content:center}',
      '.f79-live strong{font-size:24px;display:block;line-height:1.3}',
      '.f79-live p{margin:0;font-size:17px;color:#3f4a5c}',
      '.f79-live.good{background:#e8f8ef}.f79-live.bad{background:#fdeeee}.f79-live.warn{background:#fdf6e6}',
      /* 进度 */
      '.f79-prog{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
      '.f79-prog progress{flex:1 1 200px;height:16px;accent-color:#8260ca;min-width:120px}',
      '.f79-prog span{font-size:16px;font-weight:700;color:#5a4a86;font-variant-numeric:tabular-nums}',
      /* 按钮 */
      '.f79-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}',
      '.f79-page button,.f79-page select{min-height:52px;padding:12px 18px;border-radius:18px;border:2px solid #d3c0f3;font-family:inherit;font-weight:800;font-size:17px;line-height:1.4;color:#50358d;background:#f2ebff;cursor:pointer}',
      '.f79-page button:disabled{opacity:.5;cursor:default}',
      '.f79-page button:focus-visible,.f79-page select:focus-visible{outline:3px solid #147796;outline-offset:3px}',
      '.f79-primary{background:#7150bc!important;color:#fff!important;border-color:#7150bc!important}',
      '.f79-recording{background:#c96a6a!important;color:#fff!important;border-color:#c96a6a!important}',
      '.f79-actions>button{flex:1 1 170px}',
      '.f79-modes{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}',
      '.f79-modes button{flex:0 1 auto}',
      '.f79-modes button[aria-pressed=true]{background:#7150bc;color:#fff;border-color:#7150bc}',
      /* 统计 */
      '.f79-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}',
      '.f79-stats>div{padding:10px 12px;border-radius:16px;background:#f7f3ff;text-align:center}',
      '.f79-stats b{display:block;font-size:24px;color:#50358d;font-variant-numeric:tabular-nums}',
      '.f79-stats small{font-size:13px;color:#7a719c}',
      '@media(max-width:640px){.f79-card{padding:16px}.f79-note{min-width:52px;min-height:54px}.f79-note b{font-size:16px}.f79-live strong{font-size:20px}.f79-songs{grid-template-columns:1fr}}',
      '@media(prefers-reduced-motion:reduce){.f79-page *{animation:none!important;transition:none!important}}',
      /* 首页入口卡（与绘本入口 .r71-entry 同族，视觉一致） */
      '.f79-entry{display:block;width:100%;text-align:left;margin:14px 0 0;padding:16px 18px;border:2px solid #cfe6f7;border-radius:22px;background:linear-gradient(180deg,#fff 0%,#eef7ff 100%);font-family:inherit;color:#2c4256;cursor:pointer;box-shadow:0 8px 22px rgba(56,96,132,.10);transition:transform .16s ease,box-shadow .16s ease}',
      '@media(hover:hover){.f79-entry:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(56,96,132,.17)}}',
      '.f79-entry:active{transform:translateY(1px) scale(.99)}',
      '.f79-entry-hd{display:flex;align-items:center;gap:10px;margin-bottom:6px}',
      '.f79-entry-hd .f79-eic{font-size:30px}',
      '.f79-entry-hd b{font-size:18px;color:#22374a}',
      '.f79-entry-hd .f79-etag{font-size:12px;font-weight:800;padding:2px 9px;border-radius:999px;background:#2f7fb8;color:#fff}',
      '.f79-entry p{font-size:13px;color:#4f6a80;line-height:1.65;margin:0 0 10px}',
      '.f79-entry-ft{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.f79-entry-ft i{font-style:normal;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:#fff;color:#3d6a8c;border:1px solid #d7e8f4}',
      '.f79-entry-ft .f79-go{margin-left:auto;font-size:14px;font-weight:800;color:#2f7fb8}',
    ].join('');
    const st = document.createElement('style');
    st.id = 'f79-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── 麦克风 ──────────────────────────────────────────────────────── */
  function releaseMic() {
    epoch++;
    pending = false;
    if (sampling) { clearInterval(sampling); sampling = null; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (source) { try { source.disconnect(); } catch (_) {} source = null; }
    analyser = null; buffer = null;
    const old = context; context = null;
    if (old) old.close().catch(() => {});
    stableCount = 0; lastMidi = null; micPaused = false;
  }

  function mounted() { return !!$('f79Page'); }

  async function enableMic() {
    if (!mounted()) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      lastAdvice = '这台设备不能开麦克风，可以先用「跟弹」看着谱慢慢弹。';
      renderLive(); updateButtons(); return;
    }
    releaseMic();
    const id = epoch;
    pending = true;
    lastAdvice = '请在浏览器提示里选择「允许」。';
    renderLive(); updateButtons();
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('unsupported');
      context = new Ctx();
      await context.resume();
      if (id !== epoch || !mounted()) return;
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          /* ⚠️ 三个必须关：开启后读数会漂移（浏览器默认开启） */
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      if (id !== epoch || !mounted()) { media.getTracks().forEach((t) => t.stop()); return; }
      stream = media;
      pending = false;
      analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      buffer = new Float32Array(analyser.fftSize);
      source = context.createMediaStreamSource(stream);
      source.connect(analyser);   /* 绝不接到 destination，否则会啸叫 */
      stream.getTracks().forEach((track) => track.addEventListener('ended', () => {
        if (stream === media) { stopAll(); lastAdvice = '麦克风断开了，请重新开启。'; renderLive(); }
      }, { once: true }));
      stopAudio();
      lastAdvice = '开始弹吧。一次弹一个音，慢慢来。';
      /* ★ 采样间隔 60ms（不是 125ms）
         实测（_pitch_tune.js）：125ms 采样 + 3 帧确认 = 375ms 窗口，
         300ms/音 只捕捉 38%；改 60ms + 2 帧确认后 200ms/音 也能 100% 捕捉。 */
      sampling = setInterval(sample, 60);
      /* ⚠️ 必须同时调 updateButtons()：麦克风按钮的文案/禁用态和
         停止按钮的可用态都由它管。首版只调了 renderLive()，
         结果麦克风其实已经开了，按钮却还显示「开启麦克风」、
         「停止」还是灰的 —— 看起来像"点了没反应"。 */
      renderLive(); updateButtons();
    } catch (error) {
      if (id !== epoch) return;
      releaseMic();
      lastAdvice = error.name === 'NotAllowedError'
        ? '没有拿到麦克风权限。可以先看着谱慢慢弹。'
        : error.name === 'NotFoundError'
          ? '没找到麦克风。可以先看着谱慢慢弹。'
          : '麦克风没准备好，再试一次。';
      renderLive(); updateButtons();
    }
  }

  function stopAll() {
    /* ⚠️ 顺序有讲究：先取消语音与恢复定时器，再释放麦克风。
       否则定时器会在麦克风已关之后把 micPaused 置回 false（状态错乱）。 */
    if (speakQueue) { clearTimeout(speakQueue); speakQueue = null; }
    micPaused = false;
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (_) {}
    releaseMic();
    stopAudio();
  }

  function stopAudio() {
    /* ⚠️ 这些是 index.html 里的**函数声明**（词法全局），不是 window 属性。
       typeof 能读到，但不能写 window.v46StopAudio —— 项目里已有先例踩过。
       另：项目里**没有** stopPianoV6 这个全局（只有 practice-v68.js 内部的
       局部同名判断），写它属于"引用不存在的函数"，已删除。 */
    try { if (typeof v46StopAudio === 'function') v46StopAudio(); } catch (_) {}
    try { if (typeof pinyinV63Stop === 'function') pinyinV63Stop(); } catch (_) {}
  }

  /* ── 语音反馈（时分复用） ─────────────────────────────────────────
     ⚠️ 为什么必须"停拾音再说话"：
        扬声器放的声音会被麦克风收进去，把"电脑说的话"当成"孩子弹的音"。
        项目原有设计（practice-v68.js:89）是**麦克风开启时全部静音**。
        这里改为时分复用：暂停拾音 → 播语音 → 恢复拾音。
     ⚠️ 不能用回声消除（AEC）解决：AEC 会削掉钢琴谐波，音高精度会掉。 */
  function speak(text, after) {
    if (!window.speechSynthesis) { if (after) after(); return; }
    /* ⚠️ 必须先清掉上一次的恢复定时器。
       踩过：连续两次播报时，第一次的 setTimeout 没被取消 →
       它提前把 micPaused 置回 false，而此时第二次语音还在播，
       扬声器声音被麦克风收进去 → 被当成"孩子弹的音"。
       这就是 practice-v68.js 当初干脆全静音的原因，时分复用必须做干净。 */
    if (speakQueue) { clearTimeout(speakQueue); speakQueue = null; }
    const voices = speechSynthesis.getVoices() || [];
    let v = null, score = -1;
    voices.forEach((x) => {
      if (!/^zh/i.test(x.lang) && !/Chinese/i.test(x.name)) return;
      let s = 0;
      ['Xiaoxiao', 'Huihui', 'Yaoyao', 'Kangkang', 'Tingting', 'zh-CN'].forEach((k, i) => {
        if (x.name.indexOf(k) >= 0) s += (7 - i) * 10;
      });
      if (/Natural|Online/i.test(x.name)) s += 8;
      if (s > score) { score = s; v = x; }
    });
    /* 暂停拾音（时分复用） */
    micPaused = true;
    try { speechSynthesis.cancel(); } catch (_) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (v) u.voice = v;
    u.rate = 0.92;    /* 儿童向：略慢 */
    u.pitch = 1.05;
    let done = false, guard = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (guard) clearTimeout(guard);
      /* 留 250ms 让扬声器余音散掉，再恢复拾音（否则残响会被收进去） */
      speakQueue = setTimeout(() => { micPaused = false; speakQueue = null; if (after) after(); }, 250);
    };
    u.onend = finish;
    u.onerror = finish;
    /* 兜底：某些浏览器 onend 不触发（音色缺失 / 被 cancel） */
    guard = setTimeout(finish, Math.max(1800, text.length * 260));
    try { speechSynthesis.speak(u); } catch (_) { finish(); }
  }

  /* ── 采样与判定 ─────────────────────────────────────────────────── */
  function currentExpected() {
    if (!curMelody) return null;
    const notes = curMelody.notes;
    if (noteIndex >= notes.length) return null;
    return notes[noteIndex];
  }

  function sample() {
    if (!mounted() || !analyser || !context || context.state !== 'running') { stopAll(); return; }
    if (micPaused) return;      /* 语音播报中，暂停拾音 */
    const exp = currentExpected();
    if (exp == null) return;

    analyser.getFloatTimeDomainData(buffer);
    const r = F.rangeOf(curMelody);
    const j = F.judge(buffer, buffer.length, context.sampleRate, exp, r.low, r.high);

    if (j.verdict === 'silent') {
      stableCount = 0; lastMidi = null; lastVerdict = '';
      heardNote = null;
      return;
    }

    /* ★ 稳定确认：连续 2 帧同一结论才推进（不是 3 帧）
       实测：2 帧 + 60ms 采样 → 200ms/音 100% 捕捉；3 帧会漏掉一半。
       ⚠️ 判"同一结论"要用 verdict + played + cents 三者，
          只用 verdict 会把"先弹 D 再弹 E"（都是 wrong）当成同一个，
          稳定计数虚增 → 第二个音还没来得及确认就被判过一次。 */
    const sig = j.verdict + '|' + (j.played == null ? '-' : j.played) + '|' + (j.cents == null ? '-' : j.cents);
    if (sig === lastVerdict) stableCount++;
    else { stableCount = 1; lastVerdict = sig; }
    lastMidi = j.played;

    heardNote = j.played != null ? j.played : (j.verdict === 'correct' ? exp : null);

    if (stableCount < 2) { renderLive(); return; }

    /* 推进条件：弹对 / 弹错 / 听不准（听不准也算"这个音过了"，避免卡死） */
    if (j.verdict === 'correct') {
      if (Date.now() - lastAdvance < 320) return;   /* 防抖：太快连推 */
      lastAdvance = Date.now();
      stats.correct++;
      markNote(noteIndex, 'ok');
      const cents = j.cents || 0;
      noteIndex++;
      stableCount = 0; lastMidi = null; lastVerdict = '';
      if (noteIndex >= curMelody.notes.length) {
        renderStats();
        finishMelody();
        return;
      }
      /* 语音反馈：只有偏差明显时才说话，避免打断节奏 */
      if (Math.abs(cents) > 30) {
        lastAdvice = cents > 0 ? '这个音有点偏高，再放松一点。' : '这个音有点偏低，手指站稳一点。';
        renderLive(); renderStrip(); renderStats();
        speak(lastAdvice);
      } else {
        lastAdvice = '很好，继续。';
        renderLive(); renderStrip(); renderStats();
      }
      return;
    }

    if (j.verdict === 'wrong') {
      if (Date.now() - lastAdvance < 320) return;
      lastAdvance = Date.now();
      stats.wrong++;
      markNote(noteIndex, 'bad');
      const playedName = j.played != null ? F.name(j.played) : null;
      lastAdvice = playedName
        ? `这里是 ${F.name(exp)}，你弹的是 ${playedName}，再看看琴键位置。`
        : `这里是 ${F.name(exp)}，再看看琴键位置，慢慢试一次。`;
      renderLive(); renderStrip(); renderStats();
      speak(lastAdvice);
      /* 弹错不推进，让孩子重弹（这是教学法的关键：错了要立即纠正）
         ⚠️ 不推进也要清 stableCount：否则孩子一直弹同一个错音时，
            每 320ms 就 +1 次 wrong，统计会被灌水。 */
      stableCount = 0; lastMidi = null; lastVerdict = '';
      return;
    }

    if (j.verdict === 'uncertain') {
      if (Date.now() - lastAdvance < 1200) return;
      lastAdvance = Date.now();
      stats.uncertain++;
      const withName = j.overlapWith != null ? F.name(j.overlapWith) : null;
      lastAdvice = withName
        ? `左手 ${withName} 的声音和这个音有点混，先只弹右手试一次。`
        : '这个音听不太准，先只弹右手慢慢试一次。';
      renderLive();
      speak(lastAdvice);
      /* 听不准也推进（否则孩子会卡死在这一小节） */
      markNote(noteIndex, 'skip');
      noteIndex++;
      stableCount = 0; lastMidi = null; lastVerdict = '';
      renderStrip(); renderStats();
      return;
    }

    /* unclear：音域内没有明确音（弹得太轻 / 手还没按实）→ 不推进，也不计数 */
    if (stableCount === 2) {
      lastAdvice = '这个音没听清，手指按实一点再弹一次。';
      renderLive();
    }
  }

  function markNote(i, cls) {
    const el = document.querySelector(`.f79-note[data-i="${i}"]`);
    if (!el) return;
    el.classList.remove('cur', 'ok', 'bad', 'skip');
    el.classList.add(cls);
  }

  function finishMelody() {
    /* ⚠️ 顺序：先关麦克风，再渲染，最后播语音。
       不能先 speak 再 stopAll —— stopAll 里的 speechSynthesis.cancel()
       会把刚要播的庆祝语音掐掉（"点了没反应"的另一种形态）。 */
    stopAll();
    const total = curMelody.notes.length;
    const rate = total ? Math.round((stats.correct / total) * 100) : 0;
    const advice = rate >= 90 ? '非常棒！可以再弹一遍，试试更连贯。'
      : rate >= 70 ? '不错！把错的几个单独练两遍，再完整弹一次。'
        : '慢慢来，先把错的那几个音单独练熟。';
    lastAdvice = `弹完啦！一共 ${total} 个音，弹对 ${stats.correct} 个。`;
    const host = $('f79Live');
    if (host) {
      host.className = 'f79-live good';
      host.innerHTML = `<strong>🎉 弹完啦</strong><p>${curMelody.title}：共 ${total} 个音，弹对 <b>${stats.correct}</b> 个${stats.uncertain ? `，${stats.uncertain} 个听不太准` : ''}。</p><p class="f79-tip">${advice}</p>`;
    }
    const btn = $('f79Start');
    if (btn) { btn.disabled = false; btn.textContent = '▶ 再弹一遍'; }
    renderStats();
    updateButtons();
    /* 记录到今日计划（钢琴项） */
    try {
      const today = G.localDay();
      const st = loadState();
      st.last = { day: today, melody: curMelody.id, correct: stats.correct, total };
      saveState(st);
    } catch (_) {}
    speak(lastAdvice + ' ' + advice);
  }

  /* ── 渲染 ────────────────────────────────────────────────────────── */
  function renderLive() {
    const host = $('f79Live');
    if (!host) return;
    const exp = currentExpected();
    let cls = 'f79-live', title = '', msg = lastAdvice || '选一首曲子，点「开始跟弹」。';
    if (pending) { title = '等待麦克风授权…'; }
    else if (!stream) { title = curMelody ? '准备开始' : '先选一首曲子'; }
    else if (exp == null) { title = '弹完啦'; cls += ' good'; }
    else {
      title = `下一个音：${F.name(exp)}（${F.solfege(exp)}）`;
      if (heardNote != null) msg = `听到：${F.name(heardNote)}` + (msg ? ' · ' + msg : '');
    }
    host.className = cls;
    host.innerHTML = `<strong>${title}</strong><p>${msg}</p>`;
  }

  function renderStrip() {
    const host = $('f79Strip');
    if (!host || !curMelody) return;
    host.innerHTML = curMelody.notes.map((m, i) => {
      const cls = i === noteIndex ? 'cur' : (i < noteIndex ? 'ok' : '');
      return `<div class="f79-note ${cls}" data-i="${i}"><b>${F.name(m)}</b><small>${F.solfege(m)}</small></div>`;
    }).join('');
    const prog = $('f79Prog');
    if (prog) {
      prog.innerHTML = `<progress max="${curMelody.notes.length}" value="${noteIndex}" aria-label="跟弹进度"></progress><span>${noteIndex} / ${curMelody.notes.length}</span>`;
    }
  }

  function renderStats() {
    const host = $('f79Stats');
    if (!host) return;
    host.innerHTML = `<div><b>${stats.correct}</b><small>弹对</small></div><div><b>${stats.wrong}</b><small>再看看</small></div><div><b>${stats.uncertain}</b><small>听不准</small></div>`;
  }

  function render() {
    injectStyle();
    stopAll();
    const songs = F.MELODIES.map((m) => {
      const r = F.analyzeOverlap(m, [48]);
      const safePct = Math.round(r.safeRatio * 100);
      const hint = safePct >= 70 ? '适合合手' : '建议先右手';
      return `<button class="f79-song" onclick="Follow79.pick('${m.id}')"><b>${m.icon} ${m.title}</b><small>${m.notes.length} 个音 · ${m.tier}</small><i>${hint}（${safePct}%）</i></button>`;
    }).join('');

    $('ct').innerHTML = `<main class="f79-page" id="f79Page">
  <button class="g1-back" onclick="showPage('home')">← 返回</button>
  <section class="f79-card">
    <h1>🎹 跟弹练习</h1>
    <p>选一首曲子，打开麦克风，一个音一个音地弹。弹对了会往下走，弹错了会停下来等你重弹。</p>
    <div class="f79-songs">${songs}</div>
  </section>
  <section class="f79-card" id="f79Practice" hidden>
    <h2 id="f79Title"></h2>
    <p id="f79Hint" class="f79-tip"></p>
    <div class="f79-modes" role="group" aria-label="练习方式">
      <button onclick="Follow79.setMode('right')" aria-pressed="true" id="f79ModeRight">🙋 只弹右手</button>
      <button onclick="Follow79.setMode('both')" aria-pressed="false" id="f79ModeBoth">🙌 双手一起</button>
    </div>
    <div class="f79-strip" id="f79Strip"></div>
    <div class="f79-prog" id="f79Prog"></div>
    <div class="f79-live" id="f79Live"></div>
    <div class="f79-stats" id="f79Stats"></div>
    <div class="f79-actions">
      <button class="f79-primary" id="f79Start" onclick="Follow79.start()">▶ 开始跟弹</button>
      <button id="f79Stop" onclick="Follow79.stop()">■ 停止</button>
      <button id="f79Mic" onclick="Follow79.askMic()">🎤 开启麦克风</button>
      <button onclick="Follow79.restart()">↻ 从头再来</button>
      <button id="f79Rec" onclick="Follow79.toggleRecord()">🔴 录音模式</button>
    </div>
    <p class="f79-tip">麦克风只在本机分析声音，不录音、不上传。练习时先关掉电视和音乐，房间安静一点会更准。</p>
  </section>
</main>`;
    /* ⚠️ 必须补渲染这三块：render() 是重建 innerHTML，
       容器是新的空节点。若不补渲染，重新进入页面时音符带 / 状态区 /
       统计全是空白（看起来像"坏了"），而 curMelody 其实还记着上次选的曲子。 */
    renderStrip(); renderLive(); renderStats();
    updateButtons();
  }

  function updateButtons() {
    const has = !!curMelody;
    const pr = $('f79Practice');
    if (pr) pr.hidden = !has;
    const mic = $('f79Mic');
    if (mic) {
      mic.disabled = pending || !!stream || !has;
      mic.textContent = pending ? '等待授权…' : stream ? '🎤 麦克风已开' : '🎤 开启麦克风';
    }
    const st = $('f79Start');
    if (st) {
      st.disabled = !has;
      if (has && noteIndex === 0) st.textContent = '▶ 开始跟弹';
    }
    const sp = $('f79Stop');
    if (sp) sp.disabled = !stream && !pending;
    const rec = $('f79Rec');
    if (rec) {
      rec.disabled = !has;
      rec.textContent = isRecording ? '⏹️ 停止录音' : '🔴 录音模式';
      rec.classList.toggle('f79-recording', isRecording);
    }
    if (has) {
      const t = $('f79Title');
      if (t) t.textContent = `${curMelody.icon} ${curMelody.title}`;
      const h = $('f79Hint');
      if (h) h.textContent = curMelody.hint;
    }
  }

  /* ── 首页入口卡 ────────────────────────────────────────────────────
     ⚠️ v77 铁律：任何新首页版块都插到 `.g1-map`（成长地图）**之后**。
        插到地图之前会把地图顶出首屏（实测 483px → 631px，掉出 630px 线）。
     ⚠️ v77 定稿顺序：问候 → 继续闯关 → 成长地图 → 绘本入口 → 今日计划卡 → 伙伴小屋。
        为了不打乱这个顺序，本卡片插在**绘本入口之后**（`.r71-entry`），
        退化链：.r71-entry → .g1-map → .g1-shell。
     ⚠️ 动态内容事件必须用委托（挂 #ct 打标记），逐元素绑 onclick
        在 innerHTML 重建后会静默失效。 */
  function entryHTML() {
    const st = loadState();
    const last = st.last && st.last.day ? st.last : null;
    let foot = '37 首曲子 · 含拜厄 1-30 课';
    if (last) {
      const pct = last.total ? Math.round((last.correct / last.total) * 100) : 0;
      foot = `上次：${last.correct} / ${last.total} 个音（${pct}%）`;
    }
    return `<button class="f79-entry" onclick="showPage('follow79')">` +
      `<div class="f79-entry-hd"><span class="f79-eic">🎹</span><b>钢琴跟弹</b>` +
      `<span class="f79-etag">新</span></div>` +
      `<p>打开麦克风，一个音一个音地弹。弹对了往下走，弹错了停下来等你重弹，还会告诉你音偏高还是偏低。</p>` +
      `<div class="f79-entry-ft"><i>拜厄 · 小汤适用</i><i>${foot}</i>` +
      `<span class="f79-go">去弹 · →</span></div></button>`;
  }

  function wrapHome() {
    if (typeof PGS !== 'object' || !PGS || !PGS.home || typeof PGS.home.render !== 'function') return false;
    if (PGS.home._f79wrapped) return true;
    const prev = PGS.home.render;
    PGS.home.render = function () {
      prev.apply(this, arguments);
      const anchor = document.querySelector('#ct .r71-entry') || document.querySelector('#ct .g1-map');
      if (anchor) anchor.insertAdjacentHTML('afterend', entryHTML());
      else {
        const shell = document.querySelector('#ct .g1-shell');
        if (shell) shell.insertAdjacentHTML('beforeend', entryHTML());
      }
    };
    PGS.home._f79wrapped = true;
    return true;
  }

  function injectEntry() {
    try {
      if (document.querySelector('.f79-entry')) return true;
      /* 只在首页插入（CP 是 index.html 的 let 全局，本文件内不可声明同名变量） */
      let nowPage;
      try { nowPage = CP; } catch (_) { nowPage = undefined; }
      if (nowPage !== undefined && nowPage !== 'home') return false;
      const ct = document.getElementById('ct');
      if (!ct) return false;
      const anchor = ct.querySelector('.r71-entry') || ct.querySelector('.g1-map');
      if (anchor) { anchor.insertAdjacentHTML('afterend', entryHTML()); return true; }
      const shell = ct.querySelector('.g1-shell');
      if (shell) { shell.insertAdjacentHTML('beforeend', entryHTML()); return true; }
    } catch (_) {}
    return false;
  }

  /* 首屏可能在本脚本执行前就已渲染完（game-v59.js 先跑），包装函数不会回头补插；
     且首页渲染时机不确定，故用 MutationObserver + 轮询双保险（项目既有做法）。 */
  function watchHome() {
    let tries = 0;
    (function poll() {
      if (injectEntry()) return;
      if (++tries > 40) return;          /* ~6s 后放弃轮询 */
      setTimeout(poll, 150);
    })();
    if (typeof MutationObserver !== 'function') return;
    const ct = document.getElementById('ct');
    if (!ct) return;
    if (ct._f79obs) ct._f79obs.disconnect();
    ct._f79obs = new MutationObserver(() => { injectEntry(); });
    ct._f79obs.observe(ct, { childList: true, subtree: true });
  }

  /* ── 对外 API ────────────────────────────────────────────────────── */
  const Follow79 = {
    pick(id) {
      const m = F.MELODIES.find((x) => x.id === id);
      if (!m) return;
      curMelody = m;
      noteIndex = 0;
      stats = { correct: 0, wrong: 0, uncertain: 0 };
      lastAdvice = '点「开启麦克风」，然后从第一个音开始弹。';
      lastVerdict = ''; lastMidi = null; stableCount = 0;
      renderStrip(); renderLive(); renderStats(); updateButtons();
      /* ⚠️ 必须在 updateButtons()（它才把 #f79Practice 的 hidden 去掉）
         之后才 scrollIntoView —— 对 hidden 元素滚动是无效的。 */
      const box = $('f79Practice');
      if (box && !box.hidden) { try { box.scrollIntoView({ block: 'nearest' }); } catch (_) {} }
    },

    setMode(m) {
      mode = m === 'both' ? 'both' : 'right';
      const r = $('f79ModeRight'), b = $('f79ModeBoth');
      if (r) r.setAttribute('aria-pressed', String(mode === 'right'));
      if (b) b.setAttribute('aria-pressed', String(mode === 'both'));
      lastAdvice = mode === 'both'
        ? '双手一起时，如果左手的声音盖住了右手，可以切回「只弹右手」。'
        : '只弹右手，左手先休息。等右手熟了再试双手。';
      renderLive();
    },

    askMic() { enableMic(); },

    start() {
      if (!curMelody) return;
      if (!stream) { enableMic(); return; }
      stats = { correct: 0, wrong: 0, uncertain: 0 };
      noteIndex = 0; lastVerdict = ''; lastMidi = null; stableCount = 0;
      lastAdvice = '开始吧，慢慢弹。';
      renderStrip(); renderLive(); renderStats(); updateButtons();
    },

    stop() {
      stopAll();
      lastAdvice = '已停止。麦克风已关闭。';
      renderLive(); updateButtons();
    },

    restart() {
      if (!curMelody) return;
      stats = { correct: 0, wrong: 0, uncertain: 0 };
      noteIndex = 0; lastVerdict = ''; lastMidi = null; stableCount = 0;
      lastAdvice = '从头再来，慢慢弹。';
      renderStrip(); renderLive(); renderStats(); updateButtons();
    },

    /* ── 录音模式：整曲录制 .wav，供离线分析/发给老师 ─────────────────
       ⚠️ 录音用独立的 MediaRecorder，不跟跟弹检测共用 stream（避免 AEC/采样率冲突）。
       只记录声音，不做实时判定。文件可下载、分享。 */
    async startRecord() {
      if (isRecording) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        lastAdvice = '这台设备不支持录音。';
        renderLive(); return;
      }
      try {
        recordedChunks = [];
        recordingStream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: false,
        });
        mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorder.ondataavailable = (e) => { if (e.data.size) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${curMelody ? curMelody.id : 'piano'}_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          lastAdvice = '录音已保存，可发给老师或留作对比。';
          renderLive();
        };
        mediaRecorder.start(1000);  /* 每秒切片一次 */
        isRecording = true;
        lastAdvice = '🔴 正在录音… 弹完整首曲子，再点一次停止。';
        updateButtons();
      } catch (err) {
        lastAdvice = err.name === 'NotAllowedError' ? '未获麦克风权限。' : '录音启动失败。';
        renderLive();
      }
    },

    stopRecord() {
      if (!isRecording) return;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      if (recordingStream) { recordingStream.getTracks().forEach(t => t.stop()); recordingStream = null; }
      isRecording = false;
      updateButtons();
    },

    toggleRecord() {
      if (isRecording) this.stopRecord();
      else this.startRecord();
    },
  };
  window.Follow79 = Follow79;

  /* ── 生命周期钩子：离开页面必须释放麦克风 ──────────────────────────
     ⚠️⚠️ 关键坑：showPage / eyeOpen 是 index.html 里的**函数声明**，
        属于词法全局，**不是 window 属性** —— `window.showPage` 恒为 undefined。
        首版写成 window.showPage = ... 导致钩子从未生效，
        麦克风会一直开着（隐私 + 耗电），且不报错。
        正确写法是直接对裸标识符赋值（同 game-v59.js:329 / learning-v66.js:262）。
     ⚠️ 本 IIFE 内不可声明与全局同名变量（CP/PGS/S/_eyeMode/showPage/eyeOpen）。 */
  try {
    if (typeof showPage === 'function') {
      const prevShow = showPage;
      showPage = function (id) {
        if (id !== 'follow79') stopAll();
        return prevShow.apply(this, arguments);
      };
    }
  } catch (_) {}
  try {
    if (typeof eyeOpen === 'function') {
      const prevEye = eyeOpen;
      eyeOpen = function () { stopAll(); return prevEye.apply(this, arguments); };
    }
  } catch (_) {}
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  window.addEventListener('pagehide', () => stopAll());

  /* ── 启动：注册页面 + 包装首页（带重试，因为 PGS 可能还没就绪） ────
     ⚠️ PGS 是 index.html 的词法全局，必须用 typeof PGS 探测（window.PGS 永远拿不到）。
     ⚠️ 注册与包装分两步，任一未就绪都要重试 —— game-v59.js 是 defer 且在本文件之前，
        通常已就绪；但若它失败（网络问题），本文件也不该静默失效。 */
  let bootTries = 0;
  (function boot() {
    let registered = false, wrapped = false;
    try {
      if (typeof PGS === 'object' && PGS) {
        PGS.follow79 = { title: '🎹 跟弹练习', render };
        registered = true;
        wrapped = wrapHome();
      }
    } catch (_) {}
    if (registered && wrapped) { watchHome(); return; }
    if (++bootTries > 60) {
      /* 静默失败是项目明令禁止的（"失败永远不要表现为静默无反应"）。
         这里用 console.warn 而非 toast：首页还没渲染时 toast 会盖住首屏。 */
      try { console.warn('[follow-v79] PGS 未就绪，跟弹页面未注册'); } catch (_) {}
      return;
    }
    setTimeout(boot, 120);
  })();
})();
