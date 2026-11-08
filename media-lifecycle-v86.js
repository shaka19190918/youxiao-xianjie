/* Stop DOM and detached HTML audio on background; never auto-resume or open mic. */
(()=>{'use strict';const active=new Set(),play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
 HTMLMediaElement.prototype.play=function(...args){if(document.hidden)return Promise.reject(new DOMException('请返回页面后轻点播放','NotAllowedError'));active.add(this);this.addEventListener('ended',()=>active.delete(this),{once:true});let result;try{result=play.apply(this,args)}catch(e){active.delete(this);throw e}if(result?.catch)result.catch(()=>active.delete(this));return result};
 HTMLMediaElement.prototype.pause=function(...args){active.delete(this);return pause.apply(this,args)};
 function stop(){for(const a of [...active])try{a.pause()}catch(_){}for(const a of document.querySelectorAll('audio,video'))try{a.pause()}catch(_){}try{v46StopAudio()}catch(_){}try{pinyinV63Stop()}catch(_){}}
 const page=showPage;showPage=function(...args){stop();return page.apply(this,args)};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
})();
