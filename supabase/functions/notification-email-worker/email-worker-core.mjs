export function readEmailConfig(env){
  const provider=String(env.get("MAGASIN_EMAIL_PROVIDER")||"").trim();
  const from=String(env.get("MAGASIN_EMAIL_FROM")||"").trim();
  const replyTo=String(env.get("MAGASIN_EMAIL_REPLY_TO")||"").trim()||null;
  const missing=[];
  if(!provider)missing.push("MAGASIN_EMAIL_PROVIDER");
  if(!from)missing.push("MAGASIN_EMAIL_FROM");
  return {provider,from,replyTo,ready:missing.length===0,missing};
}

export function accessScopeIncludesStore(accessScope,storeCode){
  const code=String(storeCode||"").trim().toUpperCase();
  if(!code)return false;
  const tokens=String(accessScope||"").toUpperCase().replaceAll(";",",").split(",").map(x=>x.trim()).filter(Boolean);
  return tokens.includes("ALL")||tokens.includes("*")||tokens.includes(code);
}

export function uniqueRecipients(rows){
  const map=new Map();
  for(const row of rows||[]){
    const email=String(row?.email||"").trim().toLowerCase();
    if(!email||!email.includes("@"))continue;
    if(!map.has(email))map.set(email,{email,name:String(row?.full_name||"").trim()||null});
  }
  return [...map.values()];
}

export function buildEnvelope(notification,recipients,config){
  return {
    eventId:String(notification.id),
    eventType:String(notification.event_type||""),
    from:config.from,
    replyTo:config.replyTo,
    to:recipients,
    subject:String(notification.title||"Thông báo MAGASIN"),
    text:String(notification.message||""),
  };
}
