"""Generate fixed local boy-voice audio for v45 lower math and time preview."""
import asyncio
from pathlib import Path

import edge_tts


VOICE = "zh-CN-YunxiNeural"

LOWER_QUESTIONS = [
    "正方形有几条一样长的边？", "三角形有几条边？", "哪个图形没有角？", "两个一样的正方形排在一起，可能拼成长什么图形？", "长方形的对边有什么特点？", "七巧板主要由哪类图形拼成？",
    "十二减九等于几？", "十五减八等于几？", "十三减六等于几？", "十一减五等于几？", "盒里有十四颗糖，吃掉九颗，还剩几颗？", "小红有十三朵花，小明有八朵，小红比小明多几朵？",
    "四十六里面有几个十和几个一？", "九十九后面的数是多少？", "数字七十二应该怎样写？", "五十八和六十五，哪个数更大？", "三十加四十等于几？", "五十六减六等于几？",
    "三十四加五等于几？", "二十六加三十等于几？", "四十六减三等于几？", "六十七减二十等于几？", "二十八加七等于几？", "五十二减八等于几？",
    "三十五加二十七等于几？", "四十六加三十八等于几？", "七十二减三十五等于几？", "八十减四十六等于几？", "图书角有二十六本故事书，又放入十八本，现在有几本？", "篮子里有六十三个球，拿走二十五个，还剩几个？",
    "小红有二十本书，小明有十四本，小红比小明多几本？", "小军有十五颗星，小丽比他多四颗，小丽有几颗？", "小猫有十八条鱼，小狗比它少六条，小狗有几条？", "第一天读十二页，第二天读十五页，两天共读几页？", "树上原有三十只鸟，飞走八只，又飞来五只，现在有几只？", "一班有四十二人，二班比一班少三人，二班有几人？",
    "一元等于几角？", "一角等于几分？", "五元加三元等于几元？", "一支笔六元，付十元，应找回几元？", "两张五元可以换成一张多少元？", "一本书十二元，一个本子五元，一共需要几元？",
    "二十三加四十等于几？", "八十一减九等于几？", "七十五和五十七，哪个数更大？", "十五减七等于几？", "三角形和圆形，哪个图形有三条边？", "二十元买八元的玩具，应找回几元？",
]

TIME_QUESTIONS = [
    "钟面上又短又粗的针通常是什么针？", "钟面上较长、表示分钟的针是什么针？", "分针指向十二，时针指向七，是几点？", "分针指向六，时针在七和八之间，是几点？", "一小时等于多少分钟？", "半小时等于多少分钟？", "一分钟等于多少秒？", "三十秒是一分钟的多少？", "从八点到八点半，经过了多久？", "从八点二十分到九点二十分，经过了多久？", "七点半和八点，哪个更早？", "眨一下眼睛大约需要多长时间？", "刷牙通常用三分钟还是三秒？", "从家走到附近公园，十五分钟和十五秒哪个更合理？", "分针走一整圈，经过多少分钟？", "六十秒也可以说成什么？", "十点开始阅读，十点二十分结束，读了多久？", "下午四点活动，下午三点半应该在活动之前还是之后？",
]

LOWER_UNITS = [
    "第一单元，认识平面图形。", "第二单元，二十以内的退位减法。", "第三单元，一百以内数的认识。", "第四单元，一百以内的口算加减法。", "第五单元，一百以内的笔算加减法。", "第六单元，数量间的加减关系。", "欢乐购物街，认识人民币和买卖活动。", "第七单元，复习与关联。",
]


async def save(text: str, target: Path) -> None:
    if target.exists() and target.stat().st_size > 1000:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, VOICE, rate="+12%").save(str(target))
            print(target)
            return
        except Exception:
            target.unlink(missing_ok=True)
            if attempt == 3:
                raise
            await asyncio.sleep(2 + attempt * 3)


async def main() -> None:
    jobs = []
    jobs += [(text, Path("assets/math-v45-lower") / f"question_{i:02d}.mp3") for i, text in enumerate(LOWER_QUESTIONS, 1)]
    jobs += [(text, Path("assets/time-v45") / f"question_{i:02d}.mp3") for i, text in enumerate(TIME_QUESTIONS, 1)]
    jobs += [(text, Path("assets/textbook-v45") / f"math_lower_unit_{i:02d}.mp3") for i, text in enumerate(LOWER_UNITS, 1)]
    semaphore = asyncio.Semaphore(4)

    async def limited(job) -> None:
        async with semaphore:
            await save(*job)

    await asyncio.gather(*(limited(job) for job in jobs))


if __name__ == "__main__":
    asyncio.run(main())
