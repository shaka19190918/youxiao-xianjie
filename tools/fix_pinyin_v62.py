# -*- coding: utf-8 -*-
"""v62 拼音修复：6 个声调错误音频，用汉字引导重新生成 + F0 自动验证。

链路依据（v61 index.html）：
  u1 四声表   -> assets/pinyin-v60/u1.mp3   文本「乌」wū
  i3 四声表   -> assets/pinyin-v60/i3.mp3   文本「以」yǐ（三声代表字）
  yin1 in韵母 -> assets/pinyin-v60/yin1.mp3 文本「因」yīn
  wen1 un韵母 -> assets/pinyin-v60/wen1.mp3 文本「温」wēn
  ong 韵母    -> assets/pinyin-v46/ong-zhong1.mp3 文本「钟」zhōng
  k 声母      -> assets/pinyin-v46/k-ke1.mp3 文本「科」kē
验证：F0 一声需 |末/首|<12%，三声需先降后升；不达标自动换声音重试（≤2轮）。
"""
import asyncio, io, json, os, subprocess, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import numpy as np
import edge_tts

SR = 16000
JOBS = [
    # (输出路径, 文本, 期望声调)
    ('assets/pinyin-v60/u1.mp',  '乌', 1),
    ('assets/pinyin-v60/yin1.mp3', '因', 1),
    ('assets/pinyin-v60/wen1.mp3', '温', 1),
    ('assets/pinyin-v60/i3.mp3',  '以', 3),
    ('assets/pinyin-v46/ong-zhong1.mp3', '钟', 1),
    ('assets/pinyin-v46/k-ke1.mp3', '科', 1),
]
# 声音候选：YunxiNeural(远端v61教学音一致) -> XiaoxiaoNeural -> YunxiaNeural
VOICES = [('zh-CN-YunxiNeural', '-10%'), ('zh-CN-XiaoxiaoNeural', '-15%'), ('zh-CN-YunxiaNeural', '-5%')]

def load(p):
    r = subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],
                       capture_output=True, timeout=60)
    return np.frombuffer(r.stdout, dtype=np.float32)

def voiced_span(sig):
    w=int(0.02*SR); n=len(sig)//w
    if n<2: return 0,len(sig)
    e=np.array([np.abs(sig[i*w:(i+1)*w]).mean() for i in range(n)])
    idx=np.where(e>=e.max()*0.10)[0]
    if len(idx)==0: return 0,len(sig)
    return int(idx[0]*w), int((idx[-1]+1)*w)

def f0(sig,s,e,p):
    n=int(0.04*SR); c=s+int((e-s)*p)-n//2
    if c<0 or c+n>len(sig): return 0.0
    x=sig[c:c+n].astype(np.float64); x=x-x.mean()
    if x.size<64 or np.abs(x).max()<0.015: return 0.0
    lo,hi=int(SR/500),int(SR/75); best,bv=0,0.0
    for lag in range(lo,hi):
        v=np.dot(x[:-lag],x[lag:])/(np.linalg.norm(x[:-lag])*np.linalg.norm(x[lag:])+1e-9)
        if v>bv: bv,best=v,lag
    return SR/best if best and bv>0.3 else 0.0

def verify(path, tone):
    """返回 (ok, 说明)。一声 |r|<12%；三声 降(f2<f1*0.96) 且 末不继续深降"""
    sig = load(path)
    dur = len(sig)/SR
    s,e = voiced_span(sig)
    f1,f2,f3 = [f0(sig,s,e,x) for x in (0.2,0.5,0.8)]
    if min(f1,f3)<=0: return False, f'F0测不到 f={f1:.0f}/{f2:.0f}/{f3:.0f}'
    r=(f3-f1)/f1
    if tone==1:
        ok = abs(r) < 0.12
    else:  # 三声：中段低于首段，末段回升高于中段
        ok = (f2 < f1*0.96) and (f3 > f2*0.98 or r > -0.05)
    return ok, f'dur={dur:.2f}s F0={round(f1)}/{round(f2)}/{round(f3)} r={r*100:+.0f}%'

async def gen(text, voice, rate, out):
    for i in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(out)
            sz=os.path.getsize(out); head=open(out,'rb').read(3)
            if sz>5000 and (head[:3]==b'ID3' or (head[0]==0xFF and (head[1]&0xE0)==0xE0)):
                return True
        except Exception as e:
            print('  retry', text, e)
        await asyncio.sleep(1)
    return False

async def main():
    results={}
    for out, text, tone in JOBS:
        done=False
        for vi,(voice,rate) in enumerate(VOICES):
            tmp = out + '.new.mp3'
            ok = await gen(text, voice, rate, tmp)
            if not ok:
                print(f'{out} [{voice}] 生成失败'); continue
            vok, info = verify(tmp, tone)
            print(f'{out} [{voice}] {info} {"✓" if vok else "✗"}')
            if vok:
                os.replace(tmp, out)
                results[out]=voice; done=True
                break
            os.remove(tmp)
        if not done:
            print(f'!! {out} 全部声音未达标，保留原文件')
    print('\n=== 结果 ===')
    for k,v in results.items(): print('OK', k, '<-', v)
    print('通过', len(results), '/', len(JOBS))

asyncio.run(main())