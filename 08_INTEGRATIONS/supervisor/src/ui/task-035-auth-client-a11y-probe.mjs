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
  const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);
  ws.hostname=ep.hostname;ws.port=ep.port;
  return chromium.connectOverCDP(ws.toString());
}
function protectWithWindowsSecureString(plaintext){
  const script=[
    "$ErrorActionPreference='Stop'",
    "$raw=[Console]::In.ReadToEnd()",
    "$secure=ConvertTo-SecureString -String $raw -AsPlainText -Force",
    "$enc=ConvertFrom-SecureString -SecureString $secure",
    "[Console]::Out.Write($enc)"
  ].join(";");
  const r=spawnSync("powershell",["-NoProfile","-NonInteractive","-Command",script],{
    input:plaintext,encoding:"utf8",windowsHide:true
  });
  if(r.status!==0 || !String(r.stdout||"").trim()) throw new Error("WINDOWS_SECURESTRING_PROTECT_FAILED");
  return String(r.stdout).trim();
}
async function captureFromPage(page){
  let body=await page.locator("body").innerText().catch(()=>"");
  let clientId=(body.match(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/i)||[])[0]||"";
  let clientSecret=(body.match(/GOCSPX-[A-Za-z0-9_-]+/)||[])[0]||"";

  if(!clientSecret){
    const revealers=[
      page.getByRole("button",{name:/show.*secret|reveal.*secret/i}).first(),
      page.locator('[aria-label*="secret" i]').filter({hasText:/show|reveal/i}).first()
    ];
    for(const b of revealers){
      if(await b.isVisible({timeout:500}).catch(()=>false)){
        await b.click({force:true}).catch(()=>{});
        await page.waitForTimeout(500);
        body=await page.locator("body").innerText().catch(()=>"");
        clientSecret=(body.match(/GOCSPX-[A-Za-z0-9_-]+/)||[])[0]||"";
        if(clientSecret) break;
      }
    }
  }
  return {clientId,clientSecret};
}

const cdp=await findCdp();
console.log("OAUTH_RECOVER_CDP="+Boolean(cdp));
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

  const rowText=page.getByText(CLIENT_NAME,{exact:true}).first();
  const found=await rowText.isVisible({timeout:2000}).catch(()=>false);
  console.log("OAUTH_CLIENT_FOUND="+found);
  if(!found) process.exit(2);

  await rowText.click({force:true}).catch(()=>{});
  await page.waitForTimeout(5000);

  let {clientId,clientSecret}=await captureFromPage(page);

  if(!clientId || !clientSecret){
    const row=page.locator('tr,[role="row"]').filter({hasText:CLIENT_NAME}).first();
    if(await row.isVisible({timeout:1000}).catch(()=>false)){
      const edit=row.locator('[aria-label*="edit" i],button[aria-label*="edit" i],a[aria-label*="edit" i]').first();
      if(await edit.isVisible({timeout:800}).catch(()=>false)){
        await edit.click({force:true}).catch(()=>{});
        await page.waitForTimeout(4000);
        ({clientId,clientSecret}=await captureFromPage(page));
      }
    }
  }

  console.log("OAUTH_CLIENT_ID_RECOVERED="+Boolean(clientId));
  console.log("OAUTH_CLIENT_SECRET_RECOVERED="+Boolean(clientSecret));
  if(!clientId || !clientSecret) process.exit(3);

  const payload=JSON.stringify({
    project:PROJECT,
    client_name:CLIENT_NAME,
    client_id:clientId,
    client_secret:clientSecret,
    captured_at:new Date().toISOString()
  });
  const encrypted=protectWithWindowsSecureString(payload);

  const dir=path.join(process.env.USERPROFILE||process.env.HOME||".",".magasin");
  fs.mkdirSync(dir,{recursive:true});
  const out=path.join(dir,"task035-google-oauth.securestring");
  fs.writeFileSync(out,encrypted,{encoding:"utf8"});
  console.log("OAUTH_SECURE_FILE_SAVED="+fs.existsSync(out));
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
