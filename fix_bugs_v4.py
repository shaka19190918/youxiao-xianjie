# -*- coding: utf-8 -*-
import re

html = open('index.html', encoding='utf-8').read()

# ===== 修复1: 古诗朗读 —— playPoemV6 改为用 _ac 全局播放器，失败回退TTS =====
old = "function playPoemV6(i){const p=POEM_COURSE_V6[i];S.poems[p.ti]=true;R();playCue(p.key,`正在朗读《${p.ti}》`)}"
new = "function playPoemV6(i){const p=POEM_COURSE_V6[i];S.poems[p.ti]=true;R();var k='assets/voice/'+p.key+'.mp3';try{if(window._ac){window._ac.pause();window._ac.currentTime=0}var a=new Audio(k);a.preload='auto';window._ac=a;a.onerror=function(){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)};a.onended=function(){};a.play().catch(function(){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)})}catch(e){say('《'+p.ti+'》'+p.lns.join(''),'zh-CN',.65)}}"
if html.count(old) == 1:
    html = html.replace(old, new, 1)
    print('OK 修复1: 古诗朗读')
else:
    print(f'SKIP 修复1: playPoemV6 count={html.count(old)}')

# ===== 修复2: 宠物页显示类型标签（恐龙/小狗等） =====
old = '<span class="ic">${dogSVG(S.dog.type,28)}</span><h2>🐶 ${d.cn}</h2><small>${st.n}</small>'
new = '<span class="ic">${dogSVG(S.dog.type,28)}</span><h2>🐶 ${d.cn}</h2><div style="font-size:13px;color:var(--tx2);margin-bottom:4px">${d.cn}</div><small>${st.n}</small>'
if html.count(old) == 1:
    html = html.replace(old, new, 1)
    print('OK 修复2: 宠物类型标注')
else:
    print(f'SKIP 修复2: dog_type_label count={html.count(old)}')

# ===== 修复3: 宠物互动语音多样化+动作增强 =====

# 3a. 喂食 fDog (V6版本)
old = "function fDog(){if(!S.dog)return;if((S.pts||0)<15)return toast('钻石不够，完成学习再来喂食吧！');S.pts-=15;S.dog.hu=Math.min(100,S.dog.hu+35);S.dog.xp=(S.dog.xp||0)+4;R();saveDog();up();showPage('dog');playCue('pet_hello','好吃好吃！');dogAnim('feed');showBubble(S.dog.type==='trex'?'嗷呜！肉肉好吃！':'好吃好吃！')}"
new = "function fDog(){if(!S.dog)return;if((S.pts||0)<15)return toast('钻石不够，完成学习再来喂食吧！');S.pts-=15;S.dog.hu=Math.min(100,S.dog.hu+35);S.dog.xp=(S.dog.xp||0)+4;R();saveDog();up();showPage('dog');var b=S.dog.type==='trex'?['嗷呜！肉肉好吃！','勒勒最爱吃肉肉！','再来一块！'][Math.floor(Math.random()*3)]:['好吃好吃！','再来一块！','好香呀！'][Math.floor(Math.random()*3)];playCue('pet_hello',b);dogAnim('feed');showBubble(b)}"
if html.count(old) == 1:
    html = html.replace(old, new, 1)
    print('OK 修复3a: 喂食语音多样化')
else:
    print(f'SKIP 修复3a: fDog count={html.count(old)}')

