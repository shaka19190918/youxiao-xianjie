# -*- coding: utf-8 -*-
"""为 4 种宠物分别生成带宠物名的语音副本，并更新 pet_voice_map.json。

背景：上一轮把宠物台词全部改成中性文案(不含宠物名)，导致不同宠物发音完全相同。
方案：
  - 4 句模板台词以「勒勒」为名字占位（trex=勒勒，其余 petFix 自动替换成宠物名）
  - 对每种宠物替换占位符 → 生成带名字的音频，键=替换后的文本（即播放时 petFix 后的文本）
"""
import asyncio, io, json, os, sys, hashlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import edge_tts

VOICE = 'zh-CN-YunxiaNeural'
RATE = '-5%'
PITCH = '+10Hz'
ROOT = os.path.dirname(os.path.abspath(__file__))
VOICE_DIR = os.path.join(ROOT, 'assets', 'voice')
MAP_PATH = os.path.join(ROOT, 'pet_voice_map.json')
sem = asyncio.Semaphore(8)

PETS = {'labrador': '小拉', 'husky': '小哈', 'shepherd': '小牧', 'trex': '勒勒'}
TEMPLATES = [
    '你好，我是勒勒，我们一起学习吧！',
    '嗷！我是勒勒，陪你一起学习伙伴！',
    '勒勒最爱和你玩啦！',
    '香喷喷的勒勒回来啦！',
]

async def gen_one(text):
    fid = 'peta_' + hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    p = os.path.join(VOICE_DIR, fid + '.mp3')
    if os.path.exists(p) and os.path.getsize(p) > 5000:
        return fid, True
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(p)
            sz = os.path.getsize(p)
            head = open(p, 'rb').read(3)
            ok = head[:3] == b'ID3' or (head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)
            if sz > 5000 and ok:
                return fid, True
        except Exception as e:
            print('retry', text, e)
        await asyncio.sleep(1)
    return fid, False

async def main():
    new_map = {}
    for name in PETS.values():
        for tpl in TEMPLATES:
            spoken = tpl.replace('lile', name)  # placeholder, never used
            spoken = tpl.replace('勒勒', name)
            fid, ok = await gen_one(spoken)
            new_map[spoken] = fid
            print(('OK ' if ok else 'FAIL ') + spoken + ' -> ' + fid)
    return new_map

new_map_entries = asyncio.run(main())

d = json.load(io.open(MAP_PATH, encoding='utf-8'))
for k in new_map_entries:
    d.pop(k, None)
d.update(new_map_entries)
io.open(MAP_PATH, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=0))
print('映射更新完成:', len(d), '条')
n = [k for k in d if any(x in k for x in ('小拉', '小哈', '小牧'))]
print('带宠物名条目:', len(n))