"""Generate local male-voice prompts for the v43 textbook route.

The pinyin unit prompts intentionally do not synthesize individual letters or
syllables. Teaching pronunciation remains mapped to the separately verified
local pinyin asset set in index.html.
"""
import asyncio
from pathlib import Path

import edge_tts


VOICE = "zh-CN-YunxiNeural"
RATE = "+12%"

UNITS = [
    [
        ("我是中国人", "认识国旗，练习大方介绍自己"),
        ("我爱我们的祖国", "观察图片，用完整句表达"),
        ("我是小学生", "熟悉校园规则和礼貌用语"),
        ("我爱学语文", "了解听、说、读、写的学习方式"),
    ],
    [
        ("天地人", "从生活情境认识常用字"),
        ("金木水火土", "借助韵文认识数字和自然事物"),
        ("口耳目手足", "看图识字，认识身体部位"),
        ("日月山川", "感受象形字与事物形状的联系"),
        ("语文园地一", "复习识字方法和书写姿势"),
        ("读书真快乐", "亲子共读，学习爱护图书"),
    ],
    [
        ("汉语拼音第一课", "请进入拼音练习，听三个单韵母的标准发音"),
        ("汉语拼音第二课", "请进入拼音练习，听三个单韵母的标准发音"),
        ("汉语拼音第三课", "请进入拼音练习，听辨声母并练习拼读"),
        ("汉语拼音第四课", "请进入拼音练习，听辨声母并练习拼读"),
        ("语文园地二", "复习第一阶段拼音和生活识字"),
    ],
    [
        ("汉语拼音第五课", "练习声母与单韵母相拼"),
        ("汉语拼音第六课", "掌握拼写规则并练习拼读"),
        ("汉语拼音第七课", "认识平舌音和整体认读音节"),
        ("汉语拼音第八课", "辨清平舌音和翘舌音"),
        ("汉语拼音第九课", "认识声母与整体认读音节"),
        ("语文园地三", "综合复习声母、韵母和音节"),
    ],
    [
        ("汉语拼音第十课", "学习复韵母和声调位置"),
        ("汉语拼音第十一课", "听辨复韵母并练习拼读"),
        ("汉语拼音第十二课", "学习复韵母和特殊韵母"),
        ("汉语拼音第十三课", "学习前鼻韵母"),
        ("汉语拼音第十四课", "学习后鼻韵母"),
        ("语文园地四", "完成拼音阶段综合复习"),
    ],
    [
        ("秋天", "借助插图和关键词了解自然变化"),
        ("江南", "感受诗歌节奏和画面"),
        ("雪地里的小画家", "提取不同动物脚印的信息"),
        ("四季", "联系生活表达喜欢的季节"),
        ("语文园地五", "积累词语，练习朗读和表达"),
    ],
    [
        ("对韵歌", "在对韵中积累自然事物词语"),
        ("日月明", "了解会意字的构字方法"),
        ("小书包", "认识学习用品并养成整理习惯"),
        ("升国旗", "规范朗读，培养礼仪意识"),
        ("语文园地六", "按结构归类汉字，复习识字方法"),
    ],
    [
        ("小小的船", "借助想象感受儿歌画面"),
        ("影子", "认识方位，观察影子的变化"),
        ("两件宝", "理解手和脑合作的重要性"),
        ("语文园地七", "学习看图表达和完整说话"),
    ],
    [
        ("比尾巴", "按明显特征比较和分类"),
        ("乌鸦喝水", "理解事情经过，尝试解决问题"),
        ("雨点儿", "分角色朗读，感受自然变化"),
        ("语文园地八", "听故事、复述要点并积累词语"),
    ],
]


async def save(text: str, target: Path) -> None:
    if target.exists() and target.stat().st_size > 1000:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(target))
            print(target)
            return
        except Exception:
            target.unlink(missing_ok=True)
            if attempt == 2:
                raise
            await asyncio.sleep(2 + attempt * 2)


async def main() -> None:
    semaphore = asyncio.Semaphore(4)

    async def limited(text: str, target: Path) -> None:
        async with semaphore:
            await save(text, target)

    jobs = []
    for unit_index, unit in enumerate(UNITS):
        for lesson_index, (title, focus) in enumerate(unit, 1):
            target = Path("assets/textbook") / f"tb_{unit_index:02d}_{lesson_index:02d}.mp3"
            jobs.append(limited(f"{title}。学习重点：{focus}。", target))
    await asyncio.gather(*jobs)


if __name__ == "__main__":
    asyncio.run(main())
