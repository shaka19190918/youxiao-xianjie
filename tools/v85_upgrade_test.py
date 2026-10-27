"""Install a real v84 SW, switch the same origin to v85, retain saved records."""
import ast,json,mimetypes,os,subprocess,sys,threading,urllib.parse
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];mode={'old':True};blobs={}
tree=ast.parse((ROOT/'tools/v82_acceptance.py').read_text('utf8'))
seed=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SEED' for t in n.targets))
seed+=";const v=JSON.parse(localStorage.getItem('grade1_island_state_v1'));v.scr.on=false;localStorage.setItem('grade1_island_state_v1',JSON.stringify(v));"
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  path=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path).lstrip('/') or 'index.html'
  target=(ROOT/path).resolve()
  if not target.is_relative_to(ROOT) or not target.is_file():self.send_error(404);return
  if mode['old'] and target.suffix in ['.html','.js','.css','.webmanifest'] and not path.startswith(('assets/','vendor/')):
   if path not in blobs:
    try:blobs[path]=subprocess.check_output(['git','show','0c08996:'+path],cwd=ROOT,stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:self.send_error(404);return
   data=blobs[path]
  else:data=target.read_bytes()
  self.send_response(200);self.send_header('Content-Type',(mimetypes.guess_type(path)[0] or 'application/octet-stream')+('; charset=utf-8' if target.suffix in ['.js','.html','.css'] else ''));self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-cache');self.end_headers()
  try:self.wfile.write(data)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.path.expandvars(r'%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe'),args=['--no-proxy-server'])
  ctx=browser.new_context();ctx.add_init_script(seed);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  base='http://127.0.0.1:'+str(server.server_port)+'/'
  page.goto(base+'?test=1',wait_until='networkidle');page.wait_for_function('!!navigator.serviceWorker.controller')
  assert page.evaluate('document.documentElement.dataset.release')=='v84-pinyin-audit'
  page.evaluate("S.pts=77;S.dog.xp=48;S.chars['一']=true;S.game.levels['start-1']={stars:3,tasks:[true,true,true]};S.game.rewardLedger['start-1:complete']=123;S._parentAuth=true;R();localStorage.setItem('readV71','{\"saved\":1}');localStorage.setItem('g1_follow_state_v1','{\"saved\":2}');showPage('pinyin')")
  assert page.evaluate("__PINYIN_V63_TEST.play('a',1)")
  mode['old']=False
  page.evaluate('window.previousController=navigator.serviceWorker.controller;void navigator.serviceWorker.getRegistration().then(r=>r.update())')
  # A cache is created before install finishes; wait for the new worker to claim.
  page.wait_for_function('navigator.serviceWorker.controller&&navigator.serviceWorker.controller!==window.previousController',timeout=45000)
  page.reload(wait_until='networkidle');page.wait_for_function("document.documentElement.dataset.release==='v85-functional-audit'")
  assert page.evaluate("S.pts===77&&S.dog.xp===48&&S.chars['一']&&S.game.levels['start-1'].stars===3&&S.game.rewardLedger['start-1:complete']===123")
  assert not page.evaluate('S._parentAuth')
  assert page.evaluate('JSON.parse(localStorage.getItem("readV71")).saved')==1
  assert page.evaluate('JSON.parse(localStorage.getItem("g1_follow_state_v1")).saved')==2
  ctx.set_offline(True);page.reload(wait_until='networkidle');assert page.evaluate('S.pts')==77
  page.evaluate("showPage('pinyin')");assert page.evaluate("__PINYIN_V63_TEST.play('a',1)")
  assert page.evaluate('typeof __DATA85.snapshot')=='function' and not errors,errors
  browser.close();print('PASS real v84→v85 SW update: profile, pet, diamonds, stars, ledger, writing, books, follow progress and cached audio retained; parent session relocked')
finally:server.shutdown();server.server_close();thread.join(timeout=3)
