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
  /* 左手只做伴随记录，不影响推进 */
  let leftTally = { ok: 0, bad: 0 };
  let stableCount = 0, lastMidi = null, lastAdvance = 0;
  let speakQueue = null, micPaused = false;
  /* 录音模式状态 */
  let mediaRecorder = null, recordedChunks = [], recordingStream = null, isRecording = false;
  let recordEpoch = 0, recordingPending = false;

  function stopRecording() {
    recordEpoch++;recordingPending=false;
    const recorder=mediaRecorder,media=recordingStream;
    mediaRecorder=null;recordingStream=null;isRecording=false;
    try { if(recorder && recorder.state!=='inactive')recorder.stop(); }catch(_){}
    finally { if(media)media.getTracks().forEach(t=>{if(t.readyState!=='ended')t.stop()}); }
    updateButtons();
  }
  /* 双手模式状态 */
  let leftNoteIndex = 0, leftStableCount = 0, leftLastVerdict = '', leftLastMidi = null, leftLastAdvance = 0;

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
      /* #kidDock 只在 ≤700px 出现（固定底部，约 64px + 安全区）——
         原来只留 40px，页面最底部的内容会被 dock 压住（"跟弹"标签被切）。 */
      '@media(max-width:700px){.f79-page{padding-bottom:calc(104px + env(safe-area-inset-bottom))}}',
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
      /* 「查看全部 37 首」/「换一首」—— 都是次要动作，做成弱化按钮 */
      '.f79-more{width:100%;margin-top:12px;background:#fff!important;border-style:dashed!important;color:#6b5a9e!important;font-size:16px!important}',
      '.f79-change{justify-self:start;min-height:46px!important;padding:8px 16px!important;font-size:15px!important;background:#fff!important;border-color:#ded4f3!important;color:#6b5a9e!important;margin-bottom:10px}',
      /* 音符带 */
      '.f79-strip{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0;padding:14px;background:#f7f3ff;border-radius:20px;min-height:80px;align-items:center}',
      /* 音符格：**唱名为主**（do/re/mi），音名（C4）降为辅助小字。
         一年级音乐课教的是唱名与简谱，C4 这种带八度编号的科学音高记号
         是成人/乐理体系的东西，孩子看到只会当成噪音。 */
      '.f79-note{display:grid;place-items:center;gap:2px;min-width:62px;min-height:62px;padding:6px 8px;border-radius:14px;border:2px solid #ddd3f0;background:#fff;transition:transform .12s,background .12s}',
      '.f79-note b{font-size:21px;font-weight:800;color:#50358d;line-height:1.1;white-space:nowrap}',
      '.f79-note small{font-size:11px;color:#8d84a8;line-height:1;white-space:nowrap}',
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
      '.f79-page button,.f79-page select{box-sizing:border-box;min-height:52px;padding:12px 18px;border-radius:18px;border:2px solid #d3c0f3;font-family:inherit;font-weight:800;font-size:17px;line-height:1.4;color:#50358d;background:#f2ebff;cursor:pointer}',
      '.f79-page button:disabled{opacity:.5;cursor:default}',
      '.f79-page button:focus-visible,.f79-page select:focus-visible{outline:3px solid #147796;outline-offset:3px}',
      '.f79-primary{background:#7150bc!important;color:#fff!important;border-color:#7150bc!important}',
      '.f79-recording{background:#c96a6a!important;color:#fff!important;border-color:#c96a6a!important}',
      /* ⚠️ 按钮宽度用百分比而不是固定 170px —— 原来 `flex:1 1 170px` 配合
         content-box 的 padding/border，实际每个按钮要 210px，手机上只能一行一个，
         5 个按钮吃掉 300px 高度，把音符带挤到屏幕外。
         现在：主按钮【开始跟弹】独占一行，其余 4 个两两并排 = 3 行 180px。 */
      '.f79-actions>button{flex:1 1 calc(50% - 6px);min-width:0}',
      '.f79-actions>#f79Start{flex:1 1 100%}',
      '.f79-modes{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}',
      '.f79-modes button{flex:0 1 auto}',
      '.f79-modes button[aria-pressed=true]{background:#7150bc;color:#fff;border-color:#7150bc}',
      /* 统计 */
      '.f79-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}',
      '.f79-stats>div{padding:10px 12px;border-radius:16px;background:#f7f3ff;text-align:center}',
      '.f79-stats b{display:block;font-size:24px;color:#50358d;font-variant-numeric:tabular-nums}',
      '.f79-stats small{font-size:13px;color:#7a719c}',
      /* 双手模式：两行音符带（右手/左手）
         ⚠️⚠️ .f79-strip-row 原来是 `display:grid` 但没给 grid-template-columns，
         grid 默认单列 → **每个音符独占一整行**。实测双手 20 个音 = 40 行 / 3797px，
         把「开始跟弹」按钮顶到视口外 3 屏（孩子点完"双手一起"按钮就消失）。
         必须 flex + wrap，和单手 .f79-strip 用同一套换行逻辑。 */
      '.f79-strips{display:grid;gap:14px;margin:16px 0;padding:14px;background:#f7f3ff;border-radius:20px}',
      '.f79-strip-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '.f79-strip-row>.f79-strip-label{flex:0 0 100%;margin-bottom:2px}',
      '.f79-strip-label{font-size:14px;font-weight:800;color:#50358d;padding:0 4px}',
      '.f79-strip-row.right .f79-note{border-color:#7150bc;background:#f7f3ff}',
      '.f79-strip-row.left .f79-note{border-color:#2f7fb8;background:#eef7ff}',
      '.f79-prog-dual{display:grid;gap:8px;margin:12px 0}',
      '.f79-prog-dual .f79-prog{margin:0}',
      '@media(max-width:640px){.f79-card{padding:16px}.f79-note{min-width:54px;min-height:56px}.f79-note b{font-size:19px}.f79-live strong{font-size:20px}.f79-songs{grid-template-columns:1fr}}',
      '@media(prefers-reduced-motion:reduce){.f79-page *{animation:none!important;transition:none!important}}',
      /* 今日计划里的「钢琴」格子：从不可点的 <span> 改成可点按钮（learning-v66.js）。
         这里补样式，让它看起来仍是科目格，但带紫色内描边提示"这里可以点"。 */
      '.l66-subjects>button.l66-subj{border:0;font:inherit;color:#4a3a78;cursor:pointer;border-radius:18px;background:#ede4ff;padding:12px;font-size:17px;font-weight:750;text-align:center;line-height:1.35;width:100%;display:block;box-shadow:inset 0 0 0 2px #c9b6f5;transition:transform .12s ease,box-shadow .12s ease}',
      '@media(hover:hover){.l66-subjects>button.l66-subj:hover{box-shadow:inset 0 0 0 3px #a98fe0}}',
      '.l66-subjects>button.l66-subj:active{transform:scale(.96)}',
      '.l66-subjects>button.l66-subj small{color:#6b48c9;font-weight:800}',
      '.l66-subjects>button.l66-subj.done{box-shadow:inset 0 0 0 2px #c9ead5;background:#f3fff7}',
      '@media(max-width:700px){.l66-subjects>button.l66-subj{padding:10px 2px;font-size:14px}}',
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
    stopRecording();
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
    if (!mounted() || document.hidden || _eyeMode || v41EnsureAudio().muted) return;
    const ticket = epoch;
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
      if (ticket !== epoch || !mounted() || document.hidden || _eyeMode) return;
      /* 留 250ms 让扬声器余音散掉，再恢复拾音（否则残响会被收进去） */
      speakQueue = setTimeout(() => { if(ticket !== epoch || !mounted() || document.hidden || _eyeMode)return;micPaused = false; speakQueue = null; if (after) after(); }, 250);
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

  function currentExpectedLeft() {
    if (!curMelody || !curMelody.leftNotes) return null;
    if (leftNoteIndex >= curMelody.leftNotes.length) return null;
    return curMelody.leftNotes[leftNoteIndex];
  }

  function sample() {
    if (!mounted() || !analyser || !context || context.state !== 'running') { stopAll(); return; }
    if (micPaused) return;      /* 语音播报中，暂停拾音 */

    const expR = currentExpected();
    const expL = currentExpectedLeft();
    if (expR == null) return;

    analyser.getFloatTimeDomainData(buffer);
    const r = F.rangeOf(curMelody);

    let j;
    if (mode === 'both' && expL != null) {
      /* 双手并行判定 */
      j = F.judgeBoth(buffer, buffer.length, context.sampleRate, expR, expL, r.low, r.high);
    } else {
      /* 单手模式：复用原有 judge */
      j = { combined: null, right: F.judge(buffer, buffer.length, context.sampleRate, expR, r.low, r.high), left: null };
      j.combined = j.right.verdict;
    }

    const jr = j.right, jl = j.left;

    if (jr.verdict === 'silent' && (!jl || jl.verdict === 'silent')) {
      resetStable();
      heardNote = null;
      return;
    }

    /* ★ 稳定确认：连续 2 帧同一结论才推进（不是 3 帧） */
    /* ⚠️ 判"同一结论"要用 verdict + played + cents 三者，
       只用 verdict 会把"先弹 D 再弹 E"（都是 wrong）当成同一个，
       稳定计数虚增 → 第二个音还没来得及确认就被判过一次。 */
    /* 右手稳定确认 */
    const sigR = jr.verdict + '|' + (jr.played == null ? '-' : jr.played) + '|' + (jr.cents == null ? '-' : jr.cents);
    if (sigR === lastVerdict) stableCount++;
    else { stableCount = 1; lastVerdict = sigR; }
    lastMidi = jr.played;

    /* 左手稳定确认（双手模式下） */
    if (jl) {
      const sigL = jl.verdict + '|' + (jl.played == null ? '-' : jl.played) + '|' + (jl.cents == null ? '-' : jl.cents);
      if (sigL === leftLastVerdict) leftStableCount++;
      else { leftStableCount = 1; leftLastVerdict = sigL; }
      leftLastMidi = jl.played;
    }

    heardNote = jr.played != null ? jr.played : (jr.verdict === 'correct' ? expR : null);

    /* ══ 推进只看右手（主目标），左手同步位移但不参与放行 ═══════════
       v82 改动原因（三条都是实测出来的，不是偏好）：
       ① 原来 `if (!rightReady || !leftReady)` 要求两手都稳定。
          孩子右手一直弹对、左手一直不对时，页面**完全不推进也不给任何反馈**
          —— 他只会得出"这个 app 坏了"。这又是一次失败静默。
       ② 6-7 岁工作记忆容量只有 3-4 个信息块，"两只手同时都要对"在认知上必然超载。
       ③ 但左手又必须跟右手**同步位移**：两只手是同时弹的，
          左手若留在原地等，谱面位置就和右手错开，之后永远对不上。
       结论：右手决定走不走，左手只决定自己那一格染什么色。 */
    const leftV = jl ? jl.verdict : null;

    if (stableCount < 2) { renderLive(); return; }

    switch (jr.verdict) {
      case 'correct': {
        if (Date.now() - lastAdvance < 320) return;
        lastAdvance = Date.now();
        stats.correct++;
        markNote(noteIndex, 'ok');
        markLeftCompanion(leftV);
        const cents = jr.cents || 0;
        noteIndex++;
        resetStable();
        if (noteIndex >= curMelody.notes.length) { renderStats(); finishMelody(); return; }

        /* 反馈优先级：左手错音 > 右手音准偏差 > 泛泛鼓励。
           左手错音放在"这个音已经弹出去之后"才说，不打断当前音。 */
        if (leftV === 'wrong' && jl && jl.played != null && expL != null) {
          lastAdvice = `右手很准。刚才左手应该是 ${F.solfege(expL)}，你弹了 ${F.solfege(jl.played)}，下一遍留意。`;
          renderLive(); renderStrip(); renderStats(); speak(lastAdvice);
        } else if (Math.abs(cents) > 30) {
          lastAdvice = cents > 0 ? '这个音有点偏高，再放松一点。' : '这个音有点偏低，手指站稳一点。';
          renderLive(); renderStrip(); renderStats(); speak(lastAdvice);
        } else {
          lastAdvice = '很好，继续。';
          renderLive(); renderStrip(); renderStats();
        }
        return;
      }

      case 'wrong': {
        if (Date.now() - lastAdvance < 320) return;
        lastAdvance = Date.now();
        stats.wrong++;
        markNote(noteIndex, 'bad');
        const playedName = jr.played != null ? F.name(jr.played) : null;
        lastAdvice = playedName
          ? `这里该弹 ${F.solfege(expR)}，你弹的是 ${playedName}，再看看琴键位置。`
          : `这里该弹 ${F.solfege(expR)}，慢慢试一次。`;
        renderLive(); renderStrip(); renderStats(); speak(lastAdvice);
        /* 弹错不推进（教学法要求即时纠正）。左手也**不动** ——
           两手必须同步位移，右手留在原地时左手不能自己往前跑。
           ⚠️ 必须清 stableCount：否则孩子一直按着同一个错音，
              每 320ms 就灌一次 wrong 统计。 */
        resetStable();
        return;
      }

      case 'uncertain': {
        if (Date.now() - lastAdvance < 1200) return;
        lastAdvance = Date.now();
        stats.uncertain++;
        const withName = jr.overlapWith != null ? F.name(jr.overlapWith) : null;
        lastAdvice = withName
          ? `左手 ${withName} 的声音和这个音有点混，先只弹右手试一次。`
          : '这个音听不太准，先只弹右手慢慢试一次。';
        renderLive(); speak(lastAdvice);
        /* 听不准也推进（否则孩子会卡死在这一小节） */
        markNote(noteIndex, 'skip');
        markLeftCompanion(leftV);
        noteIndex++;
        resetStable();
        renderStrip(); renderStats();
        return;
      }

      case 'unclear':
        if (stableCount === 2) {
          lastAdvice = '声音太轻，手指按实一点再弹一次。';
          renderLive();
        }
        return;
    }
  }

  /* 左手伴随标记：随右手一起位移，只染色不拦人（理由见 sample() 顶部注释） */
  function markLeftCompanion(leftV) {
    if (mode !== 'both' || !curMelody || !curMelody.leftNotes) return;
    if (leftNoteIndex >= curMelody.leftNotes.length) return;
    const cls = leftV === 'correct' ? 'ok' : leftV === 'wrong' ? 'bad' : 'skip';
    markLeftNote(leftNoteIndex, cls);
    if (cls === 'ok') leftTally.ok++;
    else if (cls === 'bad') leftTally.bad++;
    leftNoteIndex++;
    leftStableCount = 0; leftLastMidi = null; leftLastVerdict = '';
  }

  function resetStable() {
    stableCount = 0; lastMidi = null; lastVerdict = '';
    leftStableCount = 0; leftLastMidi = null; leftLastVerdict = '';
  }

  function markNote(i, cls) {
    const el = document.querySelector(`.f79-note[data-i="${i}"][data-hand="right"]`);
    if (!el) return;
    el.classList.remove('cur', 'ok', 'bad', 'skip');
    el.classList.add(cls);
  }

  function markLeftNote(i, cls) {
    const el = document.querySelector(`.f79-note[data-i="${i}"][data-hand="left"]`);
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
    const totalL = curMelody.leftNotes ? curMelody.leftNotes.length : 0;
    const rate = total ? Math.round((stats.correct / total) * 100) : 0;
    /* 左手单独记账（leftTally，由 markLeftCompanion 累计）。
       不再拿右手数据冒充左手 —— 原来那行 `rateL` 是同一统计的重复。 */
    const advice = (mode === 'both' && leftTally.bad > 0)
      ? `右手很好。左手有 ${leftTally.bad} 个音没对上，先把左手单独弹两遍再合手。`
      : rate >= 90 ? '非常棒！可以再弹一遍，试试更连贯。'
        : rate >= 70 ? '不错！把错的几个单独练两遍，再完整弹一次。'
          : '慢慢来，先把错的那几个音单独练熟。';
    let msg = `弹完啦！右手 ${total} 个音，弹对 ${stats.correct} 个`;
    if (mode === 'both' && totalL) msg += `；左手 ${totalL} 个音，弹对 ${leftTally.ok} 个`;
    msg += `${stats.uncertain ? `，${stats.uncertain} 个听不太准` : ''}。`;
    lastAdvice = msg;
    const host = $('f79Live');
    if (host) {
      host.className = 'f79-live good';
      host.innerHTML = `<strong>🎉 弹完啦</strong><p>${msg}</p><p class="f79-tip">${advice}</p>`;
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
      /* 文案也统一成**唱名优先**：孩子问"这个音怎么弹"时，
         老师说的是"弹 re"，不是"弹 D4"。
         音名放括号里只作参考，且不带八度编号以外的解释。 */
      if (mode === 'both' && curMelody.leftNotes) {
        const expL = curMelody.leftNotes[leftNoteIndex] ?? null;
        title = `右手 ${F.solfege(exp)}（${F.name(exp)}） · 左手 ${expL ? F.solfege(expL) + '（' + F.name(expL) + '）' : '—'}`;
      } else {
        title = `下一个音：${F.solfege(exp)}（${F.name(exp)}）`;
      }
      if (heardNote != null) msg = `听到 ${F.solfege(heardNote)}` + (msg ? ' · ' + msg : '');
    }
    host.className = cls;
    host.innerHTML = `<strong>${title}</strong><p>${msg}</p>`;
  }

  function renderStrip() {
    const host = $('f79Strip');
    if (!host || !curMelody) return;

    if (mode === 'both' && curMelody.leftNotes) {
      /* 双手模式：两行音符带 */
      host.className = 'f79-strips';
      const rightHtml = curMelody.notes.map((m, i) => {
        const cls = i === noteIndex ? 'cur' : (i < noteIndex ? 'ok' : '');
        return `<div class="f79-note ${cls}" data-i="${i}" data-hand="right"><b>${F.solfege(m)}</b><small>${F.name(m)}</small></div>`;
      }).join('');
      const leftHtml = curMelody.leftNotes.map((m, i) => {
        const cls = i === leftNoteIndex ? 'cur' : (i < leftNoteIndex ? 'ok' : '');
        return `<div class="f79-note ${cls}" data-i="${i}" data-hand="left"><b>${F.solfege(m)}</b><small>${F.name(m)}</small></div>`;
      }).join('');
      host.innerHTML = `
        <div class="f79-strip-row right"><span class="f79-strip-label">🙋 右手</span>${rightHtml}</div>
        <div class="f79-strip-row left"><span class="f79-strip-label">🤚 左手</span>${leftHtml}</div>
      `;
      /* 双进度条 */
      const progHost = $('f79Prog');
      if (progHost) {
        progHost.className = 'f79-prog-dual';
        progHost.innerHTML = `
          <div class="f79-prog"><span class="f79-strip-label">🙋 右手</span><progress max="${curMelody.notes.length}" value="${noteIndex}"></progress><span>${noteIndex} / ${curMelody.notes.length}</span></div>
          <div class="f79-prog"><span class="f79-strip-label">🤚 左手</span><progress max="${curMelody.leftNotes.length}" value="${leftNoteIndex}"></progress><span>${leftNoteIndex} / ${curMelody.leftNotes.length}</span></div>
        `;
      }
    } else {
      host.className = 'f79-strip';
      /* ⚠️ 单手模式也必须带 data-hand="right" ——
         markNote() / markLeftNote() 是按 [data-hand] 定位的。
         原来单手模板没这个属性，导致**单手模式弹对了格子永远不变色**
         （markNote 静默返回 null），孩子只能靠"下一个音"的变化判断。
         这个 bug 和"点了没反应"同源：失败静默。 */
      host.innerHTML = curMelody.notes.map((m, i) => {
        const cls = i === noteIndex ? 'cur' : (i < noteIndex ? 'ok' : '');
        return `<div class="f79-note ${cls}" data-i="${i}" data-hand="right"><b>${F.solfege(m)}</b><small>${F.name(m)}</small></div>`;
      }).join('');
      const prog = $('f79Prog');
      if (prog) {
        prog.className = 'f79-prog';
        prog.innerHTML = `<progress max="${curMelody.notes.length}" value="${noteIndex}" aria-label="跟弹进度"></progress><span>${noteIndex} / ${curMelody.notes.length}</span>`;
      }
    }
  }

  function renderStats() {
    const host = $('f79Stats');
    if (!host) return;
    host.innerHTML = `<div><b>${stats.correct}</b><small>弹对</small></div><div><b>${stats.wrong}</b><small>再看看</small></div><div><b>${stats.uncertain}</b><small>听不准</small></div>`;
  }

  /* ── 曲目列表：默认只给 6 首，其余折叠 ────────────────────────────
     37 张卡手机上是 4146px（5.3 屏）。6 岁孩子做不到"在长列表里找目标"，
     而且整块曲目区会把练习区顶到视口外。 */
  const RECOMMEND_IDS = ['wuzhi', 'twinkle', 'bee', 'beyer01', 'beyer15', 'beyer25'];
  let songsExpanded = false;
  /* 用户点了「换一首」→ 曲目区展开、练习区收起。
     用显式状态而不是只改 DOM，否则 updateButtons() 一跑就把练习区又显示出来。 */
  let songPickerOpen = false;

  function lastMelodyId() {
    try {
      const st = JSON.parse(localStorage.getItem(KEY) || '{}');
      return st && st.last && st.last.melody ? st.last.melody : null;
    } catch (_) { return null; }
  }

  function foldedIds() {
    const ids = RECOMMEND_IDS.filter((id) => F.MELODIES.some((m) => m.id === id));
    const last = lastMelodyId();
    /* 上次练过的那首永远排第一 —— 复练同一首时不用展开也不用找 */
    if (last && !ids.includes(last) && F.MELODIES.some((m) => m.id === last)) ids.unshift(last);
    return ids;
  }

  function songButton(m) {
    const r = F.analyzeOverlap(m, [48]);
    const safePct = Math.round(r.safeRatio * 100);
    const hint = safePct >= 70 ? '适合合手' : '建议先右手';
    return `<button class="f79-song" onclick="Follow79.pick('${m.id}')"><b>${m.icon} ${m.title}</b><small>${m.notes.length} 个音 · ${m.tier}</small><i>${hint}（${safePct}%）</i></button>`;
  }

  function renderSongs() {
    const host = $('f79Songs');
    if (!host) return;
    const ids = foldedIds();
    const list = songsExpanded ? F.MELODIES : F.MELODIES.filter((m) => ids.includes(m.id));
    /* 折叠态按 RECOMMEND 顺序排，别按 MELODIES 原始顺序（拜厄在后面会乱） */
    if (!songsExpanded) list.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    host.innerHTML = list.map(songButton).join('');
    const more = $('f79More');
    if (more) more.textContent = songsExpanded
      ? '收起，只看推荐的几首'
      : `查看全部 ${F.MELODIES.length} 首`;
  }

  function render() {
    injectStyle();
    stopAll();
    /* 重新进入页面时回到"选曲"态：曲目区展示、练习区收起 */
    songPickerOpen = false;

    $('ct').innerHTML = `<main class="f79-page" id="f79Page">
  <button class="g1-back" onclick="showPage('home')">← 返回</button>
  <section class="f79-card" id="f79SongBox">
    <h1>🎹 跟弹练习</h1>
    <p>选一首曲子，打开麦克风，一个音一个音地弹。弹对了会往下走，弹错了会停下来等你重弹。</p>
    <div class="f79-songs" id="f79Songs"></div>
    <button class="f79-more" id="f79More" onclick="Follow79.toggleSongs()"></button>
  </section>
  <section class="f79-card" id="f79Practice" hidden>
    <button class="f79-change" onclick="Follow79.changeSong()">← 换一首</button>
    <h2 id="f79Title"></h2>
    <p id="f79Hint" class="f79-tip"></p>
    <div class="f79-modes" role="group" aria-label="练习方式">
      <button onclick="Follow79.setMode('right')" aria-pressed="true" id="f79ModeRight">🙋 只弹右手</button>
      <button onclick="Follow79.setMode('both')" aria-pressed="false" id="f79ModeBoth">🙌 双手一起</button>
    </div>
    <!-- ★ 控制区放在音符带**之前**：先给控制、再给内容。
         放在最下面时，双手音符带一长，按钮就被推到视口外，
         孩子点完"双手一起"就找不到"开始跟弹"了。 -->
    <div class="f79-actions">
      <button class="f79-primary" id="f79Start" onclick="Follow79.start()">▶ 开始跟弹</button>
      <button id="f79Stop" onclick="Follow79.stop()">■ 停止</button>
      <button id="f79Mic" onclick="Follow79.askMic()">🎤 开启麦克风</button>
      <button onclick="Follow79.restart()">↻ 从头再来</button>
      <button id="f79Rec" onclick="Follow79.toggleRecord()">🔴 录音模式</button>
    </div>
    <div class="f79-strip" id="f79Strip"></div>
    <div class="f79-prog" id="f79Prog"></div>
    <div class="f79-live" id="f79Live"></div>
    <div class="f79-stats" id="f79Stats"></div>
    <p class="f79-tip">麦克风只在本机分析声音，不录音、不上传。练习时先关掉电视和音乐，房间安静一点会更准。</p>
  </section>
</main>`;
    /* ⚠️ 必须补渲染这几块：render() 是重建 innerHTML，
       容器是新的空节点。若不补渲染，重新进入页面时音符带 / 状态区 /
       统计全是空白（看起来像"坏了"），而 curMelody 其实还记着上次选的曲子。 */
    renderSongs();
    renderStrip(); renderLive(); renderStats();
    updateButtons();
  }

  function updateButtons() {
    const has = !!curMelody;
    const pr = $('f79Practice');
    if (pr) pr.hidden = !has || songPickerOpen;
    const songBox = $('f79SongBox');
    if (songBox) songBox.hidden = has && !songPickerOpen;
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
    if (sp) sp.disabled = !stream && !pending && !isRecording && !recordingPending;
    const rec = $('f79Rec');
    if (rec) {
      rec.disabled = !has;
      rec.textContent = recordingPending ? '取消录音授权' : isRecording ? '⏹️ 停止录音' : '🔴 录音模式';
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
  /* 首页入口：**竖排小方块，与「继续闯关」并排**（零高度增加）。
     演进过程值得记一笔：
     ① v80 是 160px 大卡插在地图之后 → 桌面 862px / 手机 1875px，首屏根本看不见，
        孩子自己找不到「跟弹练习」，必须家长带点一次；
     ② v82 先改成 56px 横条插在"继续闯关"下面 → 入口进了首屏，
        但成长地图被顶到 426px（v78 好不容易压到 342px），退掉 v78 的成果；
     ③ 最终方案 = 跟「继续闯关」并排成一行，高度取 g1-continue 的 104px，
        **地图版式一动不动（仍是 342px）**，入口同时在首屏内。
     教训：在首屏塞新入口，不要"往上加高度"，要"横向借位置"。 */
  /* 首页入口：**全宽紧凑横条**（56px）。
     v90 基线下的现实：首页主区被「今日计划」占满，`child-v82.js` 又把
     继续闯关/地图/绘本统一收进「🧭 还有这些地方可以探索」折叠区，
     已经没有可并排的主行动卡了。所以这里用最省高度的横条形态。 */
  function entryHTML() {
    const st = loadState();
    const last = st.last && st.last.day ? st.last : null;
    const pct = last && last.total ? Math.round((last.correct / last.total) * 100) : null;
    const foot = pct != null ? `上次 ${pct}%` : '37 首曲子';
    return `<button class="f79-entry" onclick="showPage('follow79')" title="钢琴跟弹：37 首曲子，会用耳朵听你弹">` +
      `<span class="f79-eic">🎹</span>` +
      `<span class="f79-etxt"><b>钢琴跟弹</b><small>${foot} · 一个音一个音地弹</small></span>` +
      `<span class="f79-go">去弹 →</span></button>`;
  }

  function wrapHome() {
    if (typeof PGS !== 'object' || !PGS || !PGS.home || typeof PGS.home.render !== 'function') return false;
    if (PGS.home._f79wrapped) return true;
    const prev = PGS.home.render;
    PGS.home.render = function () {
      prev.apply(this, arguments);
      /* ⚠️ 走 injectEntry() 而不是自己再插一次 —— injectEntry 里有
         `if (document.querySelector('.f79-entry')) return true` 的幂等判断。
         原来这里直接 insertAdjacentHTML，boot 时 injectEntry 先跑过一遍，
         重渲染就会插出**第二个**入口（一屏两个"跟弹"按钮）。 */
      injectEntry();
    };
    PGS.home._f79wrapped = true;
    return true;
  }

  function injectEntry() {
    try {
      /* 首页也要注入样式：今日计划里的「钢琴」格子靠下面的 .l66-subj 规则才像可点的按钮 */
      injectStyle();
      /* ══ v91：不再往首页另插一张「跟弹」入口卡 ══════════════════════
         试过三种位置，全都不成立（都是实测）：
         ① 插在成长地图之后（v80）→ 桌面 862px / 手机 1875px，首屏根本看不见；
         ② 跟「继续闯关」并排（v82）→ v90 起继续闯关已被 child-v82 收进折叠区，没有可并排的对象；
         ③ 插在问候区之后（v91 试）→ DOM 顺序正确，但 `.g1-shell` 是
            `grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr)` 两列网格，
            `.a86-home` 又给世界地图/折叠区写死了 grid-row:3/4，
            新元素没有 grid-row 就被 auto-place 到**最后一行（实测 1392px，首屏 630 之外）**。
         真正的答案是：v90 的今日计划卡里本来就有「🎹 钢琴 20分钟」这一格，
         只是它被渲染成了不可点击的 <span>。把它做成 <button onclick="showPage('follow79')">
         （见 learning-v66.js）—— 位置天然在首屏中部、语义正好是"今天要练琴"、
         不新增任何版块、不破坏两列布局。 */
      return true;
    } catch (_) { return false; }
  }

  /* 首屏可能在本脚本执行前就已渲染完（game-v59.js 先跑），包装函数不会回头补插；
     且首页渲染时机不确定，故用 MutationObserver + 轮询双保险（项目既有做法）。 */
  function watchHome() {
    injectStyle();
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
      leftNoteIndex = 0;
      stats = { correct: 0, wrong: 0, uncertain: 0 };
      leftTally = { ok: 0, bad: 0 };
      lastAdvice = '点「开始跟弹」，从第一个音开始弹。';
      lastVerdict = ''; lastMidi = null; stableCount = 0;
      leftLastVerdict = ''; leftLastMidi = null; leftStableCount = 0;
      leftLastAdvance = 0;
      /* 选完就把曲目区收起来 —— 6 张卡在手机上仍有 600px，
         留着它练习区就还在下面。收起后练习区紧接标题，按钮稳进首屏。 */
      songPickerOpen = false;
      const songBox = $('f79SongBox');
      if (songBox) songBox.hidden = true;
      renderStrip(); renderLive(); renderStats(); updateButtons();
      /* ⚠️ block 用 'start' 不用 'nearest'：nearest 只保证元素"进入视口"，
         容器很高时按钮仍可能落在视口下方（实测单手差 4px、双手差 2 屏）。 */
      const box = $('f79Practice');
      if (box && !box.hidden) { try { box.scrollIntoView({ block: 'start' }); } catch (_) {} }
    },

    /* 换一首：曲目区回来、练习区收起（先停止拾音，避免看不见还在听） */
    changeSong() {
      stopAll();
      songPickerOpen = true;
      const songBox = $('f79SongBox');
      if (songBox) songBox.hidden = false;
      const pr = $('f79Practice');
      if (pr) pr.hidden = true;
      renderSongs();
      if (songBox) { try { songBox.scrollIntoView({ block: 'start' }); } catch (_) {} }
    },

    toggleSongs() {
      songsExpanded = !songsExpanded;
      renderSongs();
    },

    setMode(m) {
      mode = m === 'both' ? 'both' : 'right';
      const r = $('f79ModeRight'), b = $('f79ModeBoth');
      if (r) r.setAttribute('aria-pressed', String(mode === 'right'));
      if (b) b.setAttribute('aria-pressed', String(mode === 'both'));
      lastAdvice = mode === 'both'
        ? '双手一起弹：右手带着你往下走，左手弹错了只会变红提醒，不会把你卡住。'
        : '只弹右手，左手先休息。等右手熟了再试双手。';
      /* 切模式必须把进度和统计一起清零 ——
         只清 noteIndex 不清 stats，会出现"弹了 3 个音，弹对 12 个"。 */
      noteIndex = 0; leftNoteIndex = 0;
      stats = { correct: 0, wrong: 0, uncertain: 0 };
      leftTally = { ok: 0, bad: 0 };
      resetStable();
      renderStrip(); renderLive(); renderStats(); updateButtons();
    },

    askMic() { enableMic(); },

    start() {
      if (!curMelody) return;
      if (!stream) { enableMic(); return; }
      stats = { correct: 0, wrong: 0, uncertain: 0 };
      leftTally = { ok: 0, bad: 0 };
      noteIndex = 0; leftNoteIndex = 0;
      lastVerdict = ''; lastMidi = null; stableCount = 0;
      leftLastVerdict = ''; leftLastMidi = null; leftStableCount = 0;
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
      leftTally = { ok: 0, bad: 0 };
      noteIndex = 0; leftNoteIndex = 0;
      lastVerdict = ''; lastMidi = null; stableCount = 0;
      leftLastVerdict = ''; leftLastMidi = null; leftStableCount = 0;
      lastAdvice = '从头再来，慢慢弹。';
      renderStrip(); renderLive(); renderStats(); updateButtons();
    },

    /* ── 录音模式：整曲录制 .wav，供离线分析/发给老师 ─────────────────
       ⚠️ 录音用独立的 MediaRecorder，不跟跟弹检测共用 stream（避免 AEC/采样率冲突）。
       只记录声音，不做实时判定。文件可下载、分享。 */
    async startRecord() {
      if (isRecording || recordingPending || !mounted() || document.hidden || (typeof _eyeMode!=='undefined' && _eyeMode)) return;
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        lastAdvice = '这台设备不支持录音。';
        renderLive(); return;
      }
      const id=++recordEpoch;recordingPending=true;updateButtons();
      document.querySelector('#take86 audio')?.pause();stopAudio();
      let media=null;
      try {
        media = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: false,
        });
        if(id!==recordEpoch || !mounted() || document.hidden || (typeof _eyeMode!=='undefined'&&_eyeMode)){media.getTracks().forEach(t=>t.stop());return;}
        const type=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported?.(t));
        const recorder=new MediaRecorder(media,type?{mimeType:type}:undefined);
        const chunks=[],songId=curMelody?.id||'piano',mime=recorder.mimeType||type||'application/octet-stream';
        const extension=/mp4|aac/.test(mime)?'m4a':/ogg/.test(mime)?'ogg':/webm/.test(mime)?'webm':'audio';
        recordingStream=media;mediaRecorder=recorder;recordedChunks=chunks;
        recorder.onerror=()=>{if(mediaRecorder===recorder)stopRecording();if(mounted()){lastAdvice='录音中断，麦克风已关闭，请重试';renderLive()}};
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = () => {
          media.getTracks().forEach(t=>{if(t.readyState!=='ended')t.stop()});
          if(mediaRecorder===recorder){mediaRecorder=null;recordingStream=null;isRecording=false;updateButtons()}
          if(!chunks.length)return;
          const blob = new Blob(chunks, { type: mime });
          window.MediaTake86?.remember(blob,`${songId}_${Date.now()}.${extension}`).catch(()=>{});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${songId}_${Date.now()}.${extension}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          lastAdvice = '录音已生成。可在下方试听，再保存或分享；请确认系统下载结果。';
          if(mounted())renderLive();
        };
        recorder.start(1000);  /* 每秒切片一次 */
        isRecording = true;
        lastAdvice = '🔴 正在录音… 弹完整首曲子，再点一次停止。';
        updateButtons();
      } catch (err) {
        if(media)media.getTracks().forEach(t=>t.stop());
        if(id!==recordEpoch)return;
        mediaRecorder=null;recordingStream=null;isRecording=false;
        lastAdvice = err.name === 'NotAllowedError' ? '未获麦克风权限。' : '录音启动失败。';
        if(mounted())renderLive();
      } finally {
        if(id===recordEpoch){recordingPending=false;updateButtons()}
      }
    },

    stopRecord() {
      stopRecording();
    },

    toggleRecord() {
      if (isRecording || recordingPending) this.stopRecord();
      else this.startRecord();
    },
  };
  window.Follow79 = Follow79;
  if(new URLSearchParams(location.search).has('test'))window.__FOLLOW89_TEST={speak,snapshot:()=>({epoch,pending,micPaused,hasSpeechTimer:!!speakQueue})};

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
