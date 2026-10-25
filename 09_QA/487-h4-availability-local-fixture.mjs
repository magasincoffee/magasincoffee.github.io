import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const candidate=resolve(process.cwd(),'availability-candidate');
const allow=new Map([
 ['/09_QA/people-shift/availability-summary-487-fixture.html','text/html; charset=utf-8'],
 ['/05_MANAGER/Workforce/availability-summary-v1.js','application/javascript; charset=utf-8'],
 ['/04_OWNER/Workforce/owner-scheduling-overview-v1.js','application/javascript; charset=utf-8']
]);
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(!allow.has(path)){res.writeHead(403);res.end('NO_EXTERNAL_RESOURCES');return}
 try{
  const file=join(candidate,...path.split('/').filter(Boolean));
  const contents=await readFile(file);
  res.writeHead(200,{'Content-Type':allow.get(path),'Cache-Control':'no-store',
   'Content-Security-Policy':"default-src 'self' 'unsafe-inline'; connect-src 'self'"});
  res.end(contents);
 }catch(error){res.writeHead(500);res.end('QA_FILE_NOT_FOUND')}
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
let result=1;
try{
 const child=spawn(process.execPath,['09_QA/people-shift/availability-summary-487-browser.mjs'],{
  cwd:candidate,stdio:'inherit',windowsHide:true,env:{
   ...process.env,QA_BASE_URL:'http://127.0.0.1:'+server.address().port,
   QA_CHROME_CHANNEL:'chrome'
  }
 });
 const [code]=await once(child,'exit');
 result=typeof code==='number'?code:1;
 if(result===0)console.log('H4_QA527_OWNER_MANAGER_CHROME_READONLY_PASS');
}finally{await new Promise(resolve=>server.close(resolve))}
process.exitCode=result;
