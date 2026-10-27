"""Inspect original audio energy and voiced pitch, not speech recognition.
Produces a time-aligned engineering plot for reviewing tone boundaries.
"""
import json,subprocess
from pathlib import Path
import numpy as np
import imageio_ffmpeg
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.visual-v83';OUT.mkdir(exist_ok=True)
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
def pcm(name):
 raw=subprocess.run([FFMPEG,'-v','error','-i',str(ROOT/'assets/pinyin-v63'/f'{name}.mp3'),'-f','f32le','-ac','1','-ar','16000','pipe:1'],capture_output=True,check=True).stdout
 return np.frombuffer(raw,dtype='<f4').copy()
def frames(data):
 rows=[];size=640;step=160
 for i in range(0,len(data)-size,step):
  x=data[i:i+size].astype(float);rms=float(np.sqrt(np.mean(x*x)));x-=x.mean();x*=np.hanning(size)
  ac=np.fft.irfft(abs(np.fft.rfft(x,n=2048))**2,n=2048)[:size]
  lags=np.arange(32,201);peaks=lags[(ac[lags]>ac[lags-1])&(ac[lags]>=ac[lags+1])]
  if len(peaks) and ac[0]>0:
   lag=int(max(peaks,key=lambda j:ac[j]/ac[0]));score=float(ac[lag]/ac[0]);pitch=16000/lag if score>.6 and rms>.003 else None
  else:score=0;pitch=None
  rows.append({'t':round((i+size/2)/16000,3),'rms':round(rms,6),'hz':round(pitch,1) if pitch else None,'periodicity':round(score,3)})
 return rows
if __name__=='__main__':
 for name in ['niu','yang']:
  data=pcm(name);rows=frames(data);duration=len(data)/16000
  image=Image.new('RGB',(1500,620),'white');d=ImageDraw.Draw(image)
  d.text((35,12),f'{name} ORIGINAL / energy(top), F0(bottom); seconds',fill='black')
  for sec in np.arange(0,duration,.25):
   x=50+sec/duration*1400;d.line((x,45,x,570),fill='#eeeeee')
   if round(sec*4)%4==0:d.text((x,580),str(round(sec,1)),fill='black')
  maxamp=float(max(abs(data)))
  for j in range(1400):
   chunk=data[int(j/1400*len(data)):int((j+1)/1400*len(data))]
   level=float(max(abs(chunk))) if len(chunk) else 0
   d.line((50+j,170-level/maxamp*110,50+j,170+level/maxamp*110),fill='#527fae')
  for hz in [100,200,300,400,500]:
   y=560-(hz-80)/440*230;d.line((50,y,1450,y),fill='#dddddd');d.text((5,y),str(hz),fill='black')
  for row in rows:
   if row['hz']:
    x=50+row['t']/duration*1400;y=560-(row['hz']-80)/440*230;d.ellipse((x-2,y-2,x+2,y+2),fill='#c6507e')
  image.save(OUT/f'{name}-analysis.png')
  (OUT/f'{name}-analysis.json').write_text(json.dumps(rows),encoding='utf8')
  print(name,'duration',duration,flush=True)
  for a,b in ([(.8,1.72),(2.62,3.44),(4.44,5.43),(6.32,6.94),(7.03,7.64)] if name=='niu' else [(.1,.48),(1.16,2.14),(3.3,4.16),(5.32,6.44),(7.54,8.12)]):
   group=[r for r in rows if a<=r['t']<=b];pit=[r['hz'] for r in group if r['hz']]
   print(a,b,'RMS',round(float(np.mean([r['rms'] for r in group])),4),'voiced frames',len(pit),'pitch',([round(float(np.median(part)),1) for part in np.array_split(pit,4)] if len(pit)>3 else pit),flush=True)
