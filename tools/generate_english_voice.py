"""Generate offline standard-English word audio for the first word-card set."""
import asyncio
from pathlib import Path
import edge_tts

WORDS = "dog cat rabbit bird red blue yellow green mother father sister brother eye ear nose hand run eat sleep draw".split()

async def main():
    out = Path("assets/english")
    out.mkdir(parents=True, exist_ok=True)
    for word in WORDS:
        file = out / f"{word}.mp3"
        if file.exists() and file.stat().st_size > 1000:
            continue
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

asyncio.run(main())
