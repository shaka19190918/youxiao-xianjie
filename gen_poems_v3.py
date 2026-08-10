# -*- coding: utf-8 -*-
"""古诗音频生成 V3 — 汉字引导准确发音（咏鹅修复）"""
import asyncio, edge_tts, os

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'

# 咏鹅：直接用汉字"鹅"，edge-tts对汉字发音准确
TEXT = '咏鹅。唐代，骆宾王。\n鹅，鹅，鹅，\n曲项向天歌。\n白毛浮绿水，\n红掌拨清波。'

OUT = 'assets/voice'
os.makedirs(OUT, exist_ok=True)

async def main():
    path = os.path.join(OUT, 'poem_yong_e_v3.mp3')
    try:
        c = edge_tts.Communicate(TEXT, VOICE, rate=RATE)
        await c.save(path)
        sz = os.path.getsize(path)
        print(f'OK poem_yong_e_v3.mp3: {sz} bytes')
    except Exception as e:
        print(f'FAIL: {e}')

asyncio.run(main())
