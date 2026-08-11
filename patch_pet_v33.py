# -*- coding: utf-8 -*-
import io, json, re

s = io.open('index.html', encoding='utf-8').read()
mp = json.load(io.open('pet_voice_map.json', encoding='utf-8'))

def repl(old, new, name, count=1):
    global s
    assert old in s, 'NOT FOUND: ' + name
    s = s.replace(old, new, count)
    print('OK', name)

# ===== 1. 注入PET_VOICE映射并改造speakPet =====
map_items = []
for text, fid in mp.items():
    esc = json.dumps(text, ensure_ascii=False)
    map_items.append('"%s":"%s"' % (esc[1:-1].replace('"', '\\"'), fid))
PET_LINE = 'const PET_VOICE={' + ','.join(map_items) + '};'
# 只保留静态4个的映射（固定文件名mp3不需要映射），删除这4条避免speakPet误判
PET_LINE_FIXED_ONLY = None
# 静态4个文本也进映射没问题，文件assets/voice/pet_hello.mp3等与同，保持即可

old_sp = "function speakPet(text){primeS();if(say(text,'zh-CN',.8))return;setTimeout(function(){say(text,'zh-CN',.8)},300)}"
new_sp = PET_LINE + "\nfunction speakPet(text){var fid=PET_VOICE[text];if(fid){var a=new Audio('assets/voice/'+fid+'.mp3');a.play().catch(function(){});return}primeS();if(say(text,'zh-CN',.8))return;setTimeout(function(){say(text,'zh-CN',.8)},300)}"
repl(old_sp, new_sp, 'speakPet+PET_VOICE')

# ===== 2. 删除礼物商店 =====
m = re.search(r"const GIFTS=\[.*?\];\n?function redeemGift\(id\)\{[^}]*?(?:\}[^;]*?){0,1}\}\n", s, re.S)
assert m, 'NOT FOUND: GIFTS block'
s = s.replace(m.group(0), '', 1)
print('OK GIFTS+redeemGift removed')

m = re.search(r"PGS\.gift=\{.*?\}\};\n", s, re.S)
assert m, 'NOT FOUND: PGS.gift'
s = s.replace(m.group(0), '', 1)
print('OK PGS.gift removed')

old_btn = '<button class="btn b1" style="width:100%;margin-top:10px" onclick="showPage(\'gift\')">🎁 去礼物商店兑换</button><div style="font-size:11px;color:var(--tx2);text-align:center;margin-top:6px;line-height:1.6">学习打卡赚💎 → 💎做养料喂伙伴 → 伙伴长大 → 兑换礼物</div>'
new_btn = '<div style="font-size:11px;color:var(--tx2);text-align:center;margin-top:10px;line-height:1.6">学习打卡赚💎 → 💎喂养伙伴 → 伙伴长大 → 成年解锁神秘盲盒大奖！</div>'
repl(old_btn, new_btn, 'gift按钮移除+文案')

