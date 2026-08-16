"""Create v46 local eye-rest cues and fetch auditable human pinyin references."""
import asyncio
import urllib.request
from pathlib import Path

import edge_tts


VOICE = "zh-CN-YunxiNeural"
PINYIN_BASE = "https://raw.githubusercontent.com/hugolpz/audio-cmn/master/24k-abr/syllabs"
PINYIN = {
    "k-ke1.mp3": "cmn-ke1.mp3",
    "ing-ying1.mp3": "cmn-ying1.mp3",
    "ong-zhong1.mp3": "cmn-zhong1.mp3",
}
EYE = {
    "eye_rest": "小朋友，眼睛要休息啦。请离开屏幕，看看窗外远处，让眼睛放松一下。休息好以后我们再见。",
    "eye_limit": "小朋友，今天的屏幕时间用完啦。保护小眼睛，明天再来学习吧。",
    "eye_done": "休息好啦。眨眨眼睛，伸伸懒腰，可以继续学习啦。",
}


def fetch_pinyin() -> None:
    out = Path("assets/pinyin-v46")
    out.mkdir(parents=True, exist_ok=True)
    for target, source in PINYIN.items():
        path = out / target
        if path.exists() and path.stat().st_size > 1000:
            continue
        with urllib.request.urlopen(f"{PINYIN_BASE}/{source}", timeout=30) as response:
            data = response.read()
        if len(data) < 1000 or not data.startswith(b"ID3"):
            raise RuntimeError(f"invalid MP3: {source}")
        path.write_bytes(data)
        print(path)


async def save_cue(key: str, text: str) -> None:
    path = Path("assets/voice") / f"{key}.mp3"
    if path.exists() and path.stat().st_size > 1000:
        return
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, VOICE, rate="+5%").save(str(path))
            print(path)
            return
        except Exception:
            path.unlink(missing_ok=True)
            if attempt == 3:
                raise
            await asyncio.sleep(2 + attempt * 2)


async def main() -> None:
    fetch_pinyin()
    await asyncio.gather(*(save_cue(key, text) for key, text in EYE.items()))


if __name__ == "__main__":
    asyncio.run(main())
