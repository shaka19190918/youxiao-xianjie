"""Maintained full regression set. Run against a local server (default :4213)."""
import json,os,subprocess,sys,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.visual-v85';OUT.mkdir(exist_ok=True)
TESTS=['v85_route_audit.py','v85_actions_test.py','v85_media_test.py','v84_pinyin_browser_test.py','pinyin_v63_acceptance.py','v82_acceptance.py','v82_offline_test.py','v68_practice_acceptance.py','eye_v70_test.py','eye_v70_media_test.py','v66_guided_learning_acceptance.py','game_v59_acceptance.py','v61_acceptance.py','v67_picture_acceptance.py','v69_loading_acceptance.py','ui_v64_acceptance.py','v65_family_value_acceptance.py','rounded_nav_acceptance.py']
def run(name):
 started=time.monotonic();env={**os.environ,'SMOKE_URL':os.environ.get('SMOKE_URL','http://127.0.0.1:4213/'),'PYTHONIOENCODING':'utf-8'}
 try:
  p=subprocess.run([sys.executable,str(ROOT/'tools'/name)],cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf8',timeout=600)
  return {'test':name,'exit':p.returncode,'seconds':round(time.monotonic()-started,1),'output':p.stdout+p.stderr}
 except subprocess.TimeoutExpired:return {'test':name,'exit':124,'seconds':600,'output':'Timeout'}
if __name__=='__main__':
 results=[]
 with ThreadPoolExecutor(max_workers=3) as pool:
  for future in as_completed([pool.submit(run,n) for n in TESTS]):
   result=future.result();results.append(result);(OUT/'suite-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
   print(('PASS' if result['exit']==0 else 'FAIL'),result['test'],result['seconds'],'seconds',flush=True)
   if result['exit']:print(result['output'],flush=True)
 assert len(results)==len(TESTS) and all(r['exit']==0 for r in results),'See .visual-v85/suite-results.json'
 print('PASS all',len(TESTS),'maintained functional/media/regression suites',flush=True)
