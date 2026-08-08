# -*- coding: utf-8 -*-
# 拼音音频批量生成 - 规范音节音（小学教学标准）
# 每个音频ID -> 引导TTS读准的汉字（该音节的规范读音代表字）
import asyncio, edge_tts, os, sys

VOICE = 'zh-CN-XiaoxiaoNeural'  # 清晰童声友好
RATE = '-15%'  # 稍慢，适合幼儿跟读

# 声母：读"声母本音"（带轻短韵尾的教学读音）
# 小学教学声母读音 = 本音 + 极轻韵尾（b→bo玻的声母轻读）
# 用汉字谐音引导：b→播(轻) 实际教学读 b-o 玻
SM = {
 'b':'播','p':'坡','m':'摸','f':'佛','d':'得','t':'特','n':'讷','l':'勒',
 'g':'哥','k':'科','h':'喝','j':'基','q':'欺','x':'希',
 'zh':'知','ch':'吃','sh':'诗','r':'日','z':'资','c':'雌','s':'思','y':'衣','w':'屋'
}

# 四声（ā á ǎ à）
TONES = {'a1':'ā','a2':'á','a3':'ǎ','a4':'à'}

# 单韵母（读四声第一声本音）
DY = {'a1':'ā','o1':'ō','e1':'ē','yi1':'衣','wu1':'屋','yu1':'迂'}

# 复韵母（规范读音代表字）
FY = {'ai1':'哀','ei1':'欸','wei1':'威','ao1':'凹','ou1':'欧','you1':'优','ye1':'耶','yue1':'约','er2':'儿'}

# 鼻韵母
BY = {'an1':'安','en1':'恩','yin1':'因','wen1':'温','yun1':'晕','ang1':'昂','eng1':'鞥','ying1':'英','weng1':'翁'}

# 整体认读音节
ZT = {'zhi1':'知','chi1':'吃','shi1':'诗','ri4':'日','zi1':'资','ci1':'雌','si1':'思',
      'yi1':'衣','wu1':'屋','yu1':'迂','ye1':'耶','yue1':'约','yuan1':'冤','yin1':'因','yun1':'晕','ying1':'英'}

# 合并所有需要生成的（音频ID -> 发音文本）
ALL = {}
for d in (SM, TONES, DY, FY, BY, ZT):
    for k,v in d.items():
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
    print(f'共需生成 {len(items)} 个拼音音频')
    ok, fail = 0, []
    # 并发生成（每批8个，避免限流）
    for i in range(0, len(items), 8):
        batch = items[i:i+8]
        results = await asyncio.gather(*[gen_one(a,t) for a,t in batch])
        for aid, success, info in results:
            if success: ok += 1
            else: fail.append((aid, info))
        print(f'进度 {min(i+8,len(items))}/{len(items)}')
    print(f'成功 {ok}，失败 {len(fail)}')
    if fail: print('失败项:', fail)

asyncio.run(main())
