# -*- coding: utf-8 -*-
"""F0 声调验证 — 验证 v6 音频的声调走向"""
import os, sys
sys.path.insert(0, 'C:/Users/Administrator/.workbuddy/binaries/python/envs/default/Lib/site-packages')
import miniaudio
import numpy as np
import json

OUT = 'assets/pinyin'
SR = 16000

# 期望声调
EXPECT = {
    'a1':1,'a2':2,'a3':3,'a4':4,
    'o1':1,'o2':2,'o3':3,'o4':4,
    'e1':1,'e2':2,'e3':3,'e4':4,
    'i1':1,'i2':2,'i3':3,'i4':4,
    'u1':1,'u2':2,'u3':3,'u4':4,
    'v1':1,'v2':2,'v3':3,'v4':4,
    'ai1':1,'ai2':2,'ai3':3,'ai4':4,
    'ei1':1,'ei2':2,'ei3':3,'ei4':4,
    'ao1':1,'ao2':2,'ao3':3,'ao4':4,
    'an1':1,'an2':2,'an3':3,'an4':4,
    'en1':1,'en2':2,'en3':3,'en4':4,
    'zhi1':1,'zhi2':2,'zhi3':3,'zhi4':4,
    'chi1':1,'chi2':2,'chi3':3,'chi4':4,
    'shi1':1,'shi2':2,'shi3':3,'shi4':4,
    'zi1':1,'zi2':2,'zi3':3,'zi4':4,
    'si1':1,'si2':2,'si3':3,'si4':4,
    'yi1':1,'yi2':2,'yi3':3,'yi4':4,
    'wu1':1,'wu2':2,'wu3':3,'wu4':4,
    'yu1':1,'yu2':2,'yu3':3,'yu4':4,
}

def load_sig(path):
    d = miniaudio.decode_file(path, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=SR)
    return np.frombuffer(d.samples, dtype=np.float32)

def f0_autocorr(seg, sr=SR, fmin=70, fmax=500):
    """自相关法提取基频"""
    lo = int(sr / fmax)
    hi = int(sr / fmin)
    if len(seg) < hi * 2:
        return None
    seg = seg - seg.mean()
    energy = np.dot(seg, seg)
    if energy < 0.001:
        return None
    best_lag, best_corr = 0, -1
    for lag in range(lo, min(hi, len(seg) - lo)):
        corr = np.dot(seg[:len(seg)-lag], seg[lag:]) / np.sqrt(np.dot(seg[:len(seg)-lag], seg[:len(seg)-lag]) * np.dot(seg[lag:], seg[lag:]))
        if corr > best_corr:
            best_corr, best_lag = corr, lag
    if best_lag == 0:
        return None
    return sr / best_lag

def get_contour(x, sr=SR, frame_ms=40, hop_ms=20):
    """分帧提取F0轮廓"""
    frame = int(sr * frame_ms / 1000)
    hop = int(sr * hop_ms / 1000)
    contour = []
    for i in range(0, len(x) - frame, hop):
        seg = x[i:i+frame]
        # 能量阈值
        e = np.sqrt(np.mean(seg**2))
        if e < 0.01:
            contour.append(None)
            continue
        f = f0_autocorr(seg, sr)
        contour.append(f)
    return contour

def classify_tone(contour):
    """根据F0轮廓分类声调
    1声: 平稳 ~220Hz 不变
    2声: 上升 末>首8%+
    3声: 先降后升 V型
    4声: 下降 首>末15%+
    """
    vals = [f for f in contour if f is not None and 70 < f < 500]
    if len(vals) < 3:
        return 0, 'no_f0'
    
    n = len(vals)
    first = np.mean(vals[:max(1,n//4)])
    last = np.mean(vals[max(0,3*n//4):])
    mid = np.mean(vals[n//4:3*n//4])
    all_vals = np.array(vals)
    min_idx = np.argmin(all_vals)
    
    # 末首比
    ratio = (last - first) / max(first, 1)
    
    # 3声: V型 - 最小值在中间位置(20%-80%)，且末首都高于最低值
    mid_lo = 0.2 * n
    mid_hi = 0.8 * n
    is_v_shape = (mid_lo < min_idx < mid_hi) and (vals[min_idx] < first * 0.92) and (vals[min_idx] < last * 0.92)
    
    if is_v_shape:
        return 3, f'V-shape ratio={ratio:.2f}'
    if ratio > 0.08:
        return 2, f'rising ratio={ratio:.2f}'
    if ratio < -0.15:
        return 4, f'falling ratio={ratio:.2f}'
    # 接近平调
    if abs(ratio) < 0.08:
        return 1, f'flat ratio={ratio:.2f}'
    # 弱降可能是4声但不够明显
    return -1, f'unclear ratio={ratio:.2f} first={first:.0f} last={last:.0f}'

def main():
    results = {}
    for fid in sorted(EXPECT.keys()):
        path = os.path.join(OUT, fid + '.mp3')
        if not os.path.exists(path):
            results[fid] = (EXPECT[fid], 0, 'MISSING')
            continue
        try:
            x = load_sig(path)
            contour = get_contour(x)
            detected, detail = classify_tone(contour)
            expect = EXPECT[fid]
            ok = '✅' if detected == expect else '❌'
            results[fid] = (expect, detected, f'{ok} {detail}')
            print(f'{fid}: 期望{expect}声 检测{detected}声 {ok} {detail}')
        except Exception as e:
            results[fid] = (EXPECT[fid], 0, f'ERROR: {e}')
            print(f'{fid}: ERROR {e}')
    
    # 统计
    passed = sum(1 for v in results.values() if v[0] == v[1])
    total = len(results)
    print(f'\n通过: {passed}/{total}')
    failed = {k: v for k, v in results.items() if v[0] != v[1]}
    if failed:
        print(f'失败 {len(failed)} 项:')
        for k, v in sorted(failed.items()):
            print(f'  {k}: 期望{v[0]}声 检测{v[1]}声 - {v[2]}')

main()
