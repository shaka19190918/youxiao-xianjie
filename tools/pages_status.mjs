// Uses the existing Git credential helper in memory; never prints or writes credentials.
import {execFileSync} from 'node:child_process';
const repo='shaka19190918/youxiao-xianjie';
try {
  const raw=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
  const password=raw.split(/\r?\n/).find(x=>x.startsWith('password='))?.slice(9);
  if(!password)throw new Error('No existing GitHub credential available');
  const headers={Authorization:`Bearer ${password}`,'User-Agent':'growth-island-release','Accept':'application/vnd.github+json'};
  async function api(path,method='GET'){
    const res=await fetch(`https://api.github.com/repos/${repo}/${path}`,{method,headers});
    if(!res.ok)throw new Error(`GitHub API ${res.status} (${path})`);
    return res.json();
  }
  const site=await api('pages');
  console.log(JSON.stringify({status:site.status,source:site.source,build_type:site.build_type}));
  if(process.argv.includes('--build')){
    if(site.source?.branch!=='main')throw new Error('Pages source is not main; no build requested');
    console.log(JSON.stringify(await api('pages/builds','POST')));
  }else {
    const build=await api('pages/builds/latest');
    console.log(JSON.stringify({status:build.status,commit:build.commit,error:build.error,updated_at:build.updated_at}));
  }
} catch(e){
  // Do not emit subprocess output, which could contain credentials.
  console.error(e.status!==undefined?'Git credential helper failed':String(e.message).replace(/(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]+/g,'[REDACTED]'));
  process.exitCode=1;
}
