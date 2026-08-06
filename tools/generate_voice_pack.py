"""Generate the small offline cue pack used by the child interface.

These are navigation, greeting and pet prompts only.  They intentionally do
not generate phonics or poetry assets, which require separate teaching-audio
review before release.
"""
import asyncio
from pathlib import Path

import edge_tts

VOICE = "zh-CN-YunxiNeural"  # Mandarin male neural voice
OUTPUT = Path("assets/voice")
CUES = {
    "greeting_morning": "早上好，小主人。新的一天，我们一起学习吧！",
    "greeting_late_morning": "上午好，小主人。准备好开始今天的小任务了吗？",
    "greeting_noon": "中午好，小主人。休息一下，再来学一点新知识吧！",
    "greeting_afternoon": "下午好，小主人。我们一起完成一个学习任务吧！",
    "greeting_evening": "傍晚好，小主人。今天的努力会让你越来越棒！",
    "greeting_night": "晚上好，小主人。完成一个小任务，就可以安心休息啦！",
    "pet_hungry": "小主人，我饿了，完成学习任务后给我准备食物吧！",
    "pet_bath": "小主人，我要洗澡啦，身上臭了，快帮我洗洗！",
    "pet_play": "小主人，我想出去和你玩。先完成今天的学习任务吧！",
    "pet_hello": "小主人，我会陪你一起学习，一起长大！",
    "correct": "答对啦，你真棒！",
    "retry": "再想一想，你一定可以做到！",
    "trace_start": "看清笔顺，跟着蓝色轮廓一笔一笔写。",
    "trace_pass": "描红通过，写得真认真！",
    "trace_retry": "这次还没有通过，看看笔顺，再写一次。",
    "poem_yong_e": "《咏鹅》，唐代骆宾王。鹅，鹅，鹅。曲项向天歌。白毛浮绿水，红掌拨清波。",
    "poem_hua": "《画》，唐代王维。远看山有色，近听水无声。春去花还在，人来鸟不惊。",
    "poem_min_nong": "《悯农》，唐代李绅。锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。",
    "poem_jing_ye_si": "《静夜思》，唐代李白。床前明月光，疑是地上霜。举头望明月，低头思故乡。",
    "poem_chun_xiao": "《春晓》，唐代孟浩然。春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。",
    "poem_deng_guan_que_lou": "《登鹳雀楼》，唐代王之涣。白日依山尽，黄河入海流。欲穷千里目，更上一层楼。",
    "poem_jiang_xue": "《江雪》，唐代柳宗元。千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。",
}


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for key, text in CUES.items():
        target = OUTPUT / f"{key}.mp3"
        if target.exists() and target.stat().st_size > 1000:
            continue
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate="+8%").save(str(target))
                print(f"created {target}")
                break
            except Exception as exc:
                if target.exists():
                    target.unlink()
                if attempt == 2:
                    raise
                await asyncio.sleep(2 + attempt * 2)


if __name__ == "__main__":
    asyncio.run(main())
