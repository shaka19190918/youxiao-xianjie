/* ==========================================================================
   reading-v71.js — 中文分级绘本阅读（幼小衔接快乐营 · 新版块）
   对标：统编版语文一年级「快乐读书吧」+「和大人一起读」栏目
   阅读材料规划：一年级上册《和大人一起读》（全四册）+ 一年级下册《读读童谣和儿歌》
   本文件先落地 5 本 MVP，schema 与后续整册书目完全一致，追加 book 对象即可。

   ── 分级标准的科学依据（每条都对应一个可验证的设计动作）──
   1. 简单阅读观 Gough & Tunmer 1986：阅读 = 解码 × 理解。
      故每页同时给「点读解码」（逐字高亮 + 拼音）与「理解提问」两条通道。
   2. 可理解输入 i+1 Krashen 1985：生字率必须落在学习区间。
      采用 Betts(1946) 可读性五档：≤2% 独立级 / ≤3% 独立级 / ≤5% 教学级
      （最佳 i+1）/ ≤10% 共读级 / >10% 挫败级。超标的文本一律降难改写。
   3. 文本类型差异化：儿歌靠听觉 + 韵律记忆（孩子跟唱，不必认全字），
      故事需视觉认读。故儿歌容忍度 ≤12%，故事 ≤8%，均按类型分别设线。
      依据：韵律在早期读写中的作用（Bryant & Bradley 1985 语音意识研究）。
   4. 词汇显性教学 Nation 2001：读前预教 4–6 个目标词（音+义+例句），
      读中在正文高亮已教词，读后快速回忆。不以「猜词」为主要策略。
   5. 互惠式教学 Palincsar & Brown 1984：预测/提问/澄清/总结四策略，
      效应量 d≈0.88。每本绑定一个主策略，读完必走四步。
   6. 自我调节学习 Zimmerman 2000（d≈0.69）：读前预测 → 读中自评流畅度
      → 读后回看「我猜对了吗」。三段闭环，缺一段元认知就不成立。
   7. 复述支架 Vygotsky 1978 最近发展区：先给五要素图卡脚手架，再撤支架
      自由说。脚手架是临时的，不是永久拐杖。
   8. 家校共育 Epstein 2001（d≈0.4–0.6）：每本配亲子共读脚本，给大人逐句
      台词，降低执行门槛；记录卡只描述不评分。
   9. 20-20-20 用眼法则：阅读页每 20 分钟提示远眺，与 eye-v70 保持一致。
   10. 语音意识 → 正字法映射 Ehri 2005 / Share 1995：点读高亮同步到字，
       让「音」和「形」在时间上对齐，这是自主解码能力的地基。
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 一、分级标准（含文本类型差异化生字率上限）
   * ------------------------------------------------------------------ */
  var R71_BANDS = [
    {
      id: 'L1', n: '起步级', ic: '🌱', color: '#69C98C', bg: '#E8F5E9',
      chars: '累计识字 0–250', sent: '句长 4–9 字', pinyin: '全文注音',
      mode: '大人读 · 孩子指字跟',
      desc: '一页一两句，配大图。孩子跟着念，不要求认全字。',
      who: '一年级上学期 · 刚学完拼音',
      maxRate: { rhyme: 0.12, story: 0.08 }
    },
    {
      id: 'L2', n: '成长级', ic: '🌿', color: '#4FC3F7', bg: '#E3F2FD',
      chars: '累计识字 250–400', sent: '句长 8–14 字', pinyin: '难字注音',
      mode: '一起读 · 孩子读大人搭手',
      desc: '一页两三句，有情节转折。孩子读，卡住了大人帮。',
      who: '一年级上学期末 ~ 下学期',
      maxRate: { rhyme: 0.12, story: 0.08 }
    },
    {
      id: 'L3', n: '独立级', ic: '🌳', color: '#A66CFF', bg: '#F1E9FF',
      chars: '累计识字 400–600', sent: '句长 12–20 字', pinyin: '生僻字注音',
      mode: '孩子自己读 · 读完讲给大人听',
      desc: '一页三四句，有对话和心理活动。孩子独立完成。',
      who: '一年级下学期 ~ 二年级',
      maxRate: { rhyme: 0.10, story: 0.06 }
    },
    {
      id: 'L4', n: '自主级', ic: '🌟', color: '#FFB300', bg: '#FFF8E1',
      chars: '累计识字 600–800', sent: '句长 16–24 字', pinyin: '不注音',
      mode: '自由阅读 · 能说出自己的想法和理由',
      desc: '整段阅读，读完能说观点并举出文中的证据。',
      who: '二年级以上',
      maxRate: { rhyme: 0.08, story: 0.05 }
    }
  ];

  /* Betts(1946) 可读性五档 —— 生字率 → 阅读模式判定 */
  var R71_BETTS = [
    { max: 0.02, level: '独立阅读级', mode: '自己读', note: '完全自主，不需要帮助' },
    { max: 0.03, level: '独立阅读级', mode: '自己读', note: '可独立读，偶有卡顿' },
    { max: 0.05, level: '教学阅读级', mode: '一起读', note: '最佳学习区间 i+1，需少量支持' },
    { max: 0.10, level: '共读阅读级', mode: '大人带读', note: '需大人带读，适合亲子共读' },
    { max: 1.01, level: '挫败阅读级', mode: '需降难', note: '难度过高，应降级或改写' }
  ];
  function r71Betts(r) { for (var i = 0; i < R71_BETTS.length; i++) if (r <= R71_BETTS[i].max) return R71_BETTS[i]; return R71_BETTS[R71_BETTS.length - 1]; }

  /* 统编版一年级识字表基线（会认 700 字 = 上册 302 + 下册 398）
     逐课清单去重后的实际字符集（见 _gen_sight.js），用于运行时判断
     「这个字孩子学过没有」，并给超纲字自动注音。 */
  var R71_SIGHT_UP = '天地人你我他一二三四五上下口耳目手足站坐日月水火山石田禾对云雨风花鸟虫六七八九十文数学音乐远有色近听无声去还来多少黄牛只猫边鸭苹果杏桃书包尺作业本笔刀课早校明力尘从众双木林森条心升国旗中红歌起么美丽立爸妈马土不画打棋鸡字词句子桌纸妹奶小桥台雪儿白草家车路灯走午晚昨今年秋气了树叶片大飞会个的船两头在里看见闪星江南可采莲鱼东西北尖说春青蛙夏弯皮冬男女开关正反影前后黑狗左右它好朋友比尾巴谁长短把伞兔最公写诗点要过给当串们以成彩半空问到方没更绿出睡那海真老师吗同什才亮时候觉得自己很穿衣门快蓝又笑着向和贝娃挂活金哥姐弟爷群竹牙用几步为参加洞乌鸦处找办法旁许放进展高住孩玩吧发芽爬呀久回全变工厂医院生是四子人大月儿头可下个雨们半从你有才同学自门衣白的又和竹马用几只石出见对妈全了少牛果鸟早书刀尺本木林土力心中五立正虫云山八十水去来不口目耳手日田禾火一二三上';
  var R71_SIGHT_DOWN = '霜吹落降飘游池入姓氏李张古吴赵钱孙周王官清晴眼睛保护害事情请让病相遇喜欢怕言互令动万纯净眉鼻嘴脖臂肚腿脚蜻蜓迷藏造蚂蚁食粮蜘蛛网圆严寒酷暑凉晨细朝霞夕杨操场拔拍跑踢铃热闹锻炼体之初性善习教迁贵专幼玉器义辆匹册支铅棵架棍汤扇椅萤牵织斗吵胖岁现票交弓甘卫刷梳巾擦皂澡盆吃忘井村叫毛主席乡亲战士面想告诉就京安广非常壮观接再做各种样伙伴却也趣这太阳道送忙尝香甜温暖该颜因块捉急直河行死信跟忽喊身窝孤单都邻居招呼静怎独跳绳讲羽球戏排篮连运夜思床光疑举望低故胆敢往外勇窗乱偏散原像微端粽节总米间分豆肉带知据念虹座浇提洒挑兴镜拿照千裙首踪迹浮萍泉流爱柔荷露角珠摇躺晶停机透翅膀唱朵腰坡沉伸潮湿呢闷消息搬响具次丢哪新每平她些仔检查所钟丁元迟洗背刚共汽决定已经物虎熊注意遍百舌鬼脸准第猴结掰扛满扔摘捧瓜抱蹦追咕咚熟掉吓羊鹿逃命象野拦领壁墙蚊咬断您拨甩赶房傻转棉娘治燕别干然奇颗瓢碧吐啦要连百还舌点春风雪花飞入姓什双国王方青清气晴情请生字左右红时动万间迷造运池欢网古凉细夕李语香拍打跑足声身体之相近习远玉义吃叫主江住没以多会走北京广过各种样这校金秋为他地河说也听哥单居招呼快乐玩很当音讲行许思床前光低故乡色外看爸晚笑再午节叶米真分豆那着到高兴千成首采无树爱尖角亮机台放鱼朵美直呀边呢吗吧加文次找平办让包共已经坐块非常往瓜进空病医别干奇七星吓怕跟家羊象都捉条爬姐您草房';
  var R71_SIGHT = {};
  (R71_SIGHT_UP + R71_SIGHT_DOWN).split('').forEach(function (c) { R71_SIGHT[c] = 1; });

  /* 支架注音表：预教后仍属超纲的字，阅读页必须在字上标拼音。
     依据 Ehri(2005) 正字法映射 —— 音形同步对齐才能形成自主解码。 */
  var R71_RUBY = {
    '轻': 'qīng', '认': 'rèn', '灰': 'huī', '收': 'shōu', '谢': 'xiè', '完': 'wán',
    '拉': 'lā', '碰': 'pèng', '袋': 'dài', '乖': 'guāi', '萝': 'luó', '卜': 'bo',
    '菜': 'cài', '施': 'shī', '肥': 'féi', '担': 'dàn', '糟': 'zāo', '捞': 'lāo',
    '倒': 'dào', '抬': 'tái', '麦': 'mài', '深': 'shēn', '浅': 'qiǎn', '松': 'sōng',
    '鼠': 'shǔ', '试': 'shì', '啦': 'la', '婆': 'pó', '拔': 'bá', '浇': 'jiāo',
    '台': 'tái', '偷': 'tōu', '油': 'yóu', '咕': 'gū', '噜': 'lū', '叽': 'jī',
    '诗': 'shī', '蝌': 'kē', '蚪': 'dǒu', '逗': 'dòu', '句': 'jù', '省': 'shěng',
    '略': 'lüè', '淅': 'xī', '沥': 'lì', '泡': 'pào', '珠': 'zhū', '串': 'chuàn',
    '青': 'qīng', '蛙': 'wā', '荷': 'hé', '叶': 'yè', '塘': 'táng', '呱': 'guā',
    /* 第二批：狗和猴 / 虹 / 燕子的话 / 三只白鹤 */
    '底': 'dǐ', '橙': 'chéng', '紫': 'zǐ', '屋': 'wū', '檐': 'yán',
    '鹤': 'hè', '埋': 'mái', '记': 'jì'
  };

  /* ------------------------------------------------------------------ *
   * 二、理解策略微课（互惠式教学四策略）
   * ------------------------------------------------------------------ */
  var R71_STRATEGIES = {
    predict: {
      id: 'predict', n: '猜一猜', ic: '🔮', color: '#A66CFF', bg: '#F1E9FF',
      why: '读之前先猜，脑子就开机了。猜错也没关系，重要的是你的脑子在转。',
      steps: ['看封面和题目，猜猜这个故事讲什么', '读到一半，猜猜后面会怎么样', '读完对一对：我猜对了吗？猜错也说说为什么'],
      line: '猜一猜不是考试。猜错了，说明故事和你想的不一样，这更有意思。'
    },
    question: {
      id: 'question', n: '问一问', ic: '❓', color: '#4FC3F7', bg: '#E3F2FD',
      why: '会问问题的孩子，读得更深。问题不用等别人回答，自己也可以找。',
      steps: ['读到不明白的地方，停下来问一句', '问「为什么」「怎么会这样」「然后呢」', '有的问题故事里有答案，有的要自己想'],
      line: '一个好问题，比一个好答案更厉害。'
    },
    clarify: {
      id: 'clarify', n: '理一理', ic: '🔍', color: '#69C98C', bg: '#E8F5E9',
      why: '遇到不懂的词和句子，不要跳过去。跳过去读完了，其实什么也没读到。',
      steps: ['不懂的词，先看图、看前后句猜一猜', '再把那一句读一遍，慢慢读', '还不行就问一问、查一查'],
      line: '读不懂不丢人，装作读懂才可惜。'
    },
    summarize: {
      id: 'summarize', n: '说一说', ic: '🧩', color: '#F28AB2', bg: '#FCE4EC',
      why: '能说出故事讲了什么，才算真的读懂了。说不出来，就回去再读一遍。',
      steps: ['谁？在哪里？', '发生了什么？', '最后怎么样了？', '我觉得……因为……'],
      line: '先说清楚，再说好听。'
    }
  };

  /* ------------------------------------------------------------------ *
   * 三、插画素材（内联 SVG，零外部请求）
   * 儿童向卡通画法：轮廓描边 + 大头小身 + 大眼带高光 + 腮红。
   * 角色与场景共用同一份 inner，避免封面与内页画风不一致。
   * ------------------------------------------------------------------ */
  var R71_FUR = {
    white: { body: '#FFFFFF', line: '#C9A0DC', blush: '#FF9EC4' },
    grey: { body: '#F0EDF5', line: '#9E93B3', blush: '#FF9EC4' },
    brown: { body: '#D9A66C', line: '#9A6B34', blush: '#FF9EC4' },
    orange: { body: '#F5B96A', line: '#B07B26', blush: '#FF9EC4' },
    wolf: { body: '#8E8E9E', line: '#5A5A6B', blush: '#E58AAE' },
    horse: { body: '#E0B07A', line: '#A26B32', blush: '#FF9EC4' },
    goat: { body: '#FAFAF5', line: '#B9B3A6', blush: '#FF9EC4' }
  };

  /* 通用小动物：ear = long（兔）/ round（熊猴）/ point（狐狼马羊） */
  function R71_ANIMAL(fur, ear, opt) {
    var f = R71_FUR[fur] || R71_FUR.white;
    opt = opt || {};
    var ears = '';
    if (ear === 'long') {
      ears = '<ellipse cx="86" cy="44" rx="7.5" ry="25" fill="' + f.body + '" stroke="' + f.line + '" stroke-width="2.6" transform="rotate(-11 86 44)"/>' +
        '<ellipse cx="86" cy="46" rx="3.6" ry="17" fill="#FFD6E8" transform="rotate(-11 86 46)"/>' +
        '<ellipse cx="114" cy="44" rx="7.5" ry="25" fill="' + f.body + '" stroke="' + f.line + '" stroke-width="2.6" transform="rotate(11 114 44)"/>' +
        '<ellipse cx="114" cy="46" rx="3.6" ry="17" fill="#FFD6E8" transform="rotate(11 114 46)"/>';
    } else if (ear === 'round') {
      ears = '<circle cx="76" cy="52" r="12" fill="' + f.body + '" stroke="' + f.line + '" stroke-width="2.6"/>' +
        '<circle cx="76" cy="52" r="5.5" fill="#FFD6E8"/>' +
        '<circle cx="124" cy="52" r="12" fill="' + f.body + '" stroke="' + f.line + '" stroke-width="2.6"/>' +
        '<circle cx="124" cy="52" r="5.5" fill="#FFD6E8"/>';
    } else if (ear === 'point') {
      ears = '<path d="M74 50 L66 26 L88 40 Z" fill="' + f.body + '" stroke="' + f.line + '" stroke-width="2.6" stroke-linejoin="round"/>' +
        '<path d="M126 50 L134 26 L112 40 Z" fill="' + f.body + '" stroke="' + f.line + '" stroke-width="2.6" stroke-linejoin="round"/>';
    }
    return '<g>' +
      '<ellipse cx="100" cy="120" rx="25" ry="7" fill="#00000010"/>' +
      ears +
      '<ellipse cx="100" cy="112" rx="23" ry="19" fill="' + f.body + '" stroke="' + f.line + '" stroke-width="2.6"/>' +
      '<circle cx="100" cy="78" r="34" fill="' + f.body + '" stroke="' + f.line + '" stroke-width="2.6"/>' +
      '<circle cx="88" cy="76" r="8.6" fill="#3A2B4D"/><circle cx="112" cy="76" r="8.6" fill="#3A2B4D"/>' +
      '<circle cx="90.6" cy="72.8" r="3.1" fill="#FFF"/><circle cx="114.6" cy="72.8" r="3.1" fill="#FFF"/>' +
      '<ellipse cx="76" cy="88" rx="8" ry="5.4" fill="' + f.blush + '" opacity=".5"/>' +
      '<ellipse cx="124" cy="88" rx="8" ry="5.4" fill="' + f.blush + '" opacity=".5"/>' +
      '<path d="M100 84 l-4.2 4 h8.4 z" fill="#FF8FB1" stroke="#E56A93" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M100 88.5 v2.6 M100 91.1 q-4.6 4.6 -8.4 .8 M100 91.1 q4.6 4.6 8.4 .8" stroke="' + f.line + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      (opt.belly ? '<ellipse cx="100" cy="112" rx="13" ry="11" fill="#FFF" opacity=".55"/>' : '') +
      '</g>';
  }

  /* 通用人物：老人 / 孩子 */
  function R71_HUMAN(opt) {
    opt = opt || {};
    var skin = opt.skin || '#FFE0BD', cloth = opt.cloth || '#7FB8E8', hair = opt.hair || '#D9D9D9';
    return '<g>' +
      '<ellipse cx="100" cy="120" rx="24" ry="6.5" fill="#00000010"/>' +
      '<path d="M76 118 q24 -12 48 0 v6 h-48 z" fill="' + cloth + '" stroke="#4C7FB0" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<rect x="86" y="94" width="28" height="26" rx="12" fill="' + cloth + '" stroke="#4C7FB0" stroke-width="2.6"/>' +
      '<circle cx="100" cy="78" r="31" fill="' + skin + '" stroke="#D9A06A" stroke-width="2.6"/>' +
      '<path d="M69 74 q31 -30 62 0 q-6 -22 -31 -22 q-25 0 -31 22 z" fill="' + hair + '" stroke="#B8B8B8" stroke-width="2"/>' +
      '<circle cx="89" cy="76" r="8.2" fill="#3A2B4D"/><circle cx="111" cy="76" r="8.2" fill="#3A2B4D"/>' +
      '<circle cx="91.4" cy="73" r="3" fill="#FFF"/><circle cx="113.4" cy="73" r="3" fill="#FFF"/>' +
      '<ellipse cx="78" cy="87" rx="7.4" ry="5" fill="#FF9EC4" opacity=".45"/>' +
      '<ellipse cx="122" cy="87" rx="7.4" ry="5" fill="#FF9EC4" opacity=".45"/>' +
      '<path d="M92 92 q8 6 16 0" stroke="#C4703F" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      (opt.beard ? '<path d="M84 96 q16 22 32 0 q-4 18 -16 18 q-12 0 -16 -18 z" fill="#EDEDED" stroke="#C9C9C9" stroke-width="2"/>' : '') +
      '</g>';
  }

  /* 专用角色：小老鼠 / 小蝌蚪 / 水泡泡（新童谣与童话用）
     遵循儿童向卡通铁律：轮廓描边用主色深色调、大头小身、大眼带高光、卡通腮红。 */
  function R71_MOUSE() {
    var body = '#C9C3D6', line = '#7C7391';
    return '<g>' +
      '<ellipse cx="100" cy="121" rx="26" ry="6.5" fill="#00000010"/>' +
      '<path d="M118 114 q30 6 40 -8" stroke="' + line + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="70" cy="52" r="17" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      '<circle cx="70" cy="52" r="8.5" fill="#FFD6E8"/>' +
      '<circle cx="130" cy="52" r="17" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      '<circle cx="130" cy="52" r="8.5" fill="#FFD6E8"/>' +
      '<ellipse cx="100" cy="112" rx="24" ry="20" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      '<ellipse cx="100" cy="113" rx="13" ry="11" fill="#FFF" opacity=".5"/>' +
      '<circle cx="100" cy="79" r="34" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      '<circle cx="88" cy="77" r="8.8" fill="#3A2B4D"/><circle cx="112" cy="77" r="8.8" fill="#3A2B4D"/>' +
      '<circle cx="90.8" cy="73.6" r="3.2" fill="#FFF"/><circle cx="114.8" cy="73.6" r="3.2" fill="#FFF"/>' +
      '<ellipse cx="75" cy="90" rx="8" ry="5.4" fill="#FF9EC4" opacity=".5"/>' +
      '<ellipse cx="125" cy="90" rx="8" ry="5.4" fill="#FF9EC4" opacity=".5"/>' +
      '<ellipse cx="100" cy="92" rx="4.6" ry="3.6" fill="#FF8FB1" stroke="#E56A93" stroke-width="1.4"/>' +
      '<path d="M100 95.6 v2.4 M100 98 q-4.4 4.4 -8 .8 M100 98 q4.4 4.4 8 .8" stroke="' + line + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M92 88 h-14 M92 92.6 h-14 M108 88 h14 M108 92.6 h14" stroke="' + line + '" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>' +
      '</g>';
  }

  function R71_TADPOLE() {
    var body = '#4A5568', line = '#2D3748';
    return '<g>' +
      '<ellipse cx="100" cy="122" rx="24" ry="6" fill="#00000010"/>' +
      '<path d="M118 108 q26 10 42 -6 q-16 24 -42 14 z" fill="' + body + '" stroke="' + line + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<circle cx="100" cy="86" r="36" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      '<circle cx="100" cy="84" r="36" fill="#5A6478" opacity=".35"/>' +
      '<circle cx="87" cy="82" r="9.4" fill="#FFF"/><circle cx="113" cy="82" r="9.4" fill="#FFF"/>' +
      '<circle cx="88.6" cy="83" r="6" fill="#2D3748"/><circle cx="112.6" cy="83" r="6" fill="#2D3748"/>' +
      '<circle cx="90.4" cy="80.6" r="2.2" fill="#FFF"/><circle cx="114.4" cy="80.6" r="2.2" fill="#FFF"/>' +
      '<ellipse cx="72" cy="94" rx="7.4" ry="5" fill="#FF9EC4" opacity=".45"/>' +
      '<ellipse cx="128" cy="94" rx="7.4" ry="5" fill="#FF9EC4" opacity=".45"/>' +
      '<path d="M93 98 q7 6 14 0" stroke="#1F2937" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '</g>';
  }

  function R71_BUBBLE() {
    return '<g>' +
      '<ellipse cx="100" cy="122" rx="24" ry="6" fill="#00000010"/>' +
      '<circle cx="100" cy="86" r="38" fill="#CFEFFF" stroke="#5EA8CC" stroke-width="2.8"/>' +
      '<circle cx="100" cy="86" r="38" fill="#FFFFFF" opacity=".28"/>' +
      '<path d="M78 66 q10 -14 26 -12" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>' +
      '<circle cx="124" cy="104" r="6" fill="#FFFFFF" opacity=".7"/>' +
      '<circle cx="87" cy="84" r="9.4" fill="#FFF"/><circle cx="113" cy="84" r="9.4" fill="#FFF"/>' +
      '<circle cx="88.6" cy="85" r="6" fill="#2D3748"/><circle cx="112.6" cy="85" r="6" fill="#2D3748"/>' +
      '<circle cx="90.4" cy="82.6" r="2.2" fill="#FFF"/><circle cx="114.4" cy="82.6" r="2.2" fill="#FFF"/>' +
      '<ellipse cx="73" cy="96" rx="7.4" ry="5" fill="#FF9EC4" opacity=".5"/>' +
      '<ellipse cx="127" cy="96" rx="7.4" ry="5" fill="#FF9EC4" opacity=".5"/>' +
      '<path d="M93 99 q7 6 14 0" stroke="#3E7A99" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '</g>';
  }

  function R71_FROG() {
    var body = '#7FD48F', line = '#3E9A56';
    return '<g>' +
      '<ellipse cx="100" cy="122" rx="28" ry="6.5" fill="#00000010"/>' +
      '<ellipse cx="100" cy="110" rx="30" ry="24" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      '<ellipse cx="100" cy="112" rx="16" ry="13" fill="#FFF" opacity=".45"/>' +
      '<path d="M70 118 q-14 8 -20 2 q6 -10 20 -8 z" fill="' + body + '" stroke="' + line + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M130 118 q14 8 20 2 q-6 -10 -20 -8 z" fill="' + body + '" stroke="' + line + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<circle cx="100" cy="66" r="38" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      '<circle cx="76" cy="40" r="15" fill="#FFFFFF" stroke="' + line + '" stroke-width="2.6"/>' +
      '<circle cx="124" cy="40" r="15" fill="#FFFFFF" stroke="' + line + '" stroke-width="2.6"/>' +
      '<circle cx="76" cy="42" r="8.6" fill="#3A2B4D"/><circle cx="124" cy="42" r="8.6" fill="#3A2B4D"/>' +
      '<circle cx="78.4" cy="39" r="3.1" fill="#FFF"/><circle cx="126.4" cy="39" r="3.1" fill="#FFF"/>' +
      '<ellipse cx="72" cy="80" rx="8.4" ry="5.6" fill="#FF9EC4" opacity=".5"/>' +
      '<ellipse cx="128" cy="80" rx="8.4" ry="5.6" fill="#FF9EC4" opacity=".5"/>' +
      '<path d="M80 78 q20 18 40 0" stroke="#2E7A44" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '</g>';
  }

  /* 专用角色（第二批）：小狗 / 燕子 / 白鹤
     同样遵循儿童向卡通铁律：轮廓描边 + 大头小身 + 大眼带高光 + 卡通腮红。 */
  function R71_DOG() {
    var body = '#E8C08A', line = '#A9773C';
    return '<g>' +
      '<ellipse cx="100" cy="122" rx="27" ry="6.5" fill="#00000010"/>' +
      /* 尾巴（摇起来） */
      '<path d="M126 106 q22 -6 24 -24" stroke="' + line + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      /* 身体 */
      '<ellipse cx="100" cy="110" rx="27" ry="21" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      '<ellipse cx="100" cy="112" rx="15" ry="12" fill="#FFF" opacity=".45"/>' +
      /* 前爪 */
      '<ellipse cx="82" cy="126" rx="9" ry="6" fill="#FFF" stroke="' + line + '" stroke-width="2.2"/>' +
      '<ellipse cx="118" cy="126" rx="9" ry="6" fill="#FFF" stroke="' + line + '" stroke-width="2.2"/>' +
      /* 耳朵（垂耳） */
      '<ellipse cx="66" cy="52" rx="12" ry="20" fill="' + line + '" stroke="' + line + '" stroke-width="2.4" transform="rotate(-14 66 52)"/>' +
      '<ellipse cx="134" cy="52" rx="12" ry="20" fill="' + line + '" stroke="' + line + '" stroke-width="2.4" transform="rotate(14 134 52)"/>' +
      /* 头 */
      '<circle cx="100" cy="76" r="36" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      /* 眼睛 */
      '<circle cx="87" cy="72" r="9" fill="#3A2B4D"/><circle cx="113" cy="72" r="9" fill="#3A2B4D"/>' +
      '<circle cx="89.4" cy="68.6" r="3.2" fill="#FFF"/><circle cx="115.4" cy="68.6" r="3.2" fill="#FFF"/>' +
      /* 腮红 */
      '<ellipse cx="72" cy="88" rx="8.4" ry="5.6" fill="#FF9EC4" opacity=".5"/>' +
      '<ellipse cx="128" cy="88" rx="8.4" ry="5.6" fill="#FF9EC4" opacity=".5"/>' +
      /* 口鼻（狗的黑鼻头 + 舌头） */
      '<ellipse cx="100" cy="88" rx="13" ry="10" fill="#FFF6E8" stroke="' + line + '" stroke-width="2.2"/>' +
      '<ellipse cx="100" cy="84" rx="5.4" ry="4.2" fill="#4A3728"/>' +
      '<path d="M100 88 v4 M100 92 q-5 5 -9 1 M100 92 q5 5 9 1" stroke="' + line + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M96 98 q4 8 8 0 z" fill="#FF8FB1" stroke="#E56A93" stroke-width="1.6" stroke-linejoin="round"/>' +
      '</g>';
  }

  function R71_SWALLOW() {
    var body = '#3E4A6B', line = '#232C46';
    return '<g>' +
      '<ellipse cx="100" cy="122" rx="24" ry="6" fill="#00000010"/>' +
      /* 剪刀尾（燕子的标志） */
      '<path d="M118 104 l30 -12 l-14 16 l14 12 z" fill="' + body + '" stroke="' + line + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      /* 身体 */
      '<ellipse cx="100" cy="106" rx="26" ry="19" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      /* 白肚子 */
      '<ellipse cx="100" cy="110" rx="15" ry="12" fill="#FFF8E8" stroke="' + line + '" stroke-width="1.8"/>' +
      /* 翅膀 */
      '<path d="M76 100 q-22 -6 -30 8 q18 6 30 -2 z" fill="#4A5880" stroke="' + line + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      /* 头 */
      '<circle cx="100" cy="72" r="34" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      /* 橙红的额头斑 */
      '<path d="M100 40 q10 8 0 16 q-10 -8 0 -16 z" fill="#E8734A" opacity=".9"/>' +
      /* 眼睛 */
      '<circle cx="87" cy="70" r="8.8" fill="#FFF"/><circle cx="113" cy="70" r="8.8" fill="#FFF"/>' +
      '<circle cx="88" cy="71" r="6" fill="#232C46"/><circle cx="112" cy="71" r="6" fill="#232C46"/>' +
      '<circle cx="89.8" cy="68.6" r="2.4" fill="#FFF"/><circle cx="113.8" cy="68.6" r="2.4" fill="#FFF"/>' +
      /* 腮红 */
      '<ellipse cx="70" cy="84" rx="7.6" ry="5" fill="#FF9EC4" opacity=".5"/>' +
      '<ellipse cx="130" cy="84" rx="7.6" ry="5" fill="#FF9EC4" opacity=".5"/>' +
      /* 黄色小尖嘴 */
      '<path d="M100 78 l-11 7 l11 6 l11 -6 z" fill="#FFC24A" stroke="#D99A20" stroke-width="2" stroke-linejoin="round"/>' +
      '</g>';
  }

  function R71_CRANE() {
    var body = '#FFFFFF', line = '#B9B3C9';
    return '<g>' +
      '<ellipse cx="100" cy="122" rx="24" ry="6" fill="#00000010"/>' +
      /* 长腿 */
      '<path d="M88 118 v14 M112 118 v14" stroke="#E8734A" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M80 132 h14 M104 132 h14" stroke="#E8734A" stroke-width="3.4" stroke-linecap="round"/>' +
      /* 身体 */
      '<ellipse cx="100" cy="104" rx="26" ry="20" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      /* 翅膀 */
      '<path d="M78 100 q-8 16 8 22 q8 -12 -8 -22 z" fill="#F5F2FA" stroke="' + line + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      /* 尾羽 */
      '<path d="M124 100 q16 6 22 -4 q-14 16 -24 8 z" fill="' + line + '" stroke="' + line + '" stroke-width="2" stroke-linejoin="round"/>' +
      /* 头 */
      '<circle cx="100" cy="70" r="33" fill="' + body + '" stroke="' + line + '" stroke-width="2.6"/>' +
      /* 丹顶（白鹤标志） */
      '<circle cx="100" cy="41" r="8" fill="#E85D5D" stroke="#B73A3A" stroke-width="2"/>' +
      /* 眼睛 */
      '<circle cx="88" cy="68" r="8.4" fill="#FFF" stroke="' + line + '" stroke-width="1.4"/>' +
      '<circle cx="112" cy="68" r="8.4" fill="#FFF" stroke="' + line + '" stroke-width="1.4"/>' +
      '<circle cx="89" cy="69" r="5.6" fill="#2D3748"/><circle cx="111" cy="69" r="5.6" fill="#2D3748"/>' +
      '<circle cx="90.6" cy="66.8" r="2.2" fill="#FFF"/><circle cx="112.6" cy="66.8" r="2.2" fill="#FFF"/>' +
      /* 腮红 */
      '<ellipse cx="70" cy="82" rx="7.6" ry="5" fill="#FF9EC4" opacity=".5"/>' +
      '<ellipse cx="130" cy="82" rx="7.6" ry="5" fill="#FF9EC4" opacity=".5"/>' +
      /* 长尖嘴 */
      '<path d="M100 76 l-8 8 l8 7 l8 -7 z" fill="#FFC24A" stroke="#D99A20" stroke-width="2" stroke-linejoin="round"/>' +
      '</g>';
  }

  var R71_ART = {
    rabbit: R71_ANIMAL('white', 'long', { belly: true }),
    rabbitGrey: R71_ANIMAL('grey', 'long', { belly: true }),
    wolf: R71_ANIMAL('wolf', 'point'),
    monkey: R71_ANIMAL('brown', 'round', { belly: true }),
    horse: R71_ANIMAL('horse', 'point'),
    goat: R71_ANIMAL('goat', 'point'),
    grandpa: R71_HUMAN({ hair: '#D9D9D9', cloth: '#8FBF8F', beard: true }),
    child: R71_HUMAN({ hair: '#4A3728', cloth: '#F5A6C0' }),
    mouse: R71_MOUSE(),
    tadpole: R71_TADPOLE(),
    bubble: R71_BUBBLE(),
    frog: R71_FROG(),
    dog: R71_DOG(),
    swallow: R71_SWALLOW(),
    crane: R71_CRANE()
  };

  /* 场景背景（放在角色后面的简单装饰），统一 200×140 画布 */
  var R71_BG = {
    door: '<rect x="0" y="0" width="200" height="140" fill="#FFF7E6"/>' +
      '<path d="M0 104 h200 v36 h-200 z" fill="#E8D7B8"/>' +
      '<rect x="108" y="34" width="66" height="76" rx="6" fill="#C99A62" stroke="#9A6B34" stroke-width="3"/>' +
      '<circle cx="122" cy="72" r="4" fill="#FFD567" stroke="#B98B1F" stroke-width="1.6"/>' +
      '<circle cx="168" cy="22" r="13" fill="#FFE9A8" stroke="#F0C948" stroke-width="2"/>',
    snow: '<rect x="0" y="0" width="200" height="140" fill="#EAF4FF"/>' +
      '<path d="M0 108 q40 -16 80 -4 q44 14 120 -6 v42 h-200 z" fill="#FFFFFF"/>' +
      '<circle cx="34" cy="26" r="3" fill="#FFF"/><circle cx="70" cy="44" r="2.4" fill="#FFF"/>' +
      '<circle cx="150" cy="30" r="2.8" fill="#FFF"/><circle cx="176" cy="60" r="2.2" fill="#FFF"/>',
    field: '<rect x="0" y="0" width="200" height="140" fill="#EAF7E4"/>' +
      '<path d="M0 100 q50 -14 100 0 q52 14 100 -4 v44 h-200 z" fill="#BEE0A8"/>' +
      '<path d="M22 96 q4 -26 0 -40 M30 96 q6 -22 2 -36 M14 96 q-2 -20 2 -34" stroke="#7FBF6A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    well: '<rect x="0" y="0" width="200" height="140" fill="#E9F3FB"/>' +
      '<path d="M0 100 q56 -12 100 2 q48 14 100 -6 v44 h-200 z" fill="#C6DFA6"/>' +
      '<ellipse cx="150" cy="98" rx="34" ry="14" fill="#8FB8D9" stroke="#5E8AAE" stroke-width="3"/>' +
      '<ellipse cx="150" cy="98" rx="24" ry="8" fill="#3E6E93"/>' +
      '<ellipse cx="150" cy="97" rx="11" ry="4" fill="#FFF6C9"/>' +
      '<path d="M118 96 v-42 h64 v42" stroke="#9A6B34" stroke-width="4" fill="none"/>',
    river: '<rect x="0" y="0" width="200" height="140" fill="#EAF4FF"/>' +
      '<path d="M0 88 q52 -12 100 0 q50 12 100 -2 v54 h-200 z" fill="#A8D8F0" stroke="#6FAFCF" stroke-width="2"/>' +
      '<path d="M14 108 q18 -6 34 0 M92 116 q18 -6 34 0 M150 106 q16 -5 30 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M0 86 q46 -10 100 0 q50 10 100 -2" stroke="#7FBF6A" stroke-width="3" fill="none"/>',
    night: '<rect x="0" y="0" width="200" height="140" fill="#2B2450"/>' +
      '<circle cx="46" cy="34" r="14" fill="#FFF6C9"/><circle cx="38" cy="30" r="12" fill="#2B2450"/>' +
      '<circle cx="140" cy="26" r="2.6" fill="#FFF"/><circle cx="170" cy="46" r="2" fill="#FFF"/>' +
      '<circle cx="92" cy="18" r="2.2" fill="#FFF"/>' +
      '<path d="M0 112 q56 -12 100 0 q48 12 100 -6 v34 h-200 z" fill="#1C1838"/>',
    home: '<rect x="0" y="0" width="200" height="140" fill="#FFF3E0"/>' +
      '<path d="M0 104 h200 v36 h-200 z" fill="#E8D7B8"/>' +
      '<path d="M126 62 l34 -26 l34 26 z" fill="#E57373" stroke="#B7472A" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<rect x="136" y="62" width="48" height="42" fill="#FFE0B2" stroke="#B7472A" stroke-width="2.6"/>',
    garden: '<rect x="0" y="0" width="200" height="140" fill="#FFF8E1"/>' +
      '<path d="M0 102 q52 -14 100 0 q50 14 100 -4 v42 h-200 z" fill="#CDE8B0"/>' +
      '<circle cx="40" cy="92" r="12" fill="#FF8FB1" stroke="#D9557E" stroke-width="2.4"/>' +
      '<circle cx="40" cy="92" r="4" fill="#FFF6C9"/>' +
      '<circle cx="176" cy="98" r="10" fill="#FFB3C9" stroke="#D9557E" stroke-width="2.4"/>',
    /* 灯台（小老鼠）：暖光小夜灯氛围 */
    lamp: '<rect x="0" y="0" width="200" height="140" fill="#3A3358"/>' +
      '<circle cx="140" cy="46" r="52" fill="#FFE9A8" opacity=".16"/>' +
      '<rect x="0" y="112" width="200" height="28" fill="#2A2445"/>' +
      '<rect x="130" y="86" width="20" height="26" rx="3" fill="#B98B4F" stroke="#8A6432" stroke-width="2.4"/>' +
      '<path d="M120 86 h40 l-6 -12 h-28 z" fill="#D9A86C" stroke="#8A6432" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<ellipse cx="140" cy="70" rx="11" ry="14" fill="#FFF0B8" stroke="#E8B23A" stroke-width="2.4"/>' +
      '<ellipse cx="140" cy="68" rx="5" ry="7.5" fill="#FFD24A"/>' +
      '<circle cx="42" cy="30" r="2.4" fill="#FFF" opacity=".7"/>' +
      '<circle cx="70" cy="52" r="1.8" fill="#FFF" opacity=".5"/>',
    /* 池塘（青蛙写诗）：水面 + 荷叶 */
    pond: '<rect x="0" y="0" width="200" height="140" fill="#E6F6FF"/>' +
      '<path d="M0 62 q50 -12 100 0 q50 12 100 -2 v80 h-200 z" fill="#A8D8F0" stroke="#6FAFCF" stroke-width="2"/>' +
      '<path d="M16 84 q18 -6 34 0 M78 96 q18 -6 34 0 M138 78 q16 -5 30 0 M40 116 q18 -6 34 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="150" cy="112" rx="34" ry="14" fill="#7FBF6A" stroke="#4E8F42" stroke-width="2.4"/>' +
      '<path d="M150 112 l16 -8" stroke="#4E8F42" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="176" cy="90" r="3" fill="#CFEFFF" stroke="#5EA8CC" stroke-width="1.6"/>' +
      '<circle cx="186" cy="76" r="2.2" fill="#CFEFFF" stroke="#5EA8CC" stroke-width="1.6"/>' +
      '<path d="M0 58 q46 -10 100 0 q50 10 100 -2" stroke="#8FCF7A" stroke-width="3" fill="none"/>' +
      '<path d="M30 56 q-4 -22 -10 -30 M40 56 q2 -20 10 -28" stroke="#6BAF5A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    /* 小桥（狗和猴）：桥面 + 栏杆，角色站在桥上 */
    bridge: '<rect x="0" y="0" width="200" height="140" fill="#EAF4FF"/>' +
      '<path d="M0 96 q50 -12 100 0 q50 12 100 -2 v46 h-200 z" fill="#A8D8F0" stroke="#6FAFCF" stroke-width="2"/>' +
      '<path d="M18 108 q18 -6 34 0 M96 114 q18 -6 34 0 M146 104 q16 -5 30 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M0 96 q46 -10 100 0 q50 10 100 -2" stroke="#7FBF6A" stroke-width="3" fill="none"/>' +
      /* 桥面（拱形） */
      '<path d="M12 92 q88 -34 176 0 v10 q-88 -32 -176 0 z" fill="#D9A86C" stroke="#9A6B34" stroke-width="2.6" stroke-linejoin="round"/>' +
      /* 栏杆立柱 */
      '<path d="M30 84 v-18 M70 70 v-16 M130 70 v-16 M170 84 v-18" stroke="#B98B4F" stroke-width="3.4" stroke-linecap="round"/>' +
      /* 扶手 */
      '<path d="M30 66 q70 -26 140 0" stroke="#B98B4F" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="40" cy="24" r="12" fill="#FFF6C9" stroke="#F0C948" stroke-width="2"/>',
    /* 屋檐（燕子的话）：老屋的檐下 */
    eave: '<rect x="0" y="0" width="200" height="140" fill="#FFF7E6"/>' +
      '<path d="M0 118 h200 v22 h-200 z" fill="#E8D7B8"/>' +
      /* 屋瓦（斜面） */
      '<path d="M-6 40 h212 l-14 -20 h-184 z" fill="#C97B5A" stroke="#9A4E32" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M14 40 v18 h172 v-18" fill="#FFE0B2" stroke="#9A4E32" stroke-width="2.6"/>' +
      /* 瓦楞 */
      '<path d="M40 20 v20 M72 20 v20 M104 20 v20 M136 20 v20 M168 20 v20" stroke="#B0603F" stroke-width="2" opacity=".7"/>' +
      /* 檐下的燕子窝 */
      '<path d="M138 58 q16 0 16 14 q-16 6 -32 0 q0 -14 16 -14 z" fill="#B98B4F" stroke="#8A6432" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M126 70 q12 6 24 0" stroke="#8A6432" stroke-width="2" fill="none"/>' +
      '<path d="M20 122 q4 -18 0 -28 M30 122 q5 -16 1 -26" stroke="#7FBF6A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    /* 河边浅滩（三只白鹤）：水边 + 大树 */
    shore: '<rect x="0" y="0" width="200" height="140" fill="#EAF7E4"/>' +
      '<path d="M0 100 q50 -12 100 0 q52 12 100 -4 v44 h-200 z" fill="#A8D8F0" stroke="#6FAFCF" stroke-width="2"/>' +
      '<path d="M20 116 q18 -6 34 0 M108 118 q18 -6 34 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M0 98 q46 -10 100 0 q50 10 100 -4" stroke="#8FCF7A" stroke-width="3" fill="none"/>' +
      /* 大树 */
      '<rect x="156" y="42" width="12" height="58" rx="4" fill="#A9773C" stroke="#7A5525" stroke-width="2.4"/>' +
      '<circle cx="162" cy="36" r="26" fill="#8FCF7A" stroke="#4E8F3C" stroke-width="2.6"/>' +
      '<circle cx="144" cy="46" r="17" fill="#7FBF6A" stroke="#4E8F3C" stroke-width="2.4"/>' +
      '<circle cx="180" cy="46" r="16" fill="#7FBF6A" stroke="#4E8F3C" stroke-width="2.4"/>' +
      '<circle cx="162" cy="30" r="5" fill="#4E8F3C" opacity=".35"/>'
  };

  /* 道具（叠加在场景之上） */
  var R71_PROP = {
    radish: '<g transform="translate(126,54) scale(.9)">' +
      '<path d="M24 8 q22 34 0 62 q-22 -28 0 -62 z" fill="#F2F2F7" stroke="#B9B3C9" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M24 16 q10 24 0 44" stroke="#D9D4E8" stroke-width="2" fill="none"/>' +
      '<path d="M24 10 q-4 -16 -14 -20 q10 8 10 20 z" fill="#7FBF6A" stroke="#4E8F3C" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M24 10 q0 -18 6 -22 q-2 12 0 22 z" fill="#8FCF7A" stroke="#4E8F3C" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M24 10 q6 -14 16 -16 q-10 8 -10 18 z" fill="#7FBF6A" stroke="#4E8F3C" stroke-width="2.2" stroke-linejoin="round"/>' +
      '</g>',
    cabbage: '<g transform="translate(132,62) scale(.85)">' +
      '<circle cx="26" cy="30" r="26" fill="#EAF7E4" stroke="#6FAF6A" stroke-width="2.6"/>' +
      '<path d="M26 6 q-14 22 0 48 M26 6 q14 22 0 48 M8 22 q18 10 36 0" stroke="#8FCF7A" stroke-width="2.4" fill="none"/>' +
      '</g>',
    moon: '<g><circle cx="160" cy="26" r="15" fill="#FFF6C9" stroke="#F0C948" stroke-width="2.4"/>' +
      '<circle cx="154" cy="22" r="3" fill="#F5E08A"/><circle cx="166" cy="32" r="2.4" fill="#F5E08A"/></g>',
    basket: '<g transform="translate(138,88) scale(.8)">' +
      '<path d="M4 12 h48 l-6 30 h-36 z" fill="#E0B07A" stroke="#9A6B34" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M4 12 q24 -18 48 0" stroke="#9A6B34" stroke-width="2.6" fill="none"/>' +
      '<path d="M14 20 v20 M26 20 v22 M38 20 v20" stroke="#B98B4F" stroke-width="2" fill="none"/>' +
      '</g>',
    /* 鱼（三只白鹤）：埋在树下的那堆鱼 */
    fish: '<g transform="translate(126,96) scale(.85)">' +
      '<path d="M6 16 q16 -14 34 0 q-16 14 -34 0 z" fill="#9FD8E8" stroke="#4E8FAD" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M40 16 l12 -8 v16 z" fill="#7FC8DE" stroke="#4E8FAD" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<circle cx="14" cy="14" r="2.6" fill="#2D3748"/>' +
      '<path d="M6 16 q-6 -6 -8 0 q2 6 8 0 z" fill="#7FC8DE" stroke="#4E8FAD" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M20 8 q6 8 0 16" stroke="#4E8FAD" stroke-width="1.8" fill="none"/>' +
      '</g>'
  };

  /* 把角色放进场景：统一 200×140 画布，角色居中偏左，留出叙事空间 */
  function r71Scene(role, bg, opt) {
    opt = opt || {};
    var g = R71_ART[role] || R71_ART.rabbit;
    var x = opt.x === undefined ? 46 : opt.x, y = opt.y === undefined ? 16 : opt.y;
    var s = opt.s || 1;
    var extra = opt.extra || '';
    return '<svg viewBox="0 0 200 140" class="r71-svg" role="img" aria-label="' + (opt.alt || '故事插图') + '">' +
      (R71_BG[bg] || '') + extra +
      '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' + g + '</g>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------ *
   * 四、书目数据（5 本 MVP）
   * 选篇：统编版一年级「和大人一起读」正式篇目，均为民间故事/传统儿歌
   * （公共领域），可安全分发。type 决定生字率标准（rhyme 儿歌 / story 故事）。
   * 所有文本均已按识字表基线降难改写，实测生字率见 _rate_check.js。
   * ------------------------------------------------------------------ */
  var R71_BOOKS = [
    /* ============ 1. 小兔子乖乖（L1 · 传统儿歌 · 安全） ============ */
    {
      id: 'l1_rabbit',
      title: '小兔子乖乖',
      sub: '传统儿歌',
      band: 'L1',
      type: 'rhyme',
      theme: '安全 · 自我保护',
      emoji: '🐰',
      art: 'rabbit', artBg: 'door',
      textbook: '一年级上册 · 和大人一起读',
      minutes: 6,
      chars: { newChars: ['轻', '认'], preCovered: ['乖'], rawRate: 0.074, rate: 0.032 },
      strategy: 'predict',
      goal: '能分清「妈妈的声音」和「别人的声音」，知道不能给陌生人开门。',
      bigIdea: '遇到不确定的事，先问清楚、先等一等，比马上行动更安全。',
      vocab: [
        { w: '乖乖', py: 'guāi guāi', emoji: '🥰', def: '听话、懂事的样子。大人常这样叫喜欢的小孩。', sent: '小兔子乖乖，坐在门口等妈妈。' },
        { w: '开开', py: 'kāi kāi', emoji: '🚪', def: '把门打开。这里连着说两遍，是儿歌好听的节奏。', sent: '把门儿开开，我要进来。' },
        { w: '进来', py: 'jìn lái', emoji: '➡️', def: '从外面走到里面。', sent: '请进来坐一坐。' },
        { w: '谁', py: 'shéi', emoji: '❔', def: '问是哪一个人。', sent: '门外是谁呀？' }
      ],
      pages: [
        { n: 1, art: 'rabbit', bg: 'door', text: '小兔子乖乖，把门儿开开。', py: ['xiǎo', 'tù', 'zi', 'guāi', 'guāi', 'bǎ', 'mén', 'ér', 'kāi', 'kāi'], lines: ['小兔子乖乖，', '把门儿开开。'], ask: { t: 'predict', q: '这是谁在说话呢？猜猜看。', hint: '听听声音是妈妈，还是别人？' } },
        { n: 2, art: 'rabbit', bg: 'door', text: '快点儿开开，我要进来。', py: ['kuài', 'diǎn', 'ér', 'kāi', 'kāi', 'wǒ', 'yào', 'jìn', 'lái'], lines: ['快点儿开开，', '我要进来。'], ask: { t: 'question', q: '他说「快点儿」，为什么这么着急？', hint: '妈妈回家会这么着急吗？' } },
        { n: 3, art: 'rabbit', bg: 'door', text: '不开不开我不开，妈妈没回来，谁来也不开。', py: ['bù', 'kāi', 'bu', 'kāi', 'wǒ', 'bù', 'kāi', 'mā', 'ma', 'méi', 'huí', 'lái', 'shuí', 'lái', 'yě', 'bù', 'kāi'], lines: ['不开不开我不开，', '妈妈没回来，', '谁来也不开。'], ask: { t: 'predict', q: '小兔子会开门吗？你先猜，再往下看。', hint: '小兔子心里有一把尺子：妈妈没回来。' } },
        { n: 4, art: 'rabbit', bg: 'home', text: '兔妈妈回来了。她轻轻唱：小兔子乖乖，把门儿开开。', py: ['tù', 'mā', 'ma', 'huí', 'lái', 'le', 'tā', 'qīng', 'qīng', 'chàng', 'xiǎo', 'tù', 'zi', 'guāi', 'guāi', 'bǎ', 'mén', 'ér', 'kāi', 'kāi'], lines: ['兔妈妈回来了。', '她轻轻唱：', '小兔子乖乖，把门儿开开。'], ask: { t: 'clarify', q: '妈妈的声音和刚才的声音，一样吗？', hint: '一个是「快点儿」，一个是「轻轻唱」。' } },
        { n: 5, art: 'rabbit', bg: 'home', text: '就开就开我就开，妈妈回来了，这就把门开。', py: ['jiù', 'kāi', 'jiù', 'kāi', 'wǒ', 'jiù', 'kāi', 'mā', 'ma', 'huí', 'lái', 'le', 'zhè', 'jiù', 'bǎ', 'mén', 'kāi'], lines: ['就开就开我就开，', '妈妈回来了，', '这就把门开。'], ask: { t: 'summarize', q: '小兔子为什么这次开门了？', hint: '因为门外是——' } },
        { n: 6, art: 'rabbit', bg: 'home', text: '兔妈妈抱住小兔子说：你做得对。不认准人，门就不开。', py: ['tù', 'mā', 'ma', 'bào', 'zhù', 'xiǎo', 'tù', 'zi', 'shuō', 'nǐ', 'zuò', 'dé', 'duì', 'bú', 'rèn', 'zhǔn', 'rén', 'mén', 'jiù', 'bù', 'kāi'], lines: ['兔妈妈抱住小兔子说：', '你做得对。', '不认准人，门就不开。'], ask: { t: 'summarize', q: '这个故事想告诉我们什么？用自己的话说一说。', hint: '和「开门」有关的一件事。' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '故事里有谁？还有谁在门外？',
          '小兔子在什么地方？',
          '门外的人说了什么？小兔子怎么回答的？',
          '最后谁回来了？小兔子开门了吗？',
          '如果你是小兔子，你会怎么做？为什么？'
        ],
        sample: '有一天，小兔子一个人在家。门外有人叫它开门，还说「快点儿」。小兔子没有开，因为妈妈还没回来。后来妈妈回来了，轻轻唱歌，小兔子就开门了。我觉得小兔子很聪明，因为它记住了妈妈的声音。'
      },
      parent: {
        before: '和孩子一起看封面，问一句：「你猜门外是谁？」不要急着说答案，让孩子先猜。',
        during: '读到第 3 页时停一下，问：「如果你是小兔子，你开不开门？」让孩子说完理由再往下读。',
        after: '合上书问一句：「我们家的门，什么时候可以开？」把故事连到真实生活里。',
        watch: '如果孩子答不出「为什么不开门」，别急着纠正，回到第 3 页再读一遍那句话。'
      }
    },

    /* ============ 2. 拔萝卜（L1 · 民间儿歌 · 合作） ============ */
    {
      id: 'l1_radish',
      title: '拔萝卜',
      sub: '民间儿歌',
      band: 'L1',
      type: 'rhyme',
      theme: '合作 · 坚持',
      emoji: '🥕',
      art: 'grandpa', artBg: 'field',
      textbook: '一年级上册 · 和大人一起读',
      minutes: 6,
      chars: { newChars: [], preCovered: ['萝', '卜'], rawRate: 0.086, rate: 0.000 },
      strategy: 'summarize',
      goal: '能按顺序说出谁先来、谁后来，并说出「为什么最后拔出来了」。',
      bigIdea: '一个人拔不动，不等于这件事做不成——还可以叫人来一起做。',
      vocab: [
        { w: '拔', py: 'bá', emoji: '💪', def: '用力往外拉。', sent: '用力拔，萝卜就出来了。' },
        { w: '萝卜', py: 'luó bo', emoji: '🥕', def: '长在土里的一种蔬菜，可以吃。', sent: '地里的萝卜长得又大又红。' },
        { w: '一起', py: 'yì qǐ', emoji: '👨‍👩‍👧', def: '几个人做同一件事。', sent: '大家一起拔萝卜。' },
        { w: '用力', py: 'yòng lì', emoji: '🏋️', def: '使出力气。', sent: '大家一起用力。' }
      ],
      pages: [
        { n: 1, art: 'grandpa', bg: 'field', extra: 'radish', text: '老公公去拔萝卜。萝卜太大了，他拔不动。', py: ['lǎo', 'gōng', 'gong', 'qù', 'bá', 'luó', 'bo', 'luó', 'bo', 'tài', 'dà', 'le', 'tā', 'bá', 'bú', 'dòng'], lines: ['老公公去拔萝卜。', '萝卜太大了，', '他拔不动。'], ask: { t: 'predict', q: '拔不动，他会怎么办呢？', hint: '想想一个人做不完的时候，你会找谁。' } },
        { n: 2, art: 'grandpa', bg: 'field', extra: 'radish', text: '老公公叫老奶奶来一起拔。', py: ['lǎo', 'gōng', 'gong', 'jiào', 'lǎo', 'nǎi', 'nai', 'lái', 'yì', 'qǐ', 'bá'], lines: ['老公公叫老奶奶', '来一起拔。'], ask: { t: 'question', q: '为什么要叫人来，不自己再用力一点？', hint: '有些事情，一个人再用力也不够。' } },
        { n: 3, art: 'grandpa', bg: 'field', extra: 'radish', text: '老奶奶牵着老公公，老公公牵着萝卜叶子。', py: ['lǎo', 'nǎi', 'nai', 'qiān', 'zhe', 'lǎo', 'gōng', 'gong', 'lǎo', 'gōng', 'gong', 'qiān', 'zhe', 'luó', 'bo', 'yè', 'zi'], lines: ['老奶奶牵着老公公，', '老公公牵着萝卜叶子。'], ask: { t: 'clarify', q: '「牵着」是手放在哪里？做一做动作。', hint: '一个人接一个人，像一列小火车。' } },
        { n: 4, art: 'grandpa', bg: 'field', extra: 'radish', text: '还是拔不动。老奶奶叫小妹妹来一起拔。', py: ['hái', 'shì', 'bá', 'bú', 'dòng', 'lǎo', 'nǎi', 'nai', 'jiào', 'xiǎo', 'mèi', 'mei', 'lái', 'yì', 'qǐ', 'bá'], lines: ['还是拔不动。', '老奶奶叫小妹妹', '来一起拔。'], ask: { t: 'predict', q: '加上小妹妹，够了吗？猜猜看。', hint: '后面还有人来呢。' } },
        { n: 5, art: 'grandpa', bg: 'field', extra: 'radish', text: '小妹妹叫小狗，小狗叫小猫，小猫叫小鸡。', py: ['xiǎo', 'mèi', 'mei', 'jiào', 'xiǎo', 'gǒu', 'xiǎo', 'gǒu', 'jiào', 'xiǎo', 'māo', 'xiǎo', 'māo', 'jiào', 'xiǎo', 'jī'], lines: ['小妹妹叫小狗，', '小狗叫小猫，', '小猫叫小鸡。'], ask: { t: 'question', q: '为什么连最小的小鸡也要叫来？', hint: '少一个，会怎么样？' } },
        { n: 6, art: 'grandpa', bg: 'field', extra: 'radish', text: '大家一起用力拔。用力，用力——萝卜拔出来了！', py: ['dà', 'jiā', 'yì', 'qǐ', 'yòng', 'lì', 'bá', 'yòng', 'lì', 'yòng', 'lì', 'luó', 'bo', 'bá', 'chū', 'lái', 'le'], lines: ['大家一起用力拔。', '用力，用力——', '萝卜拔出来了！'], ask: { t: 'summarize', q: '萝卜最后为什么能拔出来？', hint: '不是谁特别有力气，而是——' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '最先来拔萝卜的是谁？',
          '他在什么地方？萝卜长在哪里？',
          '他叫了谁来？后来又叫了谁？按顺序说。',
          '最后萝卜拔出来了吗？怎么拔出来的？',
          '你有没有和小朋友一起做成过一件事？'
        ],
        sample: '老公公在地里拔萝卜，萝卜太大了，他拔不动。他叫老奶奶来一起拔，老奶奶又叫小妹妹，小妹妹叫小狗，小狗叫小猫，小猫叫小鸡。大家一起用力，萝卜就拔出来了。我觉得大家一起做，力气就变大了。'
      },
      parent: {
        before: '指着封面上的大萝卜问：「这个萝卜拔得动吗？」让孩子先猜结果，再读。',
        during: '每出现一个新角色，让孩子掰一根手指头数：「现在是第几个了？」顺序感是这段故事的核心。',
        after: '读完一起做一个「拉火车」的动作：大人拉孩子的手，假装拔萝卜。身体动过，记得更牢。',
        watch: '孩子如果只说「大家拔出来的」，追问一句：「那，先是谁？后是谁？」帮他把顺序说出来。'
      }
    },

    /* ============ 3. 小白兔和小灰兔（L2 · 寓言 · 劳动） ============ */
    {
      id: 'l2_cabbage',
      title: '小白兔和小灰兔',
      sub: '寓言故事',
      band: 'L2',
      type: 'story',
      theme: '劳动 · 自立',
      emoji: '🐇',
      art: 'rabbitGrey', artBg: 'field',
      textbook: '一年级上册 · 和大人一起读',
      minutes: 9,
      chars: { newChars: ['灰', '收', '谢', '完'], preCovered: ['菜', '施', '肥', '担'], rawRate: 0.140, rate: 0.052 },
      strategy: 'clarify',
      goal: '能说出「菜子」是什么，并解释小白兔为什么不要白菜。',
      bigIdea: '别人给的东西会用完，自己学会的本领会一直留着。',
      vocab: [
        { w: '菜子', py: 'cài zǐ', emoji: '🌰', def: '白菜的种子。把它种到土里，就会长出新的白菜。', sent: '请您给我一些菜子吧。' },
        { w: '施肥', py: 'shī féi', emoji: '🌱', def: '给土地加上养分，让菜长得更好。', sent: '小白兔常常给白菜施肥。' },
        { w: '一担', py: 'yí dàn', emoji: '🧺', def: '用扁担挑的两筐东西，叫一担。', sent: '小白兔挑着一担白菜。' },
        { w: '浇水', py: 'jiāo shuǐ', emoji: '💧', def: '给植物水喝。', sent: '每天给白菜浇水。' }
      ],
      pages: [
        { n: 1, art: 'goat', bg: 'field', extra: 'cabbage', text: '老山羊在地里摘白菜。小白兔和小灰兔来一起摘。', py: ['lǎo', 'shān', 'yáng', 'zài', 'dì', 'lǐ', 'zhāi', 'bái', 'cài', 'xiǎo', 'bái', 'tù', 'hé', 'xiǎo', 'huī', 'tù', 'lái', 'yì', 'qǐ', 'zhāi'], lines: ['老山羊在地里摘白菜。', '小白兔和小灰兔', '来一起摘。'], ask: { t: 'question', q: '两只小兔为什么要来一起摘？', hint: '看它们脸上的表情。' } },
        { n: 2, art: 'rabbitGrey', bg: 'field', extra: 'cabbage', text: '摘好了白菜，老山羊把一车白菜送给小灰兔。小灰兔收下了，说：谢谢您！', py: ['zhāi', 'hǎo', 'le', 'bái', 'cài', 'lǎo', 'shān', 'yáng', 'bǎ', 'yì', 'chē', 'bái', 'cài', 'sòng', 'gěi', 'xiǎo', 'huī', 'tù', 'xiǎo', 'huī', 'tù', 'shōu', 'xià', 'le', 'shuō', 'xiè', 'xiè', 'nín'], lines: ['摘好了白菜，', '老山羊把一车白菜送给小灰兔。', '小灰兔收下了，说：谢谢您！'], ask: { t: 'predict', q: '如果老山羊也送小白兔一车白菜，它会要吗？', hint: '先记住你的猜想。' } },
        { n: 3, art: 'rabbit', bg: 'field', extra: 'cabbage', text: '老山羊又把一车白菜送给小白兔。小白兔说：我不要白菜，请您给我一些菜子吧。', py: ['lǎo', 'shān', 'yáng', 'yòu', 'bǎ', 'yì', 'chē', 'bái', 'cài', 'sòng', 'gěi', 'xiǎo', 'bái', 'tù', 'xiǎo', 'bái', 'tù', 'shuō', 'wǒ', 'bú', 'yào', 'bái', 'cài', 'qǐng', 'nín', 'gěi', 'wǒ', 'yì', 'xiē', 'cài', 'zǐ', 'ba'], lines: ['老山羊又把一车白菜送给小白兔。', '小白兔说：我不要白菜，', '请您给我一些菜子吧。'], ask: { t: 'clarify', q: '「菜子」是什么？和白菜有什么不一样？', hint: '菜子种下去会长出什么？' } },
        { n: 4, art: 'rabbit', bg: 'field', text: '小白兔回到家里，种上菜子。', py: ['xiǎo', 'bái', 'tù', 'huí', 'dào', 'jiā', 'lǐ', 'zhǒng', 'shàng', 'cài', 'zǐ'], lines: ['小白兔回到家里，', '种上菜子。'], ask: { t: 'predict', q: '种下去以后，还要做什么？', hint: '种花种菜，最怕什么？' } },
        { n: 5, art: 'rabbit', bg: 'field', extra: 'cabbage', text: '过了些日子，白菜长出来了。小白兔每天给白菜浇水、施肥、拔草、捉虫。', py: ['guò', 'le', 'xiē', 'rì', 'zi', 'bái', 'cài', 'cháng', 'chū', 'lái', 'le', 'xiǎo', 'bái', 'tù', 'měi', 'tiān', 'gěi', 'bái', 'cài', 'jiāo', 'shuǐ', 'shī', 'féi', 'bá', 'cǎo', 'zhuō', 'chóng'], lines: ['过了些日子，白菜长出来了。', '小白兔每天给白菜浇水、施肥、', '拔草、捉虫。'], ask: { t: 'question', q: '「每天」是什么意思？做一次和每天做，一样吗？', hint: '想一想天天浇水的花和忘了浇水的花。' } },
        { n: 6, art: 'rabbitGrey', bg: 'home', text: '小灰兔把白菜吃完了，又去老山羊家要白菜。', py: ['xiǎo', 'huī', 'tù', 'bǎ', 'bái', 'cài', 'chī', 'wán', 'le', 'yòu', 'qù', 'lǎo', 'shān', 'yáng', 'jiā', 'yào', 'bái', 'cài'], lines: ['小灰兔把白菜吃完了，', '又去老山羊家要白菜。'], ask: { t: 'question', q: '白菜为什么会吃完？', hint: '一车白菜能吃多久？' } },
        { n: 7, art: 'rabbit', bg: 'garden', extra: 'cabbage', text: '路上，他看见小白兔挑着一担白菜，给老山羊送去。', py: ['lù', 'shang', 'tā', 'kàn', 'jiàn', 'xiǎo', 'bái', 'tù', 'tiāo', 'zhe', 'yì', 'dān', 'bái', 'cài', 'gěi', 'lǎo', 'shān', 'yáng', 'sòng', 'qù'], lines: ['路上，他看见小白兔', '挑着一担白菜，', '给老山羊送去。'], ask: { t: 'clarify', q: '小白兔为什么要送白菜给老山羊？', hint: '菜子是谁给的？' } },
        { n: 8, art: 'rabbit', bg: 'garden', extra: 'cabbage', text: '小灰兔问：小白兔，你的菜是哪儿来的？小白兔说：是我自己种的。只有自己种，才有吃不完的菜。', py: ['xiǎo', 'huī', 'tù', 'wèn', 'xiǎo', 'bái', 'tù', 'nǐ', 'de', 'cài', 'shì', 'nǎ', 'ér', 'lái', 'de', 'xiǎo', 'bái', 'tù', 'shuō', 'shì', 'wǒ', 'zì', 'jǐ', 'zhǒng', 'de', 'zhǐ', 'yǒu', 'zì', 'jǐ', 'zhǒng', 'cái', 'yǒu', 'chī', 'bù', 'wán', 'de', 'cài'], lines: ['小灰兔问：小白兔，你的菜是哪儿来的？', '小白兔说：是我自己种的。', '只有自己种，才有吃不完的菜。'], ask: { t: 'summarize', q: '这句话里最重要的词是哪个？说说你的理由。', hint: '「自己」还是「吃不完」？' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '故事里有哪三只动物？',
          '它们在什么地方干活？',
          '老山羊送了什么东西给谁？它们分别要了什么？',
          '最后谁有吃不完的菜？为什么？',
          '你觉得小白兔聪明在哪里？'
        ],
        sample: '老山羊在地里摘白菜，小白兔和小灰兔来一起摘。老山羊给小灰兔一车白菜，小灰兔收下了；给小白兔一车白菜，小白兔不要，只要了一些菜子。小白兔回家种上菜子，每天浇水、施肥、拔草、捉虫，白菜长大了。小灰兔把白菜吃完了，又去要。小白兔却说，只有自己种，才有吃不完的菜。我觉得小白兔很聪明，因为它学会了自己种菜。'
      },
      parent: {
        before: '先聊一句：「如果别人给你一车菜，或者给你几颗种子，你选哪个？」让孩子先选，不评价。',
        during: '第 3 页停久一点。孩子多半不理解「菜子」和「白菜」的区别，可以用一颗真的豆子比划一下。',
        after: '把结尾那句话读第二遍：「只有自己种，才有吃不完的菜。」然后问：「那，你自己会做什么？」',
        watch: '不要急着讲「要自力更生」的道理。让孩子自己说出「小白兔聪明」，比大人说十遍都管用。'
      }
    },

    /* ============ 4. 猴子捞月亮（L2 · 民间故事 · 思考） ============ */
    {
      id: 'l2_monkey',
      title: '猴子捞月亮',
      sub: '民间故事',
      band: 'L2',
      type: 'story',
      theme: '观察 · 求证',
      emoji: '🐒',
      art: 'monkey', artBg: 'well',
      textbook: '一年级上册 · 和大人一起读',
      minutes: 9,
      chars: { newChars: ['拉', '碰'], preCovered: ['糟', '捞', '倒', '抬'], rawRate: 0.058, rate: 0.019 },
      strategy: 'question',
      goal: '能提出至少一个问题，并说出「月亮到底在哪里」。',
      bigIdea: '看到的不一定是真的。停下来想一想、抬头看一看，答案就出来了。',
      vocab: [
        { w: '糟啦', py: 'zāo la', emoji: '😱', def: '遇到不好的事情时喊的话，意思是「不好了」。', sent: '糟啦，月亮掉进井里啦！' },
        { w: '捞', py: 'lāo', emoji: '🫳', def: '从水里把东西取出来。', sent: '猴子们想把月亮捞上来。' },
        { w: '倒挂', py: 'dào guà', emoji: '🙃', def: '头朝下、脚朝上地挂着。', sent: '老猴子倒挂在树上。' },
        { w: '抬头', py: 'tái tóu', emoji: '⬆️', def: '把头抬起来往上看。', sent: '猴子们抬头一看。' }
      ],
      pages: [
        { n: 1, art: 'monkey', bg: 'night', extra: 'moon', text: '一群猴子在林子里玩。一只小猴子看见井里有月亮。', py: ['yì', 'qún', 'hóu', 'zi', 'zài', 'lín', 'zi', 'lǐ', 'wán', 'yì', 'zhī', 'xiǎo', 'hóu', 'zi', 'kàn', 'jiàn', 'jǐng', 'lǐ', 'yǒu', 'yuè', 'liàng'], lines: ['一群猴子在林子里玩。', '一只小猴子看见井里有月亮。'], ask: { t: 'predict', q: '井里为什么会有月亮？先猜一猜。', hint: '天上有什么？' } },
        { n: 2, art: 'monkey', bg: 'well', extra: 'moon', text: '小猴子叫起来：糟啦，糟啦！月亮掉进井里啦！', py: ['xiǎo', 'hóu', 'zi', 'jiào', 'qǐ', 'lái', 'zāo', 'lā', 'zāo', 'lā', 'yuè', 'liàng', 'diào', 'jìn', 'jǐng', 'lǐ', 'lā'], lines: ['小猴子叫起来：', '糟啦，糟啦！', '月亮掉进井里啦！'], ask: { t: 'question', q: '小猴子怎么知道月亮「掉进去」了？它看见的是什么？', hint: '水面上的那个圆圆的影子。' } },
        { n: 3, art: 'monkey', bg: 'well', extra: 'moon', text: '大猴子跑来一看，也跟着叫起来。老猴子跑来一看，也跟着叫起来。', py: ['dà', 'hóu', 'zi', 'pǎo', 'lái', 'yí', 'kàn', 'yě', 'gēn', 'zhe', 'jiào', 'qǐ', 'lái', 'lǎo', 'hóu', 'zi', 'pǎo', 'lái', 'yí', 'kàn', 'yě', 'gēn', 'zhe', 'jiào', 'qǐ', 'lái'], lines: ['大猴子跑来一看，也跟着叫起来。', '老猴子跑来一看，也跟着叫起来。'], ask: { t: 'question', q: '它们都自己去看了吗？还是听见叫声就跟着喊？', hint: '「跑来一看」和「跟着叫」有什么不一样？' } },
        { n: 4, art: 'monkey', bg: 'well', text: '猴子们决定把月亮捞上来。', py: ['hóu', 'zi', 'men', 'jué', 'dìng', 'bǎ', 'yuè', 'liàng', 'lāo', 'shàng', 'lái'], lines: ['猴子们决定', '把月亮捞上来。'], ask: { t: 'predict', q: '它们能捞上来吗？猜猜看，等下对一对。', hint: '月亮有多重？' } },
        { n: 5, art: 'monkey', bg: 'well', text: '老猴子倒挂在树上，拉住大猴子的脚。大猴子拉住别的猴子的脚……', py: ['lǎo', 'hóu', 'zǐ', 'dǎo', 'guà', 'zài', 'shù', 'shàng', 'lā', 'zhù', 'dà', 'hóu', 'zi', 'de', 'jiǎo', 'dà', 'hóu', 'zi', 'lā', 'zhù', 'bié', 'de', 'hóu', 'zi', 'de', 'jiǎo'], lines: ['老猴子倒挂在树上，', '拉住大猴子的脚。', '大猴子拉住别的猴子的脚……'], ask: { t: 'clarify', q: '「倒挂」是什么样子？你能做一做吗？', hint: '头朝哪边？脚朝哪边？' } },
        { n: 6, art: 'monkey', bg: 'well', text: '一只一只猴子接起来，一直挂到井里头。', py: ['yì', 'zhī', 'yi', 'zhī', 'hóu', 'zi', 'jiē', 'qǐ', 'lái', 'yì', 'zhí', 'guà', 'dào', 'jǐng', 'lǐ', 'tou'], lines: ['一只一只猴子接起来，', '一直挂到井里头。'], ask: { t: 'question', q: '为什么要一只接一只，而不是让一只跳下去？', hint: '跳下去会怎么样？' } },
        { n: 7, art: 'monkey', bg: 'well', extra: 'moon', text: '小猴子把手伸到水里去捞月亮。手刚碰到水，月亮就不见了。', py: ['xiǎo', 'hóu', 'zǐ', 'bǎ', 'shǒu', 'shēn', 'dào', 'shuǐ', 'lǐ', 'qù', 'lāo', 'yuè', 'liàng', 'shǒu', 'gāng', 'pèng', 'dào', 'shuǐ', 'yuè', 'liàng', 'jiù', 'bú', 'jiàn', 'le'], lines: ['小猴子把手伸到水里去捞月亮。', '手刚碰到水，', '月亮就不见了。'], ask: { t: 'clarify', q: '月亮为什么「不见了」？它真的不见了吗？', hint: '手碰到水，水会怎么样？' } },
        { n: 8, art: 'monkey', bg: 'night', extra: 'moon', text: '猴子们抬头一看，月亮还在天上呢。', py: ['hóu', 'zi', 'men', 'tái', 'tóu', 'yí', 'kàn', 'yuè', 'liàng', 'hái', 'zài', 'tiān', 'shàng', 'ne'], lines: ['猴子们抬头一看，', '月亮还在天上呢。'], ask: { t: 'summarize', q: '如果下次再看见井里有月亮，猴子会怎么做？', hint: '先做什么，再做什么？' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '故事里有哪些猴子？',
          '它们在什么地方玩？看见了什么？',
          '猴子们做了什么？结果怎么样？',
          '最后月亮在哪里？',
          '你觉得猴子们哪里做对了，哪里可以做得更好？'
        ],
        sample: '一群猴子在林子里玩，小猴子看见井里有月亮，就喊「月亮掉进井里啦」。大猴子、老猴子跑来一看，也跟着叫。它们决定把月亮捞上来，就一只接一只倒挂着挂到井里。小猴子伸手去捞，手一碰到水，月亮就不见了。猴子们抬头一看，月亮还在天上。我觉得它们下次应该先抬头看看天上。'
      },
      parent: {
        before: '指着封面问：「井里的月亮，和天上的月亮，是同一个吗？」这是整篇故事的核心问题，让孩子先想。',
        during: '第 7 页读完，问一句：「月亮去哪儿了？」如果孩子说「被捞走了」，别纠正，翻回第 8 页让他自己发现。',
        after: '做一个小实验：端一盆水，看看水里的灯光。让孩子亲眼看见「水里的东西是倒影」。',
        watch: '这个故事最容易变成「别瞎起哄」的说教。忍住，让孩子自己说「它们应该抬头看看」。'
      }
    },

    /* ============ 5. 小马过河（L3 · 寓言 · 实践） ============ */
    {
      id: 'l3_horse',
      title: '小马过河',
      sub: '寓言故事',
      band: 'L3',
      type: 'story',
      theme: '实践 · 独立判断',
      emoji: '🐴',
      art: 'horse', artBg: 'river',
      textbook: '一年级下册 · 和大人一起读（进阶）',
      minutes: 12,
      chars: { newChars: ['袋'], preCovered: ['麦', '深', '浅', '松', '鼠', '试'], rawRate: 0.115, rate: 0.007 },
      strategy: 'summarize',
      goal: '能说清老牛和松鼠说的话为什么不一样，并说出小马最后怎么做的。',
      bigIdea: '别人说的都对，但不一定对「你」都对。自己试一试，才知道深浅。',
      vocab: [
        { w: '麦子', py: 'mài zi', emoji: '🌾', def: '一种粮食，磨成粉可以做面条、馒头。', sent: '小马背着半袋麦子。' },
        { w: '深浅', py: 'shēn qiǎn', emoji: '📏', def: '水有多深、有多浅。', sent: '小马不知道河水深浅。' },
        { w: '试试', py: 'shì shi', emoji: '👟', def: '做一做，看看行不行。', sent: '不去试试，是不行的。' },
        { w: '松鼠', py: 'sōng shǔ', emoji: '🐿️', def: '一种小动物，个子很小，住在树上。', sent: '松鼠说河水很深。' }
      ],
      pages: [
        { n: 1, art: 'horse', bg: 'home', text: '小马长大了。妈妈让他把半袋麦子送到村口去。', py: ['xiǎo', 'mǎ', 'zhǎng', 'dà', 'le', 'mā', 'ma', 'ràng', 'tā', 'bǎ', 'bàn', 'dài', 'mài', 'zi', 'sòng', 'dào', 'cūn', 'kǒu', 'qù'], lines: ['小马长大了。', '妈妈让他把半袋麦子', '送到村口去。'], ask: { t: 'question', q: '妈妈为什么让小马去，而不是自己去？', hint: '「小马长大了」这句话有分量。' } },
        { n: 2, art: 'horse', bg: 'river', text: '路上有一条小河。小马不知道河水深不深。', py: ['lù', 'shang', 'yǒu', 'yì', 'tiáo', 'xiǎo', 'hé', 'xiǎo', 'mǎ', 'bù', 'zhī', 'dào', 'hé', 'shuǐ', 'shēn', 'bu', 'shēn'], lines: ['路上有一条小河。', '小马不知道', '河水深不深。'], ask: { t: 'predict', q: '如果你是小马，你会怎么办？', hint: '先记住你的办法，看小马和你一样吗。' } },
        { n: 3, art: 'goat', bg: 'river', text: '老牛说：水很浅，刚过小腿。', py: ['lǎo', 'niú', 'shuō', 'shuǐ', 'hěn', 'qiǎn', 'gāng', 'guò', 'xiǎo', 'tuǐ'], lines: ['老牛说：', '水很浅，刚过小腿。'], ask: { t: 'clarify', q: '「刚过小腿」是多深？用手比一比。', hint: '「过」在这里的意思是盖住。' } },
        { n: 4, art: 'rabbit', bg: 'river', text: '松鼠说：水很深，昨天我的伙伴就掉进水里了！', py: ['sōng', 'shǔ', 'shuō', 'shuǐ', 'hěn', 'shēn', 'zuó', 'tiān', 'wǒ', 'de', 'huǒ', 'bàn', 'jiù', 'diào', 'jìn', 'shuǐ', 'lǐ', 'le'], lines: ['松鼠说：水很深，', '昨天我的伙伴', '就掉进水里了！'], ask: { t: 'question', q: '老牛说浅，松鼠说深，谁错了？', hint: '它们两个，谁高谁矮？' } },
        { n: 5, art: 'horse', bg: 'river', text: '小马不知道该怎么办，只好回家问妈妈。', py: ['xiǎo', 'mǎ', 'bù', 'zhī', 'dào', 'gāi', 'zěn', 'me', 'bàn', 'zhǐ', 'hǎo', 'huí', 'jiā', 'wèn', 'mā', 'ma'], lines: ['小马不知道该怎么办，', '只好回家问妈妈。'], ask: { t: 'predict', q: '妈妈会告诉它「深」还是「浅」？', hint: '想一想妈妈会怎么说。' } },
        { n: 6, art: 'horse', bg: 'home', text: '妈妈说：孩子，光听别人说，自己不用心想，不去试试，是不行的。', py: ['mā', 'ma', 'shuō', 'hái', 'zǐ', 'guāng', 'tīng', 'bié', 'rén', 'shuō', 'zì', 'jǐ', 'bú', 'yòng', 'xīn', 'xiǎng', 'bú', 'qù', 'shì', 'shì', 'shì', 'bù', 'xíng', 'de'], lines: ['妈妈说：孩子，', '光听别人说，自己不用心想，', '不去试试，是不行的。'], ask: { t: 'clarify', q: '妈妈说了三件事，是哪三件？', hint: '听、想、试。' } },
        { n: 7, art: 'horse', bg: 'river', text: '小马跑到河边，小心地试一试。', py: ['xiǎo', 'mǎ', 'pǎo', 'dào', 'hé', 'biān', 'xiǎo', 'xīn', 'dì', 'shì', 'yi', 'shì'], lines: ['小马跑到河边，', '小心地试一试。'], ask: { t: 'question', q: '「小心地」是怎么试？直接冲过去行不行？', hint: '试，也要有试的方法。' } },
        { n: 8, art: 'horse', bg: 'river', text: '原来河水不像老牛说的那么浅，也不像松鼠说的那么深。', py: ['yuán', 'lái', 'hé', 'shuǐ', 'bú', 'xiàng', 'lǎo', 'niú', 'shuō', 'de', 'nà', 'me', 'qiǎn', 'yě', 'bú', 'xiàng', 'sōng', 'shǔ', 'shuō', 'de', 'nà', 'me', 'shēn'], lines: ['原来河水', '不像老牛说的那么浅，', '也不像松鼠说的那么深。'], ask: { t: 'summarize', q: '为什么老牛和松鼠说的都不一样？', hint: '水没变，变的是什么？' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '故事里有谁？小马要去做一件什么事？',
          '它在路上遇到了什么困难？',
          '老牛说了什么？松鼠说了什么？它们为什么说得不一样？',
          '妈妈告诉小马什么？小马最后怎么做的？结果呢？',
          '你有没有「听别人说」和「自己试」不一样的经历？'
        ],
        sample: '小马长大了，妈妈让它把半袋麦子送到村口去。路上有一条小河，小马不知道深浅。老牛说水很浅，刚过小腿；松鼠说水很深，昨天它的伙伴就掉进水里了。小马不知道怎么办，回家问妈妈。妈妈说，光听别人说，自己不用心想，不去试试，是不行的。小马跑到河边小心地试了试，原来河水不像老牛说的那么浅，也不像松鼠说的那么深。我觉得小马很勇敢，因为它自己去试了。'
      },
      parent: {
        before: '问一句：「同样一条河，为什么一个人说浅，一个人说深？」让孩子带着这个问题读。',
        during: '第 6 页是全文的核心，请读慢一点，读两遍。可以让孩子用手指点着字跟读。',
        after: '聊一个真实的小事：「你有没有本来不敢、试了之后发现没那么难的事？」这一步把故事变成孩子自己的经验。',
        watch: '孩子很可能说「老牛骗人」。要接住：「老牛没骗人，它说的是它自己感觉到的。」这是观点采择能力，比结论重要。'
      }
    },

    /* ============ 6. 小老鼠（L1 · 民间童谣 · 下册快乐读书吧） ============ */
    {
      id: 'l1_mouse',
      title: '小老鼠',
      sub: '民间童谣',
      band: 'L1',
      type: 'rhyme',
      theme: '童趣 · 观察',
      emoji: '🐭',
      art: 'mouse', artBg: 'lamp',
      textbook: '一年级下册 · 读读童谣和儿歌（一）',
      minutes: 6,
      chars: { newChars: ['叽', '噜'], preCovered: ['鼠', '灯', '台', '偷', '油', '滚'], rawRate: 0.250, rate: 0.056 },
      strategy: 'predict',
      goal: '能读出童谣的节奏（每句三拍），并说出「老鼠怕什么」。',
      bigIdea: '短小的童谣里藏着一个完整的小故事——会读节奏，就能记住它。',
      vocab: [
        { w: '老鼠', py: 'lǎo shǔ', emoji: '🐭', def: '一种小动物，喜欢在夜里出来找吃的。', sent: '小老鼠爬上灯台。' },
        { w: '灯台', py: 'dēng tái', emoji: '🕯️', def: '古代放油灯的高架子。', sent: '灯台上面有一盏灯。' },
        { w: '偷油', py: 'tōu yóu', emoji: '🫗', def: '悄悄拿走不属于自己的东西。', sent: '小老鼠偷偷去吃油。' },
        { w: '吃不着', py: 'chī bu zháo', emoji: '😖', def: '想吃但没吃到。', sent: '太高了，吃不着。' },
        { w: '滚下来', py: 'gǔn xià lái', emoji: '⬇️', def: '转着圈掉下来。', sent: '小老鼠滚下来了。' }
      ],
      pages: [
        { n: 1, art: 'mouse', bg: 'lamp', text: '小老鼠，上灯台。', py: ['xiǎo', 'lǎo', 'shǔ', 'shàng', 'dēng', 'tái'], lines: ['小老鼠，', '上灯台。'], ask: { t: 'predict', q: '老鼠爬上灯台，想干什么？', hint: '灯台上面有什么香香的东西？' } },
        { n: 2, art: 'mouse', bg: 'lamp', text: '偷油吃，下不来。', py: ['tōu', 'yóu', 'chī', 'xià', 'bù', 'lái'], lines: ['偷油吃，', '下不来。'], ask: { t: 'question', q: '为什么「下不来」了呢？', hint: '爬上去容易，还是下来容易？' } },
        { n: 3, art: 'mouse', bg: 'lamp', text: '叫妈妈，妈不来。', py: ['jiào', 'mā', 'ma', 'mā', 'bù', 'lái'], lines: ['叫妈妈，', '妈不来。'], ask: { t: 'clarify', q: '「妈不来」的时候，小老鼠心里是什么感觉？', hint: '你一个人卡在高处过吗？' } },
        { n: 4, art: 'mouse', bg: 'lamp', text: '叽里咕噜滚下来。', py: ['jī', 'lǐ', 'gū', 'lū', 'gǔn', 'xià', 'lái'], lines: ['叽里咕噜', '滚下来。'], ask: { t: 'summarize', q: '用一句话说说，这首童谣讲了什么事？', hint: '谁 + 做了什么 + 结果怎样。' } },
        { n: 5, art: 'mouse', bg: 'home', text: '小老鼠说：我再也不偷油了。', py: ['xiǎo', 'lǎo', 'shǔ', 'shuō', 'wǒ', 'zài', 'yě', 'bù', 'tōu', 'yóu', 'le'], lines: ['小老鼠说：', '我再也不偷油了。'], ask: { t: 'summarize', q: '如果它下次又看见油，你觉得它会怎么办？', hint: '说清楚你的理由就好，没有标准答案。' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '这首童谣里是谁？',
          '它爬到了什么地方？',
          '它去做什么？做完之后遇到了什么麻烦？',
          '最后它怎么下来的？',
          '你觉得它下次还会偷油吗？为什么？'
        ],
        sample: '有一只小老鼠，爬到了灯台上。它想偷油吃，可是吃完了就下不来了。它叫妈妈，妈妈没来。最后它叽里咕噜地滚了下来。我觉得它以后不敢再偷油了，因为太危险了。'
      },
      parent: {
        before: '先问一句：「你猜老鼠上去干什么？」再一起读。读的时候请拍手打节奏：小老鼠／上灯台——每句三拍。',
        during: '读到「下不来」时停下来问：「它为什么不跳下来？」引导孩子注意「高」和「怕」。',
        after: '让孩子把这首童谣背给爷爷奶奶听。童谣的韵律靠反复念记住，背出来比读一遍更有价值。',
        watch: '孩子可能会笑「老鼠真笨」。别急着总结道理，先接住这个笑：「你是觉得它哪里笨呀？」让孩子自己说。'
      }
    },

    /* ============ 7. 青蛙写诗（L2 · 童话 · 上册快乐读书吧） ============ */
    {
      id: 'l2_frog',
      title: '青蛙写诗',
      sub: '张秋生 童话',
      band: 'L2',
      type: 'story',
      theme: '想象 · 标点',
      emoji: '🐸',
      art: 'frog', artBg: 'pond',
      textbook: '一年级上册 · 和大人一起读（一）',
      minutes: 9,
      chars: { newChars: ['蝌', '蚪'], preCovered: ['逗', '号', '泡', '省', '略', '呱'], rawRate: 0.175, rate: 0.021 },
      strategy: 'clarify',
      goal: '能认出逗号、句号、省略号，并说出它们「像什么」。',
      bigIdea: '标点符号不是难题——它们是小蝌蚪、水泡泡和一串小水珠。',
      vocab: [
        { w: '写诗', py: 'xiě shī', emoji: '✍️', def: '把好听的话写下来。', sent: '青蛙想写一首诗。' },
        { w: '逗号', py: 'dòu hào', emoji: '，', def: '一句话没说完，先停一下。', sent: '下雨了，雨点儿落下来。' },
        { w: '句号', py: 'jù hào', emoji: '。', def: '一句话说完了。', sent: '我要给你当个小句号。' },
        { w: '省略号', py: 'shěng lüè hào', emoji: '……', def: '话还没说完，或者还有很多。', sent: '我们可以当省略号。' },
        { w: '水泡泡', py: 'shuǐ pào pao', emoji: '🫧', def: '水里圆圆的小泡泡。', sent: '水里的水泡泡说：我来当个小句号。' },
        { w: '呱呱', py: 'guā guā', emoji: '🐸', def: '青蛙叫的声音。念起来像青蛙在说话。', sent: '青蛙的诗是：呱呱，呱呱，呱呱呱。' }
      ],
      pages: [
        { n: 1, art: 'frog', bg: 'pond', text: '下雨了，雨点儿落下来。青蛙说：我要写诗啦！', py: ['xià', 'yǔ', 'le', 'yǔ', 'diǎn', 'ér', 'luò', 'xià', 'lái', 'qīng', 'wā', 'shuō', 'wǒ', 'yào', 'xiě', 'shī', 'lā'], lines: ['下雨了，', '雨点儿落下来。', '青蛙说：我要写诗啦！'], ask: { t: 'predict', q: '青蛙要写诗，它需要什么帮忙？', hint: '写诗要用到什么符号？' } },
        { n: 2, art: 'tadpole', bg: 'pond', text: '小蝌蚪游过来说：我要给你当个小逗号。', py: ['xiǎo', 'kē', 'dǒu', 'yóu', 'guò', 'lái', 'shuō', 'wǒ', 'yào', 'gěi', 'nǐ', 'dāng', 'gè', 'xiǎo', 'dòu', 'hào'], lines: ['小蝌蚪游过来说：', '我要给你当个小逗号。'], ask: { t: 'clarify', q: '小蝌蚪为什么能当逗号？它们哪里像？', hint: '看形状：小蝌蚪圆圆的头，后面一条小尾巴。' } },
        { n: 3, art: 'bubble', bg: 'pond', text: '水里的水泡泡说：我来当个小句号。', py: ['shuǐ', 'lǐ', 'de', 'shuǐ', 'pào', 'pào', 'shuō', 'wǒ', 'lái', 'dāng', 'gè', 'xiǎo', 'jù', 'hào'], lines: ['水里的水泡泡说：', '我来当个小句号。'], ask: { t: 'question', q: '句号和泡泡，哪里像？', hint: '都是一个圆圆的小圈。' } },
        { n: 4, art: 'bubble', bg: 'pond', text: '荷叶上的一串水珠说：我们可以当省略号。', py: ['hé', 'yè', 'shàng', 'de', 'yí', 'chuàn', 'shuǐ', 'zhū', 'shuō', 'wǒ', 'men', 'kě', 'yǐ', 'dāng', 'shěng', 'lüè', 'hào'], lines: ['荷叶上的一串水珠说：', '我们可以当省略号。'], ask: { t: 'clarify', q: '为什么是一串水珠，不是一颗？', hint: '省略号有几个点？' } },
        { n: 5, art: 'frog', bg: 'pond', text: '青蛙的诗写成了：呱呱，呱呱，呱呱呱。', py: ['qīng', 'wā', 'de', 'shī', 'xiě', 'chéng', 'le', 'guā', 'guā', 'guā', 'guā', 'guā', 'guā', 'guā'], lines: ['青蛙的诗写成了：', '呱呱，', '呱呱，', '呱呱呱。'], ask: { t: 'summarize', q: '这首「呱呱」诗里，哪里是逗号？哪里是句号？', hint: '数一数每个「呱」后面的符号。' } },
        { n: 6, art: 'frog', bg: 'pond', text: '朋友们都来听。青蛙说：这首诗，是我们一起写的。', py: ['péng', 'yǒu', 'men', 'dōu', 'lái', 'tīng', 'qīng', 'wā', 'shuō', 'zhè', 'shǒu', 'shī', 'shì', 'wǒ', 'men', 'yì', 'qǐ', 'xiě', 'de'], lines: ['朋友们都来听。', '青蛙说：', '这首诗，是我们一起写的。'], ask: { t: 'summarize', q: '为什么青蛙说「是我们一起写的」？', hint: '没有它们，青蛙的诗能写完吗？' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '谁想写诗？',
          '它在什么地方？那天的天气怎么样？',
          '谁来帮忙了？它们分别当了什么符号？',
          '最后诗写成了吗？写的什么？',
          '你觉得这首「呱呱」诗好听吗？为什么？'
        ],
        sample: '下雨天，青蛙在池塘边说它要写诗。小蝌蚪来了，说它当逗号；水泡泡来了，说它当句号；荷叶上的一串水珠说它们当省略号。最后青蛙的诗写成了，就是「呱呱，呱呱，呱呱呱」。朋友们都来听，青蛙说这首诗是大家一起写的。我觉得这个想法很奇妙，因为标点符号真的长得像它们。'
      },
      parent: {
        before: '翻到书的最后一页，先问：「逗号长什么样？句号呢？」如果孩子说不清，就从这一页往前找答案。',
        during: '读的时候用手指在书上「画」出逗号和句号。让孩子也用手指画一遍——身体动作能帮孩子记住抽象符号。',
        after: '玩一个游戏：随便说一句话，让孩子用手比出该用什么标点。比如「今天天气真好」——比一个圈（句号）。',
        watch: '孩子可能把省略号说成「六个点」或「很多点」。都对，不要纠正数量，重点在「表示还没说完」。'
      }
    },

    /* ============ 8. 狗和猴（L1 · 童谣 · 观察） ============ */
    {
      id: 'l1_dogmonkey',
      title: '狗和猴',
      sub: '传统童谣',
      band: 'L1',
      type: 'rhyme',
      theme: '观察 · 比较',
      emoji: '🐕',
      art: 'dog', artBg: 'bridge',
      textbook: '一年级下册 · 读读童谣和儿歌（一）',
      minutes: 5,
      chars: { newChars: [], preCovered: ['底'], rawRate: 0.033, rate: 0.000 },
      strategy: 'clarify',
      goal: '能说清狗在桥上、猴在桥下，并说出「为什么谁也说不清」。',
      bigIdea: '同一件事，站的地方不一样，看到的就不一样。',
      vocab: [
        { w: '桥上', py: 'qiáo shàng', emoji: '🌉', def: '桥的上面。', sent: '桥上一条狗。' },
        { w: '桥下', py: 'qiáo xià', emoji: '⬇️', def: '桥的下面。', sent: '桥下一只猴。' },
        { w: '也', py: 'yě', emoji: '➕', def: '表示「一样」。', sent: '狗走猴也走。' },
        { w: '到底', py: 'dào dǐ', emoji: '🤔', def: '想弄清楚「究竟是哪一个」。', sent: '到底谁跟谁？' }
      ],
      pages: [
        { n: 1, art: 'dog', bg: 'bridge', text: '桥上一条狗，桥下一只猴。', py: ['qiáo', 'shàng', 'yì', 'tiáo', 'gǒu', 'qiáo', 'xià', 'yì', 'zhī', 'hóu'], lines: ['桥上一条狗，', '桥下一只猴。'], ask: { t: 'predict', q: '一条狗在桥上，一只猴在桥下。猜猜看，接下来会发生什么？', hint: '它们能看见对方吗？' } },
        { n: 2, art: 'dog', bg: 'bridge', text: '狗走猴也走，狗停猴也停。', py: ['gǒu', 'zǒu', 'hóu', 'yě', 'zǒu', 'gǒu', 'tíng', 'hóu', 'yě', 'tíng'], lines: ['狗走猴也走，', '狗停猴也停。'], ask: { t: 'question', q: '「也」是什么意思？', hint: '狗做什么，猴就做什么。' } },
        { n: 3, art: 'dog', bg: 'bridge', text: '到底谁跟谁，谁也说不清。', py: ['dào', 'dǐ', 'shuí', 'gēn', 'shuí', 'shuí', 'yě', 'shuō', 'bù', 'qīng'], lines: ['到底谁跟谁，', '谁也说不清。'], ask: { t: 'summarize', q: '为什么它们说不清谁跟谁？', hint: '想想它们站的地方一样吗？' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '儿歌里有哪两只小动物？',
          '狗在什么地方？猴在什么地方？',
          '狗走的时候，猴做什么？狗停的时候呢？',
          '最后它们弄清楚谁跟着谁了吗？为什么？',
          '你觉得是狗在跟猴，还是猴在跟狗？'
        ],
        sample: '桥上有一条狗，桥下有一只猴。狗走，猴也走；狗停，猴也停。它们谁也说不清是谁跟着谁，因为它们一个在桥上，一个在桥下，看不到对方在做什么。我觉得这首儿歌很好玩，因为两只小动物做的一样，可是谁都以为是对方跟着自己。'
      },
      parent: {
        before: '读题目时先问：「狗和猴，一个在上一个在下，它们能看见对方吗？」让孩子先想一想。',
        during: '读到「狗走猴也走」时，用手指在桌上做「一起走」的动作，让孩子跟着做。节奏感是这首童谣的重点。',
        after: '玩一个「照镜子」游戏：大人做一个动作，孩子跟着做。然后问：「刚才是谁跟谁？」把儿歌连到身体经验上。',
        watch: '孩子如果直接说「狗跟猴」，别急着否定，问一句：「那猴看得见狗吗？」让他自己发现「看不到就说不清」。'
      }
    },

    /* ============ 9. 虹（L1 · 儿歌 · 自然） ============ */
    {
      id: 'l1_rainbow',
      title: '虹',
      sub: '儿歌',
      band: 'L1',
      type: 'rhyme',
      theme: '自然 · 颜色',
      emoji: '🌈',
      art: 'child', artBg: 'garden',
      textbook: '一年级下册 · 读读童谣和儿歌（一）',
      minutes: 5,
      chars: { newChars: [], preCovered: ['橙', '紫'], rawRate: 0.069, rate: 0.000 },
      strategy: 'clarify',
      goal: '能按顺序说出七种颜色，并说出虹出现的条件。',
      bigIdea: '雨停了，太阳出来了，天上就出现了虹——有些美好要等雨过去才看得到。',
      vocab: [
        { w: '雨停', py: 'yǔ tíng', emoji: '🌤️', def: '雨不下了。', sent: '雨停了，太阳出来了。' },
        { w: '虹', py: 'hóng', emoji: '🌈', def: '雨后天上出现的七彩弧线，也叫彩虹。', sent: '天上出现一道虹。' },
        { w: '一道', py: 'yí dào', emoji: '📏', def: '量词，用来数虹、数河、数门。', sent: '天上出现一道虹。' },
        { w: '空中', py: 'kōng zhōng', emoji: '☁️', def: '天上面、半空中。', sent: '像座小桥挂空中。' },
        { w: '橙', py: 'chéng', emoji: '🟠', def: '橘子那样的颜色，在红和黄中间。', sent: '红橙黄绿青蓝紫。' },
        { w: '紫', py: 'zǐ', emoji: '🟣', def: '茄子那样的颜色，在蓝和红中间。', sent: '红橙黄绿青蓝紫。' }
      ],
      pages: [
        { n: 1, art: 'child', bg: 'garden', text: '雨停了，太阳出来了。', py: ['yǔ', 'tíng', 'le', 'tài', 'yáng', 'chū', 'lái', 'le'], lines: ['雨停了，', '太阳出来了。'], ask: { t: 'predict', q: '雨停了，天上会出现什么呢？', hint: '想想出太阳的时候。' } },
        { n: 2, art: 'child', bg: 'garden', text: '天上出现一道虹。', py: ['tiān', 'shàng', 'chū', 'xiàn', 'yí', 'dào', 'hóng'], lines: ['天上出现', '一道虹。'], ask: { t: 'clarify', q: '「一道」是用来数什么的？', hint: '一道虹、一道河、一道门。' } },
        { n: 3, art: 'child', bg: 'garden', text: '红橙黄绿青蓝紫，', py: ['hóng', 'chéng', 'huáng', 'lǜ', 'qīng', 'lán', 'zǐ'], lines: ['红橙黄绿', '青蓝紫，'], ask: { t: 'clarify', q: '数一数，一共有几种颜色？', hint: '慢慢数，从红开始。' } },
        { n: 4, art: 'child', bg: 'garden', text: '像座小桥挂空中。', py: ['xiàng', 'zuò', 'xiǎo', 'qiáo', 'guà', 'kōng', 'zhōng'], lines: ['像座小桥', '挂空中。'], ask: { t: 'summarize', q: '虹像什么？', hint: '想想它的形状。' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '什么时候才出现了虹？',
          '虹挂在哪里？',
          '虹有哪几种颜色？按顺序说。',
          '儿歌把虹比成了什么？',
          '你见过虹吗？是什么样子的？'
        ],
        sample: '雨停了，太阳出来了，天上出现了一道虹。虹有七种颜色：红、橙、黄、绿、青、蓝、紫。它像一座小桥挂在空中。我觉得虹很好看，可是我只看过一次，是在下雨之后。'
      },
      parent: {
        before: '问孩子：「你见过彩虹吗？」如果见过，让他说说是什么时候看到的，先调出经验再读。',
        during: '读到七种颜色时，让孩子用手指一样一样点着数。颜色顺序是这首儿歌的核心。',
        after: '找一支彩笔，让孩子按儿歌的顺序画出七色条纹。画出来比背下来更牢。',
        watch: '孩子可能把「青」和「蓝」弄混。不要纠正，只要他能按顺序说下来就好。'
      }
    },

    /* ============ 10. 燕子的话（L1 · 儿歌 · 迁徙） ============ */
    {
      id: 'l1_swallow',
      title: '燕子的话',
      sub: '儿歌',
      band: 'L1',
      type: 'rhyme',
      theme: '自然 · 候鸟',
      emoji: '🐦',
      art: 'swallow', artBg: 'eave',
      textbook: '一年级上册 · 和大人一起读（三）',
      minutes: 5,
      chars: { newChars: [], preCovered: ['屋', '檐'], rawRate: 0.051, rate: 0.000 },
      strategy: 'question',
      goal: '能说出燕子住在哪里、什么时候来、什么时候走。',
      bigIdea: '有些朋友会离开，但他答应过的事，会做到。',
      vocab: [
        { w: '燕子', py: 'yàn zi', emoji: '🐦', def: '一种小鸟，尾巴像剪刀，喜欢在屋檐下做窝。', sent: '燕子说：我要回家了。' },
        { w: '屋檐', py: 'wū yán', emoji: '🏠', def: '屋顶伸出来的那一边，能挡雨。', sent: '在屋檐下面。' },
        { w: '明年', py: 'míng nián', emoji: '📅', def: '今年过完以后的那一年。', sent: '你明年还来吗？' },
        { w: '回家', py: 'huí jiā', emoji: '🏡', def: '回到自己住的地方。', sent: '我要回家了。' }
      ],
      pages: [
        { n: 1, art: 'swallow', bg: 'eave', text: '燕子说：我要回家了。', py: ['yàn', 'zi', 'shuō', 'wǒ', 'yào', 'huí', 'jiā', 'le'], lines: ['燕子说：', '我要回家了。'], ask: { t: 'question', q: '燕子的家在哪里呢？', hint: '接着往下看。' } },
        { n: 2, art: 'swallow', bg: 'eave', text: '我问：你家在哪里？', py: ['wǒ', 'wèn', 'nǐ', 'jiā', 'zài', 'nǎ', 'lǐ'], lines: ['我问：', '你家在哪里？'], ask: { t: 'predict', q: '你猜燕子会怎么回答？', hint: '想想平时在哪里看见过燕子窝。' } },
        { n: 3, art: 'swallow', bg: 'eave', text: '燕子说：在屋檐下面。', py: ['yàn', 'zi', 'shuō', 'zài', 'wū', 'yán', 'xià', 'miàn'], lines: ['燕子说：', '在屋檐下面。'], ask: { t: 'clarify', q: '「屋檐」是房子的哪一部分？', hint: '屋顶伸出来的、能挡雨的那一块。' } },
        { n: 4, art: 'swallow', bg: 'eave', text: '我又问：你明年还来吗？', py: ['wǒ', 'yòu', 'wèn', 'nǐ', 'míng', 'nián', 'hái', 'lái', 'ma'], lines: ['我又问：', '你明年还来吗？'], ask: { t: 'predict', q: '燕子会来吗？猜一猜。', hint: '燕子每年都会做同一件事。' } },
        { n: 5, art: 'swallow', bg: 'eave', text: '燕子说：我会来的。', py: ['yàn', 'zi', 'shuō', 'wǒ', 'huì', 'lái', 'de'], lines: ['燕子说：', '我会来的。'], ask: { t: 'summarize', q: '燕子答应了什么？', hint: '它说的是哪一句话？' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '是谁在和「我」说话？',
          '燕子的家在哪里？',
          '「我」问了燕子几个问题？分别问的是什么？',
          '燕子最后答应了吗？它说了什么？',
          '你觉得燕子会回来吗？为什么？'
        ],
        sample: '燕子和我说，它要回家了。我问它家在哪里，它说在屋檐下面。我又问它明年还来吗，它说它会来的。我觉得燕子是很讲信用的朋友，因为它答应过就会做到。'
      },
      parent: {
        before: '带孩子看看自家屋檐或楼下有没有燕子窝。有实物再看这首儿歌，孩子理解得快得多。',
        during: '这首是对话体，可以分角色读：大人读「我问」，孩子读「燕子说」。读两遍孩子就能背下来。',
        after: '问一句：「燕子为什么要走？」不用讲迁徙的科学道理，只要孩子知道「天冷了它要去暖的地方」就够了。',
        watch: '孩子可能问「燕子走了还回来吗」。这是个好问题，可以一起记住这句话，明年春天再验证。'
      }
    },

    /* ============ 11. 三只白鹤（L2 · 寓言 · 观察方法） ============ */
    {
      id: 'l2_threecrane',
      title: '三只白鹤',
      sub: '寓言故事',
      band: 'L2',
      type: 'story',
      theme: '观察 · 方法',
      emoji: '🕊️',
      art: 'crane', artBg: 'shore',
      textbook: '一年级上册 · 和大人一起读（一）',
      minutes: 7,
      chars: { newChars: [], preCovered: ['鹤', '埋', '记', '完'], rawRate: 0.086, rate: 0.000 },
      strategy: 'summarize',
      goal: '能说出白鹤为什么找不到鱼，并说出「怎样才能记住地方」。',
      bigIdea: '记住一个地方，不能只看「会变的东西」——影子会动，树不会动。',
      vocab: [
        { w: '白鹤', py: 'bái hè', emoji: '🕊️', def: '一种腿和嘴都很长的大鸟，喜欢在水边捉鱼。', sent: '三只白鹤在河边捉鱼。' },
        { w: '埋', py: 'mái', emoji: '⛏️', def: '把东西放进土里盖起来。', sent: '把鱼埋在大树下面。' },
        { w: '树影', py: 'shù yǐng', emoji: '🌳', def: '树挡着太阳时地上出现的黑影。', sent: '太阳升起来了，树影变了。' },
        { w: '记住', py: 'jì zhù', emoji: '🧠', def: '记在心里，不会忘。', sent: '我记得鱼在哪里。' },
        { w: '看准', py: 'kàn zhǔn', emoji: '🎯', def: '看清楚，认准了。', sent: '下次我要看准地方。' },
        { w: '吃不完', py: 'chī bù wán', emoji: '🍽️', def: '东西太多了，吃不下那么多。', sent: '它们捉了很多鱼，吃不完。' }
      ],
      pages: [
        { n: 1, art: 'crane', bg: 'shore', text: '三只白鹤在河边捉鱼。', py: ['sān', 'zhī', 'bái', 'hè', 'zài', 'hé', 'biān', 'zhuō', 'yú'], lines: ['三只白鹤', '在河边捉鱼。'], ask: { t: 'clarify', q: '白鹤在什么地方做什么？', hint: '在哪里、做什么，两件事都要说。' } },
        { n: 2, art: 'crane', bg: 'shore', text: '它们捉了很多鱼，吃不完。', py: ['tā', 'men', 'zhuō', 'le', 'hěn', 'duō', 'yú', 'chī', 'bù', 'wán'], lines: ['它们捉了很多鱼，', '吃不完。'], ask: { t: 'predict', q: '吃不完的鱼，它们会怎么办？', hint: '想想你吃不完的东西会放哪里。' } },
        { n: 3, art: 'crane', bg: 'shore', extra: 'fish', text: '一只白鹤把鱼埋在大树下面。', py: ['yì', 'zhī', 'bái', 'hè', 'bǎ', 'yú', 'mái', 'zài', 'dà', 'shù', 'xià', 'miàn'], lines: ['一只白鹤把鱼', '埋在大树下面。'], ask: { t: 'question', q: '它为什么要把鱼埋在树下？', hint: '埋起来是为了——' } },
        { n: 4, art: 'crane', bg: 'shore', text: '它说：我记得鱼在哪里。', py: ['tā', 'shuō', 'wǒ', 'jì', 'de', 'yú', 'zài', 'nǎ', 'lǐ'], lines: ['它说：', '我记得鱼在哪里。'], ask: { t: 'predict', q: '它能找到吗？你先猜，再往下看。', hint: '记住的是「树」，还是「影子」？' } },
        { n: 5, art: 'crane', bg: 'shore', text: '太阳升起来了，树影变了。', py: ['tài', 'yáng', 'shēng', 'qǐ', 'lái', 'le', 'shù', 'yǐng', 'biàn', 'le'], lines: ['太阳升起来了，', '树影变了。'], ask: { t: 'clarify', q: '树影为什么会变？', hint: '太阳动了，影子就跟着动。' } },
        { n: 6, art: 'crane', bg: 'shore', text: '白鹤找了半天，找不到鱼。', py: ['bái', 'hè', 'zhǎo', 'le', 'bàn', 'tiān', 'zhǎo', 'bú', 'dào', 'yú'], lines: ['白鹤找了半天，', '找不到鱼。'], ask: { t: 'summarize', q: '它为什么找不到鱼？', hint: '它记住的那个东西，会变。' } },
        { n: 7, art: 'crane', bg: 'shore', text: '它说：下次我要看准地方。', py: ['tā', 'shuō', 'xià', 'cì', 'wǒ', 'yào', 'kàn', 'zhǔn', 'dì', 'fāng'], lines: ['它说：', '下次我要看准地方。'], ask: { t: 'summarize', q: '如果再来一次，应该记住什么？', hint: '记住大树，还是记住影子？' } }
      ],
      retell: {
        frame: ['谁', '在哪里', '发生了什么', '最后怎么样', '我觉得'],
        prompts: [
          '故事里有几只白鹤？它们在做什么？',
          '它们在什么地方捉鱼？',
          '一只白鹤把鱼藏在哪里？它说自己记住了什么？',
          '后来它找到鱼了吗？为什么？',
          '如果是你，你会怎么记住藏东西的地方？'
        ],
        sample: '三只白鹤在河边捉鱼，捉了很多吃不完。一只白鹤把鱼埋在大树下面，它说自己记得鱼在哪里。后来太阳升起来，树影变了，它找了半天也找不到鱼。我觉得它记住的是影子，可是影子会动。下次应该记住大树，因为大树不会动。'
      },
      parent: {
        before: '先问：「如果要记住一个地方，你会看什么？」让孩子先说自己的想法，读完再对照。',
        during: '读到第 5 页「树影变了」时停一下，用台灯照一个杯子，移动灯看影子怎么变。孩子一看就懂了。',
        after: '做一次「藏东西」游戏：让孩子把玩具藏在屋里某处，说出记住的方法，第二天再找。这是把故事变成能力。',
        watch: '孩子如果只说「它记错了」，追问一句：「它记住的是什么？那个东西会变吗？」把因果说完整。'
      }
    }
  ];

  /* ------------------------------------------------------------------ *
   * 五、运行时工具
   * ------------------------------------------------------------------ */

  /* 收集一本绘本「读前预教」覆盖到的所有字（含词语中的每个字）。
     这是 Nation(2001) 词汇显性教学的作用点：预教把「生字」变成「已知」，
     因此生字率必须按「预教后仍不认识的字」来算，否则会高估难度。 */
  function r71PreTaught(book) {
    var s = {};
    (book.vocab || []).forEach(function (v) {
      (v.w || '').split('').forEach(function (c) { if (/[\u4e00-\u9fa5]/.test(c)) s[c] = 1; });
    });
    return s;
  }

  /* 统计一本绘本的实测生字率
     生字率 = 未在识字表内、且未被预教覆盖的汉字 token 数 / 正文汉字总数
     依据：Betts(1946) 可读性标准 + Nation(2001) 词汇教学补偿机制 */
  function r71Rate(book) {
    var all = book.pages.map(function (p) { return p.text; }).join('');
    var chars = all.match(/[\u4e00-\u9fa5]/g) || [];
    var empty = { total: 0, unique: 0, newChars: [], preChars: [], tokens: 0, rate: 0, betts: R71_BETTS[0] };
    if (!chars.length) return empty;

    var pre = r71PreTaught(book);
    var uniq = {}, allNew = {}, stillNew = {}, preHit = {};
    var tokNew = 0, tokStill = 0;

    chars.forEach(function (c) {
      uniq[c] = 1;
      if (R71_SIGHT[c]) return;              // 识字表内 → 已知
      allNew[c] = 1; tokNew++;
      if (pre[c]) { preHit[c] = 1; return; }  // 超纲但已预教 → 视为已知
      stillNew[c] = 1; tokStill++;
    });

    var rate = tokStill / chars.length;
    return {
      total: chars.length,
      unique: Object.keys(uniq).length,
      newChars: Object.keys(stillNew),        // 预教后仍不认识的字（真正需要注音/支架）
      allNewChars: Object.keys(allNew),       // 全部超纲字（用于核对 preTeach 覆盖率）
      preChars: Object.keys(preHit),          // 被预教覆盖住的超纲字
      tokens: tokStill,
      rawTokens: tokNew,
      rawRate: tokNew / chars.length,
      rate: rate,
      betts: r71Betts(rate)
    };
  }

  /* 按文本类型与分级取生字率上限 */
  function r71Cap(book) {
    var b = null;
    for (var i = 0; i < R71_BANDS.length; i++) if (R71_BANDS[i].id === book.band) b = R71_BANDS[i];
    if (!b) b = R71_BANDS[0];
    return b.maxRate[book.type === 'rhyme' ? 'rhyme' : 'story'];
  }

  /* ==========================================================================
     R71_CATALOG —「快乐读书吧」官方书目（人教社 · 曹文轩/陈先云主编）
     一年级上册《和大人一起读》全 4 册 + 一年级下册《读读童谣和儿歌》全 4 册。
     作用有三：
       ① 让家长知道「课本指定读哪些」，而不是随便找书读；
       ② 标出哪几篇已做成互动绘本（on: '书id'），哪几篇建议用纸质书亲子共读；
       ③ 每册给出官方阅读指导要点，对齐教材「课外阅读课程化」的意图。
     数据来源：人民教育出版社官网书目页 + 统编教材配套书目（2024 版）。
     ========================================================================== */
  var R71_CATALOG = {
    note: '这套书是统编语文教材「快乐读书吧」栏目指定读物，一年级共 8 册。课本里出现的篇目，优先读互动版；其余篇目建议用纸质书和大人一起读。',
    sets: [
      {
        id: 'g1a', grade: '一年级上册', title: '和大人一起读', vols: 4,
        publisher: '人民教育出版社 · 曹文轩 陈先云 主编',
        howto: '这一册以「大人读、孩子听和指」为主。孩子刚学完拼音，不要求独立认全字，重点是让孩子觉得读书是件暖和的事。',
        books: [
          {
            vol: '（一）', theme: '儿歌与童话', items: [
              { t: '小小竹排画中游', type: '儿歌' },
              { t: '春水（六三）', type: '诗歌', by: '冰心' },
              { t: '小兔子乖乖', type: '儿歌', on: 'l1_rabbit' },
              { t: '青蛙写诗', type: '童话', by: '张秋生', on: 'l2_frog' },
              { t: '松鼠和松果', type: '童话', by: '林颂英' },
              { t: '三只白鹤', type: '寓言', on: 'l2_threecrane' },
              { t: '狗熊请客', type: '童话', by: '樊发稼' },
              { t: '小猫咪穿鞋子', type: '童话' },
              { t: '比画风', type: '故事', by: '方轶群' }
            ]
          },
          {
            vol: '（二）', theme: '成语与典故', items: [
              { t: '胸有成竹', type: '成语故事' },
              { t: '画龙点睛', type: '成语故事' },
              { t: '望梅止渴', type: '成语故事' },
              { t: '磨刀不误砍柴工', type: '成语故事' },
              { t: '程门立雪', type: '成语故事' },
              { t: '惊弓之鸟', type: '成语故事' },
              { t: '凿壁借光', type: '成语故事' },
              { t: '闻鸡起舞', type: '成语故事' }
            ]
          },
          {
            vol: '（三）', theme: '生活故事', items: [
              { t: '燕子的话', type: '儿歌', on: 'l1_swallow' },
              { t: '小蘑菇', type: '儿歌' },
              { t: '你好，伙伴', type: '故事' },
              { t: '企鹅寄冰', type: '童话' },
              { t: '螃蟹的生意', type: '童话' },
              { t: '小猫做饭', type: '童话' },
              { t: '晨读对韵', type: '韵文' }
            ]
          },
          {
            vol: '（四）', theme: '中外童话', items: [
              { t: '小花和小草', type: '儿歌' },
              { t: '当一次小尾巴', type: '故事' },
              { t: '小猪奴尼', type: '童话' },
              { t: '好事情', type: '故事' },
              { t: '小狐狸买手套', type: '童话' },
              { t: '狐狸和鹳', type: '寓言' },
              { t: '下金蛋的鹅', type: '寓言' },
              { t: '青蛙和黄牛', type: '寓言' },
              { t: '豌豆上的公主', type: '童话' },
              { t: '小红帽', type: '童话' }
            ]
          }
        ]
      },
      {
        id: 'g1b', grade: '一年级下册', title: '读读童谣和儿歌', vols: 4,
        publisher: '人民教育出版社 · 曹文轩 陈先云 主编',
        howto: '这一册全部是童谣儿歌，共 124 首，全文注音。孩子此时已能拼读，重点转为「自己读、读出节奏」。建议每天一首，读完拍手打节奏。',
        books: [
          {
            vol: '（一）', theme: '奇趣大自然 · 多彩的生活', items: [
              { t: '小老鼠', type: '童谣', on: 'l1_mouse' },
              { t: '小松鼠', type: '童谣' },
              { t: '搬鸡蛋', type: '童谣' },
              { t: '高高山上一头牛', type: '童谣' },
              { t: '数蛤蟆', type: '童谣' },
              { t: '没有腿', type: '童谣' },
              { t: '狗和猴', type: '童谣', on: 'l1_dogmonkey' },
              { t: '一对蝈蝈吹牛皮', type: '童谣' },
              { t: '菊花开', type: '童谣' },
              { t: '种西瓜', type: '童谣' },
              { t: '虹', type: '儿歌', on: 'l1_rainbow' },
              { t: '雨儿雨儿下', type: '儿歌' },
              { t: '听声音', type: '儿歌' },
              { t: '对花', type: '儿歌' },
              { t: '外婆桥', type: '童谣' },
              { t: '摇篮曲', type: '童谣' },
              { t: '小板凳', type: '童谣' },
              { t: '剪纸歌', type: '童谣' },
              { t: '小花鼓', type: '童谣' },
              { t: '风筝飘', type: '童谣' },
              { t: '月亮毛毛', type: '童谣' },
              { t: '端阳', type: '童谣' },
              { t: '颠倒歌', type: '童谣' },
              { t: '打醋买布', type: '绕口令' },
              { t: '画凤凰', type: '绕口令' },
              { t: '头字歌', type: '童谣' },
              { t: '房子里有箱子', type: '童谣' }
            ]
          },
          {
            vol: '（二）', theme: '快乐的游戏 · 好习惯', items: [
              { t: '手拉手', type: '儿歌' },
              { t: '肥皂泡', type: '儿歌' },
              { t: '放气球', type: '儿歌' },
              { t: '荡秋千', type: '儿歌' },
              { t: '跳房子', type: '儿歌' },
              { t: '伞', type: '儿歌' },
              { t: '捉浪花', type: '儿歌' },
              { t: '两个泥娃娃', type: '儿歌' },
              { t: '折小鸟', type: '儿歌' },
              { t: '钓鱼', type: '儿歌' },
              { t: '轻轻', type: '儿歌' },
              { t: '叫什么', type: '儿歌' },
              { t: '跟谁走', type: '儿歌' },
              { t: '让我们荡起双桨', type: '歌曲' },
              { t: '眼睛亮亮', type: '儿歌' },
              { t: '耳朵', type: '儿歌' },
              { t: '洗手歌', type: '儿歌' },
              { t: '花手绢', type: '儿歌' },
              { t: '晒被子', type: '儿歌' },
              { t: '新年到', type: '童谣' },
              { t: '闹元宵', type: '童谣' },
              { t: '月亮婆婆生日到', type: '童谣' },
              { t: '传统节日', type: '儿歌' },
              { t: '铃儿响叮当', type: '歌曲' },
              { t: '小白船', type: '歌曲' },
              { t: '红蜻蜓', type: '歌曲' }
            ]
          },
          {
            vol: '（三）', theme: '我爱祖国 · 我爱读书', items: [
              { t: '祖国地图多美丽', type: '儿歌' },
              { t: '大草原', type: '儿歌' },
              { t: '我和祖国', type: '儿歌' },
              { t: '升国旗', type: '儿歌' },
              { t: '合奏祖国妈妈好', type: '儿歌' },
              { t: '爱护地球', type: '儿歌' },
              { t: '山爷爷', type: '儿歌' },
              { t: '保护环境拍手谣', type: '儿歌' },
              { t: '爱鸟歌', type: '儿歌' },
              { t: '植树谣', type: '儿歌' },
              { t: '手脑相长歌', type: '儿歌', by: '陶行知' },
              { t: '学写字', type: '儿歌' },
              { t: '小书架', type: '儿歌' },
              { t: '读书乐', type: '儿歌' },
              { t: '铃声变歌声', type: '儿歌' },
              { t: '红橘', type: '儿歌' },
              { t: '捶捶腰', type: '儿歌' },
              { t: '爷爷太老', type: '儿歌' },
              { t: '站一下没关系', type: '儿歌' },
              { t: '送伞', type: '儿歌' },
              { t: '瓜', type: '儿歌' },
              { t: '什么美', type: '儿歌' },
              { t: '手', type: '儿歌' },
              { t: '手指歌', type: '儿歌' },
              { t: '学好样', type: '儿歌' },
              { t: '自己来', type: '儿歌' },
              { t: '过生日', type: '儿歌' },
              { t: '不倒翁', type: '儿歌' },
              { t: '水管哭了', type: '儿歌' }
            ]
          },
          {
            vol: '（四）', theme: '四季 · 动植物', items: [
              { t: '四季儿歌', type: '儿歌' },
              { t: '春是淘气包', type: '儿歌' },
              { t: '春天的小雨', type: '儿歌' },
              { t: '春天在哪里', type: '儿歌' },
              { t: '风娃娃', type: '儿歌' },
              { t: '夏天好', type: '儿歌' },
              { t: '秋天是个大果盘', type: '儿歌' },
              { t: '冬天爷爷变戏法', type: '儿歌' },
              { t: '雪', type: '儿歌' },
              { t: '露珠', type: '儿歌' },
              { t: '月亮', type: '儿歌' },
              { t: '海娃娃', type: '儿歌' },
              { t: '小蚱蜢', type: '儿歌' },
              { t: '小燕子背把剪', type: '儿歌' },
              { t: '青蛙跳到荷叶上', type: '儿歌' },
              { t: '小猫养鱼', type: '儿歌' },
              { t: '小蜗牛', type: '儿歌' },
              { t: '蜗牛看花', type: '儿歌' },
              { t: '小鸟追窝', type: '儿歌' },
              { t: '猫咪骑上虎', type: '儿歌' },
              { t: '猫剪胡子老鼠笑', type: '儿歌' },
              { t: '小树节节高', type: '儿歌' },
              { t: '蒲公英', type: '儿歌' },
              { t: '小竹笋', type: '儿歌' },
              { t: '野牵牛', type: '儿歌' },
              { t: '爬山虎', type: '儿歌' },
              { t: '豆豆姑娘', type: '儿歌' },
              { t: '小葫芦', type: '儿歌' },
              { t: '柳树条', type: '儿歌' },
              { t: '麦海', type: '儿歌' },
              { t: '瓜儿谣', type: '儿歌' }
            ]
          }
        ]
      }
    ]
  };

  window.R71 = {
    BANDS: R71_BANDS,
    BETTS: R71_BETTS,
    STRATEGIES: R71_STRATEGIES,
    BOOKS: R71_BOOKS,
    CATALOG: R71_CATALOG,
    ART: R71_ART,
    BG: R71_BG,
    PROP: R71_PROP,
    SIGHT: R71_SIGHT,
    RUBY: R71_RUBY,
    scene: r71Scene,
    betts: r71Betts,
    rate: r71Rate,
    cap: r71Cap,
    band: function (id) { for (var i = 0; i < R71_BANDS.length; i++) if (R71_BANDS[i].id === id) return R71_BANDS[i]; return R71_BANDS[0]; },
    book: function (id) { for (var i = 0; i < R71_BOOKS.length; i++) if (R71_BOOKS[i].id === id) return R71_BOOKS[i]; return null; },
    /* 书目统计：共几册、几篇、几篇已做成互动绘本 */
    catalogStat: function () {
      var vols = 0, items = 0, done = 0;
      R71_CATALOG.sets.forEach(function (s) {
        s.books.forEach(function (b) {
          vols++; b.items.forEach(function (it) { items++; if (it.on) done++; });
        });
      });
      return { vols: vols, items: items, done: done, sets: R71_CATALOG.sets.length };
    }
  };
})();
