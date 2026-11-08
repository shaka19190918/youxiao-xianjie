"""BLCU integrity, real Web Audio, offline/retry/UI/data checks; NOT listening."""
import ast
import hashlib
import json
import os
import subprocess
import sys
import urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('SMOKE_URL','http://127.0.0.1:4213/')
manifest=json.loads((ROOT/'assets/pinyin-finals-v87/manifest.json').read_text('utf8'))
assert manifest['count']==48 and not manifest['professionalListeningComplete']
for key,row in manifest['files'].items():
    data=(ROOT/'assets/pinyin-finals-v87'/row['file']).read_bytes()
    assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256']
    assert row['phoneticReview']=='pending' and key==row['audio']+'|'+str(row['tone'])
old=json.loads(subprocess.check_output(['git','show','75ef3e1:assets/pinyin-v63/manifest.json'],cwd=ROOT))
assert json.loads((ROOT/'assets/pinyin-v63/manifest.json').read_text('utf8'))==old
for row in old['files']:
    assert hashlib.sha256((ROOT/'assets/pinyin-v63'/row['file']).read_bytes()).hexdigest()==row['sha256']
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
seed+=";const s=JSON.parse(localStorage.getItem('grade1_island_state_v1'));s.scr.on=false;localStorage.setItem('grade1_island_state_v1',JSON.stringify(s));"
with sync_playwright() as p:
    launch=dict(headless=True,executable_path=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'))
    if BASE.startswith('https:'):
        proxy=urllib.parse.urlsplit(os.environ['HTTPS_PROXY']);launch['proxy']={'server':f'{proxy.scheme}://{proxy.hostname}:{proxy.port}'}
    else:launch['args']=['--no-proxy-server']
    browser=p.chromium.launch(**launch)
    ctx=browser.new_context(viewport={'width':390,'height':844});ctx.add_init_script(seed)
    page=ctx.new_page();page.set_default_timeout(180000);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'?test=1',wait_until='networkidle',timeout=60000)
    assert page.locator('meta[name="app-version"]').get_attribute('content')=='v88-audio-focus'
    page.wait_for_function('!!navigator.serviceWorker.controller')
    page.evaluate("window.tts=0;speechSynthesis.speak=()=>tts++;window.starts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){starts.push(a);return start.apply(this,a)};showPage('pinyin');pinyinV63Part('finals')")
    for width,height in [(320,568),(375,667),(390,844),(844,390),(768,1024),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('#p63Body .p63-card').count()==24
    for tone in range(1,5):
        page.locator('.p63-tone').nth(tone-1).click()
        assert f',{tone},this)' in page.locator("button[onclick*=\"'final_v'\"]").get_attribute('onclick')
    page.locator("button[onclick*=\"'final_v'\"]").click()
    page.wait_for_function('document.querySelector("#p63Status").textContent.includes("再听一遍")')
    assert '独立韵母' in page.locator('#p86Model').inner_text()
    assert page.evaluate("pinyinV63TaskToken(['ing','ing1'])")=='p63|final_ing|1'
    assert page.evaluate("pinyinV63TaskToken(['ǖ','v1'])")=='p63|final_v|1'
    assert page.evaluate("pinyinV63TaskToken(['yi','yi1'])")=='p63|yi|1'
    # Native full-file decode plus real onended completion for every new tone.
    result=page.evaluate("""async rows=>{const api=__PINYIN_V63_TEST;for(const r of rows){const b=await api.getBuffer(r.audio,r.tone);if(Math.abs(b.duration-r.duration)>.15)throw Error(r.file+' duration');let energy=0;for(const v of b.getChannelData(0))energy+=v*v;if(energy/b.length<1e-6)throw Error(r.file+' silent');if(!await api.play(r.audio,r.tone))throw Error(r.file+' incomplete');const call=starts.at(-1);if(call[1]!==0||Math.abs(call[2]-b.duration)>1e-6)throw Error(r.file+' clipped')}return rows.length}""",list(manifest['files'].values()))
    assert result==48 and page.evaluate('tts')==0
    print('PASS 48 SHA-verified native decodes, non-silent buffers and complete real-time tone plays; no TTS (not professional listening)',flush=True)
    # A bad new buffer must not speak, call onEnd, or silently substitute yi/zhong.
    page.evaluate("__PINYIN_V63_TEST.clearDecodedCache();window.fetchAsset87=Fast69.fetchAsset;Fast69.fetchAsset=async()=>new Uint8Array([1,2,3]).buffer;window.ended87=0")
    assert page.evaluate("pinyinV63PlayToken('p63|final_ong|4',()=>ended87++).then(()=>false).catch(()=>true)")
    assert page.evaluate('ended87')==0 and page.evaluate('tts')==0
    page.evaluate('Fast69.fetchAsset=fetchAsset87;void 0')
    assert page.evaluate("pinyinV63PlayToken('p63|final_ong|4')")
    # Cache each tone before a real offline navigation (no all-audio precache).
    page.evaluate("async rows=>{for(const r of rows)await __PINYIN_V63_TEST.getBuffer(r.audio,r.tone)}",list(manifest['files'].values()))
    page.evaluate("S.pts=77;S.dog.xp=48;S.chars['一']=true;S.game.levels['start-1']={stars:3,tasks:[true,true,true]};R();localStorage.setItem('g1_pinyin_review_v86','{\"a|1\":{\"status\":\"question\",\"reviewer\":\"keep\"}}')")
    ctx.set_offline(True);page.reload(wait_until='networkidle')
    assert page.evaluate("S.pts===77&&S.dog.xp===48&&S.chars['一']&&S.game.levels['start-1'].stars===3")
    assert page.evaluate('JSON.parse(localStorage.getItem("g1_pinyin_review_v86"))["a|1"].reviewer')=='keep'
    page.evaluate("showPage('pinyin')")
    offline=page.evaluate("async rows=>{for(const r of rows)await __PINYIN_V63_TEST.getBuffer(r.audio,r.tone);return rows.length}",list(manifest['files'].values()))
    assert offline==48
    catalog=page.evaluate("fetch('assets/pinyin-v86/review-catalog.json?v=87').then(r=>r.json())")
    assert len(catalog['items'])==87 and sum(len(r['tones']) for r in catalog['recordings'])==1672
    assert not catalog['professionalListeningComplete'] and all(r['phoneticReview']=='pending' for r in catalog['recordings'])
    assert not errors,errors
    print('PASS 6 layouts, 24 finals, four-tone buttons, unchanged whole-syllable mapping, corrupt-file rejection/retry, 48 offline loads and retained learning/audit data',flush=True)
    browser.close()
