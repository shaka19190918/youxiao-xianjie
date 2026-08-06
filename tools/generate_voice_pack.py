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
