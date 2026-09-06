"""Build the v61 curriculum snapshot and local audio bundle.

The browser is the single source of truth for curriculum/game data.  This
script extracts the loaded manifest and tasks, then creates fixed local audio
that reads each question and every answer option.  Pinyin tone references are
human recordings from hugolpz/audio-cmn (CC BY-SA), never device TTS.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import urllib.request
from pathlib import Path

import edge_tts
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
VOICE = "zh-CN-YunxiNeural"
RATE = "+12%"
PINYIN_IDS = [
    f"{syllable}{tone}"
    for syllable in ("ma", "bo", "ge", "yi", "wu", "yu")
    for tone in range(1, 5)
]
PINYIN_BASE = (
    "https://raw.githubusercontent.com/hugolpz/audio-cmn/master/"
    "64k/syllabs/cmn-{audio_id}.mp3"
)


def extract(base_url: str) -> tuple[dict, list[dict]]:
    with sync_playwright() as playwright:
        bundled = Path(
            os.path.expandvars(
                r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"
            )
        )
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=str(bundled) if bundled.exists() else None,
            args=["--no-proxy-server"],
        )
        context = browser.new_context(service_workers="block")
        page = context.new_page()
        target = (
            base_url + ("&" if "?" in base_url else "?") + "test=1"
            if base_url.lower().endswith(".html") or ".html?" in base_url.lower()
            else base_url.rstrip("/") + "/?test=1"
        )
        page.goto(target, wait_until="networkidle")
        page.wait_for_function(
            "window.CURRICULUM_MANIFEST_V1 && window.__G1_TEST",
            timeout=30_000,
        )
        manifest = page.evaluate("() => window.CURRICULUM_MANIFEST_V1")
        levels = page.evaluate(
            """() => window.__G1_TEST.levels
              .filter(level => level.id.startsWith('curr-'))
              .map(level => ({
                id: level.id,
                region: level.region,
                title: level.title,
                tasks: level.tasks.map(task => ({
                  id: task.id,
                  prompt: task.prompt,
                  options: task.options,
                  answer: task.answer,
                  audio: task.audio
                }))
              }))"""
        )
        browser.close()
    return manifest, levels


def task_narration(task: dict) -> str:
    prompt = task["prompt"].strip()
    if not prompt.endswith(("。", "！", "？", "!", "?")):
        prompt += "。"
    option_text = "。".join(
        f"选项{index + 1}，{option}" for index, option in enumerate(task["options"])
    )
    return f"{prompt}{option_text}。请选出正确答案。"


def write_snapshots(manifest: dict, levels: list[dict]) -> list[dict]:
    data_dir = ROOT / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "curriculum-manifest-v61.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    checklist = []
    for level in levels:
        for task in level["tasks"]:
            checklist.append(
                {
                    "levelId": level["id"],
                    "region": level["region"],
                    "title": level["title"],
                    "taskId": task["id"],
                    "audio": task["audio"],
                    "text": task_narration(task),
                    "answer": task["answer"],
                }
            )
    (data_dir / "curriculum-audio-checklist-v61.json").write_text(
        json.dumps(checklist, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return checklist


def download_pinyin(force: bool) -> None:
    out_dir = ROOT / "assets" / "pinyin-v61"
    out_dir.mkdir(parents=True, exist_ok=True)
    for audio_id in PINYIN_IDS:
        target = out_dir / f"{audio_id}.mp3"
        if not force and target.exists() and target.stat().st_size > 1_000:
            continue
        temp = target.with_suffix(".mp3.part")
        request = urllib.request.Request(
            PINYIN_BASE.format(audio_id=audio_id),
            headers={"User-Agent": "grade1-island-audio-builder/1.0"},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            temp.write_bytes(response.read())
        if temp.stat().st_size <= 1_000:
            temp.unlink(missing_ok=True)
            raise RuntimeError(f"Invalid pinyin audio: {audio_id}")
        temp.replace(target)
        print(f"pinyin {audio_id}")


async def generate_curriculum(checklist: list[dict], force: bool) -> None:
    semaphore = asyncio.Semaphore(4)

    async def generate_one(item: dict) -> None:
        target = ROOT / item["audio"]
        if not force and target.exists() and target.stat().st_size > 1_000:
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        temp = target.with_suffix(".mp3.part")
        async with semaphore:
            for attempt in range(3):
                try:
                    temp.unlink(missing_ok=True)
                    await edge_tts.Communicate(
                        item["text"],
                        VOICE,
                        rate=RATE,
                        connect_timeout=10,
                        receive_timeout=35,
                    ).save(str(temp))
                    if temp.stat().st_size <= 1_000:
                        raise RuntimeError("empty audio")
                    temp.replace(target)
                    print(item["audio"], flush=True)
                    return
                except Exception:
                    temp.unlink(missing_ok=True)
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 + attempt * 2)

    results = await asyncio.gather(
        *(generate_one(item) for item in checklist), return_exceptions=True
    )
    failures = [result for result in results if isinstance(result, BaseException)]
    if failures:
        raise RuntimeError(f"{len(failures)} curriculum audio files failed") from failures[0]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8123")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--extract-only", action="store_true")
    parser.add_argument("--skip-pinyin", action="store_true")
    parser.add_argument("--skip-curriculum", action="store_true")
    args = parser.parse_args()

    manifest, levels = extract(args.base_url)
    checklist = write_snapshots(manifest, levels)
    print(f"snapshot: {len(manifest['subjects'])} subjects, {len(levels)} levels")
    print(f"audio checklist: {len(checklist)} tasks")
    if args.extract_only:
        return
    if not args.skip_pinyin:
        download_pinyin(args.force)
    if not args.skip_curriculum:
        asyncio.run(generate_curriculum(checklist, args.force))


if __name__ == "__main__":
    main()
