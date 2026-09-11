"""Download the MIT-licensed human pinyin chart used by pinyin v63.

The upstream files contain four clearly separated native-speaker tone examples.
The browser decodes a file once, detects the four voiced spans, and plays only
the requested span.  Assets stay local so teaching audio works offline after it
has been cached and never falls back to device TTS.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import os
import re
import time
import urllib.request
import urllib.parse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "pinyin-v63"
API = "https://api.github.com/repos/hotoo/pinyin"
UPSTREAM_DIR = "apps/website/docs/public/audio"


def request_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "grade1-island-pinyin-builder/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response:
        return json.load(response)


def download(url: str, target: Path) -> dict:
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "grade1-island-pinyin-builder/1.0"})
            with urllib.request.urlopen(req, timeout=60) as response:
                data = response.read()
            if len(data) < 4_000 or not (data.startswith(b"ID3") or data[0] == 0xFF):
                raise RuntimeError(f"invalid MP3: {target.name} ({len(data)} bytes)")
            temp = target.with_suffix(".part")
            temp.write_bytes(data)
            temp.replace(target)
            return {
                "file": target.name,
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
        except Exception:
            if attempt == 3:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise AssertionError("unreachable")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    commit = request_json(f"{API}/commits/master")["sha"]
    listing = request_json(f"{API}/contents/{UPSTREAM_DIR}?ref={commit}")
    # Ignore upstream editor duplicates such as ``huo (1).mp3``.  The chart
    # itself only addresses canonical ASCII pinyin syllable filenames.
    names = sorted(
        item["name"] for item in listing
        if item["name"].endswith(".mp3") and re.fullmatch(r"[a-z]+\.mp3", item["name"])
    )
    if len(names) < 380:
        raise RuntimeError(f"upstream pinyin table unexpectedly small: {len(names)}")

    def one(name: str) -> dict:
        target = OUT / name
        encoded_name = urllib.parse.quote(name)
        url = f"https://raw.githubusercontent.com/hotoo/pinyin/{commit}/{UPSTREAM_DIR}/{encoded_name}"
        if target.exists() and target.stat().st_size > 4_000:
            data = target.read_bytes()
            return {"file": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        result = download(url, target)
        print(name, flush=True)
        return result

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        files = list(pool.map(one, names))

    manifest = {
        "schema": "grade1-pinyin-audio-v1",
        "source": "https://github.com/hotoo/pinyin",
        "sourceCommit": commit,
        "sourcePath": UPSTREAM_DIR,
        "license": "MIT",
        "licenseUrl": "https://github.com/hotoo/pinyin/blob/master/LICENSE",
        "usage": "native-speaker four-tone pinyin chart; decoded and segmented locally",
        "count": len(files),
        "files": files,
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"ready: {len(files)} pinyin files from {commit}")


if __name__ == "__main__":
    main()
