# -*- coding: utf-8 -*-
# V5b: 逐字候选 + 段落裁剪 + F0 验证。每个文件独立"单音节"，失败自动换候选。
import asyncio, os, sys, io, json
import edge_tts
sys.path.insert(0, 'C:/Users/Administrator/.workbuddy/binaries/python/envs/default/Lib/site-packages')
import miniaudio, numpy as np

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'
OUT = 'assets/pinyin'

# (fid, expect_tone, candidates[(text, seg)])
# seg=None 整段; seg=n 保留第 n 个有声段(1起)
I = []
def add(fid, expect, cands): I.append((fid, expect, cands))

# ---- 声调区 24 项 ----
add('a1',1,[('阿',None),('阿姨',1)])
add('a2',2,[('啊？你说什么？',1)])
add('a3',3,[('啊？怎么会这样呢？',1),('啊？我还没听清。',1)])
add('a4',4,[('啊，原来如此！',1),('啊！多么可爱的小鸟啊！',1)])
add('o1',1,[('噢，原来是他。',1),('噢',None),('窝，窝头',1)])
add('o2',2,[('哦？她会游泳吗？',1),('哦？真的吗？',1)])
add('o3',3,[('我',None),('哦，我懂了。',1)])
add('o4',4,[('哦！我明白了！',1),('哦，真是太好了！',1)])
add('e1',1,[('阿，阿谀奉承。',1),('哎哟，好痒啊！',1)])
add('e2',2,[('鹅',None),('白鹅',1),('鹅，鹅，鹅。',1)])
add('e3',3,[('恶心',1),('恶，恶心。',1)])
add('e4',4,[('饿',None),('饿了',1),('恶，凶恶。',2)])
add('i1',1,[('衣',None),('衣服',1)])
add('i2',2,[('姨',None),('姨妈',1)])
add('i3',3,[('椅',None),('椅子',1)])
add('i4',4,[('意',None),('意思',1),('一年级',1)])   # 一年级 yī——不行
add('u1',1,[('屋',None),('屋子',1)])
add('u2',2,[('无',None),('无人',1)])
add('u3',3,[('五',None),('五十',1)])
add('u4',4,[('雾',None),('大雾',2),('勿',None)])
add('v1',1,[('迂',None),('淤血',1)])
add('v2',2,[('鱼',None),('小鱼',2)])
add('v3',3,[('雨',None),('雨伞',1)])
add('v4',4,[('玉',None),('玉米',1),('遇',None)])

# ---- 声母（呼读音：玻坡摸佛 得特讷勒 哥科喝 基欺希 知蚩诗日 资雌思 衣屋）----
SF = [('b','玻',1),('p','坡',1),('m','摸',1),('f','佛',2),('d','得',2),('t','特',4),
      ('n','讷',4),('l','勒',4),('g','哥',1),('k','科',1),('h','喝',1),
      ('j','基',1),('q','欺',1),('x','希',1),('zh','知',1),('ch','蚩',1),('sh','诗',1),
      ('r','日',4),('z','资',1),('c','雌',1),('s','思',1),('y','衣',1),('w','屋',1)]
for k,c,e in SF: add(k,e,[(c,None)])

# ---- 复韵母 ----
RF = [('ai','哀',1),('ei','欸',1),('ui','威',1),('ao','凹',1),('ou','欧',1),
      ('iu','优',1),('ie','耶',1),('ue','约',1),('er','儿',2)]
for k,c,e in RF:
    fid = 'er2' if k=='er' else k+'1'
    if k=='ie': fid='ye1'
    if k=='ue': fid='yue1'
    if k=='iu': fid='you1'
    if k=='ui': fid='wei1'
    add(fid,e,[(c,None)])

# ---- 鼻韵母 ----
BF = [('an','安',1),('en','恩',1),('in','音',1),('un','温',1),('vn','晕',1),
      ('ang','肮',1),('eng','鞥',1),('ing','英',1),('ong','轰',1)]
BID = {'vn':'yun1','ing':'ying1','un':'wen1','in':'yin1','ong':'weng1'}
for k,c,e in BF:
    fid = BID.get(k, k+'1')
    add(fid,e,[(c,None)])

# ---- 整体认读音节 ----
ZF = [('zhi1','知',1),('chi1','吃',1),('shi1','师',1),('ri4','日',4),
      ('zi1','资',1),('ci1','雌',1),('si1','思',1),('yi1','衣',1),('wu1','屋',1),
      ('yu1','迂',1),('ye1','耶',1),('yue1','约',1),('yuan1','冤',1),('yin1','音',1),
      ('yun1','晕',1),('ying1','英',1)]
for k,c,e in ZF: add(k,e,[(c,None)])

# ---- 拼读音节（对应声母呼读音）----
SY = [('bo1','玻',1),('po1','坡',1),('mo1','摸',1),('fo1','佛',2),
      ('de1','得',2),('te1','特',4),('ne1','讷',4),('le1','勒',4),
      ('ge1','哥',1),('ke1','科',1),('he1','喝',1),('ji1','基',1),('qi1','欺',1),('xi1','希',1)]
