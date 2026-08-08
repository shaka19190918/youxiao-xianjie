# -*- coding: utf-8 -*-
import re

html = open('index.html', encoding='utf-8').read()

# ===== 修复1: 古诗朗读 bug —— playPoemV6 改为用 _ac 全局播放器，失败回退TTS =====
old = "function playPoemV6(i){const p=POEM_COURSE_V6[i];S.poems[p.ti]=true;R();playCue(p.key,`正在朗读《${p.ti}》`)}"
new = "function playPoemV6(i){const p=POEM_COURSE_V6[i];S.poems[p.ti]=true;R();var k='assets/voice/'+p.key+'.mp3';try{if(window._ac){window._ac.pause();window._ac.currentTime=0}var a=new Audio(k);a.preload='auto';window._ac=a;a.onerror=function(){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)};a.onended=function(){};a.play().catch(function(){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)})}catch(e){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)}}"
assert html.count(old) == 1, f"playPoemV6 count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 修复1: 古诗朗读')

# ===== 修复2: 宠物页显示类型标签（恐龙/小狗） =====
# 在 dogSVG 行之后，查找 dog-main 卡片中的 h2 后面
# 找到 PGS.dog.render 中 <h2>🐶 ${d.cn}</h2> 后面加 <div style="font-size:13px;color:var(--tx2);margin-bottom:8px">${d.cn}</div>
# 实际是在 dog-main 的 card-hd 中 h2 后面加一个类型标签
old = '<span class="ic">${dogSVG(S.dog.type,28)}</span><h2>🐶 ${d.cn}</h2><small>${st.n}</small>'
new = '<span class="ic">${dogSVG(S.dog.type,28)}</span><h2>🐶 ${d.cn}</h2><div style="font-size:13px;color:var(--tx2);margin-bottom:4px">${d.cn}</div><small>${st.n}</small>'
assert html.count(old) == 1, f"dog_type_label count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 修复2: 宠物类型标注')

# ===== 修复3: 拼音声母统一用本地音频 =====
# 拼音学习中，点击声母时，src==='init' 走的是 say(py,'zh-CN',.65) 系统TTS，导致男声女声混
# 改为调用 pA 走本地 assets/pinyin/*.mp3
old = "if(src==='init'){say(py,'zh-CN',.65)}"
new = "if(src==='init'){pA(aid,'init',function(r){if(!r)say(py,'zh-CN',.65)})}"
assert html.count(old) == 1, f"say_init count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 修复3: 拼音声母统一语音')

# ===== 修复4: 宠物互动语音多样化+动作增强 =====

# 4a. 喂食 fDog
old = "function fDog(){if(!S.dog)return;if((S.pts||0)<15)return toast('钻石不够，完成学习再来喂食吧！');S.pts-=15;S.dog.hu=Math.min(100,S.dog.hu+35);S.dog.xp=(S.dog.xp||0)+4;R();saveDog();up();showPage('dog');playCue('pet_hello','好吃好吃！');dogAnim('feed');showBubble(S.dog.type==='trex'?'嗷呜！肉肉好吃！':'好吃好吃！')}"
new = "function fDog(){if(!S.dog)return;if((S.pts||0)<15)return toast('钻石不够，完成学习再来喂食吧！');S.pts-=15;S.dog.hu=Math.min(100,S.dog.hu+35);S.dog.xp=(S.dog.xp||0)+4;R();saveDog();up();showPage('dog');var b=S.dog.type==='trex'?['嗷呜！肉肉好吃！','勒勒最爱吃肉肉！','再来一块！'][Math.floor(Math.random()*3)]:['好吃好吃！','再来一块！','好香呀！'][Math.floor(Math.random()*3)];playCue('pet_hello',b);dogAnim('feed');showBubble(b)}"
assert html.count(old) == 1, f"fDog count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 修复4a: 喂食语音多样化')

# 4b. 抚摸 pDog
old = "function pDog(){if(!S.dog)return;if(!hasTodayLearningV6())return toast('先完成一项今天的学习任务，再来陪伙伴玩吧！');S.dog.en=Math.min(100,S.dog.en+20);S.dog.xp=(S.dog.xp||0)+2;R();saveDog();showPage('dog');playCue('pet_hello','好舒服～');dogAnim('pet');showBubble(S.dog.type==='trex'?'勒勒好舒服～❤️':'好舒服～')}"
new = "function pDog(){if(!S.dog)return;if(!hasTodayLearningV6())return toast('先完成一项今天的学习任务，再来陪伙伴玩吧！');S.dog.en=Math.min(100,S.dog.en+20);S.dog.xp=(S.dog.xp||0)+2;R();saveDog();showPage('dog');var b=S.dog.type==='trex'?['勒勒好舒服～❤️','摸摸头，真开心！','再摸摸～'][Math.floor(Math.random()*3)]:['好舒服～','摸摸头，真开心！','再摸摸～'][Math.floor(Math.random()*3)];playCue('pet_hello',b);dogAnim('pet');showBubble(b)}"
assert html.count(old) == 1, f"pDog count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 修复4b: 抚摸语音多样化')

