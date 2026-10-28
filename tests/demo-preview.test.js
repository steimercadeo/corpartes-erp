"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8");
const demo=fs.readFileSync("demo.html","utf8");

test("El ERP ya no contiene scripts incrustados accidentalmente en la plantilla de impresión",()=>{
  assert.ok(!html.includes('<script src="./corpartes-ai-v1.js"></script>\n<script src="./corpartes-crm-v1.js"></script>\n</body></html>'));
});
test("Los bloques JavaScript incrustados del ERP son sintácticamente válidos",()=>{
  const withoutFirebase=html.replace(/<script>\/\* CORPARTES ERP V0\.2\.1 · Firebase bundle embebido para apertura local \*\/[\s\S]*?<\/script>/,"");
  const rx=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m,count=0;
  while((m=rx.exec(withoutFirebase))){
    if(/\bsrc\s*=/.test(m[1])||!m[2].trim())continue;
    assert.doesNotThrow(()=>new Function(m[2]),"Script en posición "+m.index);
    count++;
  }
  assert.ok(count>30,"Se esperaban los scripts principales del ERP");
});
test("La demo no expone credenciales genéricas en el login real",()=>{
  assert.match(demo,/const USER="DEMO",PASSWORD="Corpartes2026!"/);
  assert.ok(!html.includes('const USER="DEMO",PASSWORD="Corpartes2026!"'));
});
test("La demo está aislada de Firebase y del origen de datos reales",()=>{
  assert.match(demo,/sandbox="allow-scripts allow-modals allow-downloads"/);
  assert.ok(!demo.includes("allow-same-origin"));
  assert.match(demo,/Firebase deshabilitado: demo aislada/);
  assert.match(demo,/state\.data=seedData\(\)/);
  assert.match(demo,/if\(window\.__CORPARTES_OFFLINE_DEMO__\)return;/);
  assert.match(demo,/no hay envíos ni escritura remota/);
});
test("El JavaScript embebido de la pantalla de prueba puede compilarse",()=>{
  const m=demo.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(m);
  assert.doesNotThrow(()=>new Function(m[1]));
});
