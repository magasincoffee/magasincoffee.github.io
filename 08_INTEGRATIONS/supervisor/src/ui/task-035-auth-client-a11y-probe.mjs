import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT="magasin-noibo";
const WEB_CLIENT_NAME="MAGASIN Gmail Worker Web";
const DESKTOP_CLIENT_NAME="MAGASIN Gmail Worker";
const REDIRECT_URI="https://developers.google.com/oauthplayground";
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
  if(!clientId||!clientSecret){
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

const probe="MAGASIN_TASK035_WEB_SECURESTRING_PROBE";
let preflight=false;
try{
  const enc=protect(probe);
  preflight=Boolean(enc)&&unprotect(enc)===probe;
}catch{}
console.log("WEB_SECURESTRING_PREFLIGHT="+preflight);
if(!preflight) process.exit(10);

const cdp=await findCdp();
console.log("WEB_CREATE_CDP="+Boolean(cdp));
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

  const existingWeb=page.getByText(WEB_CLIENT_NAME,{exact:true}).first();
  if(await existingWeb.isVisible({timeout:1200}).catch(()=>false)){
    console.log("WEB_CLIENT_ALREADY_EXISTS=true");
    process.exit(11);
  }

  await page.goto(`https://console.cloud.google.com/auth/clients/create?project=${PROJECT}`,{
    waitUntil:"domcontentloaded",timeout:60000
  }).catch(()=>{});
  await page.waitForTimeout(7000);

  const dismiss=page.getByRole("button",{name:/Dismiss/i}).first();
  if(await dismiss.isVisible({timeout:600}).catch(()=>false)){
    await dismiss.click({force:true}).catch(()=>{});
    await page.waitForTimeout(350);
  }

  const combo=page.locator('cfc-select[role="combobox"]').last();
  if(!(await combo.isVisible({timeout:1600}).catch(()=>false))) process.exit(2);
  await combo.click({force:true});
  await page.waitForTimeout(450);

  let web=page.getByRole("option",{name:/^Web application$/i}).first();
  if(!(await web.isVisible({timeout:900}).catch(()=>false))) web=page.getByText(/^Web application$/i).first();
  if(!(await web.isVisible({timeout:900}).catch(()=>false))) process.exit(3);
  await web.click({force:true});
  await page.waitForTimeout(700);

  let nameInput=page.getByLabel(/^Name$/i).first();
  if(!(await nameInput.isVisible({timeout:900}).catch(()=>false))) nameInput=page.getByRole("main").locator('input[type="text"]').first();
  if(!(await nameInput.isVisible({timeout:900}).catch(()=>false))) process.exit(4);
  await nameInput.fill(WEB_CLIENT_NAME);

  const heading=page.getByText("Authorized redirect URIs",{exact:true}).first();
  const hbox=await heading.boundingBox();
  if(!hbox) process.exit(5);

  const addBtns=page.getByRole("button",{name:/^Add URI$/i});
  const n=await addBtns.count();
  let redirectBtn=null;
  let bestY=Number.POSITIVE_INFINITY;
  for(let i=0;i<n;i++){
    const b=addBtns.nth(i);
    const box=await b.boundingBox().catch(()=>null);
    if(box && box.y>hbox.y && box.y<bestY){redirectBtn=b;bestY=box.y;}
  }
  console.log("WEB_REDIRECT_BUTTON_IDENTIFIED="+Boolean(redirectBtn));
  if(!redirectBtn) process.exit(6);
  await redirectBtn.click({force:true});
  await page.waitForTimeout(500);

  const inputs=page.locator('input');
  const ic=await inputs.count();
  let redirectInput=null;
  let inputBestY=Number.POSITIVE_INFINITY;
  for(let i=0;i<ic;i++){
    const inp=inputs.nth(i);
    const box=await inp.boundingBox().catch(()=>null);
    if(box && box.y>hbox.y && box.y<inputBestY){
      redirectInput=inp;
      inputBestY=box.y;
    }
  }
  console.log("WEB_REDIRECT_INPUT_IDENTIFIED="+Boolean(redirectInput));
  if(!redirectInput) process.exit(7);
  await redirectInput.fill(REDIRECT_URI);

  const filled=await redirectInput.inputValue().catch(()=>"");
  console.log("WEB_REDIRECT_URI_VERIFIED="+(filled===REDIRECT_URI));
  if(filled!==REDIRECT_URI) process.exit(8);

  const create=page.getByRole("button",{name:/^Create$/i}).first();
  if(!(await create.isVisible({timeout:900}).catch(()=>false))) process.exit(9);
  await create.click({force:true});
  await page.waitForTimeout(6500);

  const {clientId,clientSecret}=await extractCredentials(page);
  console.log("WEB_CLIENT_ID_CAPTURED="+Boolean(clientId));
  console.log("WEB_CLIENT_SECRET_CAPTURED="+Boolean(clientSecret));
  if(!clientId||!clientSecret) process.exit(12);

  const payload=JSON.stringify({
    project:PROJECT,
    client_name:WEB_CLIENT_NAME,
    client_type:"WEB_APPLICATION",
    redirect_uri:REDIRECT_URI,
    client_id:clientId,
    client_secret:clientSecret,
    captured_at:new Date().toISOString()
  });
  const encrypted=protect(payload);
  const verified=unprotect(encrypted)===payload;
  console.log("WEB_SECURESTRING_VERIFIED="+verified);
  if(!verified) process.exit(13);

  const dir=path.join(process.env.USERPROFILE||process.env.HOME||".",".magasin");
  fs.mkdirSync(dir,{recursive:true});
  const out=path.join(dir,"task035-google-oauth-web.securestring");
  fs.writeFileSync(out,encrypted,{encoding:"utf8"});
  console.log("WEB_SECURE_FILE_SAVED="+fs.existsSync(out));

  await page.goto(`https://console.cloud.google.com/auth/clients?project=${PROJECT}`,{
    waitUntil:"domcontentloaded",timeout:60000
  }).catch(()=>{});
  await page.waitForTimeout(6500);

  const desktop=page.getByText(DESKTOP_CLIENT_NAME,{exact:true}).first();
  const desktopFound=await desktop.isVisible({timeout:1200}).catch(()=>false);
  console.log("DESKTOP_CLEANUP_TARGET_FOUND="+desktopFound);
  if(desktopFound){
    await desktop.click({force:true});
    await page.waitForTimeout(3500);
    const title=await page.title().catch(()=>"");
    const isDesktop=/Client ID for Desktop/i.test(title);
    console.log("DESKTOP_CLEANUP_TYPE_VERIFIED="+isDesktop);
    if(!isDesktop) process.exit(14);

    const del=page.getByRole("button",{name:/^Delete$/i}).first();
    if(!(await del.isVisible({timeout:1200}).catch(()=>false))) process.exit(15);
    await del.click({force:true});
    await page.waitForTimeout(700);

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
    console.log("DESKTOP_CLEANUP_DELETE_CONFIRMED="+confirmed);
    if(!confirmed) process.exit(16);
    await page.waitForTimeout(3000);
  }
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
