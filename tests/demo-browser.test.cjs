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
 await page.locator("#demoUser").fill("DEMO");
 await page.locator("#demoPassword").fill("Corpartes2026!");
 await page.locator("#enter").click();
 await page.waitForFunction(()=>document.querySelector("#demoModulesReady")?.textContent?.includes("7 de 7"),null,{timeout:25000});
 assert.match(await page.locator("#demoModulesReady").textContent(),/7 de 7/);
 const frame=page.frameLocator("#demoFrame");
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
 const serious=errors.filter(x=>!/(net::ERR|Failed to load resource|refused to load|networkerror)/i.test(x));
 assert.deepEqual(serious.slice(0,4),[],"Errores JavaScript: "+serious.join("; "));
});
