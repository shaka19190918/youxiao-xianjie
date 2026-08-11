# -*- coding: utf-8 -*-
# 拼音音频 V5：每个发音 = 教学代表字，生成后逐字做F0声调形状验证
# 运行: python gen_pinyin_v5.py [--regen]
import asyncio, os, sys, json, io
import edge_tts
sys.path.insert(0, 'C:/Users/Administrator/.workbuddy/binaries/python/envs/default/Lib/site-packages')
import miniaudio
import numpy as np

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'
OUT = 'assets/pinyin'

# 期望声调形状: 1平 2升 3先降后升 4降
# 格式: id: [(字, 声调), (备选字, 声调)...]
ITEMS = {
    # ---- 23 声母（呼读音代表字，均一声，佛为二声fó属教学常态） ----
    'b': [('玻',1)], 'p': [('坡',1)], 'm': [('摸',1)], 'f': [('佛',2)],
    'd': [('得',2)], 't': [('特',4)], 'n': [('讷',4),('呢',2)], 'l': [('勒',4)],
    'g': [('哥',1)], 'k': [('科',1)], 'h': [('喝',1)],
    'j': [('基',1),('鸡',1)], 'q': [('欺',1),('七',1)], 'x': [('希',1),('西',1)],
    'zh': [('知',1)], 'ch': [('吃',1)], 'sh': [('诗',1)], 'r': [('日',4)],
    'z': [('资',1)], 'c': [('雌',1),('刺',4)], 's': [('思',1)],
    'y': [('衣',1)], 'w': [('屋',1)],
    # ---- 24 声调（单韵母四声；啊系通过语境句裁剪） ----
    'a1': [('阿',1)], 'a2': [('啊?你说什么?',2),('啊',2)],
    'a3': [('啊?我还没听清.',3),('啊。啊?',3)], 'a4': [('啊!我终于明白了.',4),('啊',4)],
    'o1': [('喔',1),('噢',1)], 'o2': [('哦?真的吗?',2),('哦',2)],
    'o3': [('哦,我懂了.',3),('哦。哦?',3)], 'o4': [('哦!原来是这样.',4),('哦',4),('哦！」',4)],
    'e1': [('哎哟,好痒啊!',2,True),('阿',1)], 'e2': [('鹅',2)], 'e3': [('恶,恶心.',3),('恶',3)],
    'e4': [('饿',4)],
    'i1': [('衣服',1,True),('衣',1)], 'i2': [('姨',2),('移',2)],
    'i3': [('椅子',3,True),('椅',3)], 'i4': [('意',4)],
    'u1': [('屋',1)], 'u2': [('无',2)], 'u3': [('五',3)], 'u4': [('雾',4)],
    'v1': [('淤',1)], 'v2': [('鱼',2)], 'v3': [('雨',3)], 'v4': [('玉',4)],
    # ---- 6 单韵母（知识卡片） ----
    'a1c': None, 'o1c': None, 'e1c': None,  # 映射到 a1/o1/e1，不占文件名
    'yu1': [('淤',1)],
    # ---- 9 复韵母 ----
    'ai1': [('哀',1)], 'ei1': [('欸',1),('飞',1)],
    'wei1': [('威',1),('危',2)], 'ao1': [('凹',1)],
    'ou1': [('欧',1)], 'you1': [('优',1),('悠',1)],
    'ye1': [('椰',1),('耶',1)], 'yue1': [('约',1)],
    'er2': [('儿',2)],
    # ---- 9 鼻韵母 ----
    'an1': [('安',1)], 'en1': [('恩',1)], 'yin1': [('音',1)], ('yin2x','因+x'): None,
    'wen1': [('温',1)], 'yun1': [('晕',1),('晕+晕',1)],
    'ang1': [('肮',1),('昂',2)], 'eng1': [('鞥',1),('恩',1)],
    'ying1': [('英',1)], 'weng1': [('翁',1),('轰',1)],
    # ---- 16 整体认读音节 ----
    'zhi1': [('知',1)], 'chi1': [('吃',1)], 'shi1': [('诗',1)], 'ri4': [('日',4)],
    'zi1': [('资',1)], 'ci1': [('雌',1),('磁',2)], 'si1': [('思',1)],
    'yi1': [('衣',1)], 'wu1': [('屋',1)], 'yue1z': None, 'ye1z': None,
    'yuan1': [('冤',1),('鸳',1)], 'yinz': None, 'yunz': None, 'yingx': None,
    # ---- 14 拼读（b/p/m/f/d/t/n/l/g/k/h/j/q/x + o/e/i） ----
    'bo1': [('玻',1)], 'po1': [('坡',1)], 'mo1': [('摸',1)], 'fo1': [('佛',2)],
    'de1': [('得',2)], 'te1': [('特',4)], 'ne1': [('讷',4),('呢',2)], 'le1': [('勒',4),('乐',4)],
    'ge1': [('哥',1)], 'ke1': [('科',1)], 'he1': [('喝',1)],
    'ji1': [('鸡',1),('基',1)], 'qi1': [('七',1),('欺',1)], 'xi1': [('西',1),('希',1)],
}

