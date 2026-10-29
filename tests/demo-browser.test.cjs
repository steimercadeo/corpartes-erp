"use strict";
// Navegación real en Chromium. No conecta a Firebase, no toca producción.
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");

test("DEMO muestra módulos y permite navegar a Atlas, aprendizajes y chat",async(t)=>{
 const root=path.resolve(__dirname,"..");
 const server=http.createServer((req,res)=>{
   let url=new URL(req.url,"http://127.0.0.1");
   let safe=path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/,"");
   let file=path.resolve(root,"."+safe);
   if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   try{
     const data=fs.readFileSync(file);
     const ext=path.extname(file);
     res.writeHead(200,{"Content-Type":ext===".html"?"text/html; charset=utf-8":ext===".js"?"text/javascript; charset=utf-8":ext===".webmanifest"?"application/manifest+json":ext===".css"?"text/css":"application/octet-stream"});
     res.end(data);
   }catch(_){res.writeHead(404).end("No encontrado");}
 });
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 t.after(()=>new Promise(ok=>server.close(ok)));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage"]});
 t.after(async()=>browser.close());
 const page=await browser.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(String(e).slice(0,250)));
 page.on("console",m=>{if(m.type()==="error")errors.push(m.text().slice(0,250));});
 await page.route("**/*",route=>{
   const url=route.request().url();
   if(url.startsWith("http://127.0.0.1:")||url.startsWith("about:")||url.startsWith("data:"))return route.continue();
   return route.abort();
 });
 const addr=server.address();const url="http://127.0.0.1:"+addr.port+"/demo.html";
 await page.goto(url,{waitUntil:"domcontentloaded"});
 await page.locator("#demoUser").fill("Nico123");
 await page.locator("#demoPassword").fill("Nico123");
 await page.locator("#enter").click();
 await page.waitForFunction(()=>document.querySelector("#demoModulesReady")?.textContent?.includes("8 de 8"),null,{timeout:10000}).catch(async function(){
  const ready=await page.locator("#demoModulesReady").textContent().catch(()=>"<missing>");
  const error=await page.locator("#err").textContent().catch(()=>"<missing>");
  const count=await page.locator("#demoFrame").count();
  throw new Error("DEMO load diagnostics: ready="+ready+" error="+error+" frame="+count+" console="+errors.join(" | "));
 });
 assert.match(await page.locator("#demoModulesReady").textContent(),/8 de 8/);
 const frame=page.frameLocator("#demoFrame");
 await frame.locator("#module-control").waitFor({state:"visible",timeout:10000});
 await page.locator('[data-demo-module="automatizaciones"]').click();
 await frame.locator("#module-automatizaciones").waitFor({state:"visible",timeout:10000});
 await frame.locator('#cp7NewForm button[type="submit"]').click();
 await frame.locator('[data-cp7-step="evaluate"]').click();
 await frame.locator('[data-cp7-step="request"]').click();
 await frame.locator('[data-cp7-step="approve"]').click();
 await frame.locator('[data-cp7-step="guide"]').click();
 assert.match(await frame.locator("#cp7Detail").innerText(),/DEMO-CO-/);
 await frame.locator('[data-cp7-step="synchronize"]').click();
 assert.match(await frame.locator("#cp7Detail").innerText(),/Seguimiento simulado/);
 await page.locator('[data-demo-module="atlas"]').click();
 await frame.locator("#module-atlas").waitFor({state:"visible",timeout:10000});
 assert.match(await frame.locator("#module-atlas").innerText(),/Importar CRM Atlas/);
 await page.locator('[data-demo-module="conocimiento"]').click();
 await frame.locator("#module-conocimiento").waitFor({state:"visible",timeout:10000});
 await frame.locator("#cpkbQuestion").fill("¿Cómo integraremos Apollo y Hunter?");
 await frame.locator("#cpkbForm button").click();
 const kbDetail=await frame.locator("#cpkbAnswer").innerText();
 const suggestions=await frame.locator("#cpkbSuggest button").count();
 assert.match(kbDetail,/Apollo y Hunter/i,"knowledgeAnswer="+kbDetail+" suggestions="+suggestions+" console="+errors.join(" | "));
 await page.locator('[data-demo-module="ai"]').click();
 await frame.locator("#module-ai").waitFor({state:"visible",timeout:10000});
 assert.match(await frame.locator("#module-ai").innerText(),/chat interno/i);
 await page.locator('[data-demo-module="control"]').click();
 await frame.locator("#module-control").waitFor({state:"visible",timeout:10000});
 const legacy=errors.filter(x=>/(ReferenceError: openEditOrder is not defined|Cannot read properties of null|SecurityError: Failed to read the 'serviceWorker')/i.test(x));
 if(legacy.length)console.warn("Advertencias heredadas del ERP:",legacy.join("; "));
 const serious=errors.filter(x=>!/(net::ERR|Failed to load resource|refused to load|networkerror|ReferenceError: openEditOrder is not defined|Cannot read properties of null|serviceWorker)/i.test(x));
 assert.deepEqual(serious.slice(0,4),[],"Errores nuevos no controlados: "+serious.join("; "));
});