# 3b. 抚摸 pDog (V6版本)
old = "function pDog(){if(!S.dog)return;if(!hasTodayLearningV6())return toast('先完成一项今天的学习任务，再来陪伙伴玩吧！');S.dog.en=Math.min(100,S.dog.en+20);S.dog.xp=(S.dog.xp||0)+2;R();saveDog();showPage('dog');playCue('pet_hello','好舒服～');dogAnim('pet');showBubble(S.dog.type==='trex'?'勒勒好舒服～❤️':'好舒服～')}"
new = "function pDog(){if(!S.dog)return;if(!hasTodayLearningV6())return toast('先完成一项今天的学习任务，再来陪伙伴玩吧！');S.dog.en=Math.min(100,S.dog.en+20);S.dog.xp=(S.dog.xp||0)+2;R();saveDog();showPage('dog');var b=S.dog.type==='trex'?['勒勒好舒服～❤️','摸摸头，真开心！','再摸摸～'][Math.floor(Math.random()*3)]:['好舒服～','摸摸头，真开心！','再摸摸～'][Math.floor(Math.random()*3)];playCue('pet_hello',b);dogAnim('pet');showBubble(b)}"
if html.count(old) == 1:
    html = html.replace(old, new, 1)
    print('OK 修复3b: 抚摸语音多样化')
else:
    print(f'SKIP 修复3b: pDog count={html.count(old)}')

# 3c. 洗澡 bDog (V6版本)
old = "function bDog(){if(!S.dog)return;if((S.pts||0)<8)return toast('钻石不够，完成学习再来洗澡吧！');S.pts-=8;S.dog.hy=Math.min(100,S.dog.hy+40);S.dog.xp=(S.dog.xp||0)+3;R();saveDog();up();showPage('dog');playCue('pet_bath','洗干净啦！');dogAnim('bath');showBubble(S.dog.type==='trex'?'冲干净啦，香喷喷！':'洗干净啦！')}"
new = "function bDog(){if(!S.dog)return;if((S.pts||0)<8)return toast('钻石不够，完成学习再来洗澡吧！');S.pts-=8;S.dog.hy=Math.min(100,S.dog.hy+40);S.dog.xp=(S.dog.xp||0)+3;R();saveDog();up();showPage('dog');var b=S.dog.type==='trex'?['冲干净啦，香喷喷！','泡泡浴好舒服！','勒勒变干净啦！'][Math.floor(Math.random()*3)]:['洗干净啦！','泡泡浴好舒服！','变干净啦！'][Math.floor(Math.random()*3)];playCue('pet_bath',b);dogAnim('bath');showBubble(b)}"
if html.count(old) == 1:
    html = html.replace(old, new, 1)
    print('OK 修复3c: 洗澡语音多样化')
else:
    print(f'SKIP 修复3c: bDog count={html.count(old)}')

# 3d. 说话 tDog (V6版本)
old = "function tDog(){if(!S.dog)return;const p=S.dog,isTrex=p.type==='trex';let key='pet_hello',m=isTrex?'嗷！我是勒勒，陪你一起学习！':'我会陪你一起学习，一起长大！';if(p.hu<30){key='pet_hungry';m=isTrex?'嗷呜……勒勒肚子饿了，给点肉肉吧！':'我饿了，完成学习任务后给我准备食物吧！'}else if(p.hy<30){key='pet_bath';m=isTrex?'勒勒身上脏脏的，帮我冲个澡！':'我要洗澡啦，身上臭了，快帮我洗洗！'}else if(p.en<30){key='pet_play';m=isTrex?'嗷！勒勒想出去玩，先完成今天的任务吧！':'我想出去和你玩，先完成今天的学习任务吧！'}playCue(key,m);dogAnim(isTrex?'roar':'talk');showBubble(m)}"
new = "function tDog(){if(!S.dog)return;const p=S.dog,isTrex=p.type==='trex';let key='pet_hello',m=isTrex?['嗷！我是勒勒，陪你一起学习！','我是勒勒，一起加油！'][Math.floor(Math.random()*2)]:['我会陪你一起学习，一起长大！','一起加油哦！'][Math.floor(Math.random()*2)];if(p.hu<30){key='pet_hungry';m=isTrex?['嗷呜……勒勒肚子饿了，给点肉肉吧！','勒勒想吃肉肉，快完成学习任务吧！','肚子咕咕叫了，给点吃的吧！'][Math.floor(Math.random()*3)]:['我饿了，完成学习任务后给我准备食物吧！','肚子好饿，完成任务才有吃的！'][Math.floor(Math.random()*2)]}else if(p.hy<30){key='pet_bath';m=isTrex?['勒勒身上脏脏的，帮我冲个澡！','好脏呀，快帮我洗澡！','洗个澡变干净！'][Math.floor(Math.random()*3)]:['我要洗澡啦，身上臭了，快帮我洗洗！','身上脏了，洗澡澡！'][Math.floor(Math.random()*2)]}else if(p.en<30){key='pet_play';m=isTrex?['嗷！勒勒想出去玩，先完成今天的任务吧！','完成学习，勒勒陪你玩！','动起来，完成任务再玩耍！'][Math.floor(Math.random()*3)]:['我想出去和你玩，先完成今天的学习任务吧！','完成任务后一起玩吧！'][Math.floor(Math.random()*2)]}playCue(key,m);dogAnim(isTrex?'roar':'talk');showBubble(m)}"
if html.count(old) == 1:
    html = html.replace(old, new, 1)
    print('OK 修复3d: 说话语音多样化')
