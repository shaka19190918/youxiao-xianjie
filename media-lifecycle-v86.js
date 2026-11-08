/* v88: exclusive pinyin focus, including detached/pending HTML audio and TTS.
   Ordinary HTML music/voice mixing is retained for the eye-rest programme. */
(()=>{
 'use strict';
 const active=new Set(),listeners=new WeakMap(),play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
 let epoch=0;
 function clear(a){const handler=listeners.get(a);if(handler)a.removeEventListener('ended',handler);listeners.delete(a);active.delete(a)}
 function stopPinyin(){try{pinyinV63Stop()}catch(_){}}
 HTMLMediaElement.prototype.play=function(...args){
  if(document.hidden)return Promise.reject(new DOMException('请返回页面后轻点播放','NotAllowedError'));
  stopPinyin();clear(this);active.add(this);const ticket=epoch,ended=()=>clear(this);listeners.set(this,ended);this.addEventListener('ended',ended,{once:true});
  let result;try{result=play.apply(this,args)}catch(e){clear(this);throw e}
  if(!result?.then)return result;
  return result.then(value=>{if(ticket!==epoch){this.pause();throw new DOMException('已切换到新的播放请求','AbortError')}return value},error=>{clear(this);throw error});
 };
 HTMLMediaElement.prototype.pause=function(...args){clear(this);return pause.apply(this,args)};
 function stopHtml(){
  epoch++;
  for(const a of [...active])try{a.pause()}catch(_){}
  for(const a of document.querySelectorAll('audio,video'))try{a.pause()}catch(_){}
  try{v46StopAudio()}catch(_){}
 }
 // Called synchronously by the pinyin engine before its first await.
 window.PinyinAudioFocus88={begin:stopHtml};
 if(window.speechSynthesis){const speak=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=function(...args){if(document.hidden)return;stopPinyin();return speak(...args)}}
 function stop(){stopHtml();stopPinyin()}
 const toggle=v41ToggleSound;v41ToggleSound=function(...args){const result=toggle.apply(this,args);if(v41EnsureAudio().muted)stop();return result};
 const page=showPage;showPage=function(...args){stop();return page.apply(this,args)};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop);
})();