# 4c. 洗澡 bDog
old = "function bDog(){if(!S.dog)return;if((S.pts||0)<8)return toast('钻石不够，完成学习再来洗澡吧！');S.pts-=8;S.dog.hy=Math.min(100,S.dog.hy+40);S.dog.xp=(S.dog.xp||0)+3;R();saveDog();up();showPage('dog');playCue('pet_bath','洗干净啦！');dogAnim('bath');showBubble(S.dog.type==='trex'?'冲干净啦，香喷喷！':'洗干净啦！')}"
new = "function bDog(){if(!S.dog)return;if((S.pts||0)<8)return toast('钻石不够，完成学习再来洗澡吧！');S.pts-=8;S.dog.hy=Math.min(100,S.dog.hy+40);S.dog.xp=(S.dog.xp||0)+3;R();saveDog();up();showPage('dog');var b=S.dog.type==='trex'?['冲干净啦，香喷喷！','泡泡浴好舒服！','勒勒变干净啦！'][Math.floor(Math.random()*3)]:['洗干净啦！','泡泡浴好舒服！','变干净啦！'][Math.floor(Math.random()*3)];playCue('pet_bath',b);dogAnim('bath');showBubble(b)}"
assert html.count(old) == 1, f"bDog count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 修复4c: 洗澡语音多样化')

# 4d. 说话 tDog
old = "function tDog(){if(!S.dog)return;const p=S.dog,isTrex=p.type==='trex';let key='pet_hello',m=isTrex?'嗷！我是勒勒，陪你一起学习！':'我会陪你一起学习，一起长大！';if(p.hu<30){key='pet_hungry';m=isTrex?'嗷呜……勒勒肚子饿了，给点肉肉吧！':'我饿了，完成学习任务后给我准备食物吧！'}else if(p.hy<30){key='pet_bath';m=isTrex?'勒勒身上脏脏的，帮我冲个澡！':'我要洗澡啦，身上臭了，快帮我洗洗！'}else if(p.en<30){key='pet_play';m=isTrex?'嗷！勒勒想出去玩，先完成今天的任务吧！':'我想出去和你玩，先完成今天的学习任务吧！'}playCue(key,m);dogAnim(isTrex?'roar':'talk');showBubble(m)}"
new = "function tDog(){if(!S.dog)return;const p=S.dog,isTrex=p.type==='trex';let key='pet_hello',m=isTrex?['嗷！我是勒勒，陪你一起学习！','我是勒勒，一起加油！'][Math.floor(Math.random()*2)]:['我会陪你一起学习，一起长大！','一起加油哦！'][Math.floor(Math.random()*2)];if(p.hu<30){key='pet_hungry';m=isTrex?['嗷呜……勒勒肚子饿了，给点肉肉吧！','勒勒想吃肉肉，快完成学习任务吧！','肚子咕咕叫了，给点吃的吧！'][Math.floor(Math.random()*3)]:['我饿了，完成学习任务后给我准备食物吧！','肚子好饿，完成任务才有吃的！'][Math.floor(Math.random()*2)]}else if(p.hy<30){key='pet_bath';m=isTrex?['勒勒身上脏脏的，帮我冲个澡！','好脏呀，快帮我洗澡！','洗个澡变干净！'][Math.floor(Math.random()*3)]:['我要洗澡啦，身上臭了，快帮我洗洗！','身上脏了，洗澡澡！'][Math.floor(Math.random()*2)]}else if(p.en<30){key='pet_play';m=isTrex?['嗷！勒勒想出去玩，先完成今天的任务吧！','完成学习，勒勒陪你玩！','动起来，完成任务再玩耍！'][Math.floor(Math.random()*3)]:['我想出去和你玩，先完成今天的学习任务吧！','完成任务后一起玩吧！'][Math.floor(Math.random()*2)]}playCue(key,m);dogAnim(isTrex?'roar':'talk');showBubble(m)}"
assert html.count(old) == 1, f"tDog count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 修复4d: 说话语音多样化')

# 4e. dogAnim 动作增强
old = "function dogAnim(type){const el=document.getElementById('dogDisp');if(!el)return;el.classList.remove('wag','bounce','shake','roar','heart');void el.offsetWidth;if(type==='pet'){el.classList.add('heart');dogFloat(el,'❤️')}else if(type==='feed'){el.classList.add('bounce');dogFloat(el,'🍖')}else if(type==='bath'){el.classList.add('shake');dogFloat(el,'💧')}else if(type==='talk'){el.classList.add('wag');dogFloat(el,'💬')}else if(type==='roar'){el.classList.add('roar');dogFloat(el,'🦖')}setTimeout(()=>el.classList.remove('wag','bounce','shake','roar','heart'),1500)}"
new = "function dogAnim(type){const el=document.getElementById('dogDisp');if(!el)return;el.classList.remove('wag','bounce','shake','roar','heart');void el.offsetWidth;if(type==='pet'){el.classList.add('heart');dogFloat(el,'❤️');el.style.transform='scale(1.05)';setTimeout(()=>el.style.transform='',400)}else if(type==='feed'){el.classList.add('bounce');dogFloat(el,'🍖');el.style.transform='translateY(-8px)';setTimeout(()=>el.style.transform='',500)}else if(type==='bath'){el.classList.add('shake');dogFloat(el,'💧');el.style.transform='rotate(-3deg)';setTimeout(()=>el.style.transform='',600)}else if(type==='talk'){el.classList.add('wag');dogFloat(el,'💬');el.style.transform='scale(1.03)';setTimeout(()=>el.style.transform='',300)}else if(type==='roar'){el.classList.add('roar');dogFloat(el,'🦖');el.style.transform='scale(1.15)';setTimeout(()=>el.style.transform='',500)}setTimeout(()=>el.classList.remove('wag','bounce','shake','roar','heart'),1500)}"
assert html.count(old) == 1, f"dogAnim count={html.count(old)}"
html = html.replace(old, new, 1)
print('OK 修复4e: 宠物动作增强')

open('index.html', 'w', encoding='utf-8').write(html)
print('全部修复完成！')