/* One child-sized journey; no reward or storage reset. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function tools(){
  let bar=$('learningTools82');if(!bar){bar=document.createElement('div');bar.id='learningTools82';bar.setAttribute('aria-label','声音与护眼时间');document.querySelector('#app>.header').after(bar)}
  const eye=$('eyeBar'),sound=$('v41Sound');if(eye)bar.append(eye);if(sound)bar.append(sound);
  const dock=$('kidDock');if(dock&&dock.parentElement!==$('app'))$('app').append(dock);
 }
 const mount=v41MountSound;v41MountSound=function(){mount();tools()};
 const queued=playQueuedCue;playQueuedCue=function(){if(['pinyin','daily66','level'].includes(CP)){_queuedCue=null;return false}return queued()};
 const rootHome=PGS.home.render;
 PGS.home.render=function(){
  rootHome();const shell=document.querySelector('.g1-shell');if(!shell)return;
  const plan=shell.querySelector('.l66-plan'),top=shell.querySelector('.g1-top'),next=shell.querySelector('.g1-continue');
  if(top){top.querySelector('h1').textContent=(S._setup.name||'小朋友')+'，今天一起学！';top.querySelector('p').textContent='听一听、动手做，再试一题。做多少都算数。'}
  if(plan){plan.classList.remove('l66-folded');plan.querySelector('.l66-fold-btn')?.remove();plan.querySelector('header strong').textContent='🌈 今天的小冒险';plan.querySelector('header').after(plan.querySelector('.l66-primary'));if(top)top.after(plan);else shell.prepend(plan)}
  const extras=document.createElement('details');extras.className='v82-explore';extras.innerHTML='<summary>🧭 还有这些地方可以探索</summary><div class="v82-extra-grid"></div>';
  const box=extras.querySelector('div');for(const el of [next,shell.querySelector('.g1-review-alert'),shell.querySelector('.g1-map'),shell.querySelector('.r71-entry'),shell.querySelector('.f79-entry')])if(el)box.append(el);
  shell.append(extras);
  if(next){next.querySelector('strong').textContent='自由闯关 · '+next.querySelector('strong').textContent.replace(/^继续：/,'');next.querySelector('small').textContent='可以在今日计划之外继续探索'}
  const due=Object.values(G1Learning.game().reviewQueue||{}).filter(q=>q.dueAt<=Date.now()).length;
  if(due&&plan){const review=document.createElement('button');review.className='v82-review';review.textContent='📦 有 '+due+' 道到期复习 · 先练最多3道';review.onclick=()=>showPage('review');plan.prepend(review)}
 };
 const replies=['我喜欢和你待在一起！','摸摸头，好舒服呀！','谢谢你，小主人！','我们休息一下，再一起出发。'];
 function pet(){
  if(!S.dog)return showDogSelect();const d=PETS_V6[S.dog.type]||PETS_V6.labrador,stage=DST[dlv()],xp=S.dog.xp||0,progress=dpg();
  $('ct').innerHTML=`<main class="v82-pet-room"><header><button class="back" onclick="showPage('home')" aria-label="返回首页">←</button><div><h1>🐾 ${esc(d.n)}的伙伴小屋</h1><span>${esc(stage.n)} · 成长 ${xp}</span></div></header><section class="v82-pet-scene"><div id="dogDisp" class="v82-pet-display">${dogSVG(S.dog.type,240)}<div id="dogBub" class="dog-bubble" role="status"></div></div><div class="v82-growth"><span>🌱 ${progress}% · 学习完成后才会成长</span><progress max="100" value="${progress}" aria-label="伙伴成长进度"></progress></div></section><div class="v82-pet-meters">${[['🍖','饱腹','hu'],['🛁','清洁','hy'],['⚡','活力','en']].map(([i,n,k])=>`<span>${i} ${n} <b data-pet-stat="${k}">${S.dog[k]||0}</b></span>`).join('')}</div><div class="v82-pet-actions"><button onclick="Pet82.act('feed')"><span>🍖</span>喂食<small>15💎</small></button><button onclick="Pet82.act('pet')"><span>🤚</span>抚摸<small>免费陪伴</small></button><button onclick="Pet82.act('bath')"><span>🛁</span>洗澡<small>8💎</small></button></div><p class="v82-pet-status" id="pet82Status" role="status">摸摸伙伴，或者用学习赚来的钻石照顾它。</p></main>`;
 }
 let petBusy=false,petLast=-1;
 window.Pet82={act(kind){
  if(!S.dog||CP!=='dog'||_eyeMode||petBusy)return;const cost=kind==='feed'?15:kind==='bath'?8:0;
  if(S.pts<cost){$('pet82Status').textContent='还需要 '+cost+' 颗钻石，完成学习就能积攒。不着急，伙伴会等你。';showBubble('我会在这里等你，不着急！');return}
  if(cost){S.pts-=cost;const key=kind==='feed'?'hu':'hy';S.dog[key]=Math.min(100,(S.dog[key]||0)+(kind==='feed'?35:40))}
  // Affection is free. It never gives XP, diamonds or a completed lesson.
  petBusy=true;R();saveDog();up();document.querySelectorAll('[data-pet-stat]').forEach(e=>e.textContent=S.dog[e.dataset.petStat]||0);
  let group=kind==='feed'?0:kind==='bath'?2:1;v41PetReply(group,kind==='feed'?'feed':kind==='bath'?'bath':'pet');
  const text=kind==='feed'?'谢谢投喂，吃饱啦！':kind==='bath'?'洗得香香的，真舒服！':replies[(++petLast)%replies.length];
  $('pet82Status').textContent=text;setTimeout(()=>{petBusy=false},1000);
 },render:pet};
 PGS.dog={title:'🐾 伙伴小屋',render:pet};
 const page=showPage;showPage=function(id){window.__petSpeakEpoch=(window.__petSpeakEpoch||0)+1;const result=page(id);tools();$('hLogo').textContent='低年级每日学习搭子';document.body.dataset.route=CP;document.querySelector('#app>.main').scrollTop=0;return result};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)petBusy=false});
 tools();document.body.dataset.route=CP;document.documentElement.dataset.release='v84-pinyin-audit';
 if(CP==='home')PGS.home.render();
})();
