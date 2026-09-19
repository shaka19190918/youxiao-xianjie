/* Local, monophonic YIN-style difference estimator. Not a polyphonic transcriber.
 * No network, recording, or third-party code. A4=440 Hz; C3–C6 practice range. */
((root)=>{
  'use strict';
  const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const name=m=>names[((m%12)+12)%12]+(Math.floor(m/12)-1);
  function detect(samples,rate){
    if(!samples||samples.length<2048||!Number.isFinite(rate)||rate<8000)return null;
    const n=Math.min(2048,Math.floor(samples.length/2));
    let power=0,mean=0,clipped=0;
    for(let i=0;i<n;i++){const x=samples[i];if(!Number.isFinite(x))return null;mean+=x;power+=x*x;if(Math.abs(x)>.98)clipped++}
    mean/=n;const rms=Math.sqrt(Math.max(0,power/n-mean*mean));
    if(rms<.008||clipped>n*.02)return null;
    const max=Math.min(Math.ceil(rate/125),samples.length-n-1),min=Math.floor(rate/1080);
    const d=new Float64Array(max+1);let sum=0;
    for(let tau=1;tau<=max;tau++){
      let v=0;for(let i=0;i<n;i++){const z=samples[i]-samples[i+tau];v+=z*z}
      sum+=v;d[tau]=sum?v*tau/sum:1;
    }
    for(let tau=min;tau<max-1;tau++){
      if(d[tau]>.10)continue;
      while(tau+1<max&&d[tau+1]<d[tau])tau++;
      const before=d[tau-1],middle=d[tau],after=d[tau+1];
      const den=before-2*middle+after,offset=den?(before-after)/(2*den):0;
      const frequency=rate/(tau+Math.max(-1,Math.min(1,offset)));
      if(frequency<128||frequency>1060)return null;
      const semitones=69+12*Math.log2(frequency/440),midi=Math.round(semitones);
      return{frequency,midi,name:name(midi),cents:Math.round((semitones-midi)*100),confidence:1-middle,rms};
    }
    return null;
  }
  root.PianoPitch68={detect,name};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PianoPitch68;
})(globalThis);
