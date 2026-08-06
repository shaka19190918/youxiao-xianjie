"""Generate offline standard-English word audio for the first word-card set."""
import asyncio
from pathlib import Path
import edge_tts

WORDS = "dog cat rabbit bird red blue yellow green mother father sister brother eye ear nose hand run eat sleep draw".split()
TRANSLATIONS = {"dog":"狗","cat":"猫","rabbit":"兔子","bird":"鸟","red":"红色","blue":"蓝色","yellow":"黄色","green":"绿色","mother":"妈妈","father":"爸爸","sister":"姐姐或妹妹","brother":"哥哥或弟弟","eye":"眼睛","ear":"耳朵","nose":"鼻子","hand":"手","run":"跑","eat":"吃","sleep":"睡觉","draw":"画画"}

async def main():
    out = Path("assets/english")
    cn_out = Path("assets/english-cn")
    out.mkdir(parents=True, exist_ok=True)
    cn_out.mkdir(parents=True, exist_ok=True)
    for word in WORDS:
        file = out / f"{word}.mp3"
        if not (file.exists() and file.stat().st_size > 1000):
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(word, "en-US-GuyNeural", rate="-5%").save(str(file))
                    print(file)
                    break
                except Exception:
                    if file.exists():
                        file.unlink()
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 + attempt * 2)
        cn_file = cn_out / f"{word}.mp3"
        if cn_file.exists() and cn_file.stat().st_size > 1000:
            continue
        for attempt in range(3):
            try:
                await edge_tts.Communicate(TRANSLATIONS[word], "zh-CN-YunxiNeural", rate="+5%").save(str(cn_file))
                print(cn_file)
                break
            except Exception:
                if cn_file.exists():
                    cn_file.unlink()
                if attempt == 2:
                    raise
                await asyncio.sleep(2 + attempt * 2)

asyncio.run(main())