else:
    print(f'SKIP 修复3d: tDog count={html.count(old)}')

# 3e. dogAnim 动作增强
old = "function dogAnim(type){const el=document.getElementById('dogDisp');if(!el)return;el.classList.remove('wag','bounce','shake','roar','heart');void el.offsetWidth;if(type==='pet'){el.classList.add('heart');dogFloat(el,'❤️')}else if(type==='feed'){el.classList.add('bounce');dogFloat(el,'🍖')}else if(type==='bath'){el.classList.add('shake');dogFloat(el,'💧')}else if(type==='talk'){el.classList.add('wag');dogFloat(el,'💬')}else if(type==='roar'){el.classList.add('roar');dogFloat(el,'🦖')}setTimeout(()=>el.classList.remove('wag','bounce','shake','roar','heart'),1500)}"
new = "function dogAnim(type){const el=document.getElementById('dogDisp');if(!el)return;el.classList.remove('wag','bounce','shake','roar','heart');void el.offsetWidth;if(type==='pet'){el.classList.add('heart');dogFloat(el,'❤️');el.style.transform='scale(1.05)';setTimeout(()=>el.style.transform='',400)}else if(type==='feed'){el.classList.add('bounce');dogFloat(el,'🍖');el.style.transform='translateY(-8px)';setTimeout(()=>el.style.transform='',500)}else if(type==='bath'){el.classList.add('shake');dogFloat(el,'💧');el.style.transform='rotate(-3deg)';setTimeout(()=>el.style.transform='',600)}else if(type==='talk'){el.classList.add('wag');dogFloat(el,'💬');el.style.transform='scale(1.03)';setTimeout(()=>el.style.transform='',300)}else if(type==='roar'){el.classList.add('roar');dogFloat(el,'🦖');el.style.transform='scale(1.15)';setTimeout(()=>el.style.transform='',500)}setTimeout(()=>el.classList.remove('wag','bounce','shake','roar','heart'),1500)}"
if html.count(old) == 1:
    html = html.replace(old, new, 1)
    print('OK 修复3e: 宠物动作增强')
else:
    print(f'SKIP 修复3e: dogAnim count={html.count(old)}')

# ===== 修复4: 拼音声母统一语音（确保所有拼音点击都走本地音频） =====
# 注意：sayPy 已经走 pA 本地音频，但需要确保 playCue 在拼音模块中不混用
# 检查是否有其他拼音相关的地方用 say() 系统TTS
# 查找拼音播放中是否有用 say() 的地方
# 在 pinyin 页面渲染中，所有点击都走 sayPy，没有问题
# 但需要确保声母点击不意外触发系统TTS
# 检查第306-309行旧版宠物函数是否被调用（它们用 say() 系统TTS）
# 这些函数被第629-633行同名函数覆盖，不会实际生效
# 但为了干净，建议删除旧版函数

