"""Exhaustive provenance/boundary/voicing audit; flags never disable recordings.
Pitch estimates are engineering diagnostics, NOT a pronunciation certificate.
"""
import hashlib,json,subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from analyze_pinyin_v83 import pcm,frames
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'assets/pinyin-v63/manifest.json').read_text('utf8'))
table=json.loads((ROOT/'assets/pinyin-v63/segments-v83.json').read_text('utf8'))
def one(item):
 name=item['file'][:-4];data=(ROOT/'assets/pinyin-v63'/item['file']).read_bytes()
 assert data==subprocess.check_output(['git','show','3c55e87:assets/pinyin-v63/'+item['file']],cwd=ROOT),name
 row=table['files'][name];assert hashlib.sha256(data).hexdigest()==item['sha256']==row['sha256']
 signal=pcm(name);f=frames(signal);assert abs(len(signal)/16000-row['duration'])<.01
 assert len(row['spans'])==4 and all(0<=a<b<=row['duration'] for a,b in row['spans'])
 assert all(row['spans'][i][1]<row['spans'][i+1][0] for i in range(3))
 tones=[]
 for a,b in row['spans']:
  pitches=[r['hz'] for r in f if a<=r['t']<=b and r['hz']]
  assert len(pitches)>=5,(name,a,b,'missing voiced section')
  tones.append({'span':[a,b],'voicedFrames':len(pitches),'pitchQuartiles':[round(float(np.median(x)),1) for x in np.array_split(pitches,4)]})
 return {'name':name,'tones':tones}
if __name__=='__main__':
 assert len(manifest['files'])==len(table['files'])==406 and not table['unavailable']
 with ThreadPoolExecutor(max_workers=4) as pool: rows=list(pool.map(one,manifest['files']))
 out=ROOT/'.visual-v84';out.mkdir(exist_ok=True)
 (out/'audio-audit.json').write_text(json.dumps({'recordings':406,'tones':1624,'unchangedBaseline':'3c55e87','phoneticCertification':False,'files':rows},ensure_ascii=False),encoding='utf8')
 print('PASS 406 unchanged recordings / 1624 ordered, voiced, non-overlapping tone spans; no exclusion')
