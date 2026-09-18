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
function clean(s){
  return String(s||"")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]")
    .replace(/\s+/g," ").trim().slice(0,220);
}
const cdp=await findCdp(); if(!cdp) process.exit(0);
const browser=await connect(cdp);
const context=browser.contexts()[0]; if(!context) process.exit(0);
const page=await context.newPage();

try{
  await page.goto(`https://console.cloud.google.com/auth/clients/create?project=${PROJECT}`,{
    waitUntil:"domcontentloaded", timeout:60000
  }).catch(()=>{});
  await page.waitForTimeout(8000);

  const dismiss = page.getByRole("button",{name:/Dismiss/i}).first();
  if(await dismiss.isVisible({timeout:800}).catch(()=>false)){
    await dismiss.click({force:true}).catch(()=>{});
    await page.waitForTimeout(600);
  }

  const combo = page.getByRole("combobox",{name:/Application type/i}).first();
  const comboVisible = await combo.isVisible({timeout:2000}).catch(()=>false);
  console.log("APPLICATION_TYPE_COMBO_VISIBLE="+comboVisible);
  if(!comboVisible) process.exit(0);

  await combo.click({force:true});
  await page.waitForTimeout(800);

  const options = await page.locator('[role="option"],mat-option,cfc-option').evaluateAll(ns=>ns.map(n=>(n.innerText||n.textContent||"").trim()).filter(Boolean));
  const unique=[...new Set(options.map(clean))];
  console.log("APPLICATION_TYPE_OPTION_COUNT="+unique.length);
  unique.forEach((v,i)=>console.log(`APPLICATION_TYPE_OPTION_${i+1}=${v}`));

  const desktop = page.getByRole("option",{name:/^Desktop app$/i}).first();
  let selected=false;
  if(await desktop.isVisible({timeout:1500}).catch(()=>false)){
    await desktop.click({force:true});
    selected=true;
  } else {
    const fallback=page.getByText(/^Desktop app$/i).first();
    if(await fallback.isVisible({timeout:1200}).catch(()=>false)){
      await fallback.click({force:true});
      selected=true;
    }
  }
  console.log("DESKTOP_APP_SELECTED="+selected);
  if(!selected) process.exit(0);

  await page.waitForTimeout(1200);

  const inputs=await page.locator('input,textarea,[role="textbox"],button,[role="button"],label,mat-label').evaluateAll(ns=>ns.map(n=>({
    tag:n.tagName,
    role:n.getAttribute("role")||"",
    aria:n.getAttribute("aria-label")||"",
    placeholder:n.getAttribute("placeholder")||"",
    type:n.getAttribute("type")||"",
    text:(n.innerText||n.textContent||"").trim()
  })));
  const out=[];
  for(const x of inputs){
    const label=clean(`${x.tag} | role=${x.role} | aria=${x.aria} | placeholder=${x.placeholder} | type=${x.type} | text=${x.text}`);
    if(label && /name|create|cancel|desktop|client|tên|tạo|hủy/i.test(label) && !out.includes(label)) out.push(label);
    if(out.length>=60) break;
  }
  console.log("DESKTOP_FORM_CONTROL_COUNT="+out.length);
  out.forEach((v,i)=>console.log(`DESKTOP_FORM_CONTROL_${i+1}=${v}`));
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
