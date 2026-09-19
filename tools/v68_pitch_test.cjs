// Signal tests are not a substitute for acoustic piano / device validation.
const assert=require('node:assert/strict');
const {detect}=require('../pitch-v68.js');
let cases=0,maxError=0,seed=42;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
for(const rate of [44100,48000])for(const midi of [48,50,52,55,60,62,64,65,67,69,71,72,76,79,84])for(const cents of [-20,0,20])for(const harmonics of [false,true]){
  const f=440*2**((midi-69+cents/100)/12);
  const x=Float32Array.from({length:4096},(_,i)=>{const t=i/rate,a=2*Math.PI*f*t;return .22*(Math.sin(a)+(harmonics?.45*Math.sin(2*a)+.25*Math.sin(3*a):0))*Math.exp(-t*3)});
  const p=detect(x,rate);assert(p,`no estimate: ${rate}/${midi}/${cents}`);
  const error=Math.abs(1200*Math.log2(p.frequency/f));maxError=Math.max(maxError,error);assert(error<6,`error ${error}`);assert.equal(p.midi,midi);cases++;
}
assert.equal(detect(new Float32Array(4096),48000),null);
assert.equal(detect(Float32Array.from({length:4096},()=>random()*.2-.1),48000),null);
assert.equal(detect(Float32Array.from({length:4096},()=>.6),48000),null);
assert.equal(detect(new Float32Array(128),48000),null);
console.log(`PASS ${cases} pure/harmonic signals; maximum error ${maxError.toFixed(2)} cents; silence/noise/DC rejected. Chords unsupported.`);
