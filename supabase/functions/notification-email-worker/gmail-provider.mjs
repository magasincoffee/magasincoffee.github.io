const TOKEN_URL="https://oauth2.googleapis.com/token";
const SEND_URL="https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export function readGmailOAuthConfig(env){
  const clientId=String(env.get("GMAIL_OAUTH_CLIENT_ID")||"").trim();
  const clientSecret=String(env.get("GMAIL_OAUTH_CLIENT_SECRET")||"").trim();
  const refreshToken=String(env.get("GMAIL_OAUTH_REFRESH_TOKEN")||"").trim();
  const missing=[];
  if(!clientId)missing.push("GMAIL_OAUTH_CLIENT_ID");
  if(!clientSecret)missing.push("GMAIL_OAUTH_CLIENT_SECRET");
  if(!refreshToken)missing.push("GMAIL_OAUTH_REFRESH_TOKEN");
  return {clientId,clientSecret,refreshToken,ready:missing.length===0,missing};
}

function safeHeader(value){
  return String(value||"").replace(/[\r\n]+/g," ").trim();
}

function base64Utf8(value){
  const bytes=new TextEncoder().encode(String(value));
  let binary="";
  for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary);
}

function base64UrlUtf8(value){
  return base64Utf8(value).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
}

export function buildGmailRawMessage(envelope){
  const to=(envelope.to||[]).map(x=>safeHeader(x.email)).filter(Boolean).join(", ");
  if(!to)throw new Error("GMAIL_RECIPIENT_REQUIRED");
  const headers=[
    "MIME-Version: 1.0",
    "From: "+safeHeader(envelope.from),
    "To: "+to,
    ...(envelope.replyTo?["Reply-To: "+safeHeader(envelope.replyTo)]:[]),
    "Subject: =?UTF-8?B?"+base64Utf8(safeHeader(envelope.subject))+"?=",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit"
  ];
  const mime=headers.join("\r\n")+"\r\n\r\n"+String(envelope.text||"");
  return base64UrlUtf8(mime);
}

export function createGmailProvider(env,fetchImpl=fetch){
  const config=readGmailOAuthConfig(env);
  if(!config.ready){
    const error=new Error("GMAIL_OAUTH_CONFIG_REQUIRED:"+config.missing.join(","));
    error.code="GMAIL_OAUTH_CONFIG_REQUIRED";
    error.missing=config.missing;
    throw error;
  }

  let accessToken="";
  let expiresAt=0;

  async function refreshAccessToken(){
    const body=new URLSearchParams({
      client_id:config.clientId,
      client_secret:config.clientSecret,
      refresh_token:config.refreshToken,
      grant_type:"refresh_token"
    });
    const res=await fetchImpl(TOKEN_URL,{
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.access_token){
      throw new Error("GMAIL_OAUTH_TOKEN_FAILED:"+res.status+":"+String(data.error||"unknown"));
    }
    accessToken=String(data.access_token);
    expiresAt=Date.now()+Math.max(60,Number(data.expires_in)||3600)*1000;
    return accessToken;
  }

  async function token(){
    if(accessToken&&Date.now()<expiresAt-60000)return accessToken;
    return refreshAccessToken();
  }

  return {
    name:"GMAIL_GOOGLE_WORKSPACE",
    async initialize(){
      await token();
      return true;
    },
    async send(envelope){
      const bearer=await token();
      const res=await fetchImpl(SEND_URL,{
        method:"POST",
        headers:{
          "authorization":"Bearer "+bearer,
          "content-type":"application/json"
        },
        body:JSON.stringify({raw:buildGmailRawMessage(envelope)})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.id)throw new Error("GMAIL_SEND_FAILED:"+res.status+":"+String(data.error?.status||data.error?.message||"unknown"));
      return {providerMessageId:String(data.id)};
    }
  };
}
