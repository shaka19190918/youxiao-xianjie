/* Transactional, backwards-compatible family backups. Never reset on upgrade. */
(()=>{
 'use strict';
 const EXTRAS=['readV71','g1_follow_state_v1','g1_pinyin_on'];
 // Parent authorization is a session, never a persisted child setting.
 S._parentAuth=false;R();
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const assert=(ok,message)=>{if(!ok)throw Error(message)};
 function safeKeys(x){if(!x||typeof x!=='object')return;for(const k of Object.keys(x)){assert(!['__proto__','prototype','constructor'].includes(k),'备份包含不安全的字段');safeKeys(x[k])}}
 function validate(d){
  assert(object(d)&&d.schema==='grade1-game-v1'&&object(d.s)&&d.s.schema==='grade1-game-v1','备份版本不兼容，未更改当前数据');
  const s=d.s;safeKeys(s);
  assert(object(s._setup)&&typeof s._setup.name==='string'&&object(s.game),'备份的孩子资料或关卡记录损坏');
  for(const k of ['levels','reviewQueue','rewardLedger'])assert(object(s.game[k]),'备份的关卡或奖励记录损坏');
  for(const k of ['scr','dailyGoal','chars','poems','vR','badges','sport','sudoku','cal','pianoLog','parentQA','learning66','piano68'])if(k in s)assert(object(s[k]),'备份字段损坏：'+k);
  assert(s.dog===null||object(s.dog),'备份的伙伴记录损坏');
  assert(typeof s.parentPin==='string'&&/^\d{4}$/.test(s.parentPin),'备份的家长PIN必须是4位数字');
  assert(Number.isFinite(s.pts)&&s.pts>=0,'备份的钻石记录损坏');
  if('done' in s._setup)assert(typeof s._setup.done==='boolean','首次设置状态损坏');
  if(s.game.activityLog!==undefined)assert(Array.isArray(s.game.activityLog)&&s.game.activityLog.every(object),'学习日志损坏');
  for(const q of Object.values(s.game.reviewQueue))assert(object(q)&&Number.isFinite(q.dueAt)&&object(q.task)&&Array.isArray(q.task.options)&&q.task.options.includes(q.task.answer),'错题备份损坏');
  for(const group of [s.scr,s.dailyGoal,s.dog,s.piano68])if(group)for(const key of ['contMin','restMin','dayMin','extMin','used','cont','tasks','chars','xp','hu','hy','en','ms'])if(key in group)assert(Number.isFinite(group[key])&&group[key]>=0,'数值设置损坏：'+key);
  if(s.scr&&'on' in s.scr)assert(typeof s.scr.on==='boolean','护眼开关损坏');
  if(s.learning66){
   if('guards' in s.learning66)assert(object(s.learning66.guards),'引导记录损坏');
   const daily=s.learning66.daily;if(daily!==undefined&&daily!==null)assert(object(daily)&&Array.isArray(daily.items)&&daily.items.every(i=>object(i)&&typeof i.id==='string'&&typeof i.done==='boolean'),'今日计划备份损坏');
  }
  for(const l of Object.values(s.game.levels))assert(object(l)&&Number.isInteger(l.stars)&&l.stars>=0&&l.stars<=3&&Array.isArray(l.tasks)&&l.tasks.length===3&&l.tasks.every(v=>typeof v==='boolean'),'备份的三星关卡记录损坏');
  const extras={};
  if(d.extras!==undefined){
   assert(object(d.extras),'附加学习记录损坏');
   for(const k of EXTRAS){
    const value=d.extras[k];if(value===undefined||value===null){extras[k]=null;continue}
    assert(typeof value==='string','附加学习记录格式错误');
    if(k==='g1_pinyin_on')assert(['0','1'].includes(value),'拼音显示设置损坏');
    else{const parsed=JSON.parse(value);assert(object(parsed),'附加学习记录损坏');safeKeys(parsed)}
    extras[k]=value;
   }
  }
  return {state:{...S,...s,schema:'grade1-game-v1',_parentAuth:false},extras};
 }
 function snapshot(){
  const s=JSON.parse(JSON.stringify(S));s._parentAuth=false;
  return {v:3,app:'grade1-island',schema:'grade1-game-v1',exportedAt:new Date().toISOString(),s,extras:Object.fromEntries(EXTRAS.map(k=>[k,localStorage.getItem(k)]))};
 }
 function restore(payload){
  const candidate=validate(payload),keys=[G1_STORAGE,...Object.keys(candidate.extras)],old=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));
  try{
   for(const [k,value]of Object.entries(candidate.extras)){if(value===null)localStorage.removeItem(k);else localStorage.setItem(k,value)}
   localStorage.setItem(G1_STORAGE,JSON.stringify(candidate.state));
  }catch(e){
   for(const k of keys){try{localStorage.removeItem(k)}catch(_){}}
   for(const k of keys){try{if(old[k]!==null)localStorage.setItem(k,old[k])}catch(_){}}
   throw Error('存储空间不足或不可写，未导入；请保留备份文件');
  }
  S=candidate.state;up();showPage('home');
 }
 exportData=function(){
  if(!S._parentAuth)return toast('请先通过家长验证');
  try{const blob=new Blob([JSON.stringify(snapshot(),null,1)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='grade1-island-backup-'+T()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出学习、绘本和跟弹记录')}catch(e){toast('导出失败：'+e.message)}
 };
 importData=function(ev){
  const input=ev.target,file=input.files?.[0];if(!file)return;
  if(!S._parentAuth){input.value='';return toast('请先通过家长验证')}
  if(file.size>10*1024*1024){input.value='';return toast('备份超过10MB，请检查文件')}
  const reader=new FileReader();reader.onload=()=>{
   try{if(!S._parentAuth)throw Error('家长验证已退出，请重新验证');const data=JSON.parse(reader.result);validate(data);if(!confirm('导入会覆盖当前学习数据，确定继续吗？'))return;restore(data);toast('导入成功，家长面板已重新锁定')}catch(e){toast('导入失败：'+e.message)}finally{input.value=''}
  };reader.onerror=()=>{input.value='';toast('读取备份失败，当前数据未更改')};reader.readAsText(file);
 };
 const oldSave=saveParent;
 saveParent=function(){
  if(!S._parentAuth)return toast('请先通过家长验证');
  const pin=document.getElementById('pPin')?.value||'';
  if(pin&&!/^\d{4}$/.test(pin))return toast('PIN必须是4位数字，设置未保存');
  for(const [id,max]of [['pTasks',8],['pChars',12]]){const input=document.getElementById(id);if(input)input.value=String(Math.max(1,Math.min(max,parseInt(input.value,10)||1)))}
  oldSave();
 };
 const oldClear=confirmClearData,oldDefaults=restoreDefaults;
 confirmClearData=function(){
  if(!S._parentAuth)return toast('请先通过家长验证');
  const previous=S;oldClear();
  if(S!==previous&&!S._setup.done){for(const k of [...EXTRAS,'grade1_eye_rest_v70'])localStorage.removeItem(k);location.reload()}
 };
 restoreDefaults=function(){if(!S._parentAuth)return toast('请先通过家长验证');return oldDefaults()};
 if(new URLSearchParams(location.search).has('test'))window.__DATA85={snapshot,validate,restore};
})();
