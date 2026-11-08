/* One local recording survives return/reload. No upload or automatic microphone. */
(()=>{'use strict';let take=null,url='',dbPromise=null,notice='',epoch=0;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('IndexedDB unavailable'));const r=indexedDB.open('grade1_recording_v86',1);r.onupgradeneeded=()=>r.result.createObjectStore('takes');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return dbPromise}
 async function write(value){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('takes','readwrite');if(value)t.objectStore('takes').put(value,'last');else t.objectStore('takes').delete('last');t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})}
 function set(value){epoch++;if(url)URL.revokeObjectURL(url);take=value;url=take?URL.createObjectURL(take.blob):''}
 function panel(){document.getElementById('take86')?.remove();if(!take||!['follow79','parent'].includes(CP))return;
  const host=document.querySelector('.f79-page')||document.getElementById('ct'),box=document.createElement('section');box.id='take86';box.className='l66-card';
  box.innerHTML='<h2>🎧 最近一次录音</h2><p>'+esc(take.name)+'</p><audio controls playsinline preload="metadata" style="width:100%" src="'+url+'"></audio><div style="display:flex;flex-wrap:wrap;gap:10px"><button onclick="MediaTake86.download()">保存音频</button><button onclick="MediaTake86.share()">分享 / 存储到文件</button><a class="g1-next-task" target="_blank" rel="noopener" href="'+url+'">打开音频</a><button onclick="if(confirm(\'删除本机最近录音？\'))MediaTake86.clear()">删除录音</button></div><p id="take86Status" role="status">'+esc(notice||'仅保存在这台设备，不上传。iPad可点分享，选择存储到文件；JSON学习备份不包含录音。')+'</p>';host.append(box);
 }
 const status=s=>{notice=s;const e=document.getElementById('take86Status');if(e)e.textContent=s};
 window.MediaTake86={
  async remember(blob,name){set({blob,name,at:Date.now()});const mine=epoch,record=take;notice='正在本机暂存，可先保存文件';panel();try{const bytes=await blob.arrayBuffer();if(epoch!==mine)return;await write({name,at:record.at,type:blob.type,bytes});if(epoch===mine)status('已在本机暂存最近录音；设备清理或隐私模式可能删除，请另存文件')}catch(_){if(epoch===mine)status('本机暂存失败，当前页面仍可试听；请立即保存，关闭页面后可能丢失')}},
  download(){if(!take)return;const a=document.createElement('a');a.href=url;a.download=take.name;document.body.append(a);a.click();a.remove();status('已请求浏览器保存。若未出现下载，请点分享或打开音频；未确认系统已写入文件。')},
  async share(){if(!take)return;const f=new File([take.blob],take.name,{type:take.blob.type});try{if(navigator.share&&navigator.canShare?.({files:[f]})){await navigator.share({files:[f],title:'我的练琴录音'});status('已交给系统分享，请确认存储位置')}else status('此浏览器不支持文件分享，请点保存音频，或打开音频后使用Safari分享菜单。')}catch(e){status(e.name==='AbortError'?'已取消分享，录音仍保留':'分享未完成，请用保存音频或打开音频')}},
  async clear(){set(null);panel();try{await write(null)}catch(_){notice='录音暂存清理失败，请在浏览器站点存储中检查'}},
  has:()=>!!take,
 };
 const initialEpoch=epoch;db().then(d=>new Promise((resolve,reject)=>{const r=d.transaction('takes').objectStore('takes').get('last');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})).then(value=>{if(epoch!==initialEpoch||take)return;if(value?.bytes?.byteLength)value={name:value.name,at:value.at,blob:new Blob([value.bytes],{type:value.type})};if(value?.blob instanceof Blob){set(value);panel()}}).catch(()=>{});
 const parent=PGS.parent.render;PGS.parent.render=function(){parent();if(S._parentAuth)panel()};
 const follow=PGS.follow79.render;PGS.follow79.render=function(){follow();panel()};
})();
