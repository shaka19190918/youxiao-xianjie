// Vendor unchanged 2.0.1 character data, with original license and SHA-256 manifest.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const html=await fs.readFile('index.html','utf8');
const block=html.match(/const V42_CHARS=\[([\s\S]*?)\n\];/)[1];
const chars=[...block.matchAll(/\['([^']+)'/g)].map(m=>m[1]);
const out='assets/strokes-v69';await fs.mkdir(out,{recursive:true});
async function get(path){
  let error;for(let i=0;i<3;i++)try{const r=await fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/'+path,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return Buffer.from(await r.arrayBuffer())}catch(e){error=e}
  throw error;
}
const files=[];
for(let i=0;i<chars.length;i+=3)await Promise.all(chars.slice(i,i+3).map(async ch=>{
  const file='u'+ch.codePointAt(0).toString(16)+'.json';let data;
  try{data=await fs.readFile(out+'/'+file)}catch{data=await get(encodeURIComponent(ch)+'.json')}
  const json=JSON.parse(data);if(!json.strokes?.length||json.strokes.length!==json.medians?.length)throw Error('Invalid strokes: '+ch);
  await fs.writeFile(out+'/'+file,data);
  files.push({char:ch,file,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
}));
const license=await get('ARPHICPL.TXT');await fs.writeFile(out+'/ARPHICPL.TXT',license);
await fs.writeFile(out+'/manifest.json',JSON.stringify({source:'https://github.com/chanind/hanzi-writer-data',version:'2.0.1',license:'Arphic Public License',downloadedAt:'2026-09-19',modifications:'None; filenames use Unicode code points.',files:files.sort((a,b)=>a.file.localeCompare(b.file))},null,2));
console.log('Vendored',files.length,'unchanged characters,',files.reduce((n,f)=>n+f.bytes,0),'bytes; original license retained.');
