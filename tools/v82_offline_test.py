"""A complete shell, used teaching audio and saved progress survive offline reload."""
import os,sys,ast
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
tree=ast.parse(Path('tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'),args=['--no-proxy-server'])
 ctx=b.new_context();ctx.add_init_script(seed);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'?test=1',wait_until='networkidle');page.wait_for_function('navigator.serviceWorker.controller')
 page.wait_for_function("caches.keys().then(k=>k.includes('grade1-island-v83-1'))")
 page.evaluate("showPage('pinyin');pinyinV63Part('tones')")
 assert page.evaluate("__PINYIN_V63_TEST.play('a',1)")
 keys=page.evaluate("caches.open('grade1-island-v83-1').then(c=>c.keys()).then(xs=>xs.map(x=>x.url))")
 for name in ['pinyin-rules-v82.js','child-v82.js','child-v82.css','segments-v83.json']:assert any(name in x for x in keys),name
 page.evaluate('S.pts=37;R()');ctx.set_offline(True);page.reload(wait_until='networkidle')
 assert page.evaluate('document.documentElement.dataset.release')=='v83-pinyin-tones'
 assert page.evaluate('S.pts')==37
 page.evaluate("showPage('pinyin');pinyinV63Part('tones')")
 assert page.evaluate("__PINYIN_V63_TEST.play('a',1)")
 page.evaluate("showPage('dog')");assert page.locator('.v82-pet-actions button').count()==3
 assert not errors,errors;b.close()
 print('PASS coherent v82 shell, cached pinyin, companion UI and progress offline reload')
