"""Generate the finite offline audio vocabulary for child arithmetic questions."""
import asyncio
from pathlib import Path

import edge_tts

VOCABULARY = {
    **{str(number): text for number, text in enumerate(
        "零 一 二 三 四 五 六 七 八 九 十 十一 十二 十三 十四 十五 十六 十七 十八 十九 二十".split()
    )},
    "plus": "加",
    "minus": "减",
    "equals": "等于",
    "what": "几",
}


async def main():
    output = Path("assets/math")
    output.mkdir(parents=True, exist_ok=True)
    for key, text in VOCABULARY.items():
        target = output / f"{key}.mp3"
        if target.exists() and target.stat().st_size > 1000:
            continue
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, "zh-CN-YunxiNeural", rate="+8%").save(str(target))
                print(target)
                break
            except Exception:
                target.unlink(missing_ok=True)
                if attempt == 2:
                    raise
                await asyncio.sleep(2 + attempt * 2)


if __name__ == "__main__":
    asyncio.run(main())
