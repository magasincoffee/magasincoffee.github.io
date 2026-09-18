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
function psRun(script,input){
  const r=spawnSync("powershell",["-NoProfile","-NonInteractive","-Command",script],{
    input,encoding:"utf8",windowsHide:true
  });
  if(r.status!==0) throw new Error("POWERSHELL_SECURESTRING_FAILED");
  return String(r.stdout||"").trim();
}
function protect(plaintext){
  return psRun([
    "$ErrorActionPreference='Stop'",
    "$raw=[Console]::In.ReadToEnd()",
    "$secure=ConvertTo-SecureString -String $raw -AsPlainText -Force",
    "$enc=ConvertFrom-SecureString -SecureString $secure",
    "[Console]::Out.Write($enc)"
  ].join(";"),plaintext);
}
function unprotect(ciphertext){
  return psRun([
    "$ErrorActionPreference='Stop'",
    "$enc=[Console]::In.ReadToEnd()",
    "$secure=ConvertTo-SecureString -String $enc",
    "$b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)",
    "try {[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)}"
  ].join(";"),ciphertext);
}

const probe="MAGASIN_TASK035_DPAPI_PROBE";
let preflight=false;
try{
  const enc=protect(probe);
  preflight=Boolean(enc) && unprotect(enc)===probe;
}catch{}
console.log("SECURESTRING_PREFLIGHT="+preflight);
if(!preflight) process.exit(10);

const cdp=await findCdp();
console.log("OAUTH_ADD_SECRET_CDP="+Boolean(cdp));
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
  if(!(await target.isVisible({timeout:2000}).catch(()=>false))){
    console.log("OAUTH_CLIENT_FOUND=false");
    process.exit(2);
  }
  console.log("OAUTH_CLIENT_FOUND=true");
  await target.click({force:true});
  await page.waitForTimeout(5000);

  let body=await page.locator("body").innerText().catch(()=>"");
  const clientId=(body.match(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/i)||[])[0]||"";
  console.log("OAUTH_CLIENT_ID_CAPTURED="+Boolean(clientId));
  if(!clientId) process.exit(3);

  const add=page.getByRole("button",{name:/Add client secret|Add secret/i}).first();
  if(!(await add.isVisible({timeout:2000}).catch(()=>false))){
    console.log("OAUTH_ADD_SECRET_BUTTON_FOUND=false");
    process.exit(4);
  }
  console.log("OAUTH_ADD_SECRET_BUTTON_FOUND=true");
  await add.click({force:true});
  await page.waitForTimeout(1200);

  body=await page.locator("body").innerText().catch(()=>"");
  let secret=(body.match(/GOCSPX-[A-Za-z0-9_-]+/)||[])[0]||"";

  if(!secret){
    const confirmCandidates=[
      page.getByRole("button",{name:/^Add$|^Create$|^Confirm$/i}).last(),
      page.getByRole("button",{name:/Add secret|Create secret/i}).last()
    ];
    for(const btn of confirmCandidates){
      if(await btn.isVisible({timeout:800}).catch(()=>false)){
        await btn.click({force:true}).catch(()=>{});
        await page.waitForTimeout(2500);
        body=await page.locator("body").innerText().catch(()=>"");
        secret=(body.match(/GOCSPX-[A-Za-z0-9_-]+/)||[])[0]||"";
        if(secret) break;
      }
    }
  }

  console.log("OAUTH_NEW_SECRET_CAPTURED="+Boolean(secret));
  if(!secret) process.exit(5);

  const payload=JSON.stringify({
    project:PROJECT,
    client_name:CLIENT_NAME,
    client_id:clientId,
    client_secret:secret,
    captured_at:new Date().toISOString()
  });
  const encrypted=protect(payload);
  const verified=unprotect(encrypted)===payload;
  console.log("OAUTH_SECURESTRING_VERIFIED="+verified);
  if(!verified) process.exit(6);

  const dir=path.join(process.env.USERPROFILE||process.env.HOME||".",".magasin");
  fs.mkdirSync(dir,{recursive:true});
  const out=path.join(dir,"task035-google-oauth.securestring");
  fs.writeFileSync(out,encrypted,{encoding:"utf8"});
  console.log("OAUTH_SECURE_FILE_SAVED="+fs.existsSync(out));
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
