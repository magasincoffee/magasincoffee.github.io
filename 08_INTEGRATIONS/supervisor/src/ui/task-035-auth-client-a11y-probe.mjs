import process from "node:process";
const PROJECT="magasin-noibo";
const PORTS=Array.from({length:11},(_,i)=>9222+i);
async function findCdp(){for(const port of PORTS){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`,{cache:"no-store"});if(!r.ok)continue;const d=await r.json();if(d?.webSocketDebuggerUrl)return `http://127.0.0.1:${port}`;}catch{}}return null;}
async function connect(cdp){const {chromium}=await import("playwright-core");const v=await fetch(cdp+"/json/version").then(r=>r.json());const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);ws.hostname=ep.hostname;ws.port=ep.port;return chromium.connectOverCDP(ws.toString());}
function sanitize(s){return String(s||"").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]").replace(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/gi,"[client-id]").replace(/GOCSPX-[A-Za-z0-9_-]+/g,"[client-secret]").replace(/\s+/g," ").trim().slice(0,260);}

const cdp=await findCdp();console.log("WEB_FORM_CDP="+Boolean(cdp));if(!cdp)process.exit(1);
const browser=await connect(cdp);const context=browser.contexts()[0];if(!context)process.exit(1);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/auth/clients/create?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(7000);
  const dismiss=page.getByRole("button",{name:/Dismiss/i}).first();
  if(await dismiss.isVisible({timeout:600}).catch(()=>false)) await dismiss.click({force:true}).catch(()=>{});

  const combo=page.locator('cfc-select[role="combobox"]').last();
  if(!(await combo.isVisible({timeout:1500}).catch(()=>false))) process.exit(2);
  await combo.click({force:true});
  await page.waitForTimeout(500);
  let web=page.getByRole("option",{name:/^Web application$/i}).first();
  if(!(await web.isVisible({timeout:900}).catch(()=>false))) web=page.getByText(/^Web application$/i).first();
  if(!(await web.isVisible({timeout:900}).catch(()=>false))) process.exit(3);
  await web.click({force:true});
  await page.waitForTimeout(900);
  console.log("WEB_APPLICATION_SELECTED=true");

  const nodes=await page.locator('button,a,input,textarea,[role="button"],[role="textbox"],label,mat-label').evaluateAll(ns=>ns.map(n=>({
    tag:n.tagName,role:n.getAttribute("role")||"",aria:n.getAttribute("aria-label")||"",placeholder:n.getAttribute("placeholder")||"",type:n.getAttribute("type")||"",text:(n.innerText||n.textContent||"").trim()
  })));
  const out=[];
  for(const x of nodes){
    const label=sanitize(`${x.tag} | role=${x.role} | aria=${x.aria} | placeholder=${x.placeholder} | type=${x.type} | text=${x.text}`);
    if(label && /name|redirect|uri|origin|add|create|cancel|authorized|tên|chuyển hướng|thêm|tạo|hủy/i.test(label) && !out.includes(label)) out.push(label);
    if(out.length>=100) break;
  }
  console.log("WEB_FORM_CONTROL_COUNT="+out.length);
  out.forEach((v,i)=>console.log(`WEB_FORM_CONTROL_${i+1}=${v}`));

  const body=await page.locator("body").innerText().catch(()=>"");
  const lines=String(body).split(/\r?\n/).map(sanitize).filter(Boolean);
  const rel=[...new Set(lines.filter(v=>/name|redirect|uri|origin|authorized|add uri|create|cancel/i.test(v)))].slice(0,60);
  console.log("WEB_FORM_TEXT_COUNT="+rel.length);
  rel.forEach((v,i)=>console.log(`WEB_FORM_TEXT_${i+1}=${v}`));
}finally{await page.close().catch(()=>{});}
process.exit(0);