# ===== 3. 成年体神秘盲盒 =====
old_adv = "function advDog(n){if(!S.dog)return;var oldLv=dlv();S.dog.xp=(S.dog.xp||0)+Math.max(2,n*2);S.dog.tasks=(S.dog.tasks||0)+1;R();saveDog();if(dlv()>oldLv){setTimeout(function(){toast('🎉 伙伴升级到「'+DST[dlv()].n+'」啦！继续学习，继续进化！')},300)}}"
new_adv = ("function advDog(n){if(!S.dog)return;var oldLv=dlv();S.dog.xp=(S.dog.xp||0)+Math.max(2,n*2);S.dog.tasks=(S.dog.tasks||0)+1;R();saveDog();"
"if(dlv()>oldLv){var nl=dlv();setTimeout(function(){toast('🎉 伙伴升级到「'+DST[nl].n+'」啦！继续学习，继续进化！')},300);"
"if(nl===DST.length-1&&!S.dog.boxDone&&!S.dog.boxWait){S.dog.boxWait=true;R();saveDog();setTimeout(showBlindBox,1500)}}}\n"
"function showBlindBox(){if(!S.dog||S.dog.boxDone)return;if(document.getElementById('bbMask'))return;"
"var m=document.createElement('div');m.id='bbMask';m.style.cssText='position:fixed;inset:0;background:rgba(20,12,40,.82);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px';"
"m.innerHTML='<div style=\"font-size:22px;color:#FFD54F;font-weight:800;margin-bottom:6px\">🎊 伙伴长大成年啦！</div><div style=\"font-size:14px;color:#FFF3E0;margin-bottom:18px\">神秘盲盒已送达，快拆开看看！</div>"
+"<div id=\"bbBox\" onclick=\"openBlindBox()\" style=\"width:150px;height:150px;margin:0 auto;background:linear-gradient(135deg,#FF7043,#D81B60);border-radius:28px;display:flex;align-items:center;justify-content:center;font-size:80px;cursor:pointer;box-shadow:0 12px 40px rgba(216,27,96,.55);animation:bbShake 1s infinite\">🎁</div>"
+"<div style=\"font-size:12px;color:#FFECB3;margin-top:16px\">点击礼盒拆开大奖</div>';"
"document.body.appendChild(m);speakPet('哇！我长大啦！快拆开神秘盲盒吧！')}\n"
"function openBlindBox(){var box=document.getElementById('bbBox');if(!box)return;if(box.dataset.open)return;box.dataset.open='1';"
"var prizes=[{em:'💎',n:'钻石大红包',d:188},{em:'💎',n:'钻石礼包',d:128},{em:'🏆',n:'金牌学霸徽章',d:88},{em:'👑',n:'皇冠勋章',d:66},{em:'🌟',n:'闪耀星星大奖',d:99}];"
"var p=prizes[Math.floor(Math.random()*prizes.length)];box.style.animation='none';box.style.transform='scale(1.15)';box.innerHTML=p.em;"
"S.pts=(S.pts||0)+p.d;S.dog.boxDone=true;S.dog.boxWait=false;S.dog.boxPrize=p.n;R();saveDog();up();"
"var m=document.getElementById('bbMask');m.innerHTML='<div style=\"font-size:24px;color:#FFD54F;font-weight:800\">🎉 恭喜抽中！</div>"
+"<div style=\"font-size:72px;margin:16px 0\">'+p.em+'</div><div style=\"font-size:20px;color:#fff;font-weight:800\">'+p.n+'</div>"
+"<div style=\"font-size:15px;color:#FFECB3;margin-top:8px\">＋'+p.d+'💎 已放入你的钻石袋！</div>"
+"<div style=\"font-size:13px;color:#CE93D8;margin-top:14px\">快把这个好消息告诉爸爸妈妈吧！</div>"
+"<button onclick=\"document.getElementById('bbMask').remove()\" style=\"margin-top:20px;padding:12px 36px;border:none;border-radius:24px;background:linear-gradient(135deg,#43A047,#2E7D32);color:#fff;font-size:16px;font-weight:800;cursor:pointer\">太棒了！</button>';"
"speakPet('哇塞！'+p.n+'！太幸运啦！')}")
repl(old_adv, new_adv, 'advDog+blindbox')

# 4. 宠物页待开箱提示 + 盲盒抖动画CSS
old_hd = "PGS.dog={title:'🐶 我的狗狗',render:function(){if(!S.dog)return showDogSelect();"
new_hd = "PGS.dog={title:'🐶 我的狗狗',render:function(){if(!S.dog)return showDogSelect();if(dlv()===DST.length-1&&!S.dog.boxDone&&!S.dog.boxWait){S.dog.boxWait=true;R();saveDog()}if(S.dog.boxWait&&!S.dog.boxDone){setTimeout(showBlindBox,600)}"
repl(old_hd, new_hd, '宠物页盲盒待开检测')

# CSS: bbShake 动画
old_css = '</style>'
new_css = '@keyframes bbShake{0%,100%{transform:rotate(-4deg) scale(1)}25%{transform:rotate(4deg) scale(1.06)}50%{transform:rotate(-3deg) scale(.98)}75%{transform:rotate(3deg) scale(1.04)}}\n</style>'
repl(old_css, new_css, 'bbShake CSS')

io.open('index.html', 'w', encoding='utf-8').write(s)
print('ALL PATCHES DONE')
