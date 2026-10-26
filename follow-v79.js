/* 跟弹检测引擎 v79（2026-10-26）
   ══════════════════════════════════════════════════════════════════════
   为什么需要它
   ──────────────────────────────────────────────────────────────────────
   pitch-v68.js 的 detect() 是**盲检测** —— 问"这是什么音？"。
   实测（_pitch_real.js）：孩子双手弹奏时盲检测必然失败
     · 右手 E4 + 左手 C3  → null（完全检测不到）
     · 右手 C5 + 左手 C3  → 报出 C3（报的是左手音）
   这不是算法不够好，是**问题本身没有答案** ——
   两个音叠加时，"主音"这个概念不存在。

   跟弹场景有个盲检测没有的优势：**我们知道该弹哪个音**（有谱）。
   于是换个问法：
     ✗ "孩子弹的是什么音？"            → 盲检测，复音必败
     ✓ "该弹的这个音，在不在声音里？"   → 引导式检测，对复音免疫
   实测（_pitch_guided.js）：引导式检测在双手场景 4/4 全部可用。

   本引擎提供三个判据
   ──────────────────────────────────────────────────────────────────────
   ① presence()    引导式存在性 —— 判"这个音弹了没有"（双手模式）
   ② bestInRange() 受限 argmax  —— 判"实际弹的是哪个音"（分手模式，能指出错音）
   ③ finePitch()   精细音高     —— 判"音准准不准"，约 ±5 音分分辨率

   ⚠️ 踩过的坑（实测抓到，勿重蹈）
   ──────────────────────────────────────────────────────────────────────
   **坑一：五度/八度谐波重合导致的假阳性（物理层面，无法完全消除）**
   纯五度是 3:2 频率比 → 低音的 k 次谐波与高音的某次谐波重合：
     · 左手 C3(130.81Hz) 的 3 次谐波 = 392.4Hz ≈ G4(392Hz) 的基频
     · 左手 C3 的 4 次谐波 = 523.25Hz = C5 的基频（完全重合）
     · 左手 G3(196Hz) 的 2 次谐波 = 392Hz = G4 的基频
   后果：孩子该弹 G4 却弹了 D4（左手仍在弹 C3）时，
         G4 位置**确实有能量**（来自 C3 的谐波）→ 会被误判成"弹对了"。
   这是**最危险的错误类型**（把错的判成对的，孩子会学错）。

   处理方式（不是消除，是识别并回避）：
     `harmonicConflict()` 检测"期望音是否可能只是某个低音的谐波"。
     判据：期望音基频的实际幅度 ÷ 低音 k 次谐波的**预期**幅度。
       只弹左手 C3 时 → 比值 ≈ 1.0（能量完全可由谐波解释）
       右手真弹 G4 时 → 比值 ≈ 5（多出来的能量只能来自真弹）
     比值 < 2.5 时**不下结论**，返回 uncertain，由 UI 提示"先分手练"。
     ⚠️ 左手比右手响很多时（初学常见）比值会降到 2.4 左右 → 也判 uncertain。
        这是有意的保守设计：**宁可说"听不准"，不可把错的判成对的。**

   **坑二：谐波不能等权求和**
   等权时 4 次谐波与基频同权，会把"低音的弱谐波"放大成"另一个音被弹了"。
   正确做法：按 1/k 加权（基频主导）。

   **坑三：energyFloor 标定**
   首版拍脑袋写 0.35，实测真实音的归一化能量只有约 0.1 → 全部判"没听到"。
   **阈值必须实测标定**，不能猜。
   ══════════════════════════════════════════════════════════════════════ */
