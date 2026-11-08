// Build a COMPLETE listening checklist; never certify a recording by software.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),m=require('../assets/pinyin-v63/manifest.json'),spans=require('../assets/pinyin-v63/segments-v83.json');
const initials='b:bo p:po m:mo f:fo d:de t:te n:ne l:le g:ge k:ke h:he j:ji q:qi x:xi zh:zhi ch:chi sh:shi r:ri z:zi c:ci s:si y:yi w:wu'.split(' ').map(x=>x.split(':'));
const finals='a:a o:o e:e i:yi u:wu ü:yu ai:ai ei:ei ui:wei ao:ao ou:ou iu:you ie:ye üe:yue er:er an:an en:en in:yin un:wen ün:yun ang:ang eng:eng ing:ying ong:zhong'.split(' ').map(x=>x.split(':'));
const whole='zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying'.split(' ');
const lessons=['ɑ o e','i u ü','b p m f','d t n l','g k h','j q x','z c s','zh ch sh r','y w','ɑi ei ui','ɑo ou iu','ie üe er','ɑn en in un ün','ɑng eng ing ong'];
const items=[...initials.map(([glyph,audio],i)=>({id:'initial-'+glyph,glyph,audio,tone:1,kind:i<21?'initial':'spelling',mode:'full-syllable-example'})),...finals.map(([glyph,audio])=>({id:'final-'+glyph,glyph,audio,tone:1,kind:'final',mode:glyph===audio?'recorded-final':'full-syllable-example'})),...whole.map(audio=>({id:'whole-'+audio,glyph:audio,audio,tone:1,kind:'whole',mode:'whole'})),...['a','o','e','yi','wu','yu'].flatMap(audio=>[1,2,3,4].map(tone=>({id:'tone-'+audio+tone,glyph:({yi:'i',wu:'u',yu:'ü'})[audio]||audio,audio,tone,kind:'tone',mode:'tone-model'})))];
const sources=[{title:'人教社统编教材修订说明，PDF第5页',url:'https://www.pep.com.cn/bks/xxyw/jzjd/202505/W020250531415592673618.pdf',scope:'14课、y/w隔音字母单列；不提供可再分发的独立音素录音'},{title:'WebKit MediaRecorder',url:'https://webkit.org/blog/11353/mediarecorder-api/',scope:'录音格式检测与预览'},{title:'WebKit 用户手势播放规则',url:'https://webkit.org/blog/6784/new-video-policies-for-ios/',scope:'首次播放必须从用户操作触发'}];
for(const x of items)if(!spans.files[x.audio])throw Error(x.audio+' missing');
const recordings=m.files.map(f=>({audio:f.file.slice(0,-4),sha256:f.sha256,spans:spans.files[f.file.slice(0,-4)].spans,tones:[1,2,3,4],phoneticReview:'pending'}));
const target=path.join(root,'assets/pinyin-v86');fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'review-catalog.json'),JSON.stringify({schema:'pinyin-review-v86',checkedAt:'2026-11-08',rulesChecked:true,professionalListeningComplete:false,lessonOrder:lessons,sources,items,recordings},null,1)+'\n');
console.log('87 learning mappings / 406 recordings / 1624 tones: all listening statuses pending; no audio changed');
