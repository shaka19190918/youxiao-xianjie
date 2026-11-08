/* Presentation only: retain the same tasks, IDs, gates and reward ledger. */
(()=>{'use strict';
 const base=PGS.home.render;
 PGS.home.render=function(){base();const shell=document.querySelector('.g1-shell');if(!shell)return;
  shell.classList.add('a86-home');const map=shell.querySelector('.g1-map'),extra=shell.querySelector('.v82-explore'),plan=shell.querySelector('.l66-plan');
  if(map){map.classList.add('a86-world');shell.append(map);map.querySelector('h2').textContent='🗺️ 成长岛 · 下一站去哪里？';map.querySelectorAll('.g1-region').forEach((b,i)=>b.style.setProperty('--island',i))}
  if(extra){extra.querySelector('summary').textContent='📚 绘本、跟弹与更多练习';shell.append(extra)}
  if(plan){plan.classList.add('a86-mission');const steps=plan.querySelector('.l66-subjects');steps.classList.add('a86-path');const names=['拼音','汉字','数学','英语','钢琴'],icons=['🔤','✍️','🔢','⛵','🎹'];steps.querySelectorAll('span').forEach((e,i)=>{e.innerHTML='<b>'+icons[i]+'</b><strong>'+names[i]+'</strong><small>'+(e.classList.contains('done')?'✓ 完成':i===4?'20分钟':(i+1)+'号脚印')+'</small>'});
   const current=L66.plan().items.find(x=>!x.done),primary=plan.querySelector('.l66-primary');if(current&&primary)primary.textContent=({pinyin:'🔤 去拼音岛',writing:'✍️ 去汉字岛',math:'🔢 去数学岛',english:'⛵ 去英语岛',piano:'🎹 去琴键岛'})[current.id]||'开始小冒险';
   const notes=plan.querySelectorAll(':scope>.l66-note');if(notes[0])notes[0].textContent='跟着脚印，听一听、做一做！';if(notes[1]){const d=document.createElement('details');d.className='a86-time';d.innerHTML='<summary>👀 学习10分钟 · 练琴20分钟，休息另计</summary>';d.append(notes[1]);plan.append(d)}
  }
 };
 if(CP==='home'&&S._setup.done)PGS.home.render();
})();
