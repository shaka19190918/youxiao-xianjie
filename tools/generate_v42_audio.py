"""Generate the finite offline teaching audio added by curriculum v42."""
import asyncio
import hashlib
from pathlib import Path

import edge_tts


VOICE = "zh-CN-YunxiNeural"
RATE = "+10%"

CHARS = "一二三上下口目耳手日田禾火虫云山八十了子人大月儿头天地你我他四五花鸟六七九水风雨鱼马中小多少左右早晚来去书本学校老师同学开关前后男女爸妈好心"

READINGS = [
    "早晨，太阳出来了。小雨背上书包，向妈妈说再见。她在校门口看见老师，笑着说：老师早！",
    "小河边长着一棵柳树。春风吹来，细细的柳条轻轻摆动，像在和小鱼打招呼。",
    "下雨了，小猫没有带伞。小兔把伞往小猫那边移了移。两个人一起走回家，谁也没有淋湿。",
    "今天轮到明明整理图书角。他把大的书放在下面，小的书放在上面，还把书脊摆得整整齐齐。",
    "奶奶种了三盆花。红花每天浇一次水，绿萝两天浇一次水。奶奶说，照顾植物要先了解它们的需要。",
    "操场上，小朋友们排队跳绳。轮到乐乐时，他先看清前面的人已经离开，才走进绳圈。",
    "一只小蚂蚁找到一粒米。它搬不动，就回去叫来伙伴。大家一起用力，终于把米搬回了家。",
    "夜晚，月亮像一条弯弯的小船。星星一闪一闪，远处偶尔传来几声虫鸣。",
    "爸爸给小安十元钱买文具。铅笔两元，橡皮三元。小安买了一支铅笔和一块橡皮，还剩五元。",
    "周末，东东先整理书桌，再读了二十分钟故事书，最后和爸爸去公园骑车。他觉得这一天很充实。",
    "教室里有一盆植物。叶子朝着窗户生长，因为那里有阳光。小朋友每周转动一次花盆，让叶子均匀受光。",
    "小熊想过河，可是木桥上有一块松动的木板。它没有急着走过去，而是请河狸叔叔先来检查。"
]

MATH_PROMPTS = [
    "七和九，哪个数更大？", "十六里面有几个十和几个一？", "从三开始，接着数两个数，是几？",
    "八加七等于几？", "十三减六等于几？", "九加九等于几？", "十七减八等于几？",
    "二十五的前一个数是多少？", "四十八后面的数是多少？", "六十三里面有几个十和几个一？",
    "三十加二十等于几？", "七十减四十等于几？", "四十二加五等于几？", "五十八减六等于几？",
    "三角形有几条边？", "哪个物体最像球？", "正方形有几条一样长的边？", "长方体有几个面？",
    "钟面上的短针指向七，长针指向十二，现在是几点？", "半小时是多少分钟？", "一分钟有多少秒？",
    "一元等于几角？", "五角加五角等于几元？", "一支铅笔三元，付五元，应找回几元？",
    "小红有六本书，又得到三本，现在有几本？", "树上有十二只鸟，飞走四只，还剩几只？",
    "一盒有十支彩笔，两盒一共有多少支？", "十八个苹果，上午吃五个，下午吃三个，还剩几个？",
    "书在桌子的上面，桌子在书的什么方向？", "小明面向东，他的左边是什么方向？",
    "铅笔大约长十五厘米，应该选择厘米还是米？", "教室门大约高二米，应该选择厘米还是米？",
    "苹果、香蕉和汽车，哪一个不是水果？", "红、蓝、红、蓝，接下来是什么颜色？",
    "二、四、六、八，接下来是几？", "三个小朋友排队，小美在小军前面，小军在小亮前面，谁在最后？",
    "上午八点上课，七点半和八点半，哪个时间更早？", "十元可以买两本五元的本子吗？",
    "二十以内，最大的数是多少？", "一百里面有几个十？"
]

POEMS = [
    ("poem_feng", "《风》，唐代，李峤。", ["解落三秋叶，", "能开二月花。", "过江千尺浪，", "入竹万竿斜。"]),
    ("poem_hua_ji", "《画鸡》，明代，唐寅。", ["头上红冠不用裁，", "满身雪白走将来。", "平生不敢轻言语，", "一叫千门万户开。"]),
    ("poem_xun_yin_zhe_bu_yu", "《寻隐者不遇》，唐代，贾岛。", ["松下问童子，", "言师采药去。", "只在此山中，", "云深不知处。"]),
    ("poem_chi_shang", "《池上》，唐代，白居易。", ["小娃撑小艇，", "偷采白莲回。", "不解藏踪迹，", "浮萍一道开。"]),
    ("poem_xiao_chi", "《小池》，宋代，杨万里。", ["泉眼无声惜细流，", "树阴照水爱晴柔。", "小荷才露尖尖角，", "早有蜻蜓立上头。"]),
]


def safe_name(prefix: str, text: str) -> str:
    return f"{prefix}_{hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]}.mp3"


async def save(text: str, target: Path):
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


async def main():
    jobs = []
    for ch in dict.fromkeys(CHARS):
        jobs.append((ch, Path("assets/chars") / f"u{ord(ch):x}.mp3"))
    for i, text in enumerate(READINGS, 1):
        jobs.append((text, Path("assets/reading") / f"reading_{i:02d}.mp3"))
    for i, text in enumerate(MATH_PROMPTS, 1):
        jobs.append((text, Path("assets/math-v42") / f"question_{i:02d}.mp3"))
    for key, info, lines in POEMS:
        jobs.append((info, Path("assets/voice") / f"{key}_info.mp3"))
        jobs.append((info + "".join(lines), Path("assets/voice") / f"{key}.mp3"))
        for i, line in enumerate(lines, 1):
            jobs.append((line, Path("assets/voice") / f"{key}_l{i}.mp3"))
    # Limit concurrency so GitHub Pages assets stay deterministic and generation is reliable.
    semaphore = asyncio.Semaphore(4)

    async def limited(text, target):
        async with semaphore:
            await save(text, target)

    await asyncio.gather(*(limited(text, target) for text, target in jobs))


if __name__ == "__main__":
    asyncio.run(main())
