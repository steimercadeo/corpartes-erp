"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const code=fs.readFileSync("corpartes-operations-v5.js","utf8");
const loader=fs.readFileSync("corpartes-os-v2.js","utf8");
function init(){
 const callbacks=[];
 const context={window:{},document:{readyState:"loading",addEventListener:function(event,cb){callbacks.push([event,cb]);}},console};
 vm.runInNewContext(code,context,{filename:"corpartes-operations-v5.js",timeout:1000});
 return {api:context.window.CorpartesOperationsV5,callbacks};
}
test("Módulos nuevos compilables y enlazados desde ERP existente",()=>{
 assert.doesNotThrow(()=>new Function(code));
 assert.match(loader,/corpartes-operations-v5\.js/);
 for(const key of ["module-atlas","module-mercadeo","module-logistica","module-fiscal","module-conexiones"]){
  assert.ok(code.includes(key),key);
 }
});
test("Atlas original se mapea por columnas y conserva oportunidades, contactos y sector",()=>{
 const api=init().api;
 const rows=[
  ["ID","Empresa","Sector","Subsector","Municipio/Base","Oportunidad para CORPARTES","Potencial","Estado","Correo compras / proveedores","Correo comercial / servicio","Teléfono fijo","WhatsApp","Fuente","Prioridad acción"],
  ["AT-0001","HMV Ingenieros","Eléctrico","Subestaciones","Medellín","Gabinetes metálicos","A+","Sin contactar","","compras@ejemplo.co","6040000000","","Fuente verificada","1. Llamar"],
  ["AT-0002","Empresa X","Mobiliario","Exhibidores","Itagüí","Bases de mesas","B","Prospecto","compras@empresa.co","","6041234567","","Web oficial","2. Cotizar"]
 ];
 const result=api.importFromMatrix(rows);
 assert.equal(result.length,2);
 assert.equal(result[0].company,"HMV Ingenieros");
 assert.equal(result[0].sector,"Eléctrico");
 assert.equal(result[0].city,"Medellín");
 assert.equal(result[0].opportunity,"Gabinetes metálicos");
 assert.equal(result[0].email,"compras@ejemplo.co");
 assert.equal(result[1].email,"compras@empresa.co");
});
test("Atlas no crea compañías falsas, duplica fichas ni acepta formato inválido",()=>{
 const api=init().api;
 assert.throws(()=>api.importFromMatrix([["Nombre","Ciudad"],["Prueba","Medellín"]]),/columnas Empresa y Sector/);
 const result=api.importFromMatrix([["ID","Empresa","Sector"],["AT-1","Cliente A","Construcción"],["AT-2","cliente a","Mobiliario"],["AT-3","","Metal"]]);
 assert.equal(result.length,1);
});
test("Los módulos V5 son de revisión: sin solicitudes externas, emisión DIAN ni envíos",()=>{
 assert.match(code,/EN MEMORIA DE ESTA PESTAÑA/);
 assert.match(code,/NO certifica cumplimiento normativo/);
 assert.doesNotMatch(code,/fetch\s*\(/);
 assert.doesNotMatch(code,/window\.saveData\(/);
 assert.doesNotMatch(code,/sendEmail\s*\(/);
});
test("No se activa ninguna acción del DOM durante la importación de prueba",()=>{
 const {api,callbacks}=init();
 assert.ok(api);
 assert.equal(callbacks.length,1);
 assert.equal(callbacks[0][0],"DOMContentLoaded");
});
