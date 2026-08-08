# -*- coding: utf-8 -*-
"""古诗音频生成 V2 — 标题+作者+全文，教学式朗读"""
import asyncio, edge_tts, os

VOICE = 'zh-CN-XiaoxiaoNeural'  # 清晰朗读
RATE = '-15%'   # 稍慢，适合跟读

POEMS = {
    'poem_yong_e': '咏鹅。唐代，骆宾王。\n下面来听古诗咏鹅。\n鹅，鹅，鹅，\n曲项向天歌。\n白毛浮绿水，\n红掌拨清波。',
    'poem_hua': '画。唐代，王维。\n远看山有色，\n近听水无声。\n春去花还在，\n人来鸟不惊。',
    'poem_min_nong': '悯农。唐代，李绅。\n锄禾日当午，\n汗滴禾下土。\n谁知盘中餐，\n粒粒皆辛苦。',
    'poem_jing_ye_si': '静夜思。唐代，李白。\n床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。',
    'poem_chun_xiao': '春晓。唐代，孟浩然。\n春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。',
    'poem_deng_guan_que_lou': '登鹳雀楼。唐代，王之涣。\n白日依山尽，\n黄河入海流。\n欲穷千里目，\n更上一层楼。',
    'poem_jiang_xue': '江雪。唐代，柳宗元。\n千山鸟飞绝，\n万径人踪灭。\n孤舟蓑笠翁，\n独钓寒江雪。',
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
    print(f'语音: {VOICE}, 语速: {RATE}')
    print(f'共 {len(items)} 首古诗')
    ok, fail = 0, []
    for key, text in items:
        k, success, info = await gen(key, text)
        if success:
            ok += 1
            print(f'OK {k}: {info}字节')
        else:
            fail.append((k, info))
            print(f'FAIL {k}: {info}')
    print(f'成功 {ok}，失败 {len(fail)}')

asyncio.run(main())
