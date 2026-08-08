# -*- coding: utf-8 -*-
# 古诗整首重录 - edge-tts 童声，带标题/作者/年代，教学式停顿
import asyncio, edge_tts, os

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-10%'   # 稍慢，适合跟读
# 用标点控制停顿：句号、逗号自然停顿；句间加换行增强停顿

POEMS = {
 'poem_yong_e': '咏鹅。唐代，骆宾王。\n鹅，鹅，鹅，曲项向天歌。\n白毛浮绿水，红掌拨清波。',
 'poem_hua': '画。唐代，王维。\n远看山有色，近听水无声。\n春去花还在，人来鸟不惊。',
 'poem_min_nong': '悯农。唐代，李绅。\n锄禾日当午，汗滴禾下土。\n谁知盘中餐，粒粒皆辛苦。',
 'poem_jing_ye_si': '静夜思。唐代，李白。\n床前明月光，疑是地上霜。\n举头望明月，低头思故乡。',
 'poem_chun_xiao': '春晓。唐代，孟浩然。\n春眠不觉晓，处处闻啼鸟。\n夜来风雨声，花落知多少。',
 'poem_deng_guan_que_lou': '登鹳雀楼。唐代，王之涣。\n白日依山尽，黄河入海流。\n欲穷千里目，更上一层楼。',
 'poem_jiang_xue': '江雪。唐代，柳宗元。\n千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。',
}

OUT = 'assets/voice'
os.makedirs(OUT, exist_ok=True)

async def gen(key, text):
    path = os.path.join(OUT, key + '.mp3')
    try:
        c = edge_tts.Communicate(text, VOICE, rate=RATE)
        await c.save(path)
        return key, True, os.path.getsize(path)
    except Exception as e:
        return key, False, str(e)

async def main():
    items = list(POEMS.items())
    print(f'共 {len(items)} 首古诗')
    for key, text in items:
        k, ok, info = await gen(key, text)
        print(('OK ' if ok else 'FAIL ') + k, info if not ok else f'{info}字节')
asyncio.run(main())