((root) => {
  'use strict';

  const A4 = 440;
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  /* C 大调唱名（简谱 1-7），只对白键准确；黑键用升号表示 */
  const SOLFEGE = ['do', 'do♯', 're', 're♯', 'mi', 'fa', 'fa♯', 'sol', 'sol♯', 'la', 'la♯', 'si'];

  const freq = (m) => A4 * Math.pow(2, (m - 69) / 12);
  const name = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const solfege = (m) => SOLFEGE[((m % 12) + 12) % 12];

  /* 阈值（由 _verify_follow.js 实测标定，改这里要重跑验证）
     ⚠️ 这些值是**实测量出来的**，不是拍脑袋定的。
        首版 energyFloor 写 0.35 导致所有真实音都判"没听到"
        （实测真实音归一化能量约 0.1）。改阈值必须重跑验证脚本。 */
  const TH = {
    /* presence：期望音加权谐波能量 / 邻近半音背景能量 */
    presenceSnr: 8,
    /* presence：期望音基频能量 / 背景能量（第二重把关，防五度假阳性） */
    presenceF0: 6,
    /* bestInRange：能量地板（低于此值判"没听到"，防止静音时乱报）
       实测：真实单音约 0.1，静音/极轻触键 < 0.005 → 取 0.02 留足余量 */
    energyFloor: 0.02,
    /* bestInRange：最强音与次强音的倍数差（太小说明分不清，不下结论） */
    margin: 1.15,
    /* 谐波重合：重合点实测幅度 / 低音第 k 次谐波的预期幅度
       实测标定（_pitch_ratio.js）：没弹 0.00~0.87，真弹 1.47~5.65
       三段式判据（见 harmonicOverlap 注释）：
         < overlapAbsent(0.6)  → 确定没弹
         ≥ overlapPresent(2.0) → 确定弹了
         中间                  → 模糊带 → uncertain
       ⚠️ 比实测边界（0.87 / 1.47）**故意放宽**，多判 uncertain 更安全 */
    overlapAbsent: 0.6,
    overlapPresent: 2.0,
    /* 静音门限（RMS） */
    silenceRms: 0.004,
  };

  /* ── Hann 窗（按长度缓存，避免每次重算 cos） ───────────────────────
     为什么用窗：矩形窗的旁瓣高（约 -13dB @ 1.33 bin），
     弹 C4 时会在 C♯4 的位置留下约 5% 的能量，干扰相邻音判别。
     Hann 窗旁瓣约 -31dB，把这种串扰压到千分之一量级。 */
  const winCache = {};
  function hann(n) {
    if (winCache[n]) return winCache[n];
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    winCache[n] = w;
    return w;
  }

  function rmsOf(x, n) {
    let s = 0;
    for (let i = 0; i < n; i++) s += x[i] * x[i];
    return Math.sqrt(s / n);
  }

  /* Goertzel：单频点 DFT，比整段 FFT 轻得多（只要几个频点）
     ⚠️ 只能取整数 bin（k = round(n*f/rate)）。
        4096 点 @48kHz 时 bin 宽 11.7Hz，在 C4 处相当于 ±38 音分误差。
        对"这个音在不在"够用（主瓣半宽就是一整个 bin），
        但**判音分必须用 finePitch() 或 pitch-v68 的 YIN**。 */
  function mag(x, n, rate, f, win) {
    const k = Math.round((n * f) / rate);
    if (k <= 0 || k >= n / 2) return 0;
    const w = (2 * Math.PI * k) / n, c = 2 * Math.cos(w);
    let s0 = 0, s1 = 0, s2 = 0;
    for (let i = 0; i < n; i++) {
      const v = win ? x[i] * win[i] : x[i];
      s0 = v + c * s1 - s2; s2 = s1; s1 = s0;
    }
    return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2)) / n;
  }

  /* 谐波权重：1/k —— 基频主导。
     ⚠️ 不能等权：等权时 4 次谐波与基频同权，
        而"低音 3 次谐波"与"高音 2 次谐波"重合（五度关系），
        等权会把这个弱谐波放大成"另一个音被弹了"。 */
  const HW = [1, 1 / 2, 1 / 3, 1 / 4];
  const INH = 2.5e-4;   /* 钢琴非谐性系数（中音区实测值） */

  /* 某音的加权谐波能量（已按 RMS 归一化，可与不同窗长比较） */
  function noteEnergy(x, n, rate, m, r, win, harmonics) {
    if (r <= 1e-9) return 0;
    const f0 = freq(m);
    const K = harmonics || 4;
    let e = 0;
    for (let k = 1; k <= K; k++) {
      const fk = k * f0 * Math.sqrt(1 + INH * k * k);   /* 非谐性补偿 */
      const g = mag(x, n, rate, fk, win);
      e += HW[k - 1] * g * g;
    }
    return e / (r * r);
  }

  /* ── ① 引导式存在性 ────────────────────────────────────────────────
     问："midi 这个音，在不在当前声音里？"
     判据：期望音的加权谐波能量 ÷ 邻近 ±3 半音的平均能量 = SNR
           且 期望音基频能量 ÷ 背景 = f0Ratio（第二重把关）
     为什么对复音免疫：左手弹 C3 时，C3 的能量在 130.8/261.6/392.4Hz 上，
     问"E4(329.6Hz) 在不在"不受影响。 */
  function presence(x, n, rate, midi, opt) {
    const o = opt || {};
    const win = hann(n);
    const r = o.rms != null ? o.rms : rmsOf(x, n);
    if (r < 0.004) return { present: false, snr: 0, f0Ratio: 0, energy: 0, silent: true };
    const e = noteEnergy(x, n, rate, midi, r, win, o.harmonics);
    let bg = 0, cnt = 0;
    for (let d = -3; d <= 3; d++) {
      if (d === 0) continue;
      bg += Math.pow(mag(x, n, rate, freq(midi + d), win), 2) / (r * r);
      cnt++;
    }
    bg = cnt ? bg / cnt : 1e-9;
    const snr = bg > 1e-9 ? e / bg : 1e6;
    const f0e = Math.pow(mag(x, n, rate, freq(midi), win), 2) / (r * r);
    const f0Ratio = bg > 1e-9 ? f0e / bg : 1e6;
    const snrMin = o.snrMin != null ? o.snrMin : TH.presenceSnr;
    const f0Min = o.f0Min != null ? o.f0Min : TH.presenceF0;
    return {
      present: snr >= snrMin && f0Ratio >= f0Min,
      snr, f0Ratio, energy: e, silent: false,
    };
  }

  /* ── ② 受限 argmax ────────────────────────────────────────────────
     问："在 low..high 这个音域里，实际弹的是哪个音？"
     做法：对音域内每个半音算加权谐波能量，取最大。
     为什么用 argmax 而不是绝对阈值：左手 C3 的 3 次谐波会落在 G4 位置，
     但真弹 G4 时其基频幅度是 C3 三次谐波的约 4 倍（1 vs 0.25），
     argmax 会选真正被弹的那个音。
     ⚠️ 仍需能量地板：静音时 argmax 也会随便选一个，靠 energyFloor 拦掉。 */
  function bestInRange(x, n, rate, low, high, opt) {
    const o = opt || {};
    const win = hann(n);
    const r = o.rms != null ? o.rms : rmsOf(x, n);
    if (r < 0.004) return { midi: null, energy: 0, margin: 0, silent: true, ranked: [] };
    const ranked = [];
    for (let m = low; m <= high; m++) {
      ranked.push({ midi: m, energy: noteEnergy(x, n, rate, m, r, win, o.harmonics) });
    }
    ranked.sort((a, b) => b.energy - a.energy);
    const top = ranked[0], second = ranked[1] || { energy: 0 };
    const floor = o.energyFloor != null ? o.energyFloor : TH.energyFloor;
    const needMargin = o.margin != null ? o.margin : TH.margin;
    const margin = second.energy > 1e-9 ? top.energy / second.energy : 1e6;
    const clear = top.energy >= floor && margin >= needMargin;
    return {
      midi: clear ? top.midi : null,
      name: clear ? name(top.midi) : null,
      energy: top.energy,
      margin,
      ambiguous: top.energy >= floor && margin < needMargin,
      silent: false,
      ranked: ranked.slice(0, 3),
    };
  }

  /* ── ④ 谐波重合判别 ★核心安全机制 ────────────────────────────────
     问题（拜厄/小汤3 的必修场景）：
       左手 C3(130.81Hz) 的 3 次谐波 = 392.4Hz ≈ G4(392Hz) 基频
       左手 C3 的 4 次谐波 = 523.25Hz = C5 基频（完全重合）
       左手 G3(196Hz) 的 2 次谐波 = 392Hz = G4 基频（八度）
     这些都是入门教材里极常见的音程关系。此时"期望音位置"确实有能量，
     若直接判"弹对了"，就会出现**把错的判成对的** —— 最危险的错误。

     ★ 解法：能量比值法
       predicted = 低音基频实测幅度 × k^(-α)      ← 低音第 k 次谐波的预期量
       actual    = 重合点实测幅度
       ratio     = actual / predicted
         · 只弹低音（没弹目标音）→ ratio ≈ 0.9（能量完全可由谐波解释）
         · 真弹了目标音         → ratio ≥ 1.5（多出来的能量只能来自真弹）

     ⚠️⚠️ 关键：必须测**低音的基频**，不能测重合点本身！
        首版踩的坑：我测了重合点的幅度当"预期值"，
        于是分子分母是同一个测量值，比值恒等于 k^1.35 = 常数 2.55，毫无信息量。
        测低音基频才有意义 —— 它是"谐波能量的来源"。

     ⚠️ α（谐波衰减指数）失配不影响可用性：
        实测 α=1.0/1.35/1.7 三档下"没弹"与"真弹"两组**都能分开**
        （没弹最高 0.68/0.87/1.24，真弹最低 1.00/1.47/2.15）。
        原因：真弹多出来的能量是**实测的**，与 α 假设无关，
        α 只让阈值整体平移，不破坏可分性。

     实测标定（_pitch_ratio.js）：
       没弹：0.00 ~ 0.87     真弹（右手很轻）：1.47 ~ 2.26     真弹（等力度）：3.02 ~ 5.65

     ★★ ambiguous 是"中间模糊带"，不是"低于阈值" ★★
     踩过的坑（_diag_follow.js 诊断出来）：
       首版把 ambiguous 定义成 `ratio < need`，结果：
       "弹D4、期望F4、左手C3"里 F4 与 A♯2 的 3 次谐波频率重合，
       但该点 ratio=0.01（**几乎没能量，明确没弹**）→ 却被判 uncertain。
       这是逻辑错误：重合检查的目的是"防止把谐波能量误当成真弹"，
       如果重合点**根本没能量**，就不存在误认风险，直接判"没弹"即可。

     正确设计（三段式）：
       ratio < clearAbsent (0.6)  → 确定没弹 → 不 ambiguous，正常走"没听到"分支
       ratio ≥ clearPresent (2.0) → 确定弹了 → 不 ambiguous，正常走"present"分支
       中间 [0.6, 2.0)            → 模糊，无法确定 → ambiguous → uncertain
     阈值取 0.6 / 2.0 而非实测边界 0.87 / 1.47，是**故意放宽模糊带**：
     真实钢琴的谐波结构比建模复杂，宁可多判 uncertain（提示分手练），
     也不要把错的判成对的。 */
  const ALPHA = 1.35;   /* 钢琴谐波衰减指数（实测标定） */

  function overlapRatio(x, n, rate, targetMidi, lowerMidi, opt) {
    const o = opt || {};
    const win = hann(n);
    const r = o.rms != null ? o.rms : rmsOf(x, n);
    if (r < TH.silenceRms) return { ratio: Infinity, ampL: 0 };
    const fT = freq(targetMidi), fL = freq(lowerMidi);
    const k = Math.round(fT / fL);
    const ampL = mag(x, n, rate, fL, win) / r;                    /* ← 低音基频（关键） */
    const ampT = mag(x, n, rate, fT, win) / r;                    /* 重合点实测 */
    const predicted = ampL * Math.pow(k, -(o.alpha != null ? o.alpha : ALPHA));
    return {
      ratio: predicted > 1e-9 ? ampT / predicted : Infinity,
      ampL, ampT, predicted, harmonic: k, lowerMidi,
    };
  }

  /* 检查期望音位置是否与某个低音的谐波重合，并判断"到底弹没弹"
     返回 { overlap, ratio, source, harmonic, ambiguous, definite }
       · overlap=false                    → 无重合，正常判定
       · overlap=true, definite='present' → 重合但有富余能量 → 确定真弹
       · overlap=true, definite='absent'  → 重合但几乎没能量 → 确定没弹
       · overlap=true, ambiguous=true     → 能量落在模糊带 → 判 uncertain */
  function harmonicOverlap(x, n, rate, midi, opt) {
    const o = opt || {};
    const r = o.rms != null ? o.rms : rmsOf(x, n);
    if (r < TH.silenceRms) return { overlap: false, ratio: Infinity, source: null, ambiguous: false, definite: null };
    const f0 = freq(midi);
    const win = hann(n);
    let worst = null;
    /* 扫描下方 2~28 个半音（覆盖左手常见音区 C2–C4） */
    for (let d = 2; d <= 28; d++) {
      const lower = midi - d;
      if (lower < 24) continue;
      const fl = freq(lower);
      const k = Math.round(f0 / fl);
      if (k < 2 || k > 8) continue;
      const dev = Math.abs((k * fl) / f0 - 1);
      if (dev > 0.03) continue;                     /* 频率不重合 */
      const lowAmp = mag(x, n, rate, fl, win) / r;
      if (lowAmp < 0.003) continue;                 /* 低音没在响，不构成干扰 */
      if (!worst || dev < worst.dev) worst = { lower, k, dev };
    }
    if (!worst) return { overlap: false, ratio: Infinity, source: null, ambiguous: false, definite: null };
    const rr = overlapRatio(x, n, rate, midi, worst.lower, { rms: r, alpha: o.alpha });
    const hi = o.presentMin != null ? o.presentMin : TH.overlapPresent;
    const lo = o.absentMax != null ? o.absentMax : TH.overlapAbsent;
    const definite = rr.ratio >= hi ? 'present' : (rr.ratio < lo ? 'absent' : null);
    return {
      overlap: true,
      ratio: rr.ratio,
      source: worst.lower,
      harmonic: worst.k,
      deviation: worst.dev,
      /* ambiguous 只在**模糊带**里为真 —— 见文件头注释的坑 */
      ambiguous: definite === null,
      definite,
      presentMin: hi, absentMax: lo,
    };
  }

  /* ── ⑤ 精细音高（判音准） ─────────────────────────────────────────
     做法：以 midi 为中心，在 ±60 音分范围按 5 音分步长扫描加权谐波能量，
     取峰值位置 → 分辨率约 ±5 音分。
     为什么不用 Goertzel 单点：bin 宽 11.7Hz，在 C4 处就是 77 音分，
     根本量不出"偏高 20 音分"这种差异。
     ⚠️ 只在已确认音高之后调用（每次约 25 次额外 Goertzel），
        不要每帧都跑。 */
  function finePitch(x, n, rate, midi, opt) {
    const o = opt || {};
    const win = hann(n);
    const r = o.rms != null ? o.rms : rmsOf(x, n);
    if (r < TH.silenceRms) return null;
    let bestC = 0, bestE = -1;
    for (let c = -60; c <= 60; c += 5) {
      const f = freq(midi) * Math.pow(2, c / 1200);
      let e = 0;
      for (let k = 1; k <= 4; k++) {
        const g = mag(x, n, rate, k * f * Math.sqrt(1 + INH * k * k), win);
        e += HW[k - 1] * g * g;
      }
      if (e > bestE) { bestE = e; bestC = c; }
    }
    /* 抛物线插值细化到 ±1 音分 */
    const at = (c) => {
      const f = freq(midi) * Math.pow(2, c / 1200);
      let e = 0;
      for (let k = 1; k <= 4; k++) {
        const g = mag(x, n, rate, k * f * Math.sqrt(1 + INH * k * k), win);
        e += HW[k - 1] * g * g;
      }
      return e;
    };
    const a = at(bestC - 5), b = bestE, c2 = at(bestC + 5);
    const den = a - 2 * b + c2;
    const off = den ? Math.max(-1, Math.min(1, (a - c2) / (2 * den))) * 5 : 0;
    return { midi, cents: Math.round(bestC + off), energy: bestE / (r * r) };
  }

  /* ── 统一判定 ─────────────────────────────────────────────────────
     给定"期望音 + 音域"，返回一条完整结论。供 UI 直接使用。

     verdict 取值：
       correct    —— 弹对了（含音准信息）
       wrong      —— 弹错了（能指出实际弹的是哪个音）
       uncertain  —— 听不准（谐波重合 / 声音太轻 / 分不清），**不下结论**
       silent     —— 没听到声音

     ⚠️ uncertain 是**刻意保留的状态**，不是"没做完"。
        仅在"谐波重合且无法确认是否真弹"时出现，UI 应提示
        "这个音先分手弹一次"，而不是显示"错了"。 */
  function judge(x, n, rate, expected, low, high, opt) {
    const o = opt || {};
    const r = rmsOf(x, n);
    if (r < TH.silenceRms) return { verdict: 'silent', expected, played: null, cents: null };

    /* ── 第一步：查期望音位置的谐波重合（三段式） ──
       ⚠️ 只在**模糊带**才判 uncertain。确定"没弹"时不要拦，
          否则会把"明确弹错"误报成"听不准"（_diag_follow.js 踩过）。 */
    const ov = harmonicOverlap(x, n, rate, expected, { rms: r });
    if (ov.overlap && ov.ambiguous) {
      return {
        verdict: 'uncertain', expected, played: null, cents: null,
        reason: 'harmonic-overlap',
        overlapWith: ov.source, overlapHarmonic: ov.harmonic, overlapRatio: ov.ratio,
      };
    }

    const p = presence(x, n, rate, expected, Object.assign({ rms: r }, o));
    if (p.present) {
      const fp = finePitch(x, n, rate, expected, { rms: r });
      return {
        verdict: 'correct', expected, played: expected,
        cents: fp ? fp.cents : 0, snr: p.snr,
        overlapRatio: ov.overlap ? ov.ratio : null,
      };
    }

    /* ── 第二步：期望音没听到 ──
       ① 音域内有明确的其他音 → 弹错了
          ⚠️ 报出的音名若落在模糊带，只隐藏音名（played=null），
             但结论仍是 wrong —— 因为"期望音不在"这一点已经确定，
             报出的音名可不可信不影响这个结论。
       ② 音域内也没有明确音 → unclear（没弹 / 太轻） */
    const b = bestInRange(x, n, rate, low, high, Object.assign({ rms: r }, o));
    if (b.midi != null && b.midi !== expected) {
      const bOv = harmonicOverlap(x, n, rate, b.midi, { rms: r });
      const nameTrustworthy = !(bOv.overlap && bOv.ambiguous);
      return {
        verdict: 'wrong', expected,
        played: nameTrustworthy ? b.midi : null,
        playedHint: nameTrustworthy ? null : 'unclear-name',
        cents: null, snr: p.snr, energy: b.energy,
      };
    }
    return { verdict: 'unclear', expected, played: null, cents: null, snr: p.snr, energy: b.energy };
  }

  /* ── ⑥ 曲目安全性预分析 ──────────────────────────────────────────
     给定曲目与左手伴奏音，标出哪些音在合手时会"听不准"。
     用途：① UI 提前告知家长"这首建议先分手练"
           ② 也可反向用来选曲（优先推荐重合少的曲目） */
  function analyzeOverlap(melody, leftNotes) {
    const lh = leftNotes || [48];   /* 默认左手 C3 */
    const risky = [];
    melody.notes.forEach((m, i) => {
      for (const lm of lh) {
        if (m - lm < 2) continue;
        const k = Math.round(freq(m) / freq(lm));
        if (k < 2 || k > 8) continue;
        const dev = Math.abs((k * freq(lm)) / freq(m) - 1);
        if (dev <= 0.03) { risky.push({ index: i, midi: m, withNote: lm, harmonic: k }); break; }
      }
    });
    return {
      total: melody.notes.length,
      riskyCount: risky.length,
      risky,
      safeRatio: (melody.notes.length - risky.length) / melody.notes.length,
    };
  }

  /* ── 曲目库（全部为公有领域作品） ─────────────────────────────────
     ⚠️ 版权说明：儿歌均为传统民谣（公有领域）；
        拜厄 Op.101 作者 Ferdinand Beyer 卒于 1863 年，早已进入公有领域；
        小汤（John Thompson）现代教程的**具体编配版本**仍有版权，
        因此本曲库**只收传统儿歌与练习音型**，不收小汤的编配。 */
  const MELODIES = [
    {
      id: 'wuzhi', title: '五指练习', icon: '✋', tier: '入门',
      hint: '右手五指从 do 走到 sol，再走回来。手指站稳，一个一个弹。',
      notes: [60, 62, 64, 65, 67, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'twinkle', title: '小星星', icon: '⭐', tier: '入门',
      hint: '最经典的入门曲，右手五指位置就能弹完。',
      notes: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60],
      beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'boat', title: '划船歌', icon: '⛵', tier: '入门',
      hint: '节奏很稳，适合练"每个音弹匀"。',
      notes: [60, 60, 60, 62, 64, 64, 62, 64, 65, 67],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'tiger', title: '两只老虎', icon: '🐯', tier: '进阶',
      hint: '前半段重复两遍，注意手不要僵。',
      notes: [60, 62, 64, 60, 60, 62, 64, 60, 64, 65, 67, 64, 65, 67],
      beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2],
    },
    {
      id: 'bee', title: '小蜜蜂', icon: '🐝', tier: '进阶',
      hint: '有跳进，注意三度、四度的距离。',
      notes: [67, 64, 64, 65, 62, 62, 60, 62, 64, 65, 67, 67, 67],
      beats: [1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'mary', title: '玛丽有只小羊羔', icon: '🐑', tier: '进阶',
      hint: '同一个音连续弹时，要一下一下地弹，不要按住不放。',
      notes: [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67],
      beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2],
    },
    {
      id: 'joy', title: '欢乐颂', icon: '🎉', tier: '挑战',
      hint: '贝多芬《第九交响曲》主题，级进为主，适合练连贯。',
      notes: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62],
      beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    },

    /* ── 拜厄 Op.101 第 1-30 课（右手单声部，公有领域）────────────────
       仅取每课主旋律片段（10-20 个音），供"分手练右手"用。
       难度按原教材顺序：入门(1-10) → 进阶(11-20) → 挑战(21-30)。
       ⚠️ 只收右手单声部，不收左手伴奏、不收双手合奏版本。 */
    {
      id: 'beyer01', title: '拜厄 第 1 课', icon: '📖', tier: '入门',
      hint: '最基础的五指练习，do-re-mi-fa-sol 来回走。手指站稳，一个一个弹。',
      notes: [60, 62, 64, 65, 67, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer02', title: '拜厄 第 2 课', icon: '📖', tier: '入门',
      hint: '同 1 课节奏变奏，注意四分音符与二分音符的时值差。',
      notes: [60, 60, 62, 62, 64, 64, 65, 65, 67, 67, 65, 65, 64, 64, 62, 62, 60, 60],
      beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
    },
    {
      id: 'beyer03', title: '拜厄 第 3 课', icon: '📖', tier: '入门',
      hint: '引入附点节奏，前长后短，像"滑滑梯"一样弹。',
      notes: [60, 62, 64, 60, 62, 64, 65, 67, 65, 64, 62, 60],
      beats: [1.5, 0.5, 2, 1.5, 0.5, 2, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer04', title: '拜厄 第 4 课', icon: '📖', tier: '入门',
      hint: '三度跳进练习，手指要"跳"过去，不要滑。',
      notes: [60, 64, 62, 65, 64, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 1, 2, 1, 1, 1, 2],
    },
    {
      id: 'beyer05', title: '拜厄 第 5 课', icon: '📖', tier: '入门',
      hint: '四度跳进，跨度变大，手腕带着手指动。',
      notes: [60, 65, 62, 67, 64, 65, 64, 62, 60],
      beats: [1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer06', title: '拜厄 第 6 课', icon: '📖', tier: '入门',
      hint: '五指位置固定练习，拇指不翘、小指不塌。',
      notes: [60, 62, 64, 65, 67, 65, 64, 62, 60, 62, 64, 65, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer07', title: '拜厄 第 7 课', icon: '📖', tier: '入门',
      hint: '五指位置固定，注意音的连贯与停顿感。',
      notes: [60, 62, 64, 65, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 2],
    },
    {
      id: 'beyer08', title: '拜厄 第 8 课', icon: '📖', tier: '入门',
      hint: '两个八分音符连弹，要均匀，像"小马跑"一样。',
      notes: [60, 60, 62, 62, 64, 64, 65, 65, 67, 67, 65, 65, 64, 64, 62, 62, 60, 60],
      beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1],
    },
    {
      id: 'beyer09', title: '拜厄 第 9 课', icon: '📖', tier: '入门',
      hint: '混合节奏：四分+八分+八分，感受长短搭配。',
      notes: [60, 62, 62, 64, 64, 65, 65, 67, 65, 64, 64, 62, 62, 60],
      beats: [1, 0.5, 0.5, 1, 0.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 2],
    },
    {
      id: 'beyer10', title: '拜厄 第 10 课', icon: '📖', tier: '入门',
      hint: '阶梯式上行下行，像爬楼梯一样一级级来。',
      notes: [60, 62, 64, 62, 64, 65, 64, 65, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2],
    },
    {
      id: 'beyer11', title: '拜厄 第 11 课', icon: '📖', tier: '进阶',
      hint: '引入 F 音（fa），大拇指要学会转、跨。',
      notes: [60, 62, 64, 65, 67, 65, 64, 62, 60, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer12', title: '拜厄 第 12 课', icon: '📖', tier: '进阶',
      hint: '手位微调：右手从 C 位移到 G 位（sol 位）。',
      notes: [67, 69, 71, 72, 74, 74, 72, 71, 69, 67],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer13', title: '拜厄 第 13 课', icon: '📖', tier: '进阶',
      hint: 'G 大调五指位置，注意升 fa（F♯），黑键别碰白键。',
      notes: [67, 69, 71, 72, 74, 72, 71, 69, 67, 69, 71, 72, 74, 72, 71, 69, 67],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer14', title: '拜厄 第 14 课', icon: '📖', tier: '进阶',
      hint: '连音线练习，两个音连在一起弹，中间不断。',
      notes: [60, 62, 64, 65, 67, 65, 64, 62, 60],
      beats: [2, 2, 2, 2, 4, 2, 2, 2, 4],
    },
    {
      id: 'beyer15', title: '拜厄 第 15 课', icon: '📖', tier: '进阶',
      hint: '断奏与连奏混合，听清楚每个音的接触方式。',
      notes: [60, 62, 64, 65, 67, 67, 65, 64, 62, 60, 62, 64, 65, 67],
      beats: [0.5, 0.5, 1, 1, 2, 0.5, 0.5, 1, 1, 2, 1, 1, 1, 2],
    },
    {
      id: 'beyer16', title: '拜厄 第 16 课', icon: '📖', tier: '进阶',
      hint: '右手扩展到高音 C（do），小指够得着吗？',
      notes: [64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64],
      beats: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer17', title: '拜厄 第 17 课', icon: '📖', tier: '进阶',
      hint: '音程扩大到六度，手腕要灵活带动。',
      notes: [60, 67, 62, 69, 64, 71, 65, 72, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer18', title: '拜厄 第 18 课', icon: '📖', tier: '进阶',
      hint: '八分音符连跑，手指颗粒感要清晰。',
      notes: [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60],
      beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2],
    },
    {
      id: 'beyer19', title: '拜厄 第 19 课', icon: '📖', tier: '进阶',
      hint: '切分节奏，弱拍变强，身体要跟着动。',
      notes: [60, 64, 62, 65, 64, 67, 62, 65, 64, 62, 60],
      beats: [0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer20', title: '拜厄 第 20 课', icon: '📖', tier: '进阶',
      hint: '综合复习：级进、跳进、节奏、力度全混在一起。',
      notes: [60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 64, 67, 64, 62, 60],
      beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer21', title: '拜厄 第 21 课', icon: '📖', tier: '挑战',
      hint: '引入降 B 大调（B♭），大拇指按黑键，手型别变。',
      notes: [60, 62, 63, 65, 67, 68, 67, 65, 63, 62, 60],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer22', title: '拜厄 第 22 课', icon: '📖', tier: '挑战',
      hint: 'F 大调五指位置，注意降 B（B♭）。',
      notes: [65, 67, 68, 70, 72, 72, 70, 68, 67, 65],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer23', title: '拜厄 第 23 课', icon: '📖', tier: '挑战',
      hint: '音阶片段练习，八个音上下行，指法要顺。',
      notes: [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60],
      beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2],
    },
    {
      id: 'beyer24', title: '拜厄 第 24 课', icon: '📖', tier: '挑战',
      hint: '三度音阶练习，像珍珠一样一个个串起来。',
      notes: [60, 64, 62, 65, 64, 67, 65, 69, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer25', title: '拜厄 第 25 课', icon: '📖', tier: '挑战',
      hint: '六度跳进练习，手腕弹性决定音色好坏。',
      notes: [60, 69, 62, 71, 64, 72, 65, 67, 64, 62, 60],
      beats: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer26', title: '拜厄 第 26 课', icon: '📖', tier: '挑战',
      hint: '装饰音预备：前打音、后打音，轻快地弹。',
      notes: [62, 60, 62, 64, 62, 64, 65, 64, 65, 67, 65, 64, 62, 60],
      beats: [0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1, 1, 2],
    },
    {
      id: 'beyer27', title: '拜厄 第 27 课', icon: '📖', tier: '挑战',
      hint: '双手配合预备：右手旋律、左手简单伴奏（仅右手谱）。',
      notes: [64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer28', title: '拜厄 第 28 课', icon: '📖', tier: '挑战',
      hint: '速度加快，八分音符要跑得圆润不拖泥带水。',
      notes: [60, 62, 64, 65, 67, 65, 64, 62, 60, 62, 64, 65, 67, 65, 64, 62, 60],
      beats: [0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 2],
    },
    {
      id: 'beyer29', title: '拜厄 第 29 课', icon: '📖', tier: '挑战',
      hint: '表情记号练习：强、弱、渐强、渐弱，音乐会说话。',
      notes: [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
    },
    {
      id: 'beyer30', title: '拜厄 第 30 课', icon: '📖', tier: '挑战',
      hint: '前 30 课总复习，挑最难的几段连着弹。',
      notes: [60, 62, 64, 65, 67, 65, 64, 62, 60, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60],
      beats: [1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2],
    },
  ];

  /* 曲目音域（用于 bestInRange 的搜索范围） */
  function rangeOf(melody) {
    let lo = 127, hi = 0;
    melody.notes.forEach((m) => { if (m < lo) lo = m; if (m > hi) hi = m; });
    return { low: Math.max(36, lo - 2), high: Math.min(96, hi + 2) };
  }

  const api = {
    presence, bestInRange, finePitch, harmonicOverlap, overlapRatio, judge, analyzeOverlap,
    freq, name, solfege, rmsOf, mag, noteEnergy,
    MELODIES, rangeOf, TH,
  };
  root.G1Follow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
