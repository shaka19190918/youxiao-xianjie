# -*- coding: utf-8 -*-
"""拼音音频生成 V3 — XiaoxiaoNeural，汉字引导准确发音"""
import asyncio, edge_tts, os

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'

# 声母：教学音节 + 汉字引导
SM = {
    'b':'bō','p':'pō','m':'mō','f':'fō',
    'd':'dē','t':'tē','n':'nē','l':'lē',
    'g':'gē','k':'kē','h':'hē',
    'j':'jī','q':'qī','x':'xī',
    'zh':'zhī','ch':'chī','sh':'shī','r':'rì',
    'z':'zī','c':'cī','s':'sī',
    'y':'yī','w':'wū'
}

TONES = {'a1':'ā','a2':'á','a3':'ǎ','a4':'à'}
DY = {'a1':'ā','o1':'喔','e1':'ē','yi1':'yī','wu1':'wū','yu1':'yū'}
FY = {'ai1':'āi','ei1':'ēi','wei1':'wēi','ao1':'āo','ou1':'ōu',
      'you1':'yōu','ye1':'yē','yue1':'yuē','er2':'ér'}
BY = {'an1':'ān','en1':'ēn','yin1':'yīn','wen1':'wēn','yun1':'yūn',
      'ang1':'āng','eng1':'ēng','ying1':'yīng','weng1':'wēng'}
ZT = {'zhi1':'zhī','chi1':'chī','shi1':'shī','ri4':'rì',
      'zi1':'zī','ci1':'cī','si1':'sī',
      'yi1':'yī','wu1':'wū','yu1':'yū','ye1':'yē','yue1':'yuē',
      'yuan1':'yuān','yin1':'yīn','yun1':'yūn','ying1':'yīng'}

ALL = {}
for d in (SM, TONES, DY, FY, BY, ZT):
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
            if success: ok += 1
            else: fail.append((aid, info))
        print(f'进度 {min(i+6,len(items))}/{len(items)}')
    print(f'成功 {ok}，失败 {len(fail)}')
    if fail: print('失败:', fail)

asyncio.run(main())
