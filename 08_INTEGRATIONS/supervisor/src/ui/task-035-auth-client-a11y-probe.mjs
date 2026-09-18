import process from "node:process";
const PROJECT="magasin-noibo";
const PORTS=Array.from({length:11},(_,i)=>9222+i);
async function findCdp(){for(const port of PORTS){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`,{cache:"no-store"});if(!r.ok)continue;const d=await r.json();if(d?.webSocketDebuggerUrl)return `http://127.0.0.1:${port}`;}catch{}}return null;}
async function connect(cdp){const {chromium}=await import("playwright-core");const v=await fetch(cdp+"/json/version").then(r=>r.json());const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);ws.hostname=ep.hostname;ws.port=ep.port;return chromium.connectOverCDP(ws.toString());}
function clean(s){return String(s||"").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]").replace(/\s+/g," ").trim().slice(0,220);}
const cdp=await findCdp();if(!cdp)process.exit(0);
const browser=await connect(cdp);const context=browser.contexts()[0];if(!context)process.exit(0);
const page=await context.newPage();
try{
 await page.goto(`https://console.cloud.google.com/auth/clients/create?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
 await page.waitForTimeout(8000);
 const body=clean(await page.locator("body").innerText().catch(()=>""));
 console.log("CREATE_BODY_HAS_APPLICATION_TYPE="+/Application type|Loại ứng dụng/i.test(body));
 console.log("CREATE_BODY_HAS_NAME="+/(^| )Name( |$)|Tên/i.test(body));
 console.log("CREATE_BODY_HAS_CREATE="+/Create|Tạo/i.test(body));

 const nodes=await page.locator('input,textarea,select,[role],[aria-label],[aria-labelledby],label,mat-label,cfc-select,cfc-option').evaluateAll(ns=>ns.map(n=>({
   tag:n.tagName,
   role:n.getAttribute("role")||"",
   aria:n.getAttribute("aria-label")||"",
   labelledby:n.getAttribute("aria-labelledby")||"",
   placeholder:n.getAttribute("placeholder")||"",
   type:n.getAttribute("type")||"",
   text:(n.innerText||n.textContent||"").trim()
 })));
 const out=[];
 for(const x of nodes){
   const label=clean(`${x.tag} | role=${x.role} | aria=${x.aria} | labelledby=${x.labelledby} | placeholder=${x.placeholder} | type=${x.type} | text=${x.text}`);
   if(label && /application|type|name|desktop|web|create|cancel|client|ứng dụng|loại|tên|máy tính|tạo|hủy/i.test(label) && !out.includes(label)) out.push(label);
   if(out.length>=100) break;
 }
 console.log("CREATE_A11Y_COUNT="+out.length);
 out.forEach((v,i)=>console.log(`CREATE_A11Y_${i+1}=${v}`));
}finally{await page.close().catch(()=>{});}
process.exit(0);