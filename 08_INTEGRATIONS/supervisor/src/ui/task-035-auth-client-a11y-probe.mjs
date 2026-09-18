import process from "node:process";
const PROJECT="magasin-noibo";
const CLIENT_NAME="MAGASIN Gmail Worker";
const PORTS=Array.from({length:11},(_,i)=>9222+i);

async function findCdp(){
  for(const port of PORTS){
    try{
      const r=await fetch(`http://127.0.0.1:${port}/json/version`,{cache:"no-store"});
      if(!r.ok) continue;
      const d=await r.json();
      if(d?.webSocketDebuggerUrl) return `http://127.0.0.1:${port}`;
    }catch{}
  }
  return null;
}
async function connect(cdp){
  const {chromium}=await import("playwright-core");
  const v=await fetch(cdp+"/json/version").then(r=>r.json());
  const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);
  ws.hostname=ep.hostname;ws.port=ep.port;
  return chromium.connectOverCDP(ws.toString());
}
function sanitize(s){
  return String(s||"")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]")
    .replace(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/gi,"[client-id]")
    .replace(/GOCSPX-[A-Za-z0-9_-]+/g,"[client-secret]")
    .replace(/\s+/g," ").trim().slice(0,260);
}

const cdp=await findCdp();
console.log("OAUTH_DETAIL_CDP="+Boolean(cdp));
if(!cdp) process.exit(1);
const browser=await connect(cdp);
const context=browser.contexts()[0];
if(!context) process.exit(1);
const page=await context.newPage();

try{
  await page.goto(`https://console.cloud.google.com/auth/clients?project=${PROJECT}`,{
    waitUntil:"domcontentloaded",timeout:60000
  }).catch(()=>{});
  await page.waitForTimeout(7000);

  const target=page.getByText(CLIENT_NAME,{exact:true}).first();
  const found=await target.isVisible({timeout:2000}).catch(()=>false);
  console.log("OAUTH_CLIENT_FOUND="+found);
  if(!found) process.exit(2);

  await target.click({force:true});
  await page.waitForTimeout(5000);

  console.log("OAUTH_DETAIL_TITLE="+sanitize(await page.title()));
  console.log("OAUTH_DETAIL_URL_IS_CLIENTS="+/\/auth\/clients/i.test(page.url()));

  const controls=await page.locator('button,a,[role="button"],[role="link"],input,label,mat-label').evaluateAll(ns=>ns.map(n=>({
    tag:n.tagName,
    role:n.getAttribute("role")||"",
    aria:n.getAttribute("aria-label")||"",
    title:n.getAttribute("title")||"",
    type:n.getAttribute("type")||"",
    text:(n.innerText||n.textContent||"").trim()
  })));
  const out=[];
  for(const x of controls){
    const label=sanitize(`${x.tag} | role=${x.role} | aria=${x.aria} | title=${x.title} | type=${x.type} | text=${x.text}`);
    if(label && /secret|download|json|client id|reset|copy|edit|delete|credential|client/i.test(label) && !out.includes(label)) out.push(label);
    if(out.length>=100) break;
  }
  console.log("OAUTH_DETAIL_CONTROL_COUNT="+out.length);
  out.forEach((v,i)=>console.log(`OAUTH_DETAIL_CONTROL_${i+1}=${v}`));

  const body=await page.locator("body").innerText().catch(()=>"");
  const lines=String(body).split(/\r?\n/).map(sanitize).filter(Boolean);
  const relevant=[...new Set(lines.filter(v=>/client id|client secret|secret|download json|download|reset secret|creation date/i.test(v)))].slice(0,50);
  console.log("OAUTH_DETAIL_TEXT_COUNT="+relevant.length);
  relevant.forEach((v,i)=>console.log(`OAUTH_DETAIL_TEXT_${i+1}=${v}`));
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
