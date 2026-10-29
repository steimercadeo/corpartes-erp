"use strict";
/* Opt-in Shopify webhook intake for Corpartes:
   - disabled without deliberate server settings;
   - validates HMAC of RAW bytes and a single allowed shop;
   - saves a redacted review event in Firestore with dedupe by delivery ID;
   - NEVER creates shipments, labels, stock movements, or invoices.
   Environment (server-only): SHOPIFY_WEBHOOK_ENABLED, SHOPIFY_WEBHOOK_SECRET,
   SHOPIFY_ALLOWED_SHOP_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_JSON.
*/
const crypto=require("node:crypto");
const {verifyShopifyHmac,expectedShop,classify,eventKey,firestoreFields}=require("./_shopify-intake");
const MAX_BODY=512*1024;
async function readRaw(req){
 if(Buffer.isBuffer(req.body)){if(req.body.length>MAX_BODY)throw Object.assign(new Error("Too large"),{status:413});return req.body;}
 if(typeof req.body==="string"){const r=Buffer.from(req.body);if(r.length>MAX_BODY)throw Object.assign(new Error("Too large"),{status:413});return r;}
 if(req.body&&typeof req.body==="object")throw Object.assign(new Error("Raw webhook body required"),{status:422});
 let parts=[],size=0;
 for await(const part of req){size+=part.length;if(size>MAX_BODY)throw Object.assign(new Error("Too large"),{status:413});parts.push(part);}
 return Buffer.concat(parts,size);
}
async function googleAccessToken(serviceJson){
 const svc=JSON.parse(serviceJson);
 if(!svc||typeof svc.client_email!=="string"||!svc.client_email.endsWith(".gserviceaccount.com")||!svc.private_key)throw new Error("Invalid service account");
 const now=Math.floor(Date.now()/1000);
 const b64=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
 const head=b64({alg:"RS256",typ:"JWT"}),body=b64({iss:svc.client_email,scope:"https://www.googleapis.com/auth/datastore",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+900});
 const token=head+"."+body+"."+crypto.sign("RSA-SHA256",Buffer.from(head+"."+body),svc.private_key).toString("base64url");
 const response=await fetch("https://oauth2.googleapis.com/token",{
  method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:token}),signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw new Error("Google OAuth unavailable");
 const data=await response.json();
 if(!data.access_token)throw new Error("Missing Google token");
 return data.access_token;
}
function safeOrg(v){return /^[a-zA-Z0-9_-]{3,50}$/.test(v||"")?v:"";}
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 if(process.env.SHOPIFY_WEBHOOK_ENABLED!=="true")return res.status(503).json({error:"Shopify intake not enabled"});
 const secret=process.env.SHOPIFY_WEBHOOK_SECRET,
   shop=expectedShop(process.env.SHOPIFY_ALLOWED_SHOP_DOMAIN),
   project=process.env.FIREBASE_PROJECT_ID,service=process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
   org=safeOrg(process.env.CORPARTES_SHOPIFY_ORG_ID||"");
 if(!secret||!shop||!project||!service||!org)return res.status(503).json({error:"Shopify intake dependencies not configured"});
 const headers=req.headers||{};
 const deliveryId=String(headers["x-shopify-webhook-id"]||"");
 const topic=String(headers["x-shopify-topic"]||"");
 const providedShop=expectedShop(headers["x-shopify-shop-domain"]);
 if(!/^[A-Za-z0-9_-]{10,130}$/.test(deliveryId)||!["orders/create","orders/paid"].includes(topic))
   return res.status(400).json({error:"Unsupported event"});
 let raw;
 try{raw=await readRaw(req);}catch(err){return res.status(err.status||400).json({error:"Invalid raw webhook body"});}
 if(!verifyShopifyHmac(raw,headers["x-shopify-hmac-sha256"],secret))
   return res.status(401).json({error:"Invalid signature"});
 if(providedShop!==shop)return res.status(403).json({error:"Unrecognized shop"});
 let summary;
 try{summary=classify(JSON.parse(raw.toString("utf8")))}
 catch(_){return res.status(422).json({error:"Invalid order payload"});}
 const id=eventKey(shop,topic,deliveryId);
 const fields=firestoreFields({
  id,organizationId:org,shop,topic,receivedAt:new Date().toISOString(),deliveryId,
  source:"shopify",status:"pending_manual_review",summary
 });
 try{
   const token=await googleAccessToken(service);
   const url="https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(project)+"/databases/(default)/documents/shopifyWebhookEvents?documentId="+encodeURIComponent(id);
   const response=await fetch(url,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
     body:JSON.stringify({fields}),signal:AbortSignal.timeout(10000)});
   if(response.status===409)return res.status(200).json({ok:true,duplicate:true});
   if(!response.ok){console.error("SHOPIFY_REVIEW_STORE_ERROR",response.status);return res.status(503).json({error:"Event store unavailable; retry webhook"});}
   return res.status(200).json({ok:true,accepted:true,reviewOnly:true});
 }catch(err){
   console.error("SHOPIFY_INTAKE_UNAVAILABLE",err?.name||"Error");
   return res.status(503).json({error:"Webhook storage unavailable; retry"});
 }
};
// When using a Next.js-compatible runtime, preserve raw bytes for HMAC.
module.exports.config={api:{bodyParser:false}};
module.exports._internal={readRaw,googleAccessToken,safeOrg};