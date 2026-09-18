import process from "node:process";
const PROJECT="magasin-noibo";
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
  const ws=new URL(v.webSocketDebuggerUrl), ep=new URL(cdp);
  ws.hostname=ep.hostname; ws.port=ep.port;
  return chromium.connectOverCDP(ws.toString());
}
function sanitize(s){
  return String(s||"")
   .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]")
   .replace(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/gi,"[client-id]")
   .replace(/\s+/g," ").trim().slice(0,180);
}
const cdp=await findCdp(); if(!cdp) process.exit(0);
const browser=await connect(cdp); const context=browser.contexts()[0]; if(!context) process.exit(0);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/auth/clients?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(7000);
  const candidates=[
    page.getByRole("button",{name:/Create client/i}).first(),
    page.getByRole("link",{name:/Create client/i}).first(),
    page.getByText(/^Create client$/i).first(),
    page.locator('[aria-label*="Create client" i]').first()
  ];
  let create=null;
  for(const candidate of candidates){
    if(await candidate.isVisible({timeout:1200}).catch(()=>false)){ create=candidate; break; }
  }
  console.log("CREATE_CLIENT_VISIBLE="+Boolean(create));
  if(!create) process.exit(0);
  await create.click({force:true,timeout:10000});
  await page.waitForTimeout(2500);

  const inputs=await page.locator('input,textarea,select,[role="combobox"],[role="listbox"],button').evaluateAll(nodes=>nodes.map(n=>({
    tag:n.tagName,
    type:n.getAttribute("type")||"",
    role:n.getAttribute("role")||"",
    aria:n.getAttribute("aria-label")||"",
    placeholder:n.getAttribute("placeholder")||"",
    name:n.getAttribute("name")||"",
    text:(n.innerText||n.textContent||"").trim()
  })));
  const out=[];
  const re=/application|type|name|client|desktop|web|android|ios|chrome|create|cancel|ứng dụng|loại|tên|máy tính|tạo|hủy/i;
  for(const x of inputs){
    const label=sanitize(`${x.tag} | ${x.type} | ${x.role} | ${x.aria} | ${x.placeholder} | ${x.name} | ${x.text}`);
    if(label && re.test(label) && !out.includes(label)) out.push(label);
    if(out.length>=80) break;
  }
  console.log("CREATE_FORM_CONTROL_COUNT="+out.length);
  out.forEach((v,i)=>console.log(`CREATE_FORM_CONTROL_${i+1}=${v}`));
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
