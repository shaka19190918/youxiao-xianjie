# -*- coding: utf-8 -*-
# 提取宠物台词 -> 童声生成 -> 生成PET_VOICE映射
import asyncio, re, os, json, hashlib, io
import edge_tts

s = io.open('index.html', encoding='utf-8').read()
# 定位四个宠物函数区域
start = s.find('function fDog(')
end = s.find('function tDog(')
end = s.find('dogAnim(isTrex', end) + 200
region = s[start:end]

# 提取至少10个字符串的数组字面量
pools = re.findall(r"\[('(?:[^'\\]|\\.)*'(?:,'(?:[^'\\]|\\.)*')*)\]", region)
texts = []
for pool in pools:
    items = re.findall(r"'((?:[^'\\]|\\.)*)'", pool)
    items = [i.replace('\\u', '\\\\u') for i in items]
    if len(items) >= 8:
        for t in items:
            # 还原 \\uxxxx
            t = t.encode('utf-8').decode('unicode_escape') if '\\u' in t else t
            if t and t not in texts:
                texts.append(t)

print('台词总数:', len(texts))
for t in texts[:5]:
    print('  ', t)

mapping = {}
for t in texts:
    h = hashlib.md5(t.encode('utf-8')).hexdigest()[:8]
    fid = 'peta_' + h
    mapping[t] = fid

VOICE = 'zh-CN-YunxiaNeural'
sem = asyncio.Semaphore(8)

async def gen(fid, text):
    p = 'assets/voice/%s.mp3' % fid
    if os.path.exists(p) and os.path.getsize(p) > 5000:
        return True
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate='-5%', pitch='+10Hz').save(p)
                sz = os.path.getsize(p)
                head = open(p, 'rb').read(3)
                ok_head = head[:3] == b'ID3' or (head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)
                if sz > 5000 and ok_head:
                    return True
            except Exception as e:
                print('retry', fid, e)
            await asyncio.sleep(1)
        print('FAIL', fid, text)
        return False

async def main():
    tasks = [gen(fid, t) for t, fid in mapping.items()]
    # 4个固定静态音频重录为童声
    fixed = {
        'pet_hello': '你好呀！我是你的学习小伙伴，我们一起去冒险吧！',
        'pet_bath': '洗香香啦，泡泡飞起来咯！',
        'pet_hungry': '小肚子咕咕叫啦，完成学习就有好吃的哦！',
        'pet_play': '耶！我们一起来玩游戏吧！',
    }
    for fid, t in fixed.items():
        mapping[t] = fid
    tasks += [gen(fid, t) for fid, t in fixed.items()]
    results = await asyncio.gather(*tasks)
    print('成功 %d / %d' % (sum(results), len(results)))

asyncio.run(main())
io.open('pet_voice_map.json', 'w', encoding='utf-8').write(json.dumps(mapping, ensure_ascii=False, indent=0))
print('映射条数:', len(mapping))
