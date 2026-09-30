"""Original major-key rest music + original Mandarin instructions, no samples."""
import asyncio
import json
from pathlib import Path
import subprocess
import numpy as np
import imageio_ffmpeg
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'eye-v70'
SR = 22050
STEPS = [
    (0, '小主人，刚才你学得很认真。现在放下屏幕，让眼睛去散散步吧。双手放松，不揉眼睛。'),
    (30, '找一个安全的位置，看看远处的树、房子，或者其他景物。尽量看六米以外。不要直视太阳，也不要爬上窗台。现在不用回答，不用看屏幕。'),
    (180, '坐稳，轻轻闭上眼睛。肩膀放松，像平常一样自然呼吸。双手放在腿上就好。'),
    (240, '睁开眼睛，慢慢眨几下。再看看远处，不用用力瞪眼睛。'),
    (420, '在安全的地方站起来，伸伸手臂，轻轻走几步。别拿着手机，继续看看远处。空间不够时，坐着放松也可以。'),
    (570, '休息快结束啦，继续看看远处。不用回来盯着倒计时，声音会提醒你。'),
    (590, '这一段休息结束啦。如果眼睛不舒服，请告诉爸爸妈妈。今天时间用完了，就让伙伴明天再陪你挑战吧。'),
]

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    # C major pentatonic, short connected phrases; no sustained low drone.
    tune = [72,76,79,76,74,76,72,79,81,79,76,74,76,79,72,76,
            77,81,79,77,76,74,72,76,79,76,74,72,74,76,72,None]
    chords = [(60,64,67),(65,69,72),(60,64,67),(67,71,74)]
    music = np.zeros(600*SR, dtype=np.float32)
    beat = 60/84
    def note(midi, at, duration, volume):
        begin = round(at*SR)
        if begin >= len(music): return
        size = min(round(duration*SR),len(music)-begin)
        t = np.arange(size, dtype=np.float32)/SR
        f = 440 * 2 ** ((midi-69)/12)
        env = (1-np.exp(-t/0.018))*np.exp(-t/0.55)*np.minimum(1,(duration-t)/0.08)
        # Soft felt-piano-like tone; harmonics are quiet, no metallic high bells.
        signal = np.sin(2*np.pi*f*t)+0.16*np.sin(2*np.pi*2*f*t)+0.035*np.sin(2*np.pi*3*f*t)
        music[begin:begin+size] += volume*signal*env
    n=0
    while n*beat < 600:
        midi=tune[n%len(tune)]
        if midi is not None: note(midi,n*beat,1.4*beat,0.13)
        if n%4==0:
            chord=chords[(n//8)%4]
            for k,pitch in enumerate(chord): note(pitch,n*beat+k*0.08,2.2*beat,0.036)
        n+=1
    fade=np.minimum(1,np.arange(len(music))/SR/3)*np.minimum(1,(len(music)-np.arange(len(music)))/SR/4)
    music*=fade.astype(np.float32)
    def encode(values,path,seconds=None):
        if seconds: values=values[:round(seconds*SR)]
        pcm=(np.clip(values,-.95,.95)*32767).astype('<i2').tobytes()
        subprocess.run([ffmpeg,'-y','-loglevel','error','-f','s16le','-ar',str(SR),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','48k',str(path)],input=pcm,check=True)
    encode(music,OUT/'warm-preview.mp3',30)
    encode(music,OUT/'warm-music.mp3')
    mixed=music.copy()*0.58
    manifest=[]
    for i,(at,text) in enumerate(STEPS):
        target=OUT/f'cue-{i}.mp3'
        if not target.exists():
            await edge_tts.Communicate(text,'zh-CN-YunxiNeural',rate='-5%',pitch='+3Hz').save(str(target))
        raw=subprocess.check_output([ffmpeg,'-loglevel','error','-i',str(target),'-f','f32le','-ar',str(SR),'-ac','1','pipe:1'])
        voice=np.frombuffer(raw,dtype='<f4')
        begin=round(at*SR);assert begin+len(voice)<=len(mixed), 'Spoken cue must not be truncated'
        size=len(voice)
        mixed[begin:begin+size] *= .23
        mixed[begin:begin+size] += voice[:size]*.86
        manifest.append({'at':at,'text':text,'duration':round(len(voice)/SR,2)})
    peak=float(np.max(np.abs(mixed)))
    if peak>.9: mixed*=.9/peak
    encode(mixed,OUT/'guided-rest.mp3')
    (OUT/'manifest.json').write_text(json.dumps({'version':70,'seconds':600,'voice':'zh-CN-YunxiNeural (合成男声)','music':'原创音序与合成音色，无第三方采样','steps':manifest},ensure_ascii=False,indent=2),'utf8')
    print(json.dumps({'duration':600,'peak':peak,'guidedBytes':(OUT/'guided-rest.mp3').stat().st_size,'previewBytes':(OUT/'warm-preview.mp3').stat().st_size}))

if __name__=='__main__': asyncio.run(main())
