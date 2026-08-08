# -*- coding: utf-8 -*-
import re

html = open('index.html', encoding='utf-8').read()

# ===== 修复1: 古诗朗读 —— playPoemV6 改为用 _ac 全局播放器，失败回退TTS =====
old_pp = "function playPoemV6(i){const p=POEM_COURSE_V6[i];S.poems[p.ti]=true;R();playCue(p.key,`正在朗读《${p.ti}》`)}"
new_pp = "function playPoemV6(i){const p=POEM_COURSE_V6[i];S.poems[p.ti]=true;R();var k='assets/voice/'+p.key+'.mp3';try{if(_ac){_ac.pause();_ac.currentTime=0}var a=new Audio(k);a.preload='auto';_ac=a;a.onerror=function(){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)};a.onended=function(){};a.play().catch(function(){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)})}catch(e){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)}}"
assert html.count(old_pp) == 1, f"old_pp count={html.count(old_pp)}"
html = html.replace(old_pp, new_pp, 1)
print('OK 古诗朗读修复')

# ===== 修复2: 宠物页显示类型标签（恐龙/小狗等） =====
old_dog_render = 'return `<div class="card" style="text-align:center">${dogSVG(S.dog.type,160)}<div style="font-size:22px;font-weight:800;margin:6px 0">${d.n}</div>'
new_dog_render = 'return `<div class="card" style="text-align:center">${dogSVG(S.dog.type,160)}<div style="font-size:22px;font-weight:800;margin:6px 0">${d.n}</div><div style="font-size:13px;color:var(--tx2);margin-bottom:8px">${d.cn}</div>'
assert html.count(old_dog_render) == 1, f"dog_render count={html.count(old_dog_render)}"
html = html.replace(old_dog_render, new_dog_render, 1)
print('OK 宠物标注修复')

# ===== 修复3: 拼音声母统一用本地音频 =====
old_say = "if(src===\"init\"){say(py,\"zh-CN\",.65)}"
new_say = "if(src===\"init\"){pA(aid,\"init\",function(r){if(!r)say(py,\"zh-CN\",.65)})}"
assert html.count(old_say) == 1, f"say_init count={html.count(old_say)}"
html = html.replace(old_say, new_say, 1)
print('OK 声母统一语音')

# ===== 修复4: 宠物互动语音多样化+动作增强 =====
# 喂食
old = "function fDog(){if(!S.dog)return;if((S.pts||0)<15)return toast(\"钻石不够，完成学习再来喂食吧！\");S.pts-=15;S.dog.hu=Math.min(100,S.dog.hu+35);S.dog.xp=(S.dog.xp||0)+4;R();saveDog();up();showPage(\"dog\");playCue(\"pet_hello\",\"好吃好吃！\");dogAnim(\"feed\");showBubble(S.dog.type===\"trex\"?\"嗷呜！肉肉好吃！\":\"好吃好吃！\")}"
new = "function fDog(){if(!S.dog)return;if((S.pts||0)<15)return toast(\"钻石不够，完成学习再来喂食吧！\");S.pts-=15;S.dog.hu=Math.min(100,S.dog.hu+35);S.dog.xp=(S.dog.xp||0)+4;R();saveDog();up();showPage(\"dog\");var b=S.dog.type===\"trex\"?[\"嗷呜！肉肉好吃！\",\"勒勒最爱吃肉肉！\",\"再来一块！\"][Math.floor(Math.random()*3)]:[\"好吃好吃！\",\"再来一块！\",\"好香呀！\"][Math.floor(Math.random()*3)];playCue(\"pet_hello\",b);dogAnim(\"feed\");showBubble(b)}"
assert html.count(old) == 1, f"fDog count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 喂食语音多样化')

# 抚摸
old = "function pDog(){if(!S.dog)return;if(!hasTodayLearningV6())return toast(\"先完成一项今天的学习任务，再来陪伙伴玩吧！\");S.dog.en=Math.min(100,S.dog.en+20);S.dog.xp=(S.dog.xp||0)+2;R();saveDog();showPage(\"dog\");playCue(\"pet_hello\",\"好舒服～\");dogAnim(\"pet\");showBubble(S.dog.type===\"trex\"?\"勒勒好舒服～❤️\":\"好舒服～\")}"
new = "function pDog(){if(!S.dog)return;if(!hasTodayLearningV6())return toast(\"先完成一项今天的学习任务，再来陪伙伴玩吧！\");S.dog.en=Math.min(100,S.dog.en+20);S.dog.xp=(S.dog.xp||0)+2;R();saveDog();showPage(\"dog\");var b=S.dog.type===\"trex\"?[\"勒勒好舒服～❤️\",\"摸摸头，真开心！\",\"再摸摸～\"][Math.floor(Math.random()*3)]:[\"好舒服～\",\"摸摸头，真开心！\",\"再摸摸～\"][Math.floor(Math.random()*3)];playCue(\"pet_hello\",b);dogAnim(\"pet\");showBubble(b)}"
assert html.count(old) == 1, f"pDog count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 抚摸语音多样化')

