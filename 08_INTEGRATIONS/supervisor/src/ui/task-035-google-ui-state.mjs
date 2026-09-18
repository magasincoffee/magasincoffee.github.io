import process from "node:process";

const PORTS = Array.from({length:11},(_,i)=>9222+i);

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

async function connect(cdpUrl){
  const {chromium}=await import("playwright-core");
  const v=await fetch(cdpUrl+"/json/version").then(r=>r.json());
  const ws=new URL(v.webSocketDebuggerUrl);
  const ep=new URL(cdpUrl);
  ws.hostname=ep.hostname;
  ws.port=ep.port;
  return chromium.connectOverCDP(ws.toString());
}

async function probe(page,label,patterns){
  for(const [key,re] of patterns){
    let visible=false;
    try{
      visible=await page.getByText(re).first().isVisible({timeout:1000});
    }catch{}
    console.log(label+"_"+key+"="+visible);
  }
}

const cdp=await findCdp();
console.log("UI_STATE_CDP="+Boolean(cdp));
if(!cdp) process.exit(0);

const browser=await connect(cdp);
const context=browser.contexts()[0];
if(!context) process.exit(0);

const gmail=await context.newPage();
try{
  await gmail.goto("https://console.cloud.google.com/apis/library/gmail.googleapis.com",{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await gmail.waitForTimeout(7000);
  await probe(gmail,"GMAIL",[
    ["ENABLE_TEXT",/^Enable$|^Bật$/i],
    ["MANAGE_TEXT",/^Manage$|^Quản lý$/i],
    ["API_LIBRARY_TEXT",/API Library|Thư viện API/i],
    ["PERMISSION_DENIED",/permission denied|không có quyền|insufficient permissions|access denied/i],
    ["SELECT_PROJECT",/Select a project|Chọn dự án/i],
    ["LOADING",/Loading|Đang tải/i],
    ["DISABLED_TEXT",/Disable|Tắt API/i]
  ]);
}finally{await gmail.close().catch(()=>{});}

const auth=await context.newPage();
try{
  await auth.goto("https://console.cloud.google.com/auth/overview",{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await auth.waitForTimeout(7000);
  await probe(auth,"AUTH",[
    ["GET_STARTED",/Get started|Bắt đầu/i],
    ["OVERVIEW",/^Overview$|Tổng quan/i],
    ["BRANDING",/Branding|Thương hiệu/i],
    ["AUDIENCE",/Audience|Đối tượng/i],
    ["CLIENTS",/Clients|Ứng dụng khách/i],
    ["DATA_ACCESS",/Data Access|Quyền truy cập dữ liệu/i],
    ["PERMISSION_DENIED",/permission denied|không có quyền|insufficient permissions|access denied/i],
    ["SELECT_PROJECT",/Select a project|Chọn dự án/i]
  ]);
}finally{await auth.close().catch(()=>{});}

process.exit(0);