# 实际要生成的完整清单（把上面 None/占位 清掉，正式列表）
GEN = {
    # 声母23
    'b':'玻','p':'坡','m':'摸','f':'佛','d':'得','t':'特','n':'讷','l':'勒',
    'g':'哥','k':'科','h':'喝','j':'基','q':'欺','x':'希',
    'zh':'知','ch':'吃','sh':'诗','r':'日','z':'资','c':'雌','s':'思','y':'衣','w':'屋',
    # 声母呼读音的声调期望
    # 声调区 24
    'a1':'阿','a2':'啊?你说什么?','a3':'啊?我还没听清.','a4':'啊!我明白了.',
    'o1':'喔','o2':'哦?真的吗?','o3':'哦-我懂了.','o4':'哦!原来是这样.',
    'e1':'阿','e2':'鹅','e3':'恶,恶心.','e4':'饿',
    'i1':'衣','i2':'姨','i3':'椅','i4':'意',
    'u1':'屋','u2':'无','u3':'五','u4':'雾',
    'v1':'淤','v2':'鱼','v3':'雨','v4':'玉',
    # 单韵母 6 (与张调重复的文件也覆盖生成保证声线一致)
    'yi1':'衣','wu1':'屋',
    # 复韵母 9
    'ai1':'哀','ei1':'欸','wei1':'威','ao1':'凹','ou1':'欧','you1':'优','ye1':'椰','yue1':'约','er2':'儿',
    # 鼻韵母 9
    'an1':'安','en1':'恩','yin1':'音','wen1':'温','yun1':'晕','ang1':'肮','eng1':'鞥','ying1':'英','weng1':'翁',
    # 整体认读 16
    'zhi1':'知','chi1':'吃','shi1':'诗','ri4':'日','zi1':'资','ci1':'雌','si1':'思','yu1':'淤',
    'ye1':'椰','yue1':'约','yuan1':'冤','yin1':'音','yun1':'晕','ying1':'英',
    # 拼读 14
    'bo1':'玻','po1':'坡','mo1':'摸','fo1':'佛','de1':'得','te1':'特','ne1':'讷','le1':'勒',
    'ge1':'哥','ke1':'科','he1':'喝','ji1':'鸡','qi1':'七','xi1':'西',
    # 多音字补充
    'zw_chang2':'常','zw_zhang3':'涨','zw_yue4':'月','zw_le4':'乐',
    'zw_shao3':'少','zw_shao4':'哨','zw_jue2':'觉','zw_jiao4':'叫',
    'zw_zhi3':'纸','zw_zhi1':'知','zw_di4':'地','zw_di2':'敌',
}

# 每项的声调期望 (末尾数字)，多音字在名字里
def expected_tone(fid):
    if fid.startswith('zw_'):
        return int(fid[-1])
    import re
    m = re.search(r'(\d)$', fid)
    if m:
        return int(m.group(1))
    # 声母/拼读无数字的（b,p,...,zh）按代表字定
    tone_map = {'b':1,'p':1,'m':1,'f':2,'d':2,'t':4,'n':4,'l':4,'g':1,'k':1,'h':1,
                'j':1,'q':1,'x':1,'zh':1,'ch':1,'sh':1,'r':4,'z':1,'c':1,'s':1,'y':1,'w':1,
                'yi1':1,'wu1':1}
    return tone_map.get(fid, 1)

# 裁剪标记：某些输入是"语境句"，需裁掉尾巴/头部
CUSTOM_CROP = {
    'a2':'first','a3':'first','a4':'first',
    'o2':'first','o3':'first','o4':'first',
    'e3':'first',
}
PHRASE_SINGLE = {'i1':'衣','i3':'椅','a2':'啊','a3':'啊','a4':'啊','o2':'哦','o3':'哦','o4':'哦','e3':'恶'}

