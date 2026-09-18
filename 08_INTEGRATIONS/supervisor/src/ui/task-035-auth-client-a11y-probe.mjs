import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
  const ws=new URL(v.webSocketDebuggerUrl), ep=new URL(cdp);
  ws.hostname=ep.hostname; ws.port=ep.port;
  return chromium.connectOverCDP(ws.toString());
}
function protectWithDpapi(plaintext){
  const script = [
    "$ErrorActionPreference='Stop'",
    "$raw=[Console]::In.ReadToEnd()",
    "$bytes=[Text.Encoding]::UTF8.GetBytes($raw)",
    "$enc=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)",
    "[Console]::Out.Write([Convert]::ToBase64String($enc))"
  ].join(";");
  const r=spawnSync("powershell",["-NoProfile","-NonInteractive","-Command",script],{
    input:plaintext,encoding:"utf8",windowsHide:true
  });
  if(r.status!==0 || !String(r.stdout||"").trim()) throw new Error("DPAPI_PROTECT_FAILED");
  return String(r.stdout).trim();
}
const cdp=await findCdp();
console.log("OAUTH_CREATE_CDP="+Boolean(cdp));
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

  const existing=page.getByText(CLIENT_NAME,{exact:true}).first();
  if(await existing.isVisible({timeout:1200}).catch(()=>false)){
    console.log("OAUTH_CLIENT_ALREADY_EXISTS=true");
    console.log("OAUTH_CLIENT_CREATED=false");
    process.exit(0);
  }

  await page.goto(`https://console.cloud.google.com/auth/clients/create?project=${PROJECT}`,{
    waitUntil:"domcontentloaded",timeout:60000
  }).catch(()=>{});
  await page.waitForTimeout(7000);

  const dismiss=page.getByRole("button",{name:/Dismiss/i}).first();
  if(await dismiss.isVisible({timeout:800}).catch(()=>false)){
    await dismiss.click({force:true}).catch(()=>{});
    await page.waitForTimeout(500);
  }

  const combo=page.locator('cfc-select[role="combobox"]').last();
  if(!(await combo.isVisible({timeout:2000}).catch(()=>false))){
    console.log("OAUTH_CREATE_FORM_READY=false");
    process.exit(2);
  }
  await combo.click({force:true});
  await page.waitForTimeout(600);

  let desktop=page.getByRole("option",{name:/^Desktop app$/i}).first();
  if(!(await desktop.isVisible({timeout:1200}).catch(()=>false))){
    desktop=page.getByText(/^Desktop app$/i).first();
  }
  if(!(await desktop.isVisible({timeout:1200}).catch(()=>false))){
    console.log("OAUTH_DESKTOP_OPTION_FOUND=false");
    process.exit(3);
  }
  await desktop.click({force:true});
  await page.waitForTimeout(700);

  let nameInput=page.getByLabel(/^Name$/i).first();
  if(!(await nameInput.isVisible({timeout:1200}).catch(()=>false))){
    nameInput=page.getByRole("main").locator('input[type="text"]').first();
  }
  if(!(await nameInput.isVisible({timeout:1200}).catch(()=>false))){
    console.log("OAUTH_NAME_INPUT_FOUND=false");
    process.exit(4);
  }

  await nameInput.fill(CLIENT_NAME);
  const create=page.getByRole("button",{name:/^Create$/i}).first();
  if(!(await create.isVisible({timeout:1200}).catch(()=>false))){
    console.log("OAUTH_CREATE_BUTTON_FOUND=false");
    process.exit(5);
  }

  console.log("OAUTH_CREATE_FORM_READY=true");
  await create.click({force:true});
  await page.waitForTimeout(7000);

  const body=await page.locator("body").innerText().catch(()=>"");
  const clientId=(body.match(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/i)||[])[0]||"";
  const clientSecret=(body.match(/GOCSPX-[A-Za-z0-9_-]+/)||[])[0]||"";

  console.log("OAUTH_CLIENT_CREATED="+Boolean(clientId));
  console.log("OAUTH_CLIENT_ID_CAPTURED="+Boolean(clientId));
  console.log("OAUTH_CLIENT_SECRET_CAPTURED="+Boolean(clientSecret));

  if(!clientId || !clientSecret) process.exit(6);

  const payload=JSON.stringify({
    project:PROJECT,
    client_name:CLIENT_NAME,
    client_id:clientId,
    client_secret:clientSecret,
    captured_at:new Date().toISOString()
  });

  const encrypted=protectWithDpapi(payload);
  const dir=path.join(process.env.USERPROFILE||process.env.HOME||".",".magasin");
  fs.mkdirSync(dir,{recursive:true});
  const out=path.join(dir,"task035-google-oauth.dpapi");
  fs.writeFileSync(out,encrypted,{encoding:"utf8"});
  console.log("OAUTH_DPAPI_FILE_SAVED="+fs.existsSync(out));
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