# 洗澡
old = "function bDog(){if(!S.dog)return;if((S.pts||0)<8)return toast(\"钻石不够，完成学习再来洗澡吧！\");S.pts-=8;S.dog.hy=Math.min(100,S.dog.hy+40);S.dog.xp=(S.dog.xp||0)+3;R();saveDog();up();showPage(\"dog\");playCue(\"pet_bath\",\"洗干净啦！\");dogAnim(\"bath\");showBubble(S.dog.type===\"trex\"?\"冲干净啦，香喷喷！\":\"洗干净啦！\")}"
new = "function bDog(){if(!S.dog)return;if((S.pts||0)<8)return toast(\"钻石不够，完成学习再来洗澡吧！\");S.pts-=8;S.dog.hy=Math.min(100,S.dog.hy+40);S.dog.xp=(S.dog.xp||0)+3;R();saveDog();up();showPage(\"dog\");var b=S.dog.type===\"trex\"?[\"冲干净啦，香喷喷！\",\"泡泡浴好舒服！\",\"勒勒变干净啦！\"][Math.floor(Math.random()*3)]:[\"洗干净啦！\",\"泡泡浴好舒服！\",\"变干净啦！\"][Math.floor(Math.random()*3)];playCue(\"pet_bath\",b);dogAnim(\"bath\");showBubble(b)}"
assert html.count(old) == 1, f"bDog count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 洗澡语音多样化')

# 说话
old = "function tDog(){if(!S.dog)return;const p=S.dog,isTrex=p.type===\"trex\";let key=\"pet_hello\",m=isTrex?\"嗷！我是勒勒，陪你一起学习！\":\"我会陪你一起学习，一起长大！\";if(p.hu<30){key=\"pet_hungry\";m=isTrex?\"嗷呜……勒勒肚子饿了，给点肉肉吧！\":\"我饿了，完成学习任务后给我准备食物吧！\"}else if(p.hy<30){key=\"pet_bath\";m=isTrex?\"勒勒身上脏脏的，帮我冲个澡！\":\"我要洗澡啦，身上臭了，快帮我洗洗！\"}else if(p.en<30){key=\"pet_play\";m=isTrex?\"嗷！勒勒想出去玩，先完成今天的任务吧！\":\"我想出去和你玩，先完成今天的学习任务吧！\"}playCue(key,m);dogAnim(isTrex?\"roar\":\"talk\");showBubble(m)}"
new = "function tDog(){if(!S.dog)return;const p=S.dog,isTrex=p.type===\"trex\";let key=\"pet_hello\",m=isTrex?\"嗷！我是勒勒，陪你一起学习！\":\"我会陪你一起学习，一起长大！\";if(p.hu<30){key=\"pet_hungry\";m=isTrex?[\"嗷呜……勒勒肚子饿了，给点肉肉吧！\",\"勒勒想吃肉肉，快完成学习任务吧！\",\"肚子咕咕叫了，给点吃的吧！\"][Math.floor(Math.random()*3)]:[\"我饿了，完成学习任务后给我准备食物吧！\",\"肚子好饿，完成任务才有吃的！\"][Math.floor(Math.random()*2)]}else if(p.hy<30){key=\"pet_bath\";m=isTrex?[\"勒勒身上脏脏的，帮我冲个澡！\",\"好脏呀，快帮我洗澡！\",\"洗个澡变干净！\"][Math.floor(Math.random()*3)]:[\"我要洗澡啦，身上臭了，快帮我洗洗！\",\"身上脏了，洗澡澡！\"][Math.floor(Math.random()*2)]}else if(p.en<30){key=\"pet_play\";m=isTrex?[\"嗷！勒勒想出去玩，先完成今天的任务吧！\",\"完成学习，勒勒陪你玩！\",\"动起来，完成任务再玩耍！\"][Math.floor(Math.random()*3)]:[\"我想出去和你玩，先完成今天的学习任务吧！\",\"完成任务后一起玩吧！\"][Math.floor(Math.random()*2)]}playCue(key,m);dogAnim(isTrex?\"roar\":\"talk\");showBubble(m)}"
assert html.count(old) == 1, f"tDog count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 说话语音多样化')

# ===== 修复5: dogAnim动作增强 =====
old = "function dogAnim(type){const el=document.querySelector(\".dog-display\");if(!el)return;el.className=\"dog-display\";void el.offsetWidth;if(type===\"feed\"){el.classList.add(\"bounce\")}else if(type===\"pet\"){el.classList.add(\"shake\")}else if(type===\"bath\"){el.classList.add(\"shake\")}else if(type===\"talk\"){el.classList.add(\"wag\")}else if(type===\"roar\"){el.classList.add(\"shake\")}}"
new = "function dogAnim(type){const el=document.querySelector(\".dog-display\");if(!el)return;el.className=\"dog-display\";void el.offsetWidth;if(type===\"feed\"){el.classList.add(\"bounce\");el.style.transform=\"scale(1.1)\";setTimeout(()=>el.style.transform=\"\",300)}else if(type===\"pet\"){el.classList.add(\"shake\");el.style.filter=\"brightness(1.2)\";setTimeout(()=>el.style.filter=\"\",400)}else if(type===\"bath\"){el.classList.add(\"shake\");el.style.transform=\"rotate(-5deg)\";setTimeout(()=>el.style.transform=\"\",500)}else if(type===\"talk\"){el.classList.add(\"wag\");el.style.transform=\"scale(1.05)\";setTimeout(()=>el.style.transform=\"\",200)}else if(type===\"roar\"){el.classList.add(\"shake\");el.style.transform=\"scale(1.2)\";setTimeout(()=>el.style.transform=\"\",400)}}"
assert html.count(old) == 1, f"dogAnim count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 宠物动作增强')

open('index.html', 'w', encoding='utf-8').write(html)
print('全部修复完成')