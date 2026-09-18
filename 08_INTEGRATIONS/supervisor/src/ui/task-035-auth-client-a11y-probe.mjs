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
  if(r.status!==0) throw new Error("WINDOWS_SECURESTRING_FAILED");
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
async function extractCredentials(page){
  const body=await page.locator("body").innerText().catch(()=>"");
  let clientId=(body.match(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/i)||[])[0]||"";
  let clientSecret=(body.match(/GOCSPX-[A-Za-z0-9_-]+/)||[])[0]||"";

  if(!clientId || !clientSecret){
    const values=await page.locator("input,textarea").evaluateAll(ns=>ns.map(n=>n.value||""));
    for(const v of values){
      if(!clientId){
        const m=String(v).match(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/i);
        if(m) clientId=m[0];
      }
      if(!clientSecret){
        const m=String(v).match(/GOCSPX-[A-Za-z0-9_-]+/);
        if(m) clientSecret=m[0];
      }
    }
  }
  return {clientId,clientSecret};
}

const probe="MAGASIN_TASK035_SECURESTRING_PROBE";
let preflight=false;
try{
  const enc=protect(probe);
  preflight=Boolean(enc) && unprotect(enc)===probe;
}catch{}
console.log("SECURESTRING_PREFLIGHT="+preflight);
if(!preflight) process.exit(10);

const cdp=await findCdp();
console.log("OAUTH_RECREATE_CDP="+Boolean(cdp));
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
  const exists=await target.isVisible({timeout:1800}).catch(()=>false);
  console.log("OAUTH_OLD_CLIENT_FOUND="+exists);

  if(exists){
    await target.click({force:true});
    await page.waitForTimeout(4000);

    const del=page.getByRole("button",{name:/^Delete$/i}).first();
    if(!(await del.isVisible({timeout:1500}).catch(()=>false))){
      console.log("OAUTH_DELETE_BUTTON_FOUND=false");
      process.exit(2);
    }
    console.log("OAUTH_DELETE_BUTTON_FOUND=true");
    await del.click({force:true});
    await page.waitForTimeout(800);

    const confirms=[
      page.getByRole("button",{name:/^Delete$/i}).last(),
      page.getByRole("button",{name:/Delete client/i}).last()
    ];
    let confirmed=false;
    for(const b of confirms){
      if(await b.isVisible({timeout:700}).catch(()=>false)){
        await b.click({force:true}).catch(()=>{});
        confirmed=true;
        break;
      }
    }
    console.log("OAUTH_DELETE_CONFIRMED="+confirmed);
    if(!confirmed) process.exit(3);
    await page.waitForTimeout(4500);
  }

  await page.goto(`https://console.cloud.google.com/auth/clients/create?project=${PROJECT}`,{
    waitUntil:"domcontentloaded",timeout:60000
  }).catch(()=>{});
  await page.waitForTimeout(7000);

  const dismiss=page.getByRole("button",{name:/Dismiss/i}).first();
  if(await dismiss.isVisible({timeout:600}).catch(()=>false)){
    await dismiss.click({force:true}).catch(()=>{});
    await page.waitForTimeout(400);
  }

  const combo=page.locator('cfc-select[role="combobox"]').last();
  if(!(await combo.isVisible({timeout:1800}).catch(()=>false))) process.exit(4);
  await combo.click({force:true});
  await page.waitForTimeout(500);

  let desktop=page.getByRole("option",{name:/^Desktop app$/i}).first();
  if(!(await desktop.isVisible({timeout:900}).catch(()=>false))) desktop=page.getByText(/^Desktop app$/i).first();
  if(!(await desktop.isVisible({timeout:900}).catch(()=>false))) process.exit(5);
  await desktop.click({force:true});
  await page.waitForTimeout(500);

  let nameInput=page.getByLabel(/^Name$/i).first();
  if(!(await nameInput.isVisible({timeout:900}).catch(()=>false))) nameInput=page.getByRole("main").locator('input[type="text"]').first();
  if(!(await nameInput.isVisible({timeout:900}).catch(()=>false))) process.exit(6);
  await nameInput.fill(CLIENT_NAME);

  const create=page.getByRole("button",{name:/^Create$/i}).first();
  if(!(await create.isVisible({timeout:900}).catch(()=>false))) process.exit(7);
  await create.click({force:true});
  await page.waitForTimeout(6500);

  const {clientId,clientSecret}=await extractCredentials(page);
  console.log("OAUTH_NEW_CLIENT_ID_CAPTURED="+Boolean(clientId));
  console.log("OAUTH_NEW_CLIENT_SECRET_CAPTURED="+Boolean(clientSecret));
  if(!clientId || !clientSecret) process.exit(8);

  const payload=JSON.stringify({
    project:PROJECT,
    client_name:CLIENT_NAME,
    client_id:clientId,
    client_secret:clientSecret,
    captured_at:new Date().toISOString()
  });
  const encrypted=protect(payload);
  const verified=unprotect(encrypted)===payload;
  console.log("OAUTH_SECURESTRING_VERIFIED="+verified);
  if(!verified) process.exit(9);

  const dir=path.join(process.env.USERPROFILE||process.env.HOME||".",".magasin");
  fs.mkdirSync(dir,{recursive:true});
  const out=path.join(dir,"task035-google-oauth.securestring");
  fs.writeFileSync(out,encrypted,{encoding:"utf8"});
  console.log("OAUTH_SECURE_FILE_SAVED="+fs.existsSync(out));
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
