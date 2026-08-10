# -*- coding: utf-8 -*-
"""拼音音频生成 V4 — 汉字引导准确发音 + 完整四声覆盖
核心原则：edge-tts 对汉字的发音远比拼音符号准确
声母用教学标准读音代表字，韵母用拼音符号（edge-tts能正确处理带声调的韵母）
"""
import asyncio, edge_tts, os

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'

# ===== 声母：用汉字引导（教学标准读音代表字）=====
# b→播(玻) p→坡 m→摸 f→佛 d→得 t→特 n→讷 l→勒
# g→哥 k→科 h→喝 j→基 q→欺 x→希
# zh→知 ch→吃 sh→诗 r→日 z→资 c→雌 s→思 y→衣 w→屋
SM = {
    'b':'播', 'p':'坡', 'm':'摸', 'f':'佛',
    'd':'得', 't':'特', 'n':'讷', 'l':'勒',
    'g':'哥', 'k':'科', 'h':'喝',
    'j':'基', 'q':'欺', 'x':'希',
    'zh':'知', 'ch':'吃', 'sh':'诗', 'r':'日',
    'z':'资', 'c':'雌', 's':'思',
    'y':'衣', 'w':'屋'
}

# ===== 六个单韵母的四声（完整覆盖）=====
# a: ā á ǎ à  o: ō ó ǒ ò  e: ē é ě è
# i: ī í ǐ ì  u: ū ú ǔ ù  ü: ǖ ǘ ǚ ǜ
TONES = {
    'a1':'ā', 'a2':'á', 'a3':'ǎ', 'a4':'à',
    'o1':'ō', 'o2':'ó', 'o3':'ǒ', 'o4':'ò',
    'e1':'ē', 'e2':'é', 'e3':'ě', 'e4':'è',
    # i/u/ü 单字母edge-tts无法处理，用汉字引导
    'i1':'衣', 'i2':'姨', 'i3':'椅', 'i4':'意',
    'u1':'屋', 'u2':'无', 'u3':'五', 'u4':'雾',
    'v1':'鱼', 'v2':'渔', 'v3':'雨', 'v4':'玉'
}

# ===== 复韵母 =====
FY = {
    'ai1':'āi', 'ei1':'ēi', 'wei1':'wēi',
    'ao1':'āo', 'ou1':'ōu', 'you1':'yōu',
    'ye1':'yē', 'yue1':'yuē', 'er2':'ér'
}

# ===== 鼻韵母 =====
BY = {
    'an1':'ān', 'en1':'ēn', 'yin1':'yīn',
    'wen1':'wēn', 'yun1':'yūn',
    'ang1':'āng', 'eng1':'ēng', 'ying1':'yīng', 'weng1':'wēng'
}

# ===== 整体认读音节 =====
ZT = {
    'zhi1':'zhī', 'chi1':'chī', 'shi1':'shī', 'ri4':'rì',
    'zi1':'zī', 'ci1':'cī', 'si1':'sī',
    'yi1':'yī', 'wu1':'wū', 'yu1':'yū',
    'ye1':'yē', 'yue1':'yuē', 'yuan1':'yuān',
    'yin1':'yīn', 'yun1':'yūn', 'ying1':'yīng'
}

# ===== 合并 =====
ALL = {}
for d in (SM, TONES, FY, BY, ZT):
    ALL.update(d)

OUT = 'assets/pinyin'
os.makedirs(OUT, exist_ok=True)

async def gen_one(aid, text):
    path = os.path.join(OUT, aid + '.mp3')
    try:
        c = edge_tts.Communicate(text, VOICE, rate=RATE)
        await c.save(path)
        return aid, True, os.path.getsize(path)
    except Exception as e:
        return aid, False, str(e)

async def main():
    items = list(ALL.items())
    print(f'语音: {VOICE}, 语速: {RATE}, 共 {len(items)} 个')
    ok, fail = 0, []
    for i in range(0, len(items), 6):
        batch = items[i:i+6]
        results = await asyncio.gather(*[gen_one(a, t) for a, t in batch])
        for aid, success, info in results:
            if success:
                ok += 1
                print(f'  OK  {aid}.mp3  {ALL[aid]}  {info}B')
            else:
                fail.append((aid, info))
                print(f'  FAIL {aid}.mp3  {ALL[aid]}  {info}')
        print(f'进度 {min(i+6, len(items))}/{len(items)}')
    print(f'\n完成 {ok}/{len(items)}，失败 {len(fail)}')
    if fail:
        print('失败项:', fail)

asyncio.run(main())
