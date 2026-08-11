# -*- coding: utf-8 -*-
# F0 声调轮廓验证：一声平 / 二声升 / 三声凹 / 四声降
import sys, os, json, glob
sys.path.insert(0, 'C:/Users/Administrator/.workbuddy/binaries/python/envs/default/Lib/site-packages')
import miniaudio, numpy as np

def f0_track(fn, sr=16000):
    d = miniaudio.decode_file(fn, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=sr)
    x = np.frombuffer(d.samples, dtype=np.float32)
    win, hop = int(0.032*sr), int(0.010*sr)
    f0s = []
    for i in range(0, len(x)-win, hop):
        a = x[i:i+win] - x[i:i+win].mean()
        if np.sqrt((a**2).mean()) < 0.008: f0s.append(0); continue
        r = np.correlate(a, a, 'full')[len(a)-1:]
        lo, hi = int(sr/450), int(sr/80)
        seg = r[lo:hi]
        if seg.max() < 0.25*r[0]: f0s.append(0); continue
        f0s.append(sr/(np.argmax(seg)+lo))
    return np.array(f0s)

def classify(f0s):
    v = f0s[f0s > 0]
    if len(v) < 4: return '?', 0
    s, m, e = np.median(v[:2]), np.median(v[len(v)//2-1:len(v)//2+1]), np.median(v[-2:])
    up1, up2 = (m-s)/s*100, (e-m)/m*100
    if up2 < -12: return '4声(降)', (s, m, e)
    if up1 > 6 and up2 > 2: return '2声(升)', (s, m, e)
    if up1 < -10 and up2 > 6: return '3声(凹)', (s, m, e)
    if abs(up1) < 6 and abs(up2) < 6: return '1声(平)', (s, m, e)
    return '模糊(%+.0f%%%+.0f%%)' % (up1, up2), (s, m, e)

EXPECT = {'1':'1声', '2':'2声', '3':'3声', '4':'4声'}
fails = []
rows = []
# 声调 24 项
for base in ['a','o','e','i','u','v']:
    for t in range(4):
        fid = '%s%d' % (base, t+1)
        fn = 'assets/pinyin/%s.mp3' % fid
        cls, dbg = classify(f0_track(fn))
        ok = cls.startswith(EXPECT[str(t+1)])
        rows.append((fid, cls, ok))
        if not ok: fails.append((fid, cls, dbg))

print('%-6s %-14s %-s' % ('文件', '检测调型', '判定'))
for fid, cls, ok in rows:
    print('%-6s %-14s %s' % (fid, cls, 'OK' if ok else '<== 异常'))
print('\n声调异常 %d/24' % len(fails))
io.open('tone_check.json','w',encoding='utf-8').write(
    json.dumps({'fails':[(f,c,[round(x,1) for x in d]) for f,c,d in fails]}, ensure_ascii=False))
