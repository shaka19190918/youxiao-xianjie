"""Generate fixed local audio for math and English textbook sync v44."""
import asyncio
from pathlib import Path

import edge_tts


CN_VOICE = "zh-CN-YunxiNeural"
EN_VOICE = "en-US-AndrewNeural"

MATH_QUESTIONS = [
    "图中有四面小旗，应该选哪个数？", "小红站在小明的左边，小明在小红的哪边？", "铅笔、橡皮、苹果，哪一个不是文具？",
    "三把椅子配三个小朋友，够不够？", "一、二、三，接下来是几？", "圆形、正方形、小狗，哪一个不是图形？",
    "三和五，哪个数更大？", "排队时，小军前面有两人，他排第几？", "五可以分成二和几？", "二加三等于几？", "五减二等于几？", "零加四等于几？",
    "七里面有几个一？", "六可以分成一和几？", "八可以分成三和几？", "七减三等于几？", "小猫有六条鱼，又得到三条，一共有几条？", "十减四等于几？",
    "哪个物体最像球？", "魔方最像哪种立体图形？", "易拉罐最像哪种立体图形？", "书盒最像哪种立体图形？", "哪种物体容易滚动？", "搭积木时，哪种形状通常更容易放在下面？",
    "十三里面有几个十和几个一？", "十七前面的数是多少？", "十加五等于几？", "十八减三等于几？", "盒里有十支笔，外面有六支，一共有几支？", "十二和二十，哪个数更大？",
    "九加四等于几？", "八加七等于几？", "七加六等于几？", "六加五等于几？", "车上有九人，又上来六人，现在有几人？", "两盒球一共十四个，一盒有八个，另一盒有几个？",
    "五加五再加三等于几？", "十七减七等于几？", "九加八等于几？", "十五里面有几个十和几个一？", "足球和魔方，哪个更容易滚动？", "小红有七朵花，小明有九朵，两人共有几朵？",
]

MATH_UNITS = [
    "数学游戏与学习准备。练习观察、比较、分类和一一对应。",
    "第一单元，五以内数的认识和加减法。",
    "第二单元，六到十的认识和加减法。",
    "第三单元，认识立体图形。",
    "第四单元，十一到二十的认识。",
    "第五单元，二十以内的进位加法。",
    "第六单元，复习与关联。",
]

ENGLISH_UNITS = [
    "英语第一单元。练习问候和自我介绍。请进入练习听标准英文发音。",
    "英语第二单元。练习早晨问候和告别。请进入练习听标准英文发音。",
    "英语第三单元。练习询问近况和表示感谢。请进入练习听标准英文发音。",
    "英语第四单元。练习第一次见面时的礼貌表达。请进入练习听标准英文发音。",
    "英语第一次复习。请进入练习听标准英文发音。",
    "英语第五单元。练习用英语表达自己会做的事情。",
    "英语第六单元。练习春节和新年祝福。",
    "英语第二次复习。请进入练习听标准英文发音。",
]

ENGLISH = [
    [("Hello!", "你好！"), ("I'm Maomao.", "我是毛毛。"), ("What's your name?", "你叫什么名字？")],
    [("Good morning.", "早上好。"), ("Good afternoon.", "下午好。"), ("Goodbye.", "再见。")],
    [("How are you?", "你好吗？"), ("I'm fine.", "我很好。"), ("Thank you.", "谢谢你。")],
    [("Nice to meet you.", "很高兴认识你。"), ("This is my friend.", "这是我的朋友。"), ("Nice to meet you, too.", "我也很高兴认识你。")],
    [("Hello, I'm Maomao.", "你好，我是毛毛。"), ("Good morning.", "早上好。"), ("How are you?", "你好吗？")],
    [("I can sing.", "我会唱歌。"), ("I can dance.", "我会跳舞。"), ("Can you draw?", "你会画画吗？")],
    [("Happy Chinese New Year!", "春节快乐！"), ("Thank you.", "谢谢你。"), ("I love my family.", "我爱我的家人。")],
    [("I can run.", "我会跑步。"), ("Nice to meet you.", "很高兴认识你。"), ("Happy New Year!", "新年快乐！")],
]


async def save(text: str, voice: str, target: Path, rate: str) -> None:
    if target.exists() and target.stat().st_size > 1000:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(target))
            print(target)
            return
        except Exception:
            target.unlink(missing_ok=True)
            if attempt == 3:
                raise
            await asyncio.sleep(2 + attempt * 3)


async def main() -> None:
    jobs = []
    for index, text in enumerate(MATH_QUESTIONS, 1):
        jobs.append((text, CN_VOICE, Path("assets/math-v44") / f"question_{index:02d}.mp3", "+12%"))
    for index, text in enumerate(MATH_UNITS, 1):
        jobs.append((text, CN_VOICE, Path("assets/textbook-v44") / f"math_unit_{index:02d}.mp3", "+12%"))
    for index, text in enumerate(ENGLISH_UNITS, 1):
        jobs.append((text, CN_VOICE, Path("assets/textbook-v44") / f"english_unit_{index:02d}.mp3", "+12%"))
    for unit_index, unit in enumerate(ENGLISH, 1):
        for item_index, (english, chinese) in enumerate(unit, 1):
            name = f"u{unit_index:02d}_{item_index:02d}.mp3"
            jobs.append((english, EN_VOICE, Path("assets/english-v44") / name, "-5%"))
            jobs.append((chinese, CN_VOICE, Path("assets/english-v44-cn") / name, "+10%"))

    semaphore = asyncio.Semaphore(4)

    async def limited(job) -> None:
        async with semaphore:
            await save(*job)

    await asyncio.gather(*(limited(job) for job in jobs))


if __name__ == "__main__":
    asyncio.run(main())
