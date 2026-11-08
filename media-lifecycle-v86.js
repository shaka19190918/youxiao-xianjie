/* v89: one foreground learning voice across HTML audio, pinyin, TTS and game keys.
   Eye-rest uses its existing combined music/voice track, not multiple players. */
(()=>{
 'use strict';
 const active=new Set(),listeners=new WeakMap(),requests=new WeakMap(),play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
 let epoch=0;
 function clear(a){const handler=listeners.get(a);if(handler)a.removeEventListener('ended',handler);listeners.delete(a);active.delete(a)}
 function stopPinyin(){try{pinyinV63Stop()}catch(_){}}
 HTMLMediaElement.prototype.play=function(...args){
  if(document.hidden)return Promise.reject(new DOMException('请返回页面后轻点播放','NotAllowedError'));
  if(v41EnsureAudio().muted)return Promise.reject(new DOMException('声音已关闭','NotAllowedError'));
  stopPinyin();stopPiano();pauseHtml(this);try{speechSynthesis.cancel()}catch(_){}clear(this);active.add(this);const ticket=epoch,ended=()=>{if(requests.get(this)===ticket)clear(this)};requests.set(this,ticket);listeners.set(this,ended);this.addEventListener('ended',ended,{once:true});
  let result;try{result=play.apply(this,args)}catch(e){clear(this);throw e}
  if(!result?.then)return result;
  return result.then(value=>{if(ticket!==epoch){if(requests.get(this)===ticket)this.pause();throw new DOMException('已切换到新的播放请求','AbortError')}return value},error=>{if(requests.get(this)===ticket)clear(this);throw error});
 };
 HTMLMediaElement.prototype.pause=function(...args){clear(this);return pause.apply(this,args)};
 function stopPiano(close=false){try{window.G1PianoSound89?.stop(close)}catch(_){}}
 function pauseHtml(except){
  epoch++;
  for(const a of [...active])if(a!==except)try{a.pause()}catch(_){}
  for(const a of document.querySelectorAll('audio,video'))if(a!==except)try{a.pause()}catch(_){}
 }
 function stopHtml(){
  pauseHtml();stopPiano();
  try{v46StopAudio()}catch(_){}
 }
 // Called synchronously by the pinyin engine before its first await.
 window.PinyinAudioFocus88={begin:stopHtml};
 if(window.speechSynthesis){const speak=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=function(...args){if(document.hidden)return;stopPinyin();stopPiano();pauseHtml();return speak(...args)}}
 function stop(){window.__petSpeakEpoch=(window.__petSpeakEpoch||0)+1;try{stopPoemV6()}catch(_){}try{stopCharVoiceV89()}catch(_){}stopHtml();stopPiano(true);stopPinyin()}
 const toggle=v41ToggleSound;v41ToggleSound=function(...args){const result=toggle.apply(this,args);if(v41EnsureAudio().muted)stop();return result};
 const page=showPage;showPage=function(...args){stop();return page.apply(this,args)};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop);
 window.addEventListener('pageshow',e=>{if(e.persisted)stop()});
})();
