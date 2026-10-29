"use strict";
/* Shopify intake: pure validators. No customer contact details, access tokens or labels
   are persisted by this module. The webhook endpoint is opt-in and disabled by default. */
const crypto=require("node:crypto");
function verifyShopifyHmac(raw,header,secret){
  if(!Buffer.isBuffer(raw)||!secret||typeof header!=="string")return false;
  if(!/^[A-Za-z0-9+/]{43}=$/.test(header))return false;
  const expected=crypto.createHmac("sha256",secret).update(raw).digest();
  const supplied=Buffer.from(header,"base64");
  return supplied.length===expected.length && crypto.timingSafeEqual(supplied,expected);
}
function expectedShop(host){
  let clean=String(host||"").trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9-]{1,60}\.myshopify\.com$/.test(clean))return "";
  return clean;
}
function classify(order){
  if(!order||typeof order!=="object"||Array.isArray(order))throw new Error("Order payload must be JSON object");
  const id=String(order.id||"").trim(),number=String(order.order_number||order.name||"").slice(0,60);
  if(!/^\d{1,20}$/.test(id))throw new Error("Missing Shopify order id");
  const rows=Array.isArray(order.line_items)?order.line_items:[];
  if(rows.length>250)throw new Error("Too many line items");
  const items=rows.map(x=>({sku:String(x?.sku||"").trim().slice(0,80),quantity:Math.max(0,Math.min(100000,Number(x?.quantity)||0))}));
  const paid=["paid","partially_refunded"].includes(String(order.financial_status||"").toLowerCase());
  const physical=items.length>0 && rows.some(x=>x?.requires_shipping!==false);
  const issue=!paid?"payment_not_confirmed":!physical?"not_physical_shipment":items.some(x=>!x.sku||!x.quantity)?"sku_mapping_needed":"manual_stock_and_production_check";
  return {orderId:id,number,financialStatus:String(order.financial_status||"").slice(0,40),fulfillmentStatus:String(order.fulfillment_status||"").slice(0,40),createdAt:String(order.created_at||"").slice(0,50),
    currency:String(order.currency||"").slice(0,8),items,paymentConfirmed:paid,requiresShipping:physical,reviewStatus:issue,
    shippingCity:String(order.shipping_address?.city||"").slice(0,70)};
}
function eventKey(shop,topic,id){
  return crypto.createHash("sha256").update([shop,topic,id].join("|")).digest("hex");
}
function wrapFirestoreValue(x){
 if(x===null||x===undefined)return {nullValue:null};
 if(typeof x==="boolean")return {booleanValue:x};
 if(typeof x==="number")return Number.isFinite(x)?{doubleValue:x}:{nullValue:null};
 if(typeof x==="string")return {stringValue:x};
 if(Array.isArray(x))return {arrayValue:{values:x.map(wrapFirestoreValue)}};
 if(typeof x==="object")return {mapValue:{fields:Object.fromEntries(Object.entries(x).map(([k,v])=>[k,wrapFirestoreValue(v)]))}};
 return {stringValue:String(x)};
}
function firestoreFields(obj){return Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,wrapFirestoreValue(v)]));}
module.exports={verifyShopifyHmac,expectedShop,classify,eventKey,firestoreFields};