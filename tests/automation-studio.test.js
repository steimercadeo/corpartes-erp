"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),crypto=require("node:crypto");
const flow=fs.readFileSync("corpartes-automations-v7.js","utf8");
const {verifyShopifyHmac,expectedShop,classify,eventKey,firestoreFields}=require("../api/_shopify-intake");
const webhook=require("../api/shopify-webhook");
function engine(){
 const context={document:{readyState:"loading",addEventListener(){}},window:{},Intl,Date,console,Set,URL,Blob};
 vm.runInNewContext(flow,context,{timeout:2500});
 return context.window.CorpartesAutomationsV7;
}
test("Automation Studio compiles, presents ten workflows, never invokes external APIs",()=>{
 assert.doesNotThrow(()=>new Function(flow));
 assert.equal(engine().flowCatalog.length,10);
 assert.ok(flow.includes("module-automatizaciones"));
 assert.ok(flow.includes("No se envían pedidos"));
 assert.ok(!/\bfetch\s*\(/.test(flow));
});
test("Shopify demo: validations, approval, fictitious label, tracking, audit",()=>{
 const e=engine();
 const o=e.createDemoOrder({customer:"Ejemplo",city:"Medellín",sku:"SKU1",quantity:2,paid:true,stockConfirmed:true});
 assert.match(o.reference,/SHP-DEMO-/);
 assert.equal(o.stage,"nuevo");
 assert.throws(()=>e.createDemoGuide(o),/aprobaci[oó]n/);
 e.evaluate(o);assert.equal(o.stage,"validado");
 e.requestApproval(o,"Coordinadora");assert.equal(o.stage,"aprobacion");
 assert.throws(()=>e.createDemoGuide(o),/aprobaci[oó]n/);
 e.approve(o);
 const tracking=e.createDemoGuide(o);assert.match(tracking,/^DEMO-CO-/);
 e.simulateTracking(o);assert.equal(o.stage,"sincronizado");
 assert.ok(o.events.length>=5);
 assert.throws(()=>e.evaluate(o),/gu[ií]a/);
});
test("Factory-to-carrier route blocks unfinished, unpaid and unreserved orders",()=>{
 const e=engine();
 const unpaid=e.createDemoOrder({customer:"Ejemplo",city:"Medellín",sku:"SKU2",paid:false,stockConfirmed:true});
 assert.throws(()=>e.evaluate(unpaid),/pago/);
 const out=e.createDemoOrder({customer:"Ejemplo",city:"Medellín",sku:"SKU3",paid:true,stockConfirmed:false});
 assert.throws(()=>e.evaluate(out),/disponibilidad|existencias/);
 const built=e.createDemoOrder({customer:"Ejemplo",city:"Medellín",sku:"SKU4",paid:true,stockConfirmed:true,production:true});
 assert.throws(()=>e.evaluate(built),/fabricaci[oó]n|producci[oó]n/);
 e.production(built);e.evaluate(built);assert.equal(built.stage,"validado");
});
test("Guide ID is stable when a new simulated order arrives",()=>{
 const e=engine();
 const a=e.createDemoOrder({customer:"A",city:"Medellín",sku:"A",paid:true,stockConfirmed:true});
 e.evaluate(a);e.requestApproval(a,"Envía");e.approve(a);
 const first=e.createDemoGuide(a);
 const b=e.createDemoOrder({customer:"B",city:"Medellín",sku:"B",paid:true,stockConfirmed:true});
 e.evaluate(b);e.requestApproval(b,"Envía");e.approve(b);
 const second=e.createDemoGuide(b);
 assert.notEqual(first,second);
});
test("Shopify HMAC rejects tampered bodies and malformed hashes, validates allowed domain",()=>{
 const raw=Buffer.from(JSON.stringify({id:123,financial_status:"paid",line_items:[]}));
 const secret="demo_shared_secret";
 const signature=crypto.createHmac("sha256",secret).update(raw).digest("base64");
 assert.equal(verifyShopifyHmac(raw,signature,secret),true);
 assert.equal(verifyShopifyHmac(Buffer.from(raw.toString().replace("123","124")),signature,secret),false);
 assert.equal(verifyShopifyHmac(raw,"junk",secret),false);
 assert.equal(expectedShop("my-store.myshopify.com"),"my-store.myshopify.com");
 assert.equal(expectedShop("evil.com"),"");
});
test("Order intake is review-only and privacy-aware; missing SKU is held",()=>{
 const order=classify({id:123,order_number:456,financial_status:"paid",line_items:[{quantity:2,requires_shipping:true,sku:""}],shipping_address:{city:"Bogotá",name:"Private Name",address1:"Private address"}});
 assert.equal(order.reviewStatus,"sku_mapping_needed");
 assert.equal(order.paymentConfirmed,true);
 assert.equal(order.shippingCity,"Bogotá");
 assert.ok(!JSON.stringify(order).includes("Private"));
 assert.equal(eventKey("a.myshopify.com","orders/create","event-1"),eventKey("a.myshopify.com","orders/create","event-1"));
 assert.notEqual(eventKey("a.myshopify.com","orders/create","event-1"),eventKey("a.myshopify.com","orders/create","event-2"));
 const firestore=firestoreFields({order});assert.ok(firestore.order.mapValue.fields);
});
test("Webhook fails closed while disabled, no database or carrier is contacted",async()=>{
 const backup=process.env.SHOPIFY_WEBHOOK_ENABLED;delete process.env.SHOPIFY_WEBHOOK_ENABLED;
 let result={};
 const res={setHeader(){},status(x){result.status=x;return this;},json(x){result.body=x;return this;}};
 try{await webhook({method:"POST",headers:{}},res);assert.equal(result.status,503);assert.match(result.body.error,/not enabled/);}
 finally{if(backup!==undefined)process.env.SHOPIFY_WEBHOOK_ENABLED=backup;}
});
