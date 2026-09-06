/* 一年级成长岛 v61：国家中小学智慧教育平台一年级课程目录快照。
 * 仅保存目录、主题与原创练习，不包含教材正文、平台视频或平台音频。
 */
(function(){
  'use strict';
  const PLATFORM='https://basic.smartedu.cn/syncClassroom/auto';
  const term=(id,label,url,units)=>({id,label,sourceUrl:url||PLATFORM,units});
  const unit=(name,topics,goal,activity,check)=>({name,topics,goal,activity,check});
  const urls={
    chineseUpper:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a749654-0772-11ed-ac74-092ab92074e6%2F44bee8bc-54e6-11ed-9c34-850ba61fa9f4%2Fff8080814371757b014390f883db0453%2F5136342961',
    chineseLower:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a749654-0772-11ed-ac74-092ab92074e6%2F44bee8bc-54e6-11ed-9c34-850ba61fa9f4%2Fff8080814371757b014390fcdce504bd%2F5136342961',
    mathUpper:'https://basic.smartedu.cn/syncClassroom/prepare?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbcf80-0590-11ed-9c79-92fc3b3249d5%2Fff8080814371757b01437c363a187b0a%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2Fff8080814371757b014390f883db0453%2F5136342961',
    mathLower:'https://basic.smartedu.cn/syncClassroom/prepare?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbcf80-0590-11ed-9c79-92fc3b3249d5%2Fff8080814371757b01437c363a187b0a%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2Fff8080814371757b014390fcdce504bd%2F5136342961',
    englishUpper:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a7495dc-0772-11ed-ac74-092ab92074e6%2Fff808081439f924c0143a40bfce722d4%2Fff8080814371757b014390f883db0453',
    englishLower:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a7495dc-0772-11ed-ac74-092ab92074e6%2Fff808081439f924c0143a40bfce722d4%2Fff8080814371757b014390fcdce504bd',
    moralityUpper:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a74973a-0772-11ed-ac74-092ab92074e6%2F44bee8bc-54e6-11ed-9c34-850ba61fa9f4%2Fff8080814371757b014390f883db0453%2F5136342961',
    moralityLower:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a74973a-0772-11ed-ac74-092ab92074e6%2F44bee8bc-54e6-11ed-9c34-850ba61fa9f4%2Fff8080814371757b014390fcdce504bd%2F5136342961',
    scienceUpper:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a749230-0772-11ed-ac74-092ab92074e6%2F44bed098-54e6-11ed-9c34-850ba61fa9f4%2Fff8080814371757b014390f883db0453%2F5136342961',
    scienceLower:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a749230-0772-11ed-ac74-092ab92074e6%2F44bed098-54e6-11ed-9c34-850ba61fa9f4%2Fff8080814371757b014390fcdce504bd%2F5136342961',
    musicUpper:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a7497b2-0772-11ed-ac74-092ab92074e6%2Fff8080814371757b01437c363a187b0a%2Fff8080814371757b014390f883db0453%2F5136342961',
    musicLower:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a7497b2-0772-11ed-ac74-092ab92074e6%2Fff8080814371757b01437c363a187b0a%2Fff8080814371757b014390fcdce504bd%2F5136342961',
    artUpper:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a749398-0772-11ed-ac74-092ab92074e6%2Fff8080814371757b01437c363a187b0a%2Fff8080814371757b014390f883db0453%2F5136342961',
    artLower:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a749398-0772-11ed-ac74-092ab92074e6%2Fff8080814371757b01437c363a187b0a%2Fff8080814371757b014390fcdce504bd%2F5136342961',
    pe:'https://basic.smartedu.cn/syncClassroom/prepare?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2F6a747e26-0772-11ed-ac74-092ab92074e6%2Fff8080814371757b01437c363a187b0a%2F44bebf40-54e6-11ed-9c34-850ba61fa9f4%2F502036372038',
    integrated:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F6a74947e-0772-11ed-ac74-092ab92074e6%2F36288019491df525014935b7c67e15e2%2Fff8080814371757b014390f883db0453',
    labor:'https://basic.smartedu.cn/syncClassroom?defaultTag=e7bbb2de-0590-11ed-9c79-92fc3b3249d5%2Fe7bbd296-0590-11ed-9c79-92fc3b3249d5%2F5036342961%2F362880034bfbfa20014c0b98acd70152%2Fff8080814371757b014390f883db0453'
  };
  const simple=(names,goals)=>names.map((name,i)=>unit(name,[],goals[i]||goals[0],goals[i]||goals[0],null));
  const manifest={
    schema:'curriculum-manifest-v1',grade:'一年级',verifiedAt:'2026-09-07',platform:PLATFORM,
    policy:'目录与能力范围来自官方平台；题目、讲解、插图和互动均为本项目原创。',
    subjects:[
      {id:'chinese',icon:'📚',name:'语文',edition:'统编版',region:'chinese',terms:[
        term('upper','上册',urls.chineseUpper,[
          unit('我上学了',['我是中国人','我爱我们的祖国','我是小学生','我爱学语文'],'熟悉校园、表达自我并建立语文学习习惯','听说读写启蒙'),
          unit('第一单元·识字',['天地人','金木水火土','口耳目手足','日月山川','语文园地一','快乐读书吧'],'借助生活情境和图画认识常用字','识字与规范书写'),
          unit('第二单元·汉语拼音',['1 ɑ o e','2 i u ü','3 b p m f','4 d t n l'],'听辨单韵母和声母，练习两拼音节','拼音听辨'),
          unit('第三单元·汉语拼音',['5 g k h','6 j q x','7 z c s','8 zh ch sh r'],'辨清送气音、平翘舌音和拼写规则','拼音听辨'),
          unit('第四单元·汉语拼音',['9 y w','10 ɑi ei ui','11 ɑo ou iu','12 ie üe er','13 ɑn en in un ün','14 ɑng eng ing ong'],'掌握复韵母、鼻韵母与整体认读音节','拼音综合'),
          unit('第五单元·阅读',['秋天','江南','雪地里的小画家','四季','语文园地五'],'借助插图和关键词理解短文','朗读与表达'),
          unit('第六单元·识字',['对韵歌','日月明','小书包','升国旗','语文园地六'],'积累词语并了解汉字构字特点','识字与写字'),
          unit('第七单元·阅读',['小小的船','影子','两件宝','语文园地七'],'借助想象理解儿歌并完整表达','朗读与表达'),
          unit('第八单元·阅读',['比尾巴','乌鸦喝水','雨点儿','语文园地八'],'提取信息并按顺序复述事情','阅读理解')
        ]),
        term('lower','下册',urls.chineseLower,[
          unit('第一单元·识字',['春夏秋冬','姓氏歌','小青蛙','猜字谜','语文园地一','快乐读书吧·读读童谣和儿歌'],'用多种方法主动识字','识字写字'),
          unit('第二单元·阅读',['热爱中国共产党','吃水不忘挖井人','我多想去看看','一个接一个','四个太阳','语文园地二'],'朗读课文并联系生活表达愿望','阅读表达'),
          unit('第三单元·阅读',['小公鸡和小鸭子','树和喜鹊','怎么都快乐','口语交际·请你帮个忙','语文园地三'],'理解伙伴相处并学习礼貌求助','阅读与口语交际'),
          unit('第四单元·阅读',['静夜思','夜色','端午粽','彩虹','语文园地四'],'在朗读中感受亲情和传统文化','朗读积累'),
          unit('第五单元·识字',['动物儿歌','古对今','操场上','人之初','口语交际·打电话','语文园地五'],'在韵文和生活情境中识字','识字与表达'),
          unit('第六单元·阅读',['古诗二首','荷叶圆圆','要下雨了','语文园地六'],'边读边想象画面并发现自然现象','阅读观察'),
          unit('第七单元·阅读',['文具的家','一分钟','动物王国开大会','小猴子下山','口语交际·一起做游戏','语文园地七'],'提取重要信息并养成做事好习惯','阅读与习惯'),
          unit('第八单元·阅读',['棉花姑娘','咕咚','小壁虎借尾巴','语文园地八'],'借助图文了解动物特点并复述故事','阅读与复述')
        ])
      ]},
      {id:'math',icon:'🔢',name:'数学',edition:'人教版',region:'math',terms:[
        term('upper','上册',urls.mathUpper,simple(['数学游戏与学习准备','1·5以内数的认识和加减法','2·6～10的认识和加减法','3·认识立体图形','4·11～20的认识','5·20以内的进位加法','6·复习与关联'],['观察、比较、分类和一一对应','建立5以内数感并理解加减意义','掌握6到10的组成与加减','辨认球、正方体、长方体和圆柱','认识数位并比较20以内的数','用凑十法计算进位加法','关联数、运算和图形知识'])),
        term('lower','下册',urls.mathLower,simple(['1·认识平面图形','2·20以内的退位减法','3·100以内数的认识','4·100以内的口算加减法','5·100以内的笔算加减法','6·数量间的加减关系','欢乐购物街','7·复习与关联'],['辨认和拼组常见平面图形','理解十几减几并解决问题','数、读写、比较100以内的数','计算两位数与一位数、整十数','学习竖式书写和计算','理解相差关系并解决问题','认识人民币并进行简单购物','整理数与运算、数量关系和图形'])),
        term('extra','课外拓展',PLATFORM,[unit('时间在哪里',['整点','半小时','分与秒','经过时间','生活估测'],'时间内容不计入教材同步完成率','生活中的时间')])
      ]},
      {id:'english',icon:'🔠',name:'英语',edition:'北京版',region:'english',terms:[
        term('upper','上册',urls.englishUpper,simple(["UNIT ONE HELLO! I'M MAOMAO",'UNIT TWO GOOD MORNING','UNIT THREE HOW ARE YOU?','UNIT FOUR NICE TO MEET YOU','REVISION ONE','UNIT FIVE I CAN SING','UNIT SIX HAPPY CHINESE NEW YEAR','REVISION TWO'],['听懂并使用一年级日常英语表达'])),
        term('lower','下册',urls.englishLower,simple(['UNIT ONE GLAD TO SEE YOU AGAIN','UNIT TWO WHAT DO YOU DO?','UNIT THREE WHAT COLOUR IS YOUR BAG?','REVISION ONE','UNIT FOUR HOW MANY STARS CAN YOU SEE?',"UNIT FIVE WHO'S HE?","UNIT SIX I'M SORRY I'M LATE",'REVISION TWO'],['在问候、职业、颜色、数量、家庭和守时情境中听说英语']))
      ]},
      {id:'morality',icon:'🤝',name:'道德与法治',edition:'统编版',region:'life',terms:[
        term('upper','上册',urls.moralityUpper,[
          unit('第一单元·我是小学生啦',['开开心心上学去','我向国旗敬个礼','这是我们的校园','平平安安回家来'],'适应小学生活并安全往返学校','认识校园并遵守安全规则',{q:'放学回家怎样更安全？',o:['按约定路线和家人同行','独自去陌生地方','追逐车辆','边走边看屏幕'],a:'按约定路线和家人同行'}),
          unit('第二单元·过好校园生活',['老师，您好！','拉拉手，交朋友','上课了，好好学','课余生活真丰富'],'尊敬老师、友爱同伴并认真学习','礼貌交往',{q:'上课时应该怎么做？',o:['认真听讲并举手发言','随意离开座位','大声打断别人','一直玩玩具'],a:'认真听讲并举手发言'}),
          unit('第三单元·养成良好习惯',['作息有规律','吃饭有讲究','玩也有学问','保持整洁'],'形成作息、饮食、整理和游戏规则意识','整理书包并安排作息',{q:'哪种做法有助于养成好习惯？',o:['按时睡觉和起床','想玩多久就玩多久','不洗手就吃饭','书包从不整理'],a:'按时睡觉和起床'}),
          unit('第四单元·我们讲文明',['对人有礼貌','公共场所小点声','排队守秩序','爱护公物'],'在公共生活中使用礼貌语言并遵守秩序','文明排队',{q:'在图书馆应该怎么做？',o:['轻声说话','追逐打闹','大声唱歌','随意涂书'],a:'轻声说话'})
        ]),
        term('lower','下册',urls.moralityLower,[
          unit('第一单元·我有新面貌',['有个新目标','做事要仔细','错了就要改','我们有精神'],'学会定目标、认真做事并主动改错','完成一个小目标',{q:'发现自己做错了，应该怎么办？',o:['承认并改正','藏起来不说','责怪别人','重复错误'],a:'承认并改正'}),
          unit('第二单元·我们一起长大',['和大家在一起','请帮我一下','我们爱分享','大家来合作'],'学习求助、分享和合作','与伙伴合作',{q:'合作时遇到不同意见怎么办？',o:['轮流表达并一起商量','抢走材料','不让别人说话','马上离开'],a:'轮流表达并一起商量'}),
          unit('第三单元·幸福一家人',['这是我的家','相亲相爱一家人','让我自己来整理','学做家务活'],'感受家庭关爱并承担力所能及的家务','整理自己的物品',{q:'一年级小朋友可以做哪项家务？',o:['整理自己的书桌','独自修理电器','攀爬高处擦窗','使用锋利工具'],a:'整理自己的书桌'}),
          unit('第四单元·争做中国好儿童',['热爱集体','爱护环境','诚实友善','从小爱祖国'],'在集体生活中友善、负责并热爱祖国','为集体做一件小事',{q:'看到地上有纸屑，合适的做法是？',o:['捡起并放进垃圾桶','假装没看见','踢到别人脚边','撕更多纸'],a:'捡起并放进垃圾桶'})
        ])
      ]},
      {id:'science',icon:'🔬',name:'科学',edition:'人教鄂教版',region:'science',terms:[
        term('upper','上册',urls.scienceUpper,[
          unit('第一单元·走近科学',['“钓鱼”游戏','不倒翁','怎样学科学'],'通过观察、比较、实验和表达认识科学探究','观察并提出问题',{q:'做科学观察时，哪种做法更合适？',o:['认真看并如实记录','只猜不观察','随意改变结果','不听安全要求'],a:'认真看并如实记录'}),
          unit('第二单元·我们的感觉器官',['我们怎样知道','观察水果','保护感觉器官'],'使用多种感官观察，并知道保护感官','观察水果',{q:'不能用哪种方法观察不明物体？',o:['直接品尝','用眼睛看','在老师指导下闻','轻轻触摸安全物品'],a:'直接品尝'}),
          unit('第三单元·家养动物',['金鱼','猫和兔','更多的家养动物'],'观察动物的外形、运动和生活需要','比较动物特点',{q:'观察小动物时应该怎么做？',o:['安静观察并爱护它','追赶惊吓它','用力抓它','随意投喂'],a:'安静观察并爱护它'}),
          unit('第四单元·使用工具',['常见的工具','拆装玩具','制作杯垫'],'认识常见工具并在成人指导下安全使用','选择合适工具',{q:'使用工具前首先要做什么？',o:['听清安全要求','立即挥舞工具','把工具扔给同伴','闭着眼操作'],a:'听清安全要求'})
        ]),
        term('lower','下册',urls.scienceLower,[
          unit('第一单元·位置和方向',['前后左右','东南西北','校园“寻宝”'],'用方位词描述物体位置和行走路线','描述路线',{q:'早晨面向太阳时，太阳大致在哪个方向？',o:['东','西','南','北'],a:'东'}),
          unit('第二单元·校园里的植物',['各种各样的叶','多彩的花','观察校园里的植物'],'观察并比较植物的叶和花','观察植物',{q:'观察校园植物时应该怎么做？',o:['不随意折花摘叶','把花全部摘下','踩进花坛','摇断树枝'],a:'不随意折花摘叶'}),
          unit('第三单元·常见的材料',['它们是用什么材料做的','金属','纸制品'],'辨认常见材料并比较特点','给材料分类',{q:'易拉罐通常主要由哪类材料制成？',o:['金属','纸','木头','布'],a:'金属'}),
          unit('第四单元·制作收纳用具',['收纳物品','设计制作笔筒','展示与改进'],'经历设计、制作、展示和改进过程','制作安全的收纳用具',{q:'制作完成后为什么还要试用和改进？',o:['发现问题让作品更好用','为了弄坏作品','不用听建议','只看颜色'],a:'发现问题让作品更好用'})
        ])
      ]},
      {id:'music',icon:'🎵',name:'艺术·音乐',edition:'人教版',region:'arts',terms:[
        term('upper','上册',urls.musicUpper,[
          unit('第一单元·奇妙的声音世界',['凤鸣山谷的故事','丰富多彩的声音','麦芽的一天','神奇的嗓音'],'发现生活和音乐中的声音特点','听辨强弱与音色',{q:'保护嗓子应该怎么做？',o:['自然轻松地发声','长时间大喊','口渴也不喝水','模仿刺耳噪声'],a:'自然轻松地发声'}),
          ...simple(['第二单元·麒麒的节奏密码','第三单元·小九的旋律密码','第四单元·打击乐大赛','第五单元·弹拨乐彩排','第六单元·管乐音乐会','第七单元·弓弦乐试听会','第八单元·唤醒春天'],['感受稳定节拍','听辨旋律高低和走向','认识打击乐器和节奏','感受弹拨乐器音色','认识管乐器音色','认识弓弦乐器音色','用音乐感受春天']).map((u,i)=>({...u,check:{q:'参加音乐活动时，哪种做法更合适？',o:['先听清节拍再表现','随意敲打乐器','用很大声音盖住别人','不听指挥'],a:'先听清节拍再表现'}}))
        ]),
        term('lower','下册',urls.musicLower,simple(['第一单元·爱的摇篮','第二单元·你是我的好朋友','第三单元·绿色家园','第四单元·一二三，转转转','第五单元·劳动最光荣','第六单元·生活中的音乐','第七单元·动画城','第八单元·两只老虎与小兔乖乖'],['感受温柔舒展的音乐','用歌声表达友爱','感受自然与绿色主题','跟随稳定节拍律动','用音乐表现劳动','发现生活中的音乐','感受动画音乐形象','在熟悉旋律中合作表现']).map(u=>({...u,check:{q:'跟随音乐活动时应该怎么做？',o:['听清节拍再开始','越快越好','随意大喊','推挤同伴'],a:'听清节拍再开始'}})))
      ]},
      {id:'art',icon:'🎨',name:'艺术·美术',edition:'人教版',region:'arts',terms:[
        term('upper','上册',urls.artUpper,[
          unit('第一单元·龙的传人',['我的名字','生肖大家庭','龙的故事','灵动的龙','中秋月儿圆'],'观察传统文化形象并大胆表现','画出有特点的名字',{q:'美术创作前可以先做什么？',o:['认真观察形状和颜色','直接照抄别人','把工具乱扔','在桌面随意涂画'],a:'认真观察形状和颜色'}),
          unit('第二单元·奉献最美',['落叶去哪儿了','勤劳的蚕宝宝','寸草心'],'发现自然材料和劳动之美','用安全材料创作',{q:'收集落叶创作时应该怎么做？',o:['捡落叶，不折活枝','折断树枝','踩坏花草','采摘所有花朵'],a:'捡落叶，不折活枝'}),
          unit('第三单元·成长足迹',['新龟兔赛跑','蜗牛的坚持','看我七十二变'],'用图形、色彩和故事表现成长','画连续小故事',{q:'怎样让画面更容易讲清故事？',o:['安排人物和事情的先后','只涂一种颜色','把纸揉皱','不画主要人物'],a:'安排人物和事情的先后'}),
          unit('第四单元·我的祖国',['红星闪闪','美丽家乡','祖国好风光'],'用美术作品表达对家乡和祖国的感受','观察家乡并创作',{q:'表现家乡时，可以先观察什么？',o:['有特点的建筑和风景','别人的答案','无关广告','屏幕亮度'],a:'有特点的建筑和风景'})
        ]),
        term('lower','下册',urls.artLower,[
          unit('第一单元·大地母亲',['春天在哪里','春天的使者','大地的肌理','自然的馈赠'],'观察春天、纹理和自然材料','拓印安全纹理',{q:'拓印纹理时选择什么更安全？',o:['平整无尖刺的叶片','碎玻璃','生锈铁片','锋利刀片'],a:'平整无尖刺的叶片'}),
          unit('第二单元·时空印迹',['远古的信息','前人的巧思','文物修复师','丝路的故事'],'感受文物和传统工艺中的美','观察文物图案',{q:'参观文物时应该怎么做？',o:['遵守规定并认真观察','随意触摸','在展品上刻字','追逐打闹'],a:'遵守规定并认真观察'}),
          unit('第三单元·身边的人',['致敬平凡','守护生命','创造奇迹'],'观察人物动作并表达敬意','画身边劳动者',{q:'画人物动作时重点观察什么？',o:['身体姿态和正在做的事','只看背景','只画一个圆点','不看人物'],a:'身体姿态和正在做的事'}),
          unit('第四单元·家的故事',['走进旧时光','快乐的一家','我家的故事'],'用图画记录家庭生活和记忆','画一件家庭小事',{q:'表现家庭故事，哪种内容最合适？',o:['一起做饭或阅读的真实场景','随便复制广告','只写一串数字','不相关的标志'],a:'一起做饭或阅读的真实场景'})
        ])
      ]},
      {id:'pe',icon:'🤸',name:'体育与健康',edition:'人教版·水平一',region:'life',gradeBand:'一至二年级',terms:[
        term('level1','水平一',urls.pe,[
          unit('体育与健康基础知识',['健康文明的生活方式','愉快上体育课','坐立行我最美','饮水有益健康','安全游戏','健康饮食'],'形成安全、卫生和运动意识','整理运动前的安全准备',{q:'运动前应该怎么做？',o:['检查场地并做好热身','马上快速冲刺','推挤同伴','穿拖鞋跑步'],a:'检查场地并做好热身'}),
          unit('基本身体活动',['走、跑、跳、投','平衡、爬行、钻越'],'发展基本运动能力','完成短时规范动作',{q:'运动中身体不舒服应该怎么办？',o:['马上停止并告诉老师或家长','继续硬撑','躲起来不说','加快速度'],a:'马上停止并告诉老师或家长'}),
          unit('体操、球类与游戏',['队列和基本体操','球类活动','武术与民族民间体育','体育游戏'],'在规则下合作运动','听口令并遵守规则',{q:'集体体育游戏中最重要的是？',o:['遵守规则并注意安全','只顾自己获胜','随意冲撞','抢夺器材'],a:'遵守规则并注意安全'})
        ])
      ]},
      {id:'integrated',icon:'🎭',name:'艺术·舞蹈/影视/戏剧',edition:'教科版',region:'arts',terms:[
        term('upper','上册',urls.integrated,[
          unit('第一单元·分不开的你我他',['认识你我他','找呀找，找朋友'],'通过表情、动作和合作认识伙伴','模仿友好动作',{q:'合作表演时应该怎么做？',o:['轮流表现并互相配合','抢占所有角色','嘲笑同伴','故意推人'],a:'轮流表现并互相配合'}),
          unit('第二单元·奇妙的声音',['生活中的声音','音乐里的声音','猜猜我是谁','鸭子拌嘴'],'用声音、节奏和动作表达形象','听声音猜情境',{q:'模仿声音时怎样保护嗓子？',o:['控制音量并自然发声','一直尖叫','贴近别人耳朵喊','比赛谁声音最大'],a:'控制音量并自然发声'}),
          unit('第三单元·我们的动物朋友',['观察动物动作','动物角色表演'],'观察并用身体动作表现动物特点','表演一种动物',{q:'表演动物前先做什么？',o:['观察它怎样走和停','随意追赶动物','只看颜色','闭眼猜'],a:'观察它怎样走和停'}),
          unit('第四单元·神奇的天空',['我心中的太阳','月亮和星星','会变的云朵'],'用想象、动作和画面表现天空','表现云朵变化',{q:'哪一种最适合表现云朵变化？',o:['缓慢改变身体造型','一直站着不动','推倒同伴','大声敲桌子'],a:'缓慢改变身体造型'}),
          unit('第五单元·一起玩玩具',['玩具兵进行曲','小熊请客'],'在玩具故事中学习节奏和角色合作','跟节拍做动作',{q:'跟着进行曲做动作要注意什么？',o:['保持稳定节拍','越乱越好','只看别人','突然冲出场地'],a:'保持稳定节拍'}),
          unit('第六单元·过新年',['新年真快乐','校园音乐剧'],'综合声音、动作和角色进行展示','合作完成小舞台',{q:'上台展示前应该怎么做？',o:['分好角色并排练','临时争抢角色','不听提示','把道具乱放'],a:'分好角色并排练'})
        ])
      ]},
      {id:'labor',icon:'🧺',name:'劳动与技术',edition:'苏科版',region:'life',terms:[
        term('upper','上册',urls.labor,[
          unit('劳动与职业',['我们爱劳动','各种各样的职业','家务劳动计划'],'尊重劳动并制定力所能及的家务计划','选择一项今天能完成的家务',{q:'哪项家务适合一年级孩子独立完成？',o:['整理自己的书包','修理插座','使用燃气灶','站高凳擦窗'],a:'整理自己的书包'}),
          unit('生活整理',['系鞋带','叠衣服','理床铺'],'学习基本生活劳动并保持整洁','按步骤整理衣物和床铺',{q:'整理完成后还应该做什么？',o:['检查是否整齐和安全','把用品扔在地上','立即弄乱','让别人全部重做'],a:'检查是否整齐和安全'}),
          unit('简单制作',['十五巧板','动画手翻书','风车','风铃'],'在成人指导下安全使用材料完成制作','制作并试用作品',{q:'制作风车时使用剪刀应该怎么做？',o:['在成人指导下刀尖朝下传递','拿着剪刀奔跑','用剪刀对着同伴','剪电线'],a:'在成人指导下刀尖朝下传递'})
        ])
      ]}
    ]
  };

  window.CURRICULUM_MANIFEST_V1=manifest;
  window.CURRICULUM_SOURCE_URLS_V61=urls;

  // 修正旧目录：2024新教材仍为14课，y/w是独立第9课。
  if(typeof V43_TEXTBOOK!=='undefined'&&V43_TEXTBOOK[2]&&V43_TEXTBOOK[4]){
    V43_TEXTBOOK[2].items[1][0]='2 i u ü';
    V43_TEXTBOOK[2].items[1][1]='听辨三个单韵母及四声';
    V43_TEXTBOOK[4].items=[
      ['9 y w','认识声母 y、w 和整体认读音节 yi、wu、yu','pinyin'],
      ['10 ɑi ei ui','学习前复韵母和声调位置','pinyin'],
      ['11 ɑo ou iu','听辨复韵母，练习拼读','pinyin'],
      ['12 ie üe er','学习复韵母和特殊韵母 er','pinyin'],
      ['13 ɑn en in un ün','学习前鼻韵母','pinyin'],
      ['14 ɑng eng ing ong','学习后鼻韵母','pinyin'],
      ['语文园地四','完成拼音阶段综合复习','pinyin']
    ];
  }

  // 单韵母四声改用清晰的完整示范音节，避免把孤立 o 读成不稳定的语气词。
  const toneRefs={
    a1:['ma1','mā'],a2:['ma2','má'],a3:['ma3','mǎ'],a4:['ma4','mà'],
    o1:['bo1','bō'],o2:['bo2','bó'],o3:['bo3','bǒ'],o4:['bo4','bò'],
    e1:['ge1','gē'],e2:['ge2','gé'],e3:['ge3','gě'],e4:['ge4','gè'],
    i1:['yi1','yī'],i2:['yi2','yí'],i3:['yi3','yǐ'],i4:['yi4','yì'],
    u1:['wu1','wū'],u2:['wu2','wú'],u3:['wu3','wǔ'],u4:['wu4','wù'],
    v1:['yu1','yū'],v2:['yu2','yú'],v3:['yu3','yǔ'],v4:['yu4','yù']
  };
  window.V61_TONE_REFS=toneRefs;
  window.pinyinPathV60=function(id,label){
    if(toneRefs[id])return 'assets/pinyin-v61/'+toneRefs[id][0]+'.mp3';
    if(typeof V60_FINAL_DEMOS!=='undefined'&&V60_FINAL_DEMOS[label])return V60_FINAL_DEMOS[label];
    if(typeof V46_PINYIN_AUDIO!=='undefined'&&V46_PINYIN_AUDIO[label])return V46_PINYIN_AUDIO[label];
    return 'assets/pinyin/'+id+'.'+pinyinExtV42(id);
  };
  const oldDemo=window.pinyinDemoV60;
  window.pinyinDemoV60=function(id,label){return toneRefs[id]?toneRefs[id][1]:(oldDemo?oldDemo(id,label):label)};

  let subjectId='chinese',termId='upper';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const subject=()=>manifest.subjects.find(s=>s.id===subjectId)||manifest.subjects[0];
  window.openCurriculumSubjectV61=function(id){subjectId=id;termId=(manifest.subjects.find(s=>s.id===id)?.terms[0]?.id)||'upper';showPage('curriculumSubject')};
  window.setCurriculumTermV61=function(id){termId=id;PGS.curriculumSubject.render()};
  window.openCurriculumLevelV61=function(si,ti,ui){
    const s=manifest.subjects[si],t=s?.terms[ti],u=t?.units[ui];if(!u)return;
    if(typeof g1StartCurriculumLevel==='function'&&g1StartCurriculumLevel(s.id,t.id,ui))return;
    const fallback=s.id==='chinese'?'pinyin':s.id==='math'?(t.id==='lower'?'mathlower':'mathsync'):s.id==='english'?'englishsync':'curriculumSubject';showPage(fallback);
  };
  PGS.curriculum={title:'📚 一年级全科',render:function(){
    document.getElementById('ct').innerHTML=`<button class="back" onclick="showPage('home')">← <span>返回</span></button><section class="v61-hero"><span>🏫 国家平台一年级目录</span><h1>十科学习地图</h1><p>按真实教材范围闯关，题目和活动由成长岛原创。</p></section><section class="v61-subject-grid">${manifest.subjects.map(s=>`<button onclick="openCurriculumSubjectV61('${s.id}')"><b>${s.icon}</b><strong>${esc(s.name)}</strong><small>${esc(s.edition)} · ${s.terms.map(t=>t.label).join(' / ')}</small></button>`).join('')}</section><aside class="v61-boundary">✍️ 一年级写字并入语文；平台独立书法从三年级开始。艺术综合与劳动当前只提供上册，不虚构下册。</aside>`;
  }};
  PGS.curriculumSubject={title:'📘 教材目录',render:function(){
    const s=subject(),t=s.terms.find(x=>x.id===termId)||s.terms[0],si=manifest.subjects.indexOf(s),ti=s.terms.indexOf(t);
    document.getElementById('ct').innerHTML=`<button class="back" onclick="showPage('curriculum')">← <span>返回</span></button><section class="v61-book-head"><div class="v61-book-icon">${s.icon}</div><div><span>一年级 · ${esc(s.edition)}</span><h1>${esc(s.name)}</h1><p>目录核验：${manifest.verifiedAt}</p></div></section><nav class="v61-term-tabs">${s.terms.map(x=>`<button class="${x.id===t.id?'on':''}" onclick="setCurriculumTermV61('${x.id}')">${esc(x.label)}</button>`).join('')}</nav><div class="v61-source"><strong>${t.id==='extra'?'课外拓展':'教材同步目录'}</strong><span>${esc(manifest.policy)}</span><a href="${t.sourceUrl}" target="_blank" rel="noopener">查看国家平台 ↗</a></div><section class="v61-unit-list">${t.units.map((u,ui)=>`<article><header><i>${ui+1}</i><div><h2>${esc(u.name)}</h2><p>${esc(u.goal)}</p></div></header>${u.topics.length?`<div class="v61-topic-chips">${u.topics.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}<button onclick="openCurriculumLevelV61(${si},${ti},${ui})">⭐ 开始三星任务</button></article>`).join('')}</section>`;
  }};
})();
