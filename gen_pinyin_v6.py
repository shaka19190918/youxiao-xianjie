# -*- coding: utf-8 -*-
"""拼音音频生成 V6 — 混合方案：整字+拼音符号
原理：
1. 声母用教学代表字（播/坡/摸...），edge-tts读汉字永远准
2. a/o/e 四声用带声调符号的拼音（ā/á/ǎ/à），edge-tts能区分
3. i/u/v 四声用不同汉字（衣/姨/椅/意），单字声调天然不同
4. 整体认读/鼻韵母/拼读全用整字
5. ffmpeg 去首尾静音，不裁切声母
"""
import asyncio, edge_tts, os, subprocess, json

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'
OUT = 'assets/pinyin'
os.makedirs(OUT, exist_ok=True)

# ===== 23声母：教学代表字 =====
SM = {
    'b':'波','p':'坡','m':'摸','f':'佛',
    'd':'得','t':'特','n':'讷','l':'勒',
    'g':'哥','k':'科','h':'喝',
    'j':'鸡','q':'期','x':'西',
    'zh':'知','ch':'吃','sh':'诗','r':'日',
    'z':'资','c':'次','s':'思',
    'y':'衣','w':'屋'
}

# ===== 6单韵母 × 4声 = 24项 =====
# a/o/e: 用带声调符号的拼音（edge-tts能区分四声）
# i/u/v: 用不同汉字（声调天然不同）
TONES = {
    'a1':'ā','a2':'á','a3':'ǎ','a4':'à',
    'o1':'ō','o2':'ó','o3':'ǒ','o4':'ò',
    'e1':'ē','e2':'é','e3':'ě','e4':'è',
    'i1':'衣','i2':'姨','i3':'椅','i4':'意',
    'u1':'乌','u2':'无','u3':'五','u4':'物',
    'v1':'淤','v2':'鱼','v3':'雨','v4':'玉',
}

# ===== 复韵母 =====
FY = {
    'ai1':'哀','ai2':'挨','ai3':'矮','ai4':'爱',
    'ei1':'欸','ei2':'诶','ei3':'诶','ei4':'诶',  # ei2-4同字，用拼音符号替
    'ao1':'熬','ao2':'熬','ao3':'袄','ao4':'奥',  # ao1=ao2同字
    'ou1':'欧','ou2':'藕','ou3':'偶','ou4':'沤',
    'er2':'儿',
}

# 同字冲突的用拼音符号替代
FY_SYMBOL = {
    'ei2':'éi','ei3':'ěi','ei4':'èi',
    'ao1':'āo','ao2':'áo',
}

# ===== 鼻韵母 =====
BY = {
    'an1':'安','an2':'严','an3':'俺','an4':'岸',
    'en1':'恩','en2':'嗯','en3':'嗯','en4':'摁',  # en2=en3同字
    'in1':'因','in2':'银','in3':'引','in4':'印',
    'un1':'温','un2':'文','un3':'稳','un4':'问',
    'vn1':'晕','vn2':'云','vn3':'允','vn4':'韵',
    'ang1':'肮','ang2':'昂','ang3':'绑','ang4':'棒',
    'eng1':'亨','eng2':'恒','eng3':'冷','eng4':'横',
    'ing1':'英','ing2':'营','ing3':'影','ing4':'硬',
    'ong1':'轰','ong2':'红','ong3':'哄','ong4':'蕻',
}

BY_SYMBOL = {
    'en2':'én','en3':'ěn',
}

# ===== 整体认读音节16个×4声 =====
ZT = {
    'zhi1':'织','zhi2':'直','zhi3':'纸','zhi4':'制',
    'chi1':'吃','chi2':'迟','chi3':'尺','chi4':'赤',
    'shi1':'诗','shi2':'时','shi3':'史','shi4':'室',
    'ri2':'儿','ri3':'耳','ri4':'二',
    'zi1':'滋','zi2':'字','zi3':'紫','zi4':'自',
    'ci1':'雌','ci2':'词','ci3':'此','ci4':'次',  # ci2改"词"
    'si1':'丝','si2':'饲','si3':'死','si4':'四',  # si2改"饲"
    'yi1':'衣','yi2':'姨','yi3':'椅','yi4':'意',
    'wu1':'乌','wu2':'无','wu3':'五','wu4':'物',
    'yu1':'淤','yu2':'鱼','yu3':'雨','yu4':'玉',
    'ye1':'耶','ye2':'爷','ye3':'也','ye4':'夜',
    'yue1':'约','yue2':'月','yue3':'月','yue4':'月',  # yue2-4同字
    'yuan1':'冤','yuan2':'元','yuan3':'远','yuan4':'院',
    'yin1':'音','yin2':'银','yin3':'引','yin4':'印',
    'yun1':'晕','yun2':'云','yun3':'允','yun4':'韵',
    'ying1':'英','ying2':'营','ying3':'影','ying4':'硬',
}

