# -*- coding: utf-8 -*-
# 1) 每首诗生成「诗名+年代+作者」信息音频（XiaoxiaoNeural -15%）
# 2) 咏鹅第一句用 XiaoxiaoNeural -25% 重录，二声更清晰
import asyncio, os, sys
import edge_tts

OUT = 'assets/voice'

INFO = {
    'poem_yong_e':            '咏鹅，唐代，骆宾王。',
    'poem_hua':               '画，唐代，王维。',
    'poem_min_nong':          '悯农，唐代，李绅。',
    'poem_jing_ye_si':        '静夜思，唐代，李白。',
    'poem_chun_xiao':         '春晓，唐代，孟浩然。',
    'poem_deng_guan_que_lou': '登鹳雀楼，唐代，王之涣。',
    'poem_jiang_xue':         '江雪，唐代，柳宗元。',
}

async def gen(text, path, voice, rate):
    c = edge_tts.Communicate(text, voice, rate=rate)
    await c.save(path)

async def main():
    os.makedirs(OUT, exist_ok=True)
    ok = fail = 0
    # 咏鹅 L1 重录：XiaoxiaoNeural 更慢更端正
    try:
        await gen('鹅，鹅，鹅，', os.path.join(OUT, 'poem_yong_e_l1.mp3'),
                  'zh-CN-XiaoxiaoNeural', '-25%')
        sz = os.path.getsize(os.path.join(OUT, 'poem_yong_e_l1.mp3'))
        print(f'OK poem_yong_e_l1: {sz}B (XiaoxiaoNeural -25%)'); ok += 1
    except Exception as e:
        print(f'FAIL l1: {e}'); fail += 1
    # 诗名信息音频：共同声线 YunxiaNeural 童声，与其他句一致
    for key, text in INFO.items():
        p = os.path.join(OUT, f'{key}_info.mp3')
        try:
            await gen(text, p, 'zh-CN-YunxiaNeural', '-15%')
            sz = os.path.getsize(p)
            print(f'OK {key}_info: {sz}B "{text}"'); ok += 1
        except Exception as e:
            print(f'FAIL {key}_info: {e}'); fail += 1
    print(f'DONE ok={ok} fail={fail}')
    sys.exit(1 if fail else 0)

asyncio.run(main())