for k,c,e in SY: add(k,e,[(c,None)])

# ---- F0 工具 ----
def seg_f0(fn):
    d = miniaudio.decode_file(fn, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=16000)
    x = np.frombuffer(d.samples, dtype=np.float32); sr = 16000
    e = np.sqrt(np.convolve(x**2, np.ones(int(0.02*sr))/int(0.02*sr), 'same'))
    mx = e.max()
    if mx <= 0: return [], []
    th = mx * 0.10
    segs = []; on = False; st = 0; pad = int(0.05*sr)
    for i in range(0, len(x), int(0.005*sr)):
        if e[i] > th and not on: st = i; on = True
        elif e[i] <= th and on:
            if i - st > int(0.08*sr): segs.append((max(0, st-pad), min(len(x), i+pad)))
            on = False
    if on: segs.append((max(0,st-pad), len(x)))
    return x, segs

def f0_of(x, a, b, sr=16000):
    seg = x[a:b]; win = int(0.030*sr); hop = int(0.008*sr); out = []
    for i in range(0, len(seg)-win, hop):
        fr = seg[i:i+win] - seg[i:i+win].mean()
        if np.sqrt((fr**2).mean()) < 0.01: continue
        r = np.correlate(fr, fr, 'full')[win-1:]
        lo, hi = int(sr/450), int(sr/80)
        sub = r[lo:hi]
        if len(sub) == 0 or sub.max() <= 0.3 * r[0]: continue
        out.append(sr / (np.argmax(sub) + lo))
    return out

def shape(tr):
    if len(tr) < 3: return 0
    v = np.array(tr)
    s = np.median(v[:2]); m = np.median(v[len(v)//2 - 1 : len(v)//2 + 1]); e = np.median(v[-2:])
    u1 = (m - s)/s*100; u2 = (e - m)/max(m,1)*100
    if u1 < -9 and u2 > 4: return 3
    if u1 > 3 and u2 > 1.5: return 2
    if u2 < -11: return 4
    return 1

def trim_save(x, seg, fn):
    a,b = seg; y = x[a:b]
    fade = int(0.04*16000)
    if len(y) > 2*fade:
        y = y.copy(); y[-fade:] *= np.linspace(1,0,fade)
    import wave
    pcm = (np.clip(y,-1,1)*32767).astype(np.int16)
    mp3 = fn
    with wave.open('/tmp/_seg.wav','wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(pcm.tobytes())
    os.system('ffmpeg -y -loglevel error -i /tmp/_seg.wav -codec:a libmp3lame -q:a 4 "%s"' % mp3)

# ---- 生成 ----
TMP='assets/pinyin/_cand'
os.makedirs(TMP, exist_ok=True)
sem = asyncio.Semaphore(6)
result = {}

async def synth(text, fn):
    if os.path.exists(fn) and os.path.getsize(fn) > 2500: return True
    async with sem:
        for _ in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(fn)
                if os.path.getsize(fn) > 2500: return True
            except Exception: pass
            await asyncio.sleep(1)
    return False

async def work(fid, expect, cands):
    final = os.path.join(OUT, fid+'.mp3')
    for idx, (text, segno) in enumerate(cands):
        cand = os.path.join(TMP, '%s_c%d.mp3' % (fid, idx))
        if not await synth(text, cand):
            continue
        x, segs = seg_f0(cand)
        if not segs: continue
        if segno is None:
            a,b = 0, len(x); use_seg = None
        else:
            if len(segs) < segno: continue
            use_seg = segs[segno-1]; a,b = use_seg
        tr = f0_of(x, a, b)
        got = shape(tr)
        ok = (got == expect)
        if ok:
            if use_seg: trim_save(x, use_seg, final)
            else:
                import shutil; shutil.copyfile(cand, final)
            result[fid] = (text, expect, True)
            return
    # 兜底：取最后一个候选保留
    text, segno = cands[-1]
    cand = os.path.join(TMP, '%s_c%d.mp3' % (fid, len(cands)-1))
    x, segs = seg_f0(cand)
    if segno and segs:
        trim_save(x, segs[min(segno,len(segs))-1], final)
    else:
        import shutil; shutil.copyfile(cand, final)
    result[fid] = (text, expect, False)

async def main():
    await asyncio.gather(*[work(*t) for t in I])
    ok = sum(1 for v in result.values() if v[2])
    print('PASS %d/%d' % (ok, len(I)))
    for fid,(t,e,good) in sorted(result.items()):
        if not good: print('  !! %s <- %r (期望%d声, 未过检)' % (fid,t,e))
    io.open('pinyin_v5_map.json','w',encoding='utf-8').write(
        json.dumps({k:[v[0],v[1],v[2]] for k,v in result.items()}, ensure_ascii=False, indent=1))

asyncio.run(main())
