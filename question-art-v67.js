/* Original, deterministic teaching diagrams. Only givens are rendered; never task.answer. */
(()=>{
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const drawings={
    flag:'<path d="M13 55V8"/><path d="M15 9H51L42 20L51 31H15Z" fill="#ff8da9"/><path d="M7 56H25"/>',
    dot:'<circle cx="32" cy="32" r="21" fill="#8ed5ee"/>',
    apple:'<path d="M32 19C13 5 3 29 16 49Q23 59 32 52Q45 59 52 42C62 20 45 7 32 19Z" fill="#ff9497"/><path d="M32 18L36 6"/><path d="M35 11Q44 0 53 7Q48 18 35 11" fill="#9bd59b"/>',
    fish:'<path d="M8 32Q29 5 48 32Q29 59 8 32Z" fill="#8ed5ee"/><path d="M46 31L59 19V45Z" fill="#ffc67d"/><circle cx="20" cy="29" r="2" fill="#574c73"/>',
    pencil:'<path d="M11 41L40 12L53 25L24 54L7 58Z" fill="#ffd674"/><path d="M40 12L45 7Q49 3 54 8L58 12Q61 15 57 20L53 25Z" fill="#f6a1b6"/><path d="M11 41L24 54M16 47L45 18M7 58L11 47"/>',
    eraser:'<path d="M9 39L30 11Q33 7 39 11L56 24Q59 27 56 32L39 54H25Z" fill="#d4c1f4"/><path d="M19 26L46 45"/><path d="M39 54H57"/>',
    child:'<circle cx="32" cy="17" r="12" fill="#ffe0b7"/><path d="M21 12Q28 1 42 12" fill="#806858"/><path d="M18 54V37Q32 24 46 37V54Z" fill="#a9d9ee"/><path d="M27 54V61M38 54V61"/>',
    chair:'<path d="M15 30V8H49V30Z" fill="#d5c2f4"/><path d="M10 32H54V42H10Z" fill="#ffd67d"/><path d="M15 43V59M49 43V59"/>',
    book:'<path d="M11 12H50V54H14Q7 54 7 47V17Q7 12 11 12Z" fill="#a8d9b3"/><path d="M15 12V46H50M8 47H48M24 22H42M24 30H39"/>',
    flower:'<path d="M32 34V60M32 48Q11 33 13 49Q23 57 32 53" fill="#a1d2a2"/><path d="M26 12C12 1 5 24 19 27C4 35 23 48 29 35C38 50 53 32 40 27C55 15 37 2 32 14Z" fill="#f3b0cb"/><circle cx="29" cy="25" r="8" fill="#ffdc74"/>',
    candy:'<path d="M18 21L5 13V48L18 42M46 21L59 13V48L46 42" fill="#ffda81"/><rect x="17" y="16" width="31" height="34" rx="10" fill="#edaaca"/><path d="M25 18L39 48"/>',
    ball:'<circle cx="32" cy="32" r="25" fill="#fff5d9"/><path d="M28 19L42 23L43 38L29 43L20 30Z" fill="#b7a6e3"/><path d="M28 19L24 8M42 23L54 20M43 38L52 48M29 43L24 55M20 30L7 27"/>',
    square:'<rect x="10" y="10" width="44" height="44" rx="1" fill="#ffc77f"/>',
    triangle:'<path d="M32 7L58 55H6Z" fill="#a8d9b3"/>',
    rectangle:'<rect x="4" y="16" width="56" height="32" rx="1" fill="#b9b1ee"/>',
    circle:'<circle cx="32" cy="32" r="24" fill="#9fd5eb"/>',
    cube:'<path d="M9 19L33 6L56 18V46L31 59L9 46Z" fill="#ffd27d"/><path d="M9 19L31 32L56 18M31 32V59"/>',
    cylinder:'<path d="M12 16V48C12 61 52 61 52 48V16" fill="#a9d9c7"/><ellipse cx="32" cy="16" rx="20" ry="10" fill="#c6eee1"/>',
    cuboid:'<path d="M4 25L19 12L60 18V45L46 57L4 50Z" fill="#b9b1ee"/><path d="M4 25L46 32L60 18M46 32V57"/>',
    dog:'<path d="M16 17L5 15L7 42L18 34M48 17L59 15L57 42L46 34" fill="#b58b69"/><rect x="14" y="13" width="36" height="41" rx="15" fill="#f5d7b0"/><circle cx="24" cy="29" r="2"/><circle cx="40" cy="29" r="2"/><path d="M27 37H37L32 42Z" fill="#66556c"/><path d="M32 42V47"/>',
    cat:'<path d="M12 25V6L28 18H37L53 6V29Q60 55 32 57Q5 55 12 25Z" fill="#ffd391"/><circle cx="23" cy="32" r="2"/><circle cx="42" cy="32" r="2"/><path d="M29 41H35L32 44M7 40L21 42M43 42L58 39"/>',
    rabbit:'<ellipse cx="22" cy="17" rx="7" ry="16" fill="#ffe8ed"/><ellipse cx="41" cy="17" rx="7" ry="16" fill="#ffe8ed"/><ellipse cx="32" cy="42" rx="22" ry="19" fill="#fff6ed"/><circle cx="24" cy="38" r="2"/><circle cx="40" cy="38" r="2"/><path d="M29 46L32 49L35 46"/>',
    umbrella:'<path d="M4 31Q32 -8 60 31Q51 24 42 31Q32 24 22 31Q12 24 4 31Z" fill="#b9b1ee"/><path d="M32 31V50Q32 64 44 55"/>',
    leaf:'<path d="M13 51Q-3 17 54 7Q62 52 13 51Z" fill="#a7d9a6"/><path d="M8 59L43 21M23 43L21 28M31 35L45 37"/>',
    magnify:'<circle cx="26" cy="25" r="18" fill="#c5eafa"/><path d="M39 39L56 56" stroke-width="9"/>',
    can:'<path d="M15 12V53Q32 61 49 53V12Z" fill="#d3e2ee"/><ellipse cx="32" cy="12" rx="17" ry="6" fill="#eef7fc"/><path d="M23 12H38M22 26H42M22 34H42"/>',
    ruler:'<path d="M6 21H58V45H6Z" fill="#ffda81"/><path d="M15 22V33M24 22V29M33 22V33M42 22V29M51 22V33"/>',
    bag:'<path d="M22 15V10Q32 -1 42 10V15"/><rect x="12" y="14" width="40" height="46" rx="12" fill="#aabcef"/><rect x="18" y="36" width="28" height="18" rx="6" fill="#ffe093"/>',
    coin:'<circle cx="32" cy="32" r="25" fill="#ffdc7e"/><circle cx="32" cy="32" r="19" fill="none"/><path d="M23 18L32 30L41 18M22 32H42M22 39H42M32 30V49"/>',
    sun:'<circle cx="32" cy="32" r="15" fill="#ffdc7e"/><path d="M32 3V10M32 54V61M3 32H10M54 32H61M11 11L16 16M48 48L53 53M11 53L16 48M48 16L53 11"/>',
    unit:'<rect x="15" y="15" width="34" height="34" rx="5" fill="#a6d8e8"/>',
    ten:'<rect x="5" y="21" width="54" height="22" rx="3" fill="#ffc986"/><path d="M10.4 21V43M15.8 21V43M21.2 21V43M26.6 21V43M32 21V43M37.4 21V43M42.8 21V43M48.2 21V43M53.6 21V43" stroke-width="1"/>'
  };
  drawings.pencilcase='<rect x="5" y="18" width="54" height="30" rx="8" fill="#a8d9b3"/><path d="M9 29H55M45 29V37"/>';
  drawings.rubik=drawings.cube+'<path d="M17 14L40 27V54M25 10L48 23V50M9 28L31 41L56 27M9 37L31 50L56 36M16 50V23M23 54V28"/>';
  const names={flag:'小旗',dot:'圆点',fish:'鱼',pencil:'铅笔',eraser:'橡皮',child:'小朋友',chair:'椅子',flower:'花',book:'书',candy:'糖果',ball:'足球',square:'正方形',triangle:'三角形',rectangle:'长方形',circle:'圆形',cube:'正方体',cuboid:'长方体',cylinder:'圆柱',dog:'小狗',cat:'小猫',rabbit:'小兔',apple:'苹果',can:'易拉罐',bag:'书包',leaf:'叶子',ruler:'尺子',sun:'太阳',umbrella:'雨伞',magnify:'放大镜'};
  function icon(kind){return `<svg class="qa-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g stroke="#625574" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none">${drawings[kind]||drawings.dot}</g></svg>`}
  names.pencilcase='文具盒';names.rubik='魔方';
  function quantity(n,kind='dot',base10=false){
    if(!Number.isInteger(n)||n<0||n>100)return '';
    const ten=n>20||base10?Math.floor(n/10):0,ones=n>20||base10?n%10:n;
    return `<div class="qa-count" data-quantity="${n}" aria-label="${n}${ten?'，用十和一表示':'个'+(names[kind]||'物体')}">${Array.from({length:ten},()=>`<span data-ten="1">${icon('ten')}</span>`).join('')}${Array.from({length:ones},()=>`<span data-one="1">${icon(ten?'unit':kind)}</span>`).join('')}${n===0?'<span class="qa-zero">空的</span>':''}</div>`;
  }
  function group(label,n,kind,base10){return `<div class="qa-group"><span class="qa-label">${esc(label)}</span>${quantity(n,base10?'unit':kind,base10)}</div>`}
  function clock(h,m){
    const point=(angle,len)=>[100+Math.sin(angle*Math.PI/180)*len,100-Math.cos(angle*Math.PI/180)*len];
    const a=point((h%12)*30+m/2,42),b=point(m*6,65);
    return `<svg class="qa-clock" viewBox="0 0 200 200" role="img" aria-label="${esc(m===0?'分针指向12':m===30?'分针指向6':'分针在'+m+'分的位置')}，时针位置按题意绘制" data-hour="${h}" data-minute="${m}"><circle cx="100" cy="100" r="92" fill="#fffdf4" stroke="#c5b7eb" stroke-width="5"/>${Array.from({length:12},(_,i)=>{const n=i+1,[x,y]=point(n*30,75);return `<text x="${x}" y="${y+6}" text-anchor="middle" font-size="20" fill="#524268">${n}</text>`}).join('')}<path d="M100 100L${a.join(' ')}" stroke="#7252b7" stroke-width="8" stroke-linecap="round" data-hand="hour"/><path d="M100 100L${b.join(' ')}" stroke="#319bbd" stroke-width="4" stroke-linecap="round" data-hand="minute"/><circle cx="100" cy="100" r="6" fill="#7252b7"/></svg>`;
  }
  const specs=new Map();
  function add(key,prompt,spec){specs.set(key,{prompt,...spec})}
  const counts=(groups,caption='看图想一想',operator='')=>({type:'counts',groups,caption,operator});
  const gallery=(kinds,caption='看一看题目中的物品')=>({type:'gallery',kinds,caption});
  function chineseNumber(s){if(s==='一百')return 100;const d='零一二三四五六七八九';if(s.includes('十')){const[a,b]=s.split('十');return(a?d.indexOf(a):1)*10+(b?d.indexOf(b):0)}return s.length===1?d.indexOf(s):NaN}
  // Parse only exact arithmetic wording, not arbitrary numbers elsewhere in a question.
  for(const [prefix,bank] of [['math44_',V44_MATH],['math45l_',V45_MATH_LOWER]])for(const q of bank){
    const m=q.q.match(/^([零一二三四五六七八九十百]+)(加|减)([零一二三四五六七八九十百]+)(?:再加([零一二三四五六七八九十百]+))?等于几？$/);
    if(m){const values=[chineseNumber(m[1]),chineseNumber(m[3]),...(m[4]?[chineseNumber(m[4])]:[])];if(values.every(n=>n>=0&&n<=100))add(prefix+q.id,q.q,counts(values.map(n=>[String(n),n,'dot']),'摆一摆，结果由你来想',m[2]==='加'?'+':'−'))}
  }
  [
    [1,'图中有四面小旗，应该选哪个数？',counts([['数一数',4,'flag']])],
    [2,'小红站在小明的左边，小明在小红的哪边？',{type:'people',labels:['小红','小明'],caption:'按画面上的左、右观察'}],
    [3,'铅笔、橡皮、苹果，哪一个不是文具？',gallery(['pencil','eraser','apple'])],
    [4,'三把椅子配三个小朋友，够不够？',counts([['椅子',3,'chair'],['小朋友',3,'child']],'试着一一对应')],
    [6,'圆形、正方形、小狗，哪一个不是图形？',gallery(['circle','square','dog'])],
    [7,'三和五，哪个数更大？',counts([['3',3,'dot'],['5',5,'dot']],'比一比两组数量')],
    [8,'排队时，小军前面有两人，他排第几？',{type:'people',labels:['','', '小军'],caption:'队首在画面左边，从左往右数'}],
    [9,'五可以分成二和几？',counts([['一共',5,'dot'],['其中一份',2,'dot']],'另一份有几个？')],
    [13,'七里面有几个一？',counts([['数一数',7,'dot']])],
    [14,'六可以分成一和几？',counts([['一共',6,'dot'],['其中一份',1,'dot']],'另一份有几个？')],
    [15,'八可以分成三和几？',counts([['一共',8,'dot'],['其中一份',3,'dot']],'另一份有几个？')],
    [17,'小猫有六条鱼，又得到三条，一共有几条？',counts([['原来有',6,'fish'],['又得到',3,'fish']],'把两组鱼合起来想','+')],
    [19,'哪个物体最像球？',gallery(['ball','pencilcase','rubik','book'],'足球 · 文具盒 · 魔方 · 书本')],
    [20,'魔方最像哪种立体图形？',gallery(['rubik'],'观察魔方的形状')],
    [21,'易拉罐最像哪种立体图形？',gallery(['can'])],
    [22,'书盒最像哪种立体图形？',gallery(['cuboid'],'观察这个盒子的形状')],
    [23,'哪种物体容易滚动？',gallery(['ball','cube','cuboid','book'])],
    [29,'盒里有十支笔，外面有六支，一共有几支？',counts([['盒里',10,'pencil'],['盒外',6,'pencil']],'合起来有多少？','+')],
    [30,'十二和二十，哪个数更大？',counts([['12',12,'dot'],['20',20,'dot']],'比一比数量')],
    [35,'车上有九人，又上来六人，现在有几人？',counts([['原来车上',9,'child'],['又上车',6,'child']],'现在一共有多少人？','+')],
    [36,'两盒球一共十四个，一盒有八个，另一盒有几个？',counts([['两盒一共',14,'ball'],['其中一盒',8,'ball']],'想想另一盒有多少')],
    [41,'足球和魔方，哪个更容易滚动？',gallery(['ball','rubik'])],
    [42,'小红有七朵花，小明有九朵，两人共有几朵？',counts([['小红',7,'flower'],['小明',9,'flower']],'两人的花合起来','+')]
  ].forEach(([id,p,s])=>add('math44_'+id,p,s));
  [
    [1,'正方形有几条一样长的边？',gallery(['square'],'沿着图形的边数一数')],
    [2,'三角形有几条边？',gallery(['triangle'],'沿着图形的边数一数')],
    [3,'哪个图形没有角？',gallery(['circle','triangle','square','rectangle'],'每个图形都观察一下')],
    [4,'两个一样的正方形排在一起，可能拼成长什么图形？',{type:'joined',caption:'看两个一样的正方形拼在一起'}],
    [5,'长方形的对边有什么特点？',gallery(['rectangle'],'看看相对的两条边')],
    [11,'盒里有十四颗糖，吃掉九颗，还剩几颗？',counts([['原来',14,'candy'],['吃掉',9,'candy']],'想一想还剩多少','−')],
    [12,'小红有十三朵花，小明有八朵，小红比小明多几朵？',counts([['小红',13,'flower'],['小明',8,'flower']],'比一比，先找相同的部分')],
    [16,'五十八和六十五，哪个数更大？',counts([['58',58],['65',65]],'用十和一比一比')],
    [29,'图书角有二十六本故事书，又放入十八本，现在有几本？',counts([['原来26本',26],['放入18本',18]],'用方块表示书的数量','+')],
    [30,'篮子里有六十三个球，拿走二十五个，还剩几个？',counts([['原来63个',63],['拿走25个',25]],'用方块表示球的数量','−')],
    [31,'小红有二十本书，小明有十四本，小红比小明多几本？',counts([['小红20本',20],['小明14本',14]],'用圆点表示书的数量')],
    [32,'小军有十五颗星，小丽比他多四颗，小丽有几颗？',counts([['小军15颗',15],['小丽多出的部分',4]],'用圆点表示星星的数量','+')],
    [33,'小猫有十八条鱼，小狗比它少六条，小狗有几条？',counts([['小猫',18,'fish'],['小狗少的部分',6,'fish']],'小狗有多少？','−')],
    [34,'第一天读十二页，第二天读十五页，两天共读几页？',counts([['第一天12页',12],['第二天15页',15]],'用圆点表示页数','+')],
    [39,'五元加三元等于几元？',counts([['5枚1元学习币',5,'coin'],['3枚1元学习币',3,'coin']],'学习用示意币，不是真实人民币','+')],
    [40,'一支笔六元，付十元，应找回几元？',counts([['付出10元',10,'coin'],['花掉6元',6,'coin']],'每枚学习币表示1元','−')]
  ].forEach(([id,p,s])=>add('math45l_'+id,p,s));
  [
    [1,'钟面上又短又粗的针通常是什么针？',[[10,10]]],
    [2,'钟面上较长、表示分钟的针是什么针？',[[10,10]]],
    [3,'分针指向12，时针指向7，是几点？',[[7,0]]],
    [4,'分针指向6，时针在7和8之间，是几点？',[[7,30]]],
    [9,'从8点到8点半，经过了多久？',[[8,0],[8,30]]],
    [10,'从9点10分到9点40分，经过了多久？',[[9,10],[9,40]]],
    [11,'7点半和8点，哪个更早？',[[7,30],[8,0]]],
    [17,'10点开始阅读，10点20分结束，读了多久？',[[10,0],[10,20]]],
    [18,'下午4点活动，下午3点半应该在活动之前还是之后？',[[16,0],[15,30]]]
  ].forEach(([id,p,times])=>add('time45_'+id,p,{type:'clocks',times,caption:'观察钟面，先找短针，再找长针'}));
  add('read_0','小雨在哪里看见老师？',gallery(['child','bag','book'],'故事里有小朋友和上学用品；地点请听故事找'));
  add('read_2','谁主动帮助了小猫？',gallery(['cat','rabbit','umbrella'],'故事里有这些角色和物品；谁帮助了谁，请听故事'));
  add('read_3','明明把大书放在哪里？',gallery(['book','book'],'想一想故事里的整理顺序；这里不表示上下位置'));
  add('curr-science-upper-2-check','观察小动物时应该怎么做？',gallery(['cat','rabbit','dog'],'小动物观察角'));
  add('curr-science-upper-3-check','使用工具前首先要做什么？',gallery(['magnify','ruler'],'先想一想使用工具的准备'));
  add('curr-science-lower-1-check','观察校园植物时应该怎么做？',gallery(['leaf','flower'],'校园植物观察角'));
  add('curr-science-lower-2-check','易拉罐通常主要由哪类材料制成？',gallery(['can'],'观察物品，想一想它的材料'));
  function get(task){const entry=specs.get(task?.key||task?.id);return entry&&entry.prompt===task.prompt?entry:null}
  function html(task){
    const s=get(task);if(!s)return '';let body='';
    if(s.type==='counts')body=s.groups.map(([label,n,kind],i)=>(i&&s.operator?`<span class="qa-operator" aria-hidden="true">${s.operator}</span>`:'')+group(label,n,kind,s.groups.some(x=>x[1]>20))).join('');
    if(s.type==='gallery')body=s.kinds.map(kind=>`<div class="qa-object" role="img" aria-label="${esc(names[kind]||'示意物体')}">${icon(kind)}</div>`).join('');
    if(s.type==='people')body=s.labels.map(label=>`<div class="qa-person">${icon('child')}<span>${esc(label)||'小朋友'}</span></div>`).join('');
    if(s.type==='clocks')body=s.times.map(([h,m],i)=>`<div class="qa-clock-wrap">${s.times.length>1?`<span class="qa-label">第${i+1}个钟面</span>`:''}${clock(h,m)}</div>`).join('');
    if(s.type==='joined')body='<svg class="qa-joined" viewBox="0 0 260 150" role="img" aria-label="两个相同的正方形左右相邻"><rect x="10" y="15" width="120" height="120" fill="#ffc986" stroke="#625574" stroke-width="3"/><rect x="130" y="15" width="120" height="120" fill="#b9b1ee" stroke="#625574" stroke-width="3"/></svg>';
    const legend=s.groups?.some(x=>x[1]>20)?'<p class="qa-legend">一根长条表示10，一个小方块表示1。</p>':'';
    return `<figure class="question-art qa-${s.type}" data-art-key="${esc(task.key||task.id)}"><figcaption>${esc(s.caption)}</figcaption><div class="qa-scene">${body}</div>${legend}</figure>`;
  }
  window.QuestionArt={html,get,keys:()=>[...specs.keys()]};
  function attach(host,t){if(!host)return;host.querySelector('.question-art')?.remove();host.querySelector('.v42-question')?.insertAdjacentHTML('afterend',html(t))}
  for(const [fn,host,prefix,getQ] of [
    ['renderMath44','math44Task','math44_',()=>v44MathQ],
    ['renderMathLower45','math45LowerTask','math45l_',()=>v45MathLowerQ],
    ['renderTime45','time45Task','time45_',()=>v45TimeQ]
  ]){const old=window[fn];window[fn]=function(){old();const q=getQ();if(q)attach(document.getElementById(host),{key:prefix+q.id,prompt:q.q})}}
  const reading=PGS.reading.render;PGS.reading.render=function(){reading();const i=v42State().readingIndex||0;attach(document.getElementById('ct'),{key:'read_'+i,prompt:V42_READINGS[i]?.q})};
  const review=PGS.review.render;PGS.review.render=function(){review();const q=Object.values(G1Learning.game().reviewQueue).sort((a,b)=>a.dueAt-b.dueAt).find(q=>q.dueAt<=Date.now());if(q)document.querySelector('.g1-review-card>h3')?.insertAdjacentHTML('afterend',html(q.task))};
})();
