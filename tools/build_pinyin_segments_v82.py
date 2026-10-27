"""Build deterministic voiced boundaries, never divide a recording into quarters.
This checks signal boundaries and provenance, not human pronunciation quality.
"""
import array,hashlib,json,subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]/'assets/pinyin-v63'
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
def one(item):
 raw=(ROOT/item['file']).read_bytes()
 assert hashlib.sha256(raw).hexdigest()==item['sha256']
 pcm=subprocess.run([FFMPEG,'-v','error','-i',str(ROOT/item['file']),'-f','f32le','-ac','1','-ar','16000','pipe:1'],capture_output=True,check=True).stdout
 data=array.array('f',pcm);rate=16000;step=192
 levels=[sum(abs(x) for x in data[i:i+step])/len(data[i:i+step]) for i in range(0,len(data),step)]
 noise=sorted(levels)[int(len(levels)*.2)];threshold=max(.003,noise*4,max(levels)*.055)
 spans=[];start=None
 for i,v in enumerate(levels+[0]):
  if v>threshold and start is None:start=i
  if v<=threshold and start is not None:
   a,b=start*step/rate,i*step/rate;start=None
   if spans and a-spans[-1][1]<.23:spans[-1][1]=b
   else:spans.append([a,b])
 spans=[[round(max(0,a-.055),4),round(min(len(data)/rate,b+.075),4)] for a,b in spans if b-a>.16]
 return item['file'][:-4],{'sha256':item['sha256'],'duration':round(len(data)/rate,4),'spans':spans}
if __name__=='__main__':
 manifest=json.loads((ROOT/'manifest.json').read_text('utf8'))
 with ThreadPoolExecutor(max_workers=4) as pool:items=dict(pool.map(one,manifest['files']))
 raw_bad={k:len(v['spans']) for k,v in items.items() if len(v['spans'])!=4}
 reviewed=json.loads((ROOT/'reviewed-boundaries-v83.json').read_text('utf8'))
 for name,review in reviewed['files'].items():
  row=items[name]
  assert row['sha256']==review['sha256'],f'Review cannot be reused for changed source: {name}'
  spans=review['spans']
  assert len(spans)==4 and all(0<=a<b<=row['duration'] for a,b in spans)
  assert all(spans[i][1]<spans[i+1][0] for i in range(3))
  assert all(b<=na or a>=nb for a,b in spans for na,nb in review['excludedNoise'])
  row.update(spans=spans,boundaryMethod='reviewed-waveform-and-periodicity',review='reviewed-boundaries-v83.json')
 bad={k:len(v['spans']) for k,v in items.items() if len(v['spans'])!=4}
 print('Raw detector exceptions:',raw_bad,'; unresolved:',bad,flush=True)
 approved={k:v for k,v in items.items() if len(v['spans'])==4 and k not in ['hm','hng']}
 (ROOT/'segments-v83.json').write_text(json.dumps({'schema':'pinyin-boundaries-v83','sourceCommit':manifest['sourceCommit'],'method':'voiced spans and hash-bound reviewed noise exclusions; no equal-quarter fallback','files':approved,'unavailable':bad},ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
 print('Four-tone boundary checked:',len(approved),'recordings')
