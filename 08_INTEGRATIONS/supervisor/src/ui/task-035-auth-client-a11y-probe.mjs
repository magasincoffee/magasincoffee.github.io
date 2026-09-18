import process from "node:process";
const PROJECT="magasin-noibo";
const CLIENT_NAME="MAGASIN Gmail Worker";
const PORTS=Array.from({length:11},(_,i)=>9222+i);
async function findCdp(){for(const port of PORTS){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`,{cache:"no-store"});if(!r.ok)continue;const d=await r.json();if(d?.webSocketDebuggerUrl)return `http://127.0.0.1:${port}`;}catch{}}return null;}
async function connect(cdp){const {chromium}=await import("playwright-core");const v=await fetch(cdp+"/json/version").then(r=>r.json());const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);ws.hostname=ep.hostname;ws.port=ep.port;return chromium.connectOverCDP(ws.toString());}
function sanitize(s){return String(s||"").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]").replace(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/gi,"[client-id]").replace(/GOCSPX-[A-Za-z0-9_-]+/g,"[client-secret]").replace(/\s+/g," ").trim().slice(0,260);}

const cdp=await findCdp();console.log("ADD_SECRET_MODAL_CDP="+Boolean(cdp));if(!cdp)process.exit(1);
const browser=await connect(cdp);const context=browser.contexts()[0];if(!context)process.exit(1);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/auth/clients?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(7000);
  const target=page.getByText(CLIENT_NAME,{exact:true}).first();
  if(!(await target.isVisible({timeout:2000}).catch(()=>false))) process.exit(2);
  await target.click({force:true});
  await page.waitForTimeout(5000);
  const add=page.getByRole("button",{name:/Add client secret|Add secret/i}).first();
  if(!(await add.isVisible({timeout:1500}).catch(()=>false))) process.exit(3);
  await add.click({force:true});
  await page.waitForTimeout(1500);

  const dialogs=page.locator('[role="dialog"],[role="alertdialog"],mat-dialog-container');
  console.log("ADD_SECRET_DIALOG_COUNT="+await dialogs.count());

  const controls=await page.locator('button,[role="button"],input,textarea,label,mat-label,[role="textbox"]').evaluateAll(ns=>ns.map(n=>({
    tag:n.tagName,role:n.getAttribute("role")||"",aria:n.getAttribute("aria-label")||"",placeholder:n.getAttribute("placeholder")||"",type:n.getAttribute("type")||"",text:(n.innerText||n.textContent||"").trim()
  })));
  const out=[];
  for(const x of controls){
    const label=sanitize(`${x.tag} | role=${x.role} | aria=${x.aria} | placeholder=${x.placeholder} | type=${x.type} | text=${x.text}`);
    if(label && /secret|add|create|cancel|confirm|name|description|hủy|tạo|thêm|xác nhận|tên/i.test(label) && !out.includes(label)) out.push(label);
    if(out.length>=80) break;
  }
  console.log("ADD_SECRET_CONTROL_COUNT="+out.length);
  out.forEach((v,i)=>console.log(`ADD_SECRET_CONTROL_${i+1}=${v}`));

  const body=await page.locator("body").innerText().catch(()=>"");
  const lines=String(body).split(/\r?\n/).map(sanitize).filter(Boolean);
  const rel=[...new Set(lines.filter(v=>/secret|add|create|cancel|confirm|name|description/i.test(v)))].slice(0,60);
  console.log("ADD_SECRET_TEXT_COUNT="+rel.length);
  rel.forEach((v,i)=>console.log(`ADD_SECRET_TEXT_${i+1}=${v}`));
}finally{await page.close().catch(()=>{});}
process.exit(0);
