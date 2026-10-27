/* Teaching structure, not a pronunciation synthesizer. Audio always uses a
   complete recorded syllable; a spelling component is never substituted for it. */
(()=>{
 'use strict';
 const whole=['zhi','chi','shi','ri','zi','ci','si','yi','wu','yu','ye','yue','yuan','yin','yun','ying'];
 const initials=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s'];
 const finals=['a','o','e','i','u','v','ai','ei','ui','ao','ou','iu','ie','ve','er','an','en','in','un','vn','ang','eng','ing','ong'];
 function normalize(s){return String(s||'').trim().toLowerCase().normalize('NFC').replace(/[üǖǘǚǜ]/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('ɑ','a').replace(/[1-5]$/,'')}
 function analyze(value){
  const name=normalize(value);
  if(!/^[a-z]+$/.test(name))return {kind:'unsupported',name,parts:[],note:'先选一个已收录的音节。'};
  if(whole.includes(name))return {kind:'whole',name,parts:[name],note:'整体认读音节，整体读，不拆拼。'};
  if(['wa','wai','wan','wang','wei','wen','weng','wo','ya','yan','yang','yao','yong','you'].includes(name))return {kind:'spelling',name,parts:[name],note:'这是带 y 或 w 的音节拼写，听完整音节；它不属于16个整体认读音节。'};
  const initial=initials.find(x=>name.startsWith(x));
  if(!initial&&['a','ai','an','ang','ao','e','ei','en','eng','er','o','ou'].includes(name))return {kind:'zero',name,parts:[name],note:'零声母音节，直接听完整音节。'};
  if(!initial)return {kind:'unsupported',name,parts:[],note:'请选择拼音表中已收录的音节。'};
  let final=name.slice(initial.length),note='';
  if(['j','q','x'].includes(initial)&&final.startsWith('u')){final='v'+final.slice(1);note='ü 和 j、q、x 相拼，写成 u 时省略两点。'}
  if(finals.includes(final))return {kind:'two',name,parts:[initial,final],note};
  if(/^[iuv]/.test(final)&&['a','o','e','ai','ao','an','ang','eng','ong'].includes(final.slice(1)))return {kind:'three',name,parts:[initial,final[0],final.slice(1)],note};
  return {kind:'unsupported',name,parts:[],note:'这个音节只提供完整示范，暂不显示未经核验的拆分。'};
 }
 const api={whole,initials,finals,normalize,analyze};
 if(typeof window!=='undefined')window.PinyinRules82=api;
 if(typeof module!=='undefined')module.exports=api;
})();
