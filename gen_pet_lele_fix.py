# -*- coding: utf-8 -*-
import asyncio, re, os, json, io, sys, hashlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import edge_tts

REPLACE = {
    '勒勒最爱吃肉肉！': '我好爱吃肉肉！',
    '勒勒越吃越强壮！': '我越吃越强壮！',
    '勒勒好舒服～❤️': '好舒服呀～❤️',
    '勒勒最喜欢被摸头了！': '我最喜欢被摸头了！',
    '勒勒变干净啦！': '我变干净啦！',
    '香喷喷的勒勒回来了！': '香喷喷的我回来啦！',
    '嗷！我是勒勒，陪你一起学习！': '嗷！我是你的学习伙伴，一起加油吧！',
    '我是勒勒，一起加油！': '我是你的小伙伴，一起加油！',
    '勒勒在等你来做任务呢！': '我在等你来做任务呢！',
    '勒勒陪你一起变厉害！': '我陪你一起变厉害！',
    '勒勒最喜欢和你在一起了！': '我最喜欢和你在一起了！',
    '嗷呜……勒勒肚子饿了，给点肉肉吧！': '嗷呜……我肚子饿了，给点肉肉吧！',
    '勒勒想吃肉肉，快完成学习任务吧！': '我想吃肉肉，快完成学习任务吧！',
    '勒勒的肚子在抗议啦！': '我的肚子在抗议啦！',
    '勒勒身上脏脏的，帮我冲个澡！': '我身上脏脏的，帮我冲个澡！',
    '脏脏的勒勒不舒服……': '脏脏的我有点不舒服……',
    '嗷！勒勒想出去玩，先完成今天的任务吧！': '嗷！我想出去玩，先完成今天的任务吧！',
    '完成学习，勒勒陪你玩！': '完成学习，我陪你玩！',
    '勒勒活力满满，快来陪我！': '我活力满满，快来陪我！',
}

VOICE = 'zh-CN-YunxiaNeural'
sem = asyncio.Semaphore(8)

async def gen_one(text):
    fid = 'peta_' + hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    p = 'assets/voice/%s.mp3' % fid
    if os.path.exists(p) and os.path.getsize(p) > 5000:
        return fid, True
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate='-5%', pitch='+10Hz').save(p)
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
    new_map_entries = {}
    for old, new_text in REPLACE.items():
        fid, ok = await gen_one(new_text)
        new_map_entries[new_text] = fid
        print(('OK ' if ok else 'FAIL ') + new_text + ' -> ' + fid)
    return new_map_entries

new_map_entries = asyncio.run(main())

d = json.load(io.open('pet_voice_map.json', encoding='utf-8'))
for old in REPLACE:
    if old in d:
        del d[old]
for new_text, fid in new_map_entries.items():
    d[new_text] = fid
io.open('pet_voice_map.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=0))
print('映射更新完成:', len(d), '条')
print('含勒勒:', sum(1 for k in d if '勒勒' in k))