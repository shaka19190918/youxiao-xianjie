/* 一年级成长岛 v61：国家平台全科目录、统一三星关卡、拼音审校与间隔复习。 */
(function(){
  'use strict';

  const DAY=86400000;
  const REVIEW_DELAYS=[600000,DAY,3*DAY,7*DAY,14*DAY];
  const REGION_META={
    start:{name:'起点广场',icon:'🏝️',desc:'和伙伴一起出发',need:0,color:'#ffd45c'},
    chinese:{name:'语文森林',icon:'🌳',desc:'拼音、识字、阅读和古诗',need:3,color:'#52bf78'},
    math:{name:'数学城堡',icon:'🏰',desc:'一年级上册、下册和时间拓展',need:3,color:'#49b8e8'},
    life:{name:'生活实践营',icon:'🌈',desc:'道德与法治、劳动和体育健康',need:12,color:'#f4a63d'},
    english:{name:'英语港湾',icon:'⛵',desc:'听标准英语，完成听辨',need:18,color:'#ff8b5d'},
    science:{name:'科学探索站',icon:'🔬',desc:'观察、实验、材料和生命',need:24,color:'#32b7a4'},
    arts:{name:'艺术剧场',icon:'🎨',desc:'音乐、美术和综合艺术',need:36,color:'#bd76e8'},
    thinking:{name:'思维山谷',icon:'🧩',desc:'规律、数独和专注挑战',need:48,color:'#7975e8'},
    interest:{name:'兴趣乐园',icon:'🎡',desc:'钢琴、科普和运动任务',need:60,color:'#ff6fae'}
  };
  const REGION_ORDER=['start','chinese','math','life','english','science','arts','thinking','interest'];
  let LEVELS=[],LEVEL_BY_ID={},g1CurrentRegion='start',g1ActiveLevelId='',g1Heard={},g1FocusExpected=1,g1PianoProgress=[],g1SportTimer=null,g1ReviewIds=[],g1RegionPages={};

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function shuffle(a,seed){const out=a.slice();let x=(seed||17)+out.length*13;for(let i=out.length-1;i>0;i--){x=(x*9301+49297)%233280;const j=x%(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
  function uniqueOptions(answer,pool,seed){return shuffle([answer,...pool.filter(x=>x!==answer)].filter((x,i,a)=>a.indexOf(x)===i).slice(0,4),seed)}
  function chunks(a,n){const r=[];for(let i=0;i<a.length;i+=n)r.push(a.slice(i,i+n));return r}
  function level(id,region,title,icon,tasks){return{id,region,title,icon,tasks:tasks.slice(0,3)}}
  function choice(id,label,prompt,options,answer,audio,key){return{id,label,prompt,options,answer,audio,key,type:'choice'}}
  function g1PinyinPath(x){return typeof pinyinPathV60==='function'?pinyinPathV60(x[1],x[0]):((typeof V46_PINYIN_AUDIO!=='undefined'&&V46_PINYIN_AUDIO[x[0]])||('assets/pinyin/'+x[1]+'.'+pinyinExtV42(x[1])))}
  function g1PinyinDemo(x){return typeof pinyinDemoV60==='function'?pinyinDemoV60(x[1],x[0]):x[0]}

  function buildLevels(){
    const out=[];
    out.push(level('start-1','start','伙伴启程','🚀',[
      choice('hello','听懂星','听一听，伙伴刚才在做什么？',['向你问好','说再见','要睡觉'],'向你问好','assets/voice/greeting_morning.mp3','start_hello'),
      choice('rule','实践星','怎样才能得到星星？',['完成真实任务','连续点按钮','跳过题目'],'完成真实任务','assets/voice/pet_play.mp3','start_rule'),
      choice('review','巩固星','答错以后，最好的做法是什么？',['再想一想并复习','把题目关掉','随便点一个'],'再想一想并复习','assets/voice/retry.mp3','start_review')
    ]));

    chunks(V42_TONES,3).forEach((grp,gi)=>out.push(level('zh-tone-'+(gi+1),'chinese','四声 '+(gi+1),'🎵',grp.map((x,i)=>choice('tone_'+x[1],i?'实践星':'听懂星','听完整真人音节，选出相同的带调拼音',uniqueOptions(x[0],V42_TONES.slice(Math.floor((gi*3+i)/4)*4,Math.floor((gi*3+i)/4)*4+4).map(v=>v[0]),gi*7+i),x[0],g1PinyinPath(x),'pinyin_'+x[1])))));
    const initials=V42_INITIALS.concat([['b','声母复习','bo1']]);
    chunks(initials,3).forEach((grp,gi)=>out.push(level('zh-initial-'+(gi+1),'chinese','声母 '+(gi+1),'🔤',grp.map((x,i)=>{const px=[x[0],x[2]];return choice('initial_'+gi+'_'+i,i?'实践星':'听懂星','听完整示范音节 '+g1PinyinDemo(px)+'，选出开头声母',uniqueOptions(x[0],V42_INITIALS.map(v=>v[0]),gi*11+i),x[0],g1PinyinPath(px),'pinyin_'+x[2])}))));
    chunks(V42_FINALS,3).forEach((grp,gi)=>out.push(level('zh-final-'+(gi+1),'chinese','韵母 '+(gi+1),'🗣️',grp.map((x,i)=>choice('final_'+x[1],i?'实践星':'听懂星','听完整示范音节 '+g1PinyinDemo(x)+'，选出其中的韵母或整体认读音节',uniqueOptions(x[0],V42_FINALS.map(v=>v[0]),gi*13+i),x[0],g1PinyinPath(x),'pinyin_'+x[1])))));
    chunks(V42_CHARS,3).forEach((grp,gi)=>out.push(level('zh-char-'+(gi+1),'chinese','识字描红 '+(gi+1),'✏️',grp.map((x,i)=>({id:'char_'+x[0],label:i?'实践星':'听懂星',prompt:'听一听，再按正确笔顺写“'+x[0]+'”',type:'trace',char:x[0],pinyin:x[1],audio:v42CharPath(x[0]),key:'char_'+x[0]})))));
    chunks(V42_READINGS,3).forEach((grp,gi)=>out.push(level('zh-read-'+(gi+1),'chinese','阅读理解 '+(gi+1),'📖',grp.map((q,i)=>choice('read_'+(gi*3+i),i?'实践星':'听懂星',q.q,q.o,q.a,'assets/reading/reading_'+String(gi*3+i+1).padStart(2,'0')+'.mp3','read_'+(gi*3+i))))));
    POEM_COURSE_V6.forEach((p,pi)=>{
      const titles=POEM_COURSE_V6.map(x=>x.ti),authors=POEM_COURSE_V6.map(x=>x.au),lines=POEM_COURSE_V6.flatMap(x=>x.lns);
      out.push(level('zh-poem-'+(pi+1),'chinese',p.ti,'📜',[
        choice(p.key+'_title','听懂星','听一听，这是哪一首诗？',uniqueOptions(p.ti,titles,pi+2),p.ti,'assets/voice/'+p.key+'_info.mp3','poem_'+p.key+'_title'),
        choice(p.key+'_line','实践星','哪一句属于《'+p.ti+'》？',uniqueOptions(p.lns[0],lines,pi+21),p.lns[0],'assets/voice/'+p.key+'_l1'+(p.key==='poem_yong_e'?'.wav':'.mp3'),'poem_'+p.key+'_line'),
        choice(p.key+'_author','巩固星','《'+p.ti+'》的作者是谁？',uniqueOptions(p.au,authors,pi+41),p.au,'assets/voice/'+p.key+'_info.mp3','poem_'+p.key+'_author')
      ]));
    });
    const tb=V43_TEXTBOOK.flatMap((u,ui)=>u.items.map((x,i)=>({x,ui,i,unit:u.name})));
    chunks(tb,3).forEach((grp,gi)=>{
      const tasks=grp.map((e,i)=>{
        const key=e.key||(e.ui+'_'+e.i);
        const audio=typeof textbookAudioPathV60==='function'
          ?textbookAudioPathV60(e.ui,e.i)
          :'assets/textbook/tb_'+String(e.ui).padStart(2,'0')+'_'+String(e.i+1).padStart(2,'0')+'.mp3';
        return choice('tb_'+key,i?'实践星':'听懂星','听一听，“'+e.x[0]+'”主要学什么？',uniqueOptions(e.x[1],tb.map(z=>z.x[1]),gi*17+i),e.x[1],audio,'textbook_'+key);
      });
      out.push(level('zh-book-'+(gi+1),'chinese','教材路线 '+(gi+1),'📘',tasks));
    });

    V44_MATHBOOK.forEach((u,ui)=>chunks(V44_MATH.filter(q=>q.unit===ui),3).forEach((grp,part)=>out.push(level('math-up-'+ui+'-'+part,'math',u.name+(part?' · 巩固':' · 基础'),u.icon,grp.map((q,i)=>choice('math44_'+q.id,i?'实践星':'听懂星',q.q,q.o,q.a,'assets/math-v44/question_'+String(q.id).padStart(2,'0')+'.mp3','math44_'+q.id))))));
    V45_MATHBOOK_LOWER.forEach((u,ui)=>chunks(V45_MATH_LOWER.filter(q=>q.unit===ui),3).forEach((grp,part)=>out.push(level('math-low-'+ui+'-'+part,'math',u.name+(part?' · 巩固':' · 基础'),u.icon,grp.map((q,i)=>choice('math45_'+q.id,i?'实践星':'听懂星',q.q,q.o,q.a,'assets/math-v45-lower/question_'+String(q.id).padStart(2,'0')+'.mp3','math45l_'+q.id))))));
    chunks(V45_TIME,3).forEach((grp,gi)=>out.push(level('math-time-'+(gi+1),'math','课外时间拓展 '+(gi+1),'⏰',grp.map((q,i)=>choice('time45_'+q.id,i?'实践星':'听懂星',q.q,q.o,q.a,'assets/time-v45/question_'+String(q.id).padStart(2,'0')+'.mp3','time45_'+q.id)))));

    const allCn=V44_ENGLISH.flatMap(u=>u.items.map(x=>x[2]));
    V44_ENGLISH.forEach((u,ui)=>out.push(level('english-'+(ui+1),'english',u.name,'⛵',u.items.slice(0,3).map((x,i)=>choice('en_'+ui+'_'+i,i?'实践星':'听懂星','听一听，选出中文意思',uniqueOptions(x[2],allCn,ui*9+i),x[2],'assets/english-v44/u'+String(ui+1).padStart(2,'0')+'_'+String(i+1).padStart(2,'0')+'.mp3','english44_'+ui+'_'+i)))));

    const think=V42_MATH.filter(q=>['规律逻辑','图形空间','测量分类'].includes(q.cat)).slice(0,9);
    chunks(think,3).forEach((grp,gi)=>out.push(level('think-'+(gi+1),'thinking',['找规律','空间方向','分类挑战'][gi]||'思维挑战','🧩',grp.map((q,i)=>choice('think_'+q.id,i?'实践星':'听懂星',q.q,q.o,q.a,'assets/math-v42/question_'+String(q.id).padStart(2,'0')+'.mp3','think_'+q.id)))));
    out.push(level('think-focus','thinking','专注力九宫格','🎯',[0,1,2].map((_,i)=>({id:'focus_'+i,label:i?'实践星':'听懂星',prompt:'从 1 到 9，按顺序全部点完',type:'focus',seed:i+3,key:'focus_'+i}))));
    const sudokuOpts=[['第1行缺少哪个数？',['1','2','3','4'],'4'],['第2列缺少哪个数？',['1','2','3','4'],'2'],['最后一格应该填几？',['1','2','3','4'],'3']];
    out.push(level('think-sudoku','thinking','四宫数独','🧮',sudokuOpts.map((x,i)=>choice('sudoku_'+i,i?'实践星':'听懂星',x[0],x[1],x[2],'assets/voice/correct.mp3','sudoku_'+i))));

    out.push(level('interest-piano','interest','小钢琴','🎹',[[0,1,2],[2,1,0],[0,2,1]].map((seq,i)=>({id:'piano_'+i,label:i?'实践星':'听懂星',prompt:'按顺序弹出 '+seq.map(n=>['Do','Re','Mi'][n]).join(' · '),type:'piano',seq,key:'piano_'+i}))));
    const science=[['植物生长最需要哪一种自然条件？',['阳光','玩具','电视','糖果'],'阳光'],['下雨时，哪一种物品能帮我们挡雨？',['雨伞','铅笔','积木','皮球'],'雨伞'],['看到电源插座，正确做法是什么？',['不触碰并告诉大人','用手试一试','塞进小玩具','泼一点水'],'不触碰并告诉大人']];
    out.push(level('interest-science','interest','生活科普','🔬',science.map((x,i)=>choice('science_'+i,i?'实践星':'听懂星',x[0],x[1],x[2],'assets/voice/correct.mp3','science_'+i))));
    out.push(level('interest-sport','interest','运动任务','🤸',['开合跳','高抬腿','原地踏步'].map((name,i)=>({id:'sport_'+i,label:i?'实践星':'听懂星',prompt:'跟着计时完成：'+name,type:'sport',seconds:10,key:'sport_'+i}))));

    // 新增学科采用同一套可验证的三星闭环。语文、数学、英语继续使用上面的专项题库。
    if(typeof CURRICULUM_MANIFEST_V1!=='undefined'){
      const existing=new Set(['chinese','math','english']);
      CURRICULUM_MANIFEST_V1.subjects.filter(s=>!existing.has(s.id)).forEach((s,si)=>{
        const subjectActivities=s.terms.flatMap(t=>t.units.map(u=>u.activity)).filter(Boolean);
        s.terms.forEach((t,ti)=>{
          const unitNames=t.units.map(u=>u.name);
          t.units.forEach((u,ui)=>{
            if(!u.check||!u.activity)return;
            const prefix='curr-'+s.id+'-'+t.id+'-'+ui;
            const audio=n=>'assets/curriculum-v61/'+s.id+'-'+t.id+'-'+String(ui+1).padStart(2,'0')+'-'+n+'.mp3';
            out.push(level(prefix,s.region,u.name,s.icon,[
              choice(prefix+'-listen','听懂星','听一听，本关学习的是哪个单元？',uniqueOptions(u.name,unitNames,si*101+ti*19+ui),u.name,audio(1),prefix+'-listen'),
              choice(prefix+'-practice','实践星','哪一项活动属于本关的真实学习任务？',uniqueOptions(u.activity,subjectActivities,si*109+ti*23+ui),u.activity,audio(2),prefix+'-practice'),
              choice(prefix+'-check','巩固星',u.check.q,u.check.o,u.check.a,audio(3),prefix+'-check')
            ]));
          });
        });
      });
    }
    return out;
  }

  function game(){
    S.game=Object.assign({levels:{},reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'start-1'},S.game||{});
    S.game.levels=S.game.levels||{};S.game.reviewQueue=S.game.reviewQueue||{};S.game.rewardLedger=S.game.rewardLedger||{};S.game.petResponseHistory=S.game.petResponseHistory||[];
    return S.game;
  }
  function levelState(id){const g=game();return g.levels[id]||(g.levels[id]={stars:0,tasks:[false,false,false],wrong:0,attempts:0})}
  function totalStars(){return Object.values(game().levels).reduce((n,x)=>n+(x.stars||0),0)}
  function regionLevels(id){return LEVELS.filter(x=>x.region===id)}
  function regionUnlocked(id){return totalStars()>=(REGION_META[id]?.need||0)}
  function levelUnlocked(id){const l=LEVEL_BY_ID[id];if(!l||!regionUnlocked(l.region))return false;const list=regionLevels(l.region),i=list.findIndex(x=>x.id===id);return i<=0||levelState(list[i-1].id).stars===3}
  function regionDone(id){const ls=regionLevels(id);return ls.length&&ls.every(x=>levelState(x.id).stars===3)}
  function dueReviews(now){const t=now??Date.now();return Object.entries(game().reviewQueue).filter(([,x])=>Number(x.dueAt)<=t).sort((a,b)=>a[1].dueAt-b[1].dueAt)}
  function nextLevel(){
    const active=LEVEL_BY_ID[game().activeLevel];if(active&&levelUnlocked(active.id)&&levelState(active.id).stars<3)return active;
    for(const region of REGION_ORDER){if(!regionUnlocked(region))continue;const found=regionLevels(region).find(x=>levelUnlocked(x.id)&&levelState(x.id).stars<3);if(found)return found}
    return null;
  }
  function labelForTask(i){return ['听懂星','实践星','巩固星'][i]}
  function taskAt(){const l=LEVEL_BY_ID[g1ActiveLevelId],s=l&&levelState(l.id),i=s?s.tasks.findIndex(x=>!x):-1;return l&&i>=0?{level:l,state:s,index:i,task:l.tasks[i]}:null}
  function sourceMark(key,ok){if(!key)return;try{v42Mark(key,ok)}catch(_){} }
  function scheduleReview(l,t){
    if(!t||t.type!=='choice')return;
    const id=l.id+'::'+t.id,g=game(),old=g.reviewQueue[id]||{};
    g.reviewQueue[id]={id,levelId:l.id,title:l.title,task:{id:t.id,prompt:t.prompt,options:t.options,answer:t.answer,audio:t.audio,key:t.key,type:'choice'},step:0,dueAt:Date.now()+REVIEW_DELAYS[0],lapses:(old.lapses||0)+1,lastResult:'wrong'};
    R();
  }
  function awardTask(l,i){
    const s=levelState(l.id),g=game(),key=l.id+':star:'+i;if(s.tasks[i])return false;
    s.tasks[i]=true;s.stars=s.tasks.filter(Boolean).length;s.attempts=(s.attempts||0)+1;
    if(!g.rewardLedger[key]){g.rewardLedger[key]=Date.now();S.pts=(S.pts||0)+3}
    if(s.stars===3&&!s.completedAt){s.completedAt=Date.now();g.rewardLedger[l.id+':complete']=s.completedAt;if(S.dog){const old=dlv();S.dog.xp=(S.dog.xp||0)+12;S.dog.tasks=(S.dog.tasks||0)+1;S.dog.en=Math.min(100,(S.dog.en||0)+8);if(dlv()>old)setTimeout(()=>toast('伙伴升级啦！'),400)}const list=regionLevels(l.region),idx=list.findIndex(x=>x.id===l.id),next=list[idx+1];g.activeLevel=next?next.id:(nextLevel()?.id||l.id)}
    R();saveDog();up();starPetPulse(l,i);return true;
  }
  function starPetPulse(l,i){
    if(!S.dog||document.querySelector('.g1-star-pet'))return;
    const pet=PETS_V6[S.dog.type]||PETS_V6.labrador,el=document.createElement('div');el.className='g1-star-pet';
    el.innerHTML=`${petImageV6(S.dog.type,64,false)}<span><b>得到第 ${i+1} 颗星！</b><small>${pet.n}也开心地跳起来</small></span>`;
    document.body.appendChild(el);setTimeout(()=>el.remove(),1450);
  }
  function petReply(l){
    if(!S.dog||typeof SPEECH_DATA==='undefined')return;
    const pool=SPEECH_DATA[3][1],g=game(),recent=g.petResponseHistory.slice(-3),offset=Math.max(0,REGION_ORDER.indexOf(l?.region))*3,ordered=pool.map((_,n)=>(offset+n)%pool.length),available=ordered.filter(id=>!recent.includes(id)),id=available[0]??0,pick={text:pool[id],id};
    g.petResponseHistory.push(pick.id);g.petResponseHistory=g.petResponseHistory.slice(-3);R();
    setTimeout(()=>speakPet(pick.text),250);
    return {text:pick.text,action:(l&&({chinese:'wag',math:'bounce',life:'heart',english:'sway',science:'look',arts:'dance',thinking:'spin',interest:'bounce'}[l.region]))||'wag'};
  }

  function warmRegion(id){const assets=regionLevels(id).slice(0,2).flatMap(l=>l.tasks.map(t=>t.audio).filter(Boolean));try{navigator.serviceWorker?.ready.then(reg=>(reg.active||navigator.serviceWorker.controller)?.postMessage({type:'prewarm-assets',assets}))}catch(_){}}
  window.g1OpenRegion=function(id){if(!regionUnlocked(id))return toast('再收集一些星星，就能来这里');g1CurrentRegion=id;warmRegion(id);showPage('region')};
  window.g1RegionPage=function(delta){const ls=regionLevels(g1CurrentRegion),max=Math.max(0,Math.ceil(ls.length/8)-1),current=Number(g1RegionPages[g1CurrentRegion]||0);g1RegionPages[g1CurrentRegion]=Math.max(0,Math.min(max,current+delta));PGS.region.render();window.scrollTo(0,0)};
  window.g1StartLevel=function(id){if(!levelUnlocked(id))return toast('先完成前一关');g1ActiveLevelId=id;game().activeLevel=id;g1Heard={};R();showPage('level')};
  window.g1StartCurriculumLevel=function(subjectId,termId,unitIndex){
    if(['chinese','math','english'].includes(subjectId))return false;
    const id='curr-'+subjectId+'-'+termId+'-'+unitIndex,l=LEVEL_BY_ID[id];if(!l)return false;
    if(!regionUnlocked(l.region)){toast('先在成长地图收集 '+REGION_META[l.region].need+' 颗星');g1CurrentRegion=l.region;showPage('home');return true}
    if(!levelUnlocked(id)){toast('请先完成这个区域前面的关卡');g1CurrentRegion=l.region;showPage('region');return true}
    g1StartLevel(id);return true;
  };
  window.g1Continue=function(){if(dueReviews().length)return showPage('review');const n=nextLevel();if(n)g1StartLevel(n.id);else toast('所有关卡都完成啦！')};
  window.g1PlayTaskAudio=function(){
    const cur=taskAt();if(!cur||!cur.task.audio)return;
    const btn=document.getElementById('g1Listen'),fb=document.getElementById('g1Feedback');if(btn){btn.disabled=true;btn.textContent='正在听题目和选项…'}
    v46StopAudio();try{const a=new Audio(cur.task.audio);a.preload='auto';v46ActiveAudio=a;a.onended=()=>{g1Heard[cur.level.id+'-'+cur.index]=true;if(btn){btn.disabled=false;btn.classList.add('ready');btn.textContent='✅ 题目和选项已听完'}if(fb)fb.textContent='听完啦，现在选答案'};a.onerror=()=>{if(btn){btn.disabled=false;btn.textContent='🔁 音频没有加载，请重试'}if(fb)fb.textContent='没有听清前不能得星';};const p=a.play();if(p&&p.catch)p.catch(()=>a.onerror())}catch(_){if(btn){btn.disabled=false;btn.textContent='🔁 音频没有加载，请重试'}}
  };
  window.g1AnswerTask=function(optionIndex){
    const cur=taskAt();if(!cur||cur.task.type!=='choice')return;const heard=!cur.task.audio||g1Heard[cur.level.id+'-'+cur.index];if(!heard){toast('先完整听一遍，再来作答');return}
    const val=cur.task.options[optionIndex],buttons=[...document.querySelectorAll('.g1-answer')],fb=document.getElementById('g1Feedback');
    if(val!==cur.task.answer){buttons[optionIndex]?.classList.add('wrong');buttons[optionIndex]&&(buttons[optionIndex].disabled=true);cur.state.wrong=(cur.state.wrong||0)+1;sourceMark(cur.task.key,false);scheduleReview(cur.level,cur.task);if(fb)fb.textContent='再想一想，这道题已经放进复习站';playCue('retry','');R();return}
    buttons.forEach(b=>b.disabled=true);sourceMark(cur.task.key,true);if(fb)fb.textContent='答对啦，得到一颗星！';awardTask(cur.level,cur.index);playCue('correct','');setTimeout(()=>{if(levelState(cur.level.id).stars===3)g1ShowCelebration(cur.level);else PGS.level.render()},650);
  };
  window.g1BeginTrace=function(){const cur=taskAt();if(!cur||cur.task.type!=='trace')return;if(cur.task.audio&&!g1Heard[cur.level.id+'-'+cur.index])return toast('先听完这个字，再去描红');window.G1_TRACE_CONTEXT={levelId:cur.level.id,index:cur.index,task:cur.task};openTraceV42(cur.task.char,cur.task.pinyin)};
  window.g1FocusStart=function(){
    const cur=taskAt();if(!cur||cur.task.type!=='focus')return;g1FocusExpected=1;const nums=shuffle([1,2,3,4,5,6,7,8,9],cur.task.seed);document.getElementById('g1TaskBody').innerHTML=`<p class="g1-task-tip">从 1 开始，按顺序点到 9</p><div class="g1-focus-grid">${nums.map(n=>`<button onclick="g1FocusTap(${n},this)">${n}</button>`).join('')}</div><div class="g1-feedback" id="g1Feedback">请先点 1</div>`;
  };
  window.g1FocusTap=function(n,el){const fb=document.getElementById('g1Feedback');if(n!==g1FocusExpected){if(fb)fb.textContent='应该找数字 '+g1FocusExpected;return}el.classList.add('done');el.disabled=true;g1FocusExpected++;if(g1FocusExpected===10){const cur=taskAt();awardTask(cur.level,cur.index);if(fb)fb.textContent='全部找对，得到一颗星！';setTimeout(()=>levelState(cur.level.id).stars===3?g1ShowCelebration(cur.level):PGS.level.render(),600)}};
  function pianoTone(n){try{const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=[261.63,293.66,329.63][n];o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(.25,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.45);o.start();o.stop(ctx.currentTime+.45)}catch(_){}}
  window.g1PianoTap=function(n){const cur=taskAt();if(!cur||cur.task.type!=='piano')return;pianoTone(n);const want=cur.task.seq[g1PianoProgress.length],fb=document.getElementById('g1Feedback');if(n!==want){g1PianoProgress=[];if(fb)fb.textContent='顺序不对，重新从第一个音开始';return}g1PianoProgress.push(n);if(fb)fb.textContent='正确 '+g1PianoProgress.length+' / '+cur.task.seq.length;if(g1PianoProgress.length===cur.task.seq.length){awardTask(cur.level,cur.index);setTimeout(()=>levelState(cur.level.id).stars===3?g1ShowCelebration(cur.level):PGS.level.render(),650)}};
  window.g1SportStart=function(){
    const cur=taskAt();if(!cur||cur.task.type!=='sport'||g1SportTimer)return;let left=cur.task.seconds||10;const host=document.getElementById('g1TaskBody');host.innerHTML=`<div class="g1-sport-timer" id="g1SportClock">${left}</div><p class="g1-task-tip">认真完成动作，计时结束后请家长确认</p>`;g1SportTimer=setInterval(()=>{left--;const c=document.getElementById('g1SportClock');if(c)c.textContent=left;if(left<=0){clearInterval(g1SportTimer);g1SportTimer=null;host.innerHTML=`<p class="g1-task-tip">家长看到了真实完成，请输入家长PIN</p><input class="g1-pin" id="g1SportPin" inputmode="numeric" maxlength="4" aria-label="家长PIN"><button class="g1-next-task" style="width:100%;margin-top:12px" onclick="g1SportConfirm()">家长确认完成</button><div class="g1-feedback" id="g1Feedback"></div>`}},1000);
  };
  window.g1SportConfirm=function(){const cur=taskAt(),pin=document.getElementById('g1SportPin')?.value,fb=document.getElementById('g1Feedback');if(pin!==S.parentPin){if(fb)fb.textContent='PIN不正确，请家长重新输入';return}awardTask(cur.level,cur.index);if(fb)fb.textContent='家长已确认，得到一颗星！';setTimeout(()=>levelState(cur.level.id).stars===3?g1ShowCelebration(cur.level):PGS.level.render(),650)};

  function renderTask(cur){
    const t=cur.task,starLabel=labelForTask(cur.index),heard=g1Heard[cur.level.id+'-'+cur.index];let body='';
    if(t.type==='choice')body=`${t.audio?`<button class="g1-listen ${heard?'ready':''}" id="g1Listen" onclick="g1PlayTaskAudio()">${heard?'✅ 题目和选项已听完':'🔊 听题目和全部选项'}</button>`:''}<div class="g1-answers">${t.options.map((x,i)=>`<button class="g1-answer" onclick="g1AnswerTask(${i})">${esc(x)}</button>`).join('')}</div>`;
    else if(t.type==='trace')body=`<button class="g1-listen ${heard?'ready':''}" id="g1Listen" onclick="g1PlayTaskAudio()">${heard?'✅ 已听完，可以描红':'🔊 先听这个字'}</button><button class="g1-next-task" style="width:100%" onclick="g1BeginTrace()">✏️ 打开田字格描红</button>`;
    else if(t.type==='focus')body=`<button class="g1-next-task" style="width:100%" onclick="g1FocusStart()">🎯 开始九宫格</button>`;
    else if(t.type==='piano'){g1PianoProgress=[];body=`<p class="g1-task-tip">目标：${esc(t.seq.map(n=>['Do','Re','Mi'][n]).join(' · '))}</p><div class="g1-piano-keys">${['Do','Re','Mi'].map((x,i)=>`<button onclick="g1PianoTap(${i})">${x}</button>`).join('')}</div>`}
    else if(t.type==='sport')body=`<button class="g1-next-task" style="width:100%" onclick="g1SportStart()">⏱️ 开始计时</button>`;
    return `<div class="g1-task-tag">${starLabel} · 第 ${cur.index+1} 个任务</div><h3>${esc(t.prompt)}</h3><div id="g1TaskBody">${body}</div><div class="g1-feedback" id="g1Feedback">${t.audio&&!heard?'听完再回答，不能跳过':'认真完成就能得到星星'}</div>`;
  }
  function renderStars(s){return [0,1,2].map(i=>`<span class="g1-star ${s.tasks[i]?'on':''}">${s.tasks[i]?'★':'☆'}</span>`).join('')}

  PGS.home={title:'一年级成长岛',render:function(){
    const stars=totalStars(),due=dueReviews().length,next=nextLevel(),pet=S.dog?(PETS_V6[S.dog.type]||PETS_V6.labrador):null;
    document.getElementById('ct').innerHTML=`<main class="g1-shell"><section class="g1-top"><div><h1>${esc(S._setup.name||'小朋友')}，出发闯关吧！</h1><p>做真实任务，和伙伴一起长大</p></div><div class="g1-score"><span>⭐ ${stars}</span><span>💎 ${S.pts||0}</span></div></section><button class="g1-continue" onclick="g1Continue()"><span class="ico">${due?'📦':(next?.icon||'🏆')}</span><span><strong>${due?'先复习 '+due+' 道错题':(next?'继续：'+next.title:'全部通关')}</strong><small>${due?'复习完成再去探索':'每关三个真实任务'}</small></span><span class="arrow">›</span></button>${due?`<button class="g1-review-alert" onclick="showPage('review')">📦 到期复习<b>${due}</b></button>`:''}<section class="g1-map"><div class="g1-map-title"><h2>🗺️ 成长地图</h2><span>已收集 ${stars} 星</span></div><div class="g1-region-list">${REGION_ORDER.map(id=>{const r=REGION_META[id],open=regionUnlocked(id),done=regionDone(id),count=regionLevels(id).filter(x=>levelState(x.id).stars===3).length,total=regionLevels(id).length;return `<button class="g1-region ${open?'':'locked'} ${done?'complete':''}" style="--region-color:${r.color}" onclick="g1OpenRegion('${id}')"><span class="ri">${open?r.icon:'🔒'}</span><span><strong>${r.name}</strong><small>${open?`${count} / ${total} 关完成`:r.desc}</small>${open?'':`<span class="lock">需要 ${r.need} 星</span>`}</span></button>`}).join('')}</div></section>${pet?`<section class="g1-pet-strip"><div>${petImageV6(S.dog.type,88,false)}</div><div><strong>${pet.n}陪你闯关</strong><small>${DST[dlv()].n} · 成长值 ${S.dog.xp||0}</small></div><button onclick="showPage('dog')" aria-label="去看伙伴">🐾</button></section>`:''}</main>`;
  }};
  PGS.region={title:'🗺️ 区域关卡',render:function(){const r=REGION_META[g1CurrentRegion]||REGION_META.start,ls=regionLevels(g1CurrentRegion),done=ls.filter(x=>levelState(x.id).stars===3).length,first=Math.max(0,ls.findIndex(x=>levelState(x.id).stars<3)),suggested=Math.floor(first/8),page=Number.isInteger(g1RegionPages[g1CurrentRegion])?g1RegionPages[g1CurrentRegion]:suggested,max=Math.max(0,Math.ceil(ls.length/8)-1),start=page*8,shown=ls.slice(start,start+8);g1RegionPages[g1CurrentRegion]=Math.min(page,max);document.getElementById('ct').innerHTML=`<main class="g1-region-page"><header class="g1-page-head"><button class="g1-back" onclick="showPage('home')" aria-label="返回地图">←</button><div><h1>${r.icon} ${r.name}</h1><p>${r.desc}</p></div></header><section class="g1-region-progress"><div><strong>${done} / ${ls.length} 关</strong><span>当前小节 ${page+1} / ${max+1}</span></div><i><b style="width:${ls.length?Math.round(done/ls.length*100):0}%"></b></i></section><section class="g1-level-list">${shown.map((l,j)=>{const i=start+j,s=levelState(l.id),open=levelUnlocked(l.id);return `<button class="g1-level-card ${open?'':'locked'} ${s.stars&&s.stars<3?'current':''}" onclick="g1StartLevel('${l.id}')"><span class="num">${open?i+1:'🔒'}</span><span class="stars">${'★'.repeat(s.stars)}${'☆'.repeat(3-s.stars)}</span><strong>${esc(l.title)}</strong><small>${open?(s.stars===3?'已通关':'完成三个任务'):'先完成前一关'}</small></button>`}).join('')}</section>${max?`<nav class="g1-pager" aria-label="关卡分段"><button onclick="g1RegionPage(-1)" ${page===0?'disabled':''}>← 上一小节</button><span>${start+1}—${Math.min(start+8,ls.length)}</span><button onclick="g1RegionPage(1)" ${page===max?'disabled':''}>下一小节 →</button></nav>`:''}</main>`}};
  PGS.adventure={title:'⭐ 继续闯关',render:function(){const n=nextLevel();if(n){g1ActiveLevelId=n.id;PGS.level.render()}else PGS.home.render()}};
  PGS.level={title:'⭐ 三星闯关',render:function(){
    const l=LEVEL_BY_ID[g1ActiveLevelId]||nextLevel();if(!l)return PGS.home.render();g1ActiveLevelId=l.id;const s=levelState(l.id),cur=taskAt();document.getElementById('ct').innerHTML=`<main class="g1-level-page"><header class="g1-page-head"><button class="g1-back" onclick="g1CurrentRegion='${l.region}';showPage('region')" aria-label="返回关卡列表">←</button><div><h1>${l.icon} ${esc(l.title)}</h1><p>${REGION_META[l.region].name}</p></div></header><section class="g1-level-hero"><div class="g1-level-hero-top"><h2>收集三星</h2><strong>${s.stars} / 3</strong></div><div class="g1-star-track">${renderStars(s)}</div></section><section class="g1-task">${cur?renderTask(cur):`<div class="g1-task-done"><div class="big">🎉</div><h3>三星通关！</h3><button class="g1-next-task" onclick="g1ShowCelebration(LEVEL_BY_ID['${l.id}'])">看看伙伴</button></div>`}</section></main>`;
  }};
  window.g1ShowCelebration=function(l){if(!l)return;document.getElementById('g1Celebrate')?.remove();const pet=S.dog?(PETS_V6[S.dog.type]||PETS_V6.labrador):null,next=nextLevel(),reply=petReply(l),wrap=document.createElement('div');wrap.id='g1Celebrate';wrap.className='g1-celebrate';wrap.innerHTML=`<div class="g1-celebrate-card"><div class="stars">★★★</div><div class="g1-pet-action ${reply?.action||'wag'}">${pet?petImageV6(S.dog.type,180,false):'<div style="font-size:90px">🏆</div>'}</div><h2>三星通关！</h2><p>${reply?esc(reply.text):(pet?pet.n+'为你欢呼！':'你完成了三个真实任务！')}<br>${next?'下一关已经准备好啦。':'整座成长岛都被你点亮啦！'}</p><div class="g1-celebrate-actions"><button onclick="document.getElementById('g1Celebrate').remove();showPage('review')">📦 复习站</button><button onclick="document.getElementById('g1Celebrate').remove();showPage('home')">🗺️ 看新地图</button></div></div>`;document.body.appendChild(wrap)};

  function renderReviewQuestion(entry){const q=entry[1],t=q.task;return `<div class="g1-task-tag">间隔复习 · ${esc(q.title)}</div><h3>${esc(t.prompt)}</h3>${t.audio?`<button class="g1-listen" onclick="g1PlayReviewAudio('${esc(entry[0])}')">🔊 听一遍</button>`:''}<div class="g1-answers">${t.options.map((x,i)=>`<button class="g1-answer" onclick="g1AnswerReview('${esc(entry[0])}',${i},this)">${esc(x)}</button>`).join('')}</div><div class="g1-feedback" id="g1Feedback">答对后会安排下一次复习</div>`}
  window.g1PlayReviewAudio=function(id){const q=game().reviewQueue[id];if(!q?.task.audio)return;v42Play(q.task.audio,'复习音频没有加载，请重试')};
  window.g1AnswerReview=function(id,i,el){const g=game(),q=g.reviewQueue[id];if(!q)return;const t=q.task,fb=document.getElementById('g1Feedback');if(t.options[i]!==t.answer){el.classList.add('wrong');el.disabled=true;q.step=0;q.dueAt=Date.now()+REVIEW_DELAYS[0];q.lapses=(q.lapses||0)+1;q.lastResult='wrong';sourceMark(t.key,false);R();if(fb)fb.textContent='没关系，10分钟后再来一次';playCue('retry','');return}sourceMark(t.key,true);q.lastResult='correct';q.lastReviewedAt=Date.now();if(q.step>=4){delete g.reviewQueue[id];toast('这道题已经记牢啦！')}else{q.step=(q.step||0)+1;q.dueAt=Date.now()+REVIEW_DELAYS[q.step];toast('答对啦，复习间隔变长了！')}R();playCue('correct','');setTimeout(()=>showPage('review'),650)};
  PGS.review={title:'📦 错题复习站',render:function(){const all=Object.entries(game().reviewQueue).sort((a,b)=>a[1].dueAt-b[1].dueAt),due=all.filter(([,x])=>x.dueAt<=Date.now()).slice(0,3);g1ReviewIds=due.map(x=>x[0]);let body;if(due.length)body=`<section class="g1-review-card">${renderReviewQuestion(due[0])}</section><p class="g1-task-tip" style="text-align:center">本次最多复习3道 · 还有 ${due.length-1} 道已到期</p>`;else{const next=all[0];body=`<section class="g1-empty"><div class="em">${next?'⏳':'🌟'}</div><h2>${next?'现在先去闯关吧':'今天没有错题'}</h2><p>${next?'下一次复习：'+new Date(next[1].dueAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'认真思考，继续保持！'}</p><button class="g1-next-task" onclick="g1Continue()">继续闯关</button></section>`}document.getElementById('ct').innerHTML=`<main class="g1-review-page"><header class="g1-page-head"><button class="g1-back" onclick="showPage('home')" aria-label="返回地图">←</button><div><h1>📦 错题复习站</h1><p>10分钟、1天、3天、7天、14天再见</p></div></header>${body}</main>`}};

  const oldStartHQ=startHQ;
  startHQ=function(){
    const ctx=window.G1_TRACE_CONTEXT;if(!ctx||!_hw)return oldStartHQ();let mistakes=0;document.getElementById('hwFb').textContent='请按正确笔顺和方向书写';_hw.quiz({onMistake:()=>{mistakes++;document.getElementById('hwFb').textContent='方向、笔顺或位置不对，请调整'},onCorrectStroke:()=>{document.getElementById('hwFb').textContent='这一笔正确，继续'},onComplete:s=>{const score=Math.max(0,100-Math.max(mistakes,s.totalMistakes||0)*12),l=LEVEL_BY_ID[ctx.levelId];if(score<65){levelState(l.id).wrong++;const reviewTask=choice('char_review_'+ctx.task.char,'复习','听一听，选出刚才练习的字',uniqueOptions(ctx.task.char,V42_CHARS.map(x=>x[0]),ctx.task.char.codePointAt(0)),ctx.task.char,ctx.task.audio,ctx.task.key);scheduleReview(l,reviewTask);sourceMark(ctx.task.key,false);document.getElementById('hwFb').innerHTML='得分 <b>'+score+'</b>：低于65分，请按笔顺重写';playCue('trace_retry','');setTimeout(()=>resetHW(),900);return}S.chars[ctx.task.char]=true;sourceMark(ctx.task.key,true);awardTask(l,ctx.index);document.getElementById('hwFb').innerHTML='✅ 得分 <b>'+score+'</b>，得到一颗星！';playCue('trace_pass','');window.G1_TRACE_CONTEXT=null;setTimeout(()=>{clHW();levelState(l.id).stars===3?g1ShowCelebration(l):PGS.level.render()},850)}})
  };
  const oldClHW=clHW;clHW=function(){window.G1_TRACE_CONTEXT=null;oldClHW()};

  awd=function(){toast('练习已记录；钻石只从三星闯关获得');return false};
  window.v41LearnedToday=function(){const today=T();return Object.values(game().levels).some(x=>x.completedAt&&new Date(x.completedAt).toISOString().slice(0,10)===today)};
  advDog=function(){};

  const oldParentRender=PGS.parent.render;
  PGS.parent.render=function(){oldParentRender();if(!S._parentAuth)return;const g=game(),done=Object.values(g.levels).filter(x=>x.stars===3).length,stars=totalStars(),due=dueReviews().length,weak=Object.values(g.reviewQueue).sort((a,b)=>(b.lapses||0)-(a.lapses||0)).slice(0,3);const first=document.querySelector('#ct>.card');if(first)first.insertAdjacentHTML('afterend',`<section class="card" id="g1ParentReport" style="margin-top:14px"><div class="card-hd"><span class="ic">🗺️</span><h2>成长岛闯关报告</h2></div><div class="parent-stats"><div class="pstat"><div class="ps-v">${stars}</div><div class="ps-l">真实星星</div></div><div class="pstat"><div class="ps-v">${done}</div><div class="ps-l">三星关卡</div></div><div class="pstat"><div class="ps-v" style="color:${due?'#d86632':'#3a9d55'}">${due}</div><div class="ps-l">到期复习</div></div><div class="pstat"><div class="ps-v">${Object.keys(g.reviewQueue).length}</div><div class="ps-l">复习队列</div></div></div><p style="font-size:15px;line-height:1.7">${weak.length?'近期需要多练：'+weak.map(x=>esc(x.title)).join('、'):'暂时没有薄弱知识点。'} 星星只来自听辨、答题、描红或验证过的任务，不能手动补发。</p><button class="btn b3" style="width:100%;min-height:54px" onclick="showPage('curriculum')">预览完整一年级课程</button></section>`)};
  const parentWithGameReport=PGS.parent.render;
  PGS.parent.render=function(){parentWithGameReport();if(!S._parentAuth)return;const report=document.getElementById('g1ParentReport');if(report)report.insertAdjacentHTML('afterend',`<section class="card" id="g1SourceReport" style="margin-top:14px"><div class="card-hd"><span class="ic">📚</span><h2>课程依据与边界</h2></div><p style="font-size:15px;line-height:1.75">同步范围按国家中小学智慧教育平台当前一年级的10个学科入口核对，并以教育部课程标准和教学用书目录限定能力范围。写字并入语文；体育使用水平一；艺术综合和劳动按平台当前仅列上册。题目、插图与活动均为原创，不复制教材正文或受保护音视频。时间、数独、钢琴和额外运动为课外拓展，不计入教材同步完成率。</p><div style="display:grid;gap:8px"><a class="btn b4" target="_blank" rel="noopener" href="https://basic.smartedu.cn/syncClassroom/auto">国家中小学智慧教育平台</a><a class="btn b3" target="_blank" rel="noopener" href="https://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html">教育部课程标准</a><a class="btn b2" target="_blank" rel="noopener" href="https://www.moe.gov.cn/srcsite/A26/s8001/202408/W020240805496325238752.pdf">2024国家教学用书目录</a></div></section>`)};

  function mountGameDock(){let dock=document.getElementById('kidDock');if(!dock){dock=document.createElement('nav');dock.id='kidDock';document.body.appendChild(dock)}dock.setAttribute('aria-label','主要导航');dock.innerHTML=`<button data-route="home" onclick="showPage('home')"><span>🗺️</span>地图</button><button data-route="adventure" onclick="showPage('adventure')"><span>⭐</span>闯关</button><button data-route="dog" onclick="showPage('dog')"><span>🐶</span>伙伴</button><button data-route="review" onclick="showPage('review')"><span>📦</span>复习</button><button data-route="parent" onclick="showPage('parent')"><span>👨‍👩‍👧</span>家长</button>`;const active=['level','region'].includes(CP)?'adventure':CP;dock.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.route===active));const wide=document.getElementById('wideNav');if(wide)wide.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.route===active))}
  const baseShow=showPage;showPage=function(id){if(g1SportTimer&&id!=='level'){clearInterval(g1SportTimer);g1SportTimer=null}baseShow(id);mountGameDock()};

  LEVELS=buildLevels();LEVEL_BY_ID=Object.fromEntries(LEVELS.map(x=>[x.id,x]));game();S._setup.grade='一年级';R();
  if(new URLSearchParams(location.search).has('test'))window.__G1_TEST={
    levels:LEVELS,regions:REGION_META,totalStars,levelState,regionUnlocked,dueReviews,petReply,
    current(){return taskAt()},
    hear(){const c=taskAt();if(c)g1Heard[c.level.id+'-'+c.index]=true},
    correct(){const c=taskAt();if(!c||c.task.type!=='choice')return false;this.hear();g1AnswerTask(c.task.options.indexOf(c.task.answer));return true},
    wrong(){const c=taskAt();if(!c||c.task.type!=='choice')return false;this.hear();g1AnswerTask(c.task.options.findIndex(x=>x!==c.task.answer));return true},
    dueNow(){Object.values(game().reviewQueue).forEach(x=>x.dueAt=Date.now()-1);R()},
    game
  };
  document.documentElement.dataset.appVersion='v61-grade1-national-platform';
  if(S._setup.done&&S.dog)showPage('home');else if(!S._setup.done)showWizard();
})();