# 删除第306-309行旧版宠物函数（已被V6版本覆盖）
old = "function fDog(){if(!S.dog)return;primeS();if((S.pts||0)<15)return toast('💎不够，去学习赚钻石吧！');S.pts-=15;S.dog.hu=Math.min(100,S.dog.hu+35);S.dog.xp+=4;R();saveDog();up();showPage('dog');say(DOGS[S.dog.type].sounds.feed,'zh-CN',.9);dogAnim('feed');showBubble('好吃好吃！')}"
# 替换为无操作版本（避免干扰）
if html.count(old) == 1:
    # 注意：这里不能直接删除，因为函数声明位置会影响后续代码
    # 改为注释掉，但更好的方式是用空函数覆盖
    replacement = "function fDog(){if(!S.dog)return;primeS();if((S.pts||0)<15)return toast('💎不够，去学习赚钻石吧！');S.pts-=15;S.dog.hu=Math.min(100,S.dog.hu+35);S.dog.xp+=4;R();saveDog();up();showPage('dog');dogAnim('feed');showBubble('好吃好吃！')}"
    html = html.replace(old, replacement, 1)
    print('OK 修复4a: 清理旧版fDog')
else:
    print(f'SKIP 修复4a: old fDog count={html.count(old)}')

old = "function pDog(){if(!S.dog)return;primeS();S.dog.en=Math.min(100,S.dog.en+20);S.dog.xp+=2;R();saveDog();showPage('dog');say(DOGS[S.dog.type].sounds.pet,'zh-CN',.85);dogAnim('pet');showBubble('好舒服～')}"
if html.count(old) == 1:
    replacement = "function pDog(){if(!S.dog)return;primeS();S.dog.en=Math.min(100,S.dog.en+20);S.dog.xp+=2;R();saveDog();showPage('dog');dogAnim('pet');showBubble('好舒服～')}"
    html = html.replace(old, replacement, 1)
    print('OK 修复4b: 清理旧版pDog')
else:
    print(f'SKIP 修复4b: old pDog count={html.count(old)}')

old = "function bDog(){if(!S.dog)return;primeS();if((S.pts||0)<8)return toast('💎不够！');S.pts-=8;S.dog.hy=Math.min(100,S.dog.hy+40);S.dog.xp+=3;R();saveDog();up();showPage('dog');say(DOGS[S.dog.type].sounds.bath,'zh-CN',.85);dogAnim('bath');showBubble('洗干净啦！')}"
if html.count(old) == 1:
    replacement = "function bDog(){if(!S.dog)return;primeS();if((S.pts||0)<8)return toast('💎不够！');S.pts-=8;S.dog.hy=Math.min(100,S.dog.hy+40);S.dog.xp+=3;R();saveDog();up();showPage('dog');dogAnim('bath');showBubble('洗干净啦！')}"
    html = html.replace(old, replacement, 1)
    print('OK 修复4c: 清理旧版bDog')
else:
    print(f'SKIP 修复4c: old bDog count={html.count(old)}')

old = "function tDog(){if(!S.dog)return;primeS();const d=DOGS[S.dog.type],p=S.dog;let m=d.sounds.talk;if(p.hu<30)m='呜……好饿呀，能给我点吃的吗？';else if(p.hy<30)m='唔，身上有点脏了，帮我洗洗吧～';else if(p.en<30)m='汪！好无聊，带我去跑步！';say(m,'zh-CN',.88);dogAnim('talk');showBubble(m)}"
if html.count(old) == 1:
    replacement = "function tDog(){if(!S.dog)return;primeS();const d=DOGS[S.dog.type],p=S.dog;let m=d.sounds.talk;if(p.hu<30)m='呜……好饿呀，能给我点吃的吗？';else if(p.hy<30)m='唔，身上有点脏了，帮我洗洗吧～';else if(p.en<30)m='汪！好无聊，带我去跑步！';dogAnim('talk');showBubble(m)}"
    html = html.replace(old, replacement, 1)
    print('OK 修复4d: 清理旧版tDog')
else:
    print(f'SKIP 修复4d: old tDog count={html.count(old)}')

open('index.html', 'w', encoding='utf-8').write(html)
print('全部修复完成！')