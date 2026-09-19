"""Capture the deployed or local v66 screens using an isolated test profile."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.visual-v66'
OUT.mkdir(exist_ok=True)
CHROME=Path(os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4197/index.html')
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=str(CHROME) if CHROME.exists() else None)
    page=b.new_page(viewport={'width':1280,'height':900},service_workers='block')
    page.goto(BASE,wait_until='networkidle')
    page.evaluate("S._setup={done:true,name:'乐乐',grade:'一年级'};S.dog={type:'trex',xp:20,hu:80,hy:80,en:80,tasks:1};R();document.getElementById('wizard')?.remove();showPage('home')")
    page.reload(wait_until='networkidle')
    page.screenshot(path=str(OUT/'home-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("L66.write('āgyp')")
    page.screenshot(path=str(OUT/'writing-mobile.png'))
    page.evaluate("L66.closeWriting();L66.startDaily()")
    page.screenshot(path=str(OUT/'daily-mobile.png'),full_page=True)
    b.close()
