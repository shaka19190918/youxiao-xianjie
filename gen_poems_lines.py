# -*- coding: utf-8 -*-
# 古诗逐句音频生成 V4 —— 童声 YunxiaNeural，慢速，按句生成用于逐字标红
import asyncio, os, sys
import edge_tts

VOICE = 'zh-CN-YunxiaNeural'   # 童声
RATE  = '-15%'
OUT   = 'assets/voice'

POEMS = {
    'poem_yong_e':           ['鹅，鹅，鹅，', '曲项向天歌。', '白毛浮绿水，', '红掌拨清波。'],
    'poem_hua':              ['远看山有色，', '近听水无声。', '春去花还在，', '人来鸟不惊。'],
    'poem_min_nong':         ['锄禾日当午，', '汗滴禾下土。', '谁知盘中餐，', '粒粒皆辛苦。'],
    'poem_jing_ye_si':       ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。'],
    'poem_chun_xiao':        ['春眠不觉晓，', '处处闻啼鸟。', '夜来风雨声，', '花落知多少。'],
    'poem_deng_guan_que_lou':['白日依山尽，', '黄河入海流。', '欲穷千里目，', '更上一层楼。'],
    'poem_jiang_xue':        ['千山鸟飞绝，', '万径人踪灭。', '孤舟蓑笠翁，', '独钓寒江雪。'],
}

async def gen(text, path):
    c = edge_tts.Communicate(text, VOICE, rate=RATE)
    await c.save(path)

async def main():
    os.makedirs(OUT, exist_ok=True)
    ok = fail = 0
    for key, lines in POEMS.items():
        for i, line in enumerate(lines):
            path = os.path.join(OUT, f'{key}_l{i+1}.mp3')
            try:
                await gen(line, path)
                sz = os.path.getsize(path)
                if sz < 3000:
                    print(f'SMALL {key}_l{i+1}: {sz}B'); fail += 1
                else:
                    print(f'OK   {key}_l{i+1}: {sz}B  "{line}"'); ok += 1
            except Exception as e:
                print(f'FAIL {key}_l{i+1}: {e}'); fail += 1
    print(f'\nDONE ok={ok} fail={fail}')
    sys.exit(1 if fail else 0)

asyncio.run(main())
