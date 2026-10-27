"""Simulate a detector false alarm: no valid published row may be removed."""
import copy,hashlib,json,runpy
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'assets/pinyin-v63/segments-v83.json';before=path.read_bytes()
rows=copy.deepcopy(json.loads(before)['files']);rows['a']['spans']=rows['a']['spans'][:3]
class Pool:
 def __enter__(self):return self
 def __exit__(self,*args):pass
 def map(self,*args):return rows.items()
with patch('concurrent.futures.ThreadPoolExecutor',return_value=Pool()):
 try:runpy.run_path(str(ROOT/'tools/build_pinyin_segments_v82.py'),run_name='__main__')
 except RuntimeError as e:assert 'existing table retained unchanged' in str(e)
 else:raise AssertionError('Detector warning silently overwrote published table')
assert path.read_bytes()==before
print('PASS simulated a.mp3 detector failure: generation aborted; all 406 published entries untouched')
