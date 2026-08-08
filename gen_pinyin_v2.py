# -*- coding: utf-8 -*-
"""拼音音频生成 V2 — 童声XiaoyiNeural，教学级清晰发音"""
import asyncio, edge_tts, os

VOICE = 'zh-CN-XiaoyiNeural'  # 童声，更适合幼儿教学
RATE = '-20%'  # 更慢，发音更清晰

# === 声母：用教学音节（带轻短韵尾的标准读音） ===
SM = {
    'b':'bō', 'p':'pō', 'm':'mō', 'f':'fō',
    'd':'dē', 't':'tē', 'n':'nē', 'l':'lē',
    'g':'gē', 'k':'kē', 'h':'hē',
    'j':'jī', 'q':'qī', 'x':'xī',
    'zh':'zhī', 'ch':'chī', 'sh':'shī', 'r':'rì',
    'z':'zī', 'c':'cī', 's':'sī',
    'y':'yī', 'w':'wū'
}

# === 声调：四声朗读 ===
TONES = {'a1':'ā', 'a2':'á', 'a3':'ǎ', 'a4':'à'}

# === 单韵母 ===
DY = {'a1':'ā', 'o1':'ō', 'e1':'ē', 'yi1':'yī', 'wu1':'wū', 'yu1':'yū'}

# === 复韵母 ===
FY = {'ai1':'āi', 'ei1':'ēi', 'wei1':'wēi', 'ao1':'āo', 'ou1':'ōu',
      'you1':'yōu', 'ye1':'yē', 'yue1':'yuē', 'er2':'ér'}

# === 鼻韵母 ===
BY = {'an1':'ān', 'en1':'ēn', 'yin1':'yīn', 'wen1':'wēn', 'yun1':'yūn',
      'ang1':'āng', 'eng1':'ēng', 'ying1':'yīng', 'weng1':'wēng'}

# === 整体认读音节 ===
ZT = {'zhi1':'zhī', 'chi1':'chī', 'shi1':'shī', 'ri4':'rì',
      'zi1':'zī', 'ci1':'cī', 'si1':'sī',
      'yi1':'yī', 'wu1':'wū', 'yu1':'yū', 'ye1':'yē', 'yue1':'yuē',
      'yuan1':'yuān', 'yin1':'yīn', 'yun1':'yūn', 'ying1':'yīng'}

ALL = {}
for d in (SM, TONES, DY, FY, BY, ZT):
    for k, v in d.items():
        ALL[k] = v

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
    print(f'语音: {VOICE}, 语速: {RATE}')
    print(f'共需生成 {len(items)} 个拼音音频')
    ok, fail = 0, []
    for i in range(0, len(items), 6):
        batch = items[i:i+6]
        results = await asyncio.gather(*[gen_one(a, t) for a, t in batch])
        for aid, success, info in results:
            if success:
                ok += 1
            else:
                fail.append((aid, info))
        print(f'进度 {min(i+6, len(items))}/{len(items)}')
    print(f'成功 {ok}，失败 {len(fail)}')
    if fail:
        print('失败项:', fail)

asyncio.run(main())