SR = 16000
def load_sig(path):
    d = miniaudio.decode_file(path, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=SR)
    return np.frombuffer(d.samples, dtype=np.float32)

def voiced_segments(x, th_ratio=0.12, min_len=1200):
    e = np.sqrt(np.convolve(x**2, np.ones(800)/800, 'same'))
    th = e.max()*th_ratio
    segs=[]; on=False
    for i in range(0, len(x), 400):
        v = e[min(i,len(e)-1)]
        if v>th and not on: start=i; on=True
        elif v<=th and on:
            if i-start>min_len: segs.append((start,i))
            on=False
    if on and len(x)-start>min_len: segs.append((start,len(x)))
    return segs

def f0(x, sr=SR):
    a = x - x.mean()
    if len(a) < 800: return 0
    r = np.correlate(a,a,'full')[len(a)-1:]
    lo,hi = int(sr/400), int(sr/70)
    seg = r[lo:hi]
    if len(seg)==0 or seg.max()<=0: return 0
    pk = np.argmax(seg)+lo
    return sr/pk

def contour(x, n=8):
    seg = voiced_segments(x)
    if not seg: return None
    a,b = seg[0][0], seg[-1][1]
    if CUSTOM_CROP=='copy': pass
    vals=[]
    for j in range(2, n+2):
        s0 = a+(b-a)*j//(n+4); s1 = a+(b-a)*(j+1)//(n+4)
        f = f0(x[s0:s1])
        vals.append(f)
    return [v for v in vals if v>0]

def classify(cs):
    if not cs or len(cs)<4: return -1
    st = np.median(cs[:2]); en = np.median(cs[-2:]); mid = min(cs[len(cs)//2-1:len(cs)//2+1])
    rng = st
    if rng<=0: return -1
    if en > st*1.12 and mid > st*0.97: return 2
    if en < st*0.85: return 4
    t3 = mid < st*0.88 and en >= st*0.95
    if t3: return 3
    if mid <= st*0.92 and en >= st*0.92: return 3
    return 1

sem = asyncio.Semaphore(6)
async def gen_one(fid, text):
    p = os.path.join(OUT, fid+'.mp3')
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(p)
                if os.path.getsize(p) < 4000:
                    raise RuntimeError('too small')
                if fid in CUSTOM_CROP:
                    x = load_sig(p)
                    segs = voiced_segments(x)
                    if segs:
                        s0,e1v = segs[0]
                        pad = int(0.06*SR)
                        y = x[s0:e1v+pad]
                        fade = int(0.05*SR)
                        y[-fade:] *= np.linspace(1,0,fade)
                        y = y/max(abs(y.max()),abs(y.min()),1e-6)*0.9
                        pcm = (np.clip(y,-1,1)*32767).astype(np.int16)
                        import wave
                        with wave.open(p.replace('.mp3','.wav'),'wb') as w:
                            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
                        return 'wav'
                return 'mp3'
            except Exception as e:
                await asyncio.sleep(1)
        print('GEN FAIL', fid, text)
        return None

async def main():
    if not os.path.isdir(OUT): os.makedirs(OUT)
    # 去重下相同文本共享文件（yi1与i1等）。逐个生成并验证
    jobs = []
    for fid, text in GEN.items():
        jobs.append((fid, text))
    results = await asyncio.gather(*[gen_one(f,t) for f,t in jobs])
    report = []
    for (fid,text), fmt in zip(jobs, results):
        ext = 'wav' if fmt=='wav' else 'mp3'
        p = os.path.join(OUT, fid+'.'+ext)
        if not os.path.exists(p):
            report.append((fid, text, 'MISSING', -1)); continue
        x = load_sig(p)
        cs = contour(x)
        cls = classify(cs)
        exp = expected_tone(fid)
        ok = (cls==exp)
        report.append((fid, text, ext, cls, exp, ok, cs))
    bad = [r for r in report if len(r)>5 and not r[5]]
    print('=== 验证汇总 ===')
    print('总数', len(report), '不通过', len(bad))
    for r in bad:
        print('  FAIL', r[0], repr(r[1]), 'expect', r[4], 'got', r[3], [round(v,0) for v in (r[6] or [])])
    json.dump({r[0]:{'fmt':r[2],'tone':r[4]} for r in report if len(r)>5}, io.open('pinyin_v5_map.json','w',encoding='utf-8'), ensure_ascii=False)
    print('MAP->pinyin_v5_map.json')

asyncio.run(main())