ZT_SYMBOL = {
    'yue2':'yué','yue3':'yuě','yue4':'yuè',
}

# ===== 拼读音节示例 =====
PD = {
    'ba1':'巴','ba2':'拔','ba3':'靶','ba4':'爸',
    'po1':'坡','po2':'婆','po3':'叵','po4':'破',
    'mi1':'咪','mi2':'迷','mi3':'米','mi4':'密',
    'fo2':'佛','de2':'德','te4':'特','ne4':'讷','le4':'乐',
    'ge1':'哥','ke1':'科','he1':'喝',
    'ji1':'机','qi1':'期','xi1':'西',
}

# ===== 合并 =====
FLAT = {}
FLAT.update(SM)
FLAT.update(TONES)
FLAT.update(FY)
FLAT.update(BY)
FLAT.update(ZT)
FLAT.update(PD)

# 符号替代覆盖
SYMBOL_OVERRIDE = {}
SYMBOL_OVERRIDE.update(FY_SYMBOL)
SYMBOL_OVERRIDE.update(BY_SYMBOL)
SYMBOL_OVERRIDE.update(ZT_SYMBOL)

for fid, sym in SYMBOL_OVERRIDE.items():
    FLAT[fid] = sym

def ffmpeg_silence_crop(inp, outp):
    """用 ffmpeg 去除首尾静音段。"""
    cmd = ['ffmpeg', '-y', '-i', inp,
           '-af', 'silenceremove=start_silence=0.005:stop_silence=0.005:window=0.02:threshold=-40dB',
           '-ar', '22050', '-ac', '1', '-b:a', '48k',
           outp]
    r = subprocess.run(cmd, capture_output=True, timeout=10)
    return r.returncode == 0

async def gen_one(fid, text):
    raw = os.path.join(OUT, '_raw_' + fid + '.mp3')
    fin = os.path.join(OUT, fid + '.mp3')
    try:
        c = edge_tts.Communicate(text, VOICE, rate=RATE)
        await c.save(raw)
        if os.path.getsize(raw) < 2000:
            raise RuntimeError(f'file too small: {os.path.getsize(raw)}B')
        ok = ffmpeg_silence_crop(raw, fin)
        if not ok or not os.path.exists(fin) or os.path.getsize(fin) < 1000:
            os.replace(raw, fin)
        else:
            os.remove(raw)
        return fid, True, os.path.getsize(fin), text
    except Exception as e:
        if os.path.exists(raw):
            try:
                os.remove(raw)
            except:
                pass
        return fid, False, str(e), text

async def main():
    items = list(FLAT.items())
    print(f'语音: {VOICE}, 语速: {RATE}, 共 {len(items)} 个')
    print(f'符号替代: {len(SYMBOL_OVERRIDE)} 个')
    ok, fail = 0, []
    for i in range(0, len(items), 6):
        batch = items[i:i+6]
        results = await asyncio.gather(*[gen_one(fid, txt) for fid, txt in batch])
        for fid, success, info, txt in results:
            if success:
                ok += 1
                print(f'  OK  {fid}={txt}  {info}B')
            else:
                fail.append((fid, info))
                print(f'  FAIL {fid}={txt}  {info}')
        print(f'进度 {min(i+6, len(items))}/{len(items)}')
    
    print(f'\n完成 {ok}/{len(items)}，失败 {len(fail)}')
    if fail:
        print('失败项:', fail)
    
    m = {fid: {'txt': txt} for fid, txt in items}
    with open('pinyin_v6_map.json', 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
    print('映射表 pinyin_v6_map.json 已写入')

asyncio.run(main())
