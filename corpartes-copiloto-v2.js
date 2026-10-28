/* CORPARTES COPILOTO V2 · ayudante operativo, catálogo de habilidades y acciones autorizadas.
   Se instala encima del ERP completo, sin reemplazar pedidos, cotizaciones ni producción.
   Backend opcional: /api/copilot, deshabilitado hasta configurar Firebase propio y AI Gateway.
*/
(function(){
"use strict";
const MODULE="copiloto";
const GUIDES=[
  {id:"pedido",title:"Crear y seguir un pedido",module:"pedidos",steps:["Abre Pedidos y registra cliente, ítems y cantidades.","Adjunta los planos o documentos de fabricación.","Programa los procesos que correspondan a cada ítem.","Controla el avance en Seguimiento antes de entregar."]},
  {id:"produccion",title:"Registrar producción sin perder trazabilidad",module:"produccion",steps:["Selecciona pedido, ítem y proceso autorizado.","Registra cantidad conforme y no conforme.","Revisa que los procesos anteriores estén completos.","Consulta Seguimiento para verificar el avance actualizado."]},
  {id:"remision",title:"Preparar una remisión",module:"remisiones",steps:["Verifica que el pedido tenga cantidades listas para entregar.","Ingresa a Remisiones y selecciona el pedido.","Valida cantidades, cliente y autorización correspondiente.","Genera o descarga el documento desde el módulo original."]},
  {id:"inventario",title:"Consultar inventario de lámina",module:"lamina",steps:["Abre Inventario de lámina.","Filtra por material, espesor y formato.","Valida existencias y reservas antes de programar.","Registra entradas y movimientos solo con permisos de almacén."]},
  {id:"cotizacion",title:"Preparar una cotización",module:"cotizaciones",steps:["Abre Cotizaciones.","Selecciona cliente, materiales y operaciones.","Verifica tiempos, desperdicio, precios y márgenes.","Revisa la propuesta antes de enviarla al cliente."]},
  {id:"crm",title:"Hacer seguimiento comercial",module:"crm",steps:["Abre CRM Comercial y busca la empresa.","Confirma contacto, sector y etapa.","Programa la siguiente gestión con fecha.","Registra resultado y avance de la oportunidad."]},
  {id:"informes",title:"Comprender los indicadores",module:"informes",steps:["Abre Informes.","Selecciona el periodo y el cliente.","Compara lo planificado con lo ejecutado y entregado.","Revisa las diferencias antes de tomar decisiones."]},
  {id:"administracion",title:"Usuarios y permisos",module:"administracion",steps:["Un administrador entra a Administración.","Asigna a cada usuario solo los módulos necesarios.","Comprueba su rol antes de permitir una acción sensible.","No compartas claves; utiliza usuarios individuales."]}
];
const SKILLS=[
  {id:"resumen",group:"Analizar",title:"Diagnóstico de operación",description:"Pedidos, entregas y estado comercial.",icon:"◉"},
  {id:"riesgos",group:"Analizar",title:"Detectar pedidos en riesgo",description:"Vencimientos y avances de los pedidos.",icon:"⚠"},
  {id:"stock",group:"Analizar",title:"Revisar lámina crítica",description:"Referencias con existencias bajas.",icon:"▦"},
  {id:"crm",group:"Ejecutar",title:"Programar gestión comercial",description:"Modificar una fecha en CRM con confirmación.",icon:"◷"},
  {id:"exportar",group:"Ejecutar",title:"Exportar prospectos a CSV",description:"Descarga de empresas que permite tu rol.",icon:"⇩"},
  {id:"ayuda",group:"Aprender",title:"Enseñarme un proceso",description:"Guías paso a paso sobre el ERP.",icon:"?"}
];
let started=false;
let transcript=[];
let busy=false;
const byId=id=>document.getElementById(id);
const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const txt=value=>String(value==null?"":value);
const norm=value=>txt(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const today=()=>new Date().toLocaleDateString("en-CA");
function user(){return typeof state!=="undefined"&&state.currentUser;}
function arr(key){return typeof state!=="undefined"&&state.data&&Array.isArray(state.data[key])?state.data[key]:[];}
function can(module){return !!user()&&(typeof canAccess==="function"&&canAccess(module));}
function orderName(o){return txt(o.number||o.code||o.orderNumber||o.id||"Sin número");}
function orderClient(o){return txt(o.client||o.customer||o.clientName||"Sin cliente");}
function due(o){const raw=o.deliveryDate||o.dueDate||o.promiseDate;if(!raw)return null;const d=new Date(txt(raw).slice(0,10)+"T12:00:00");return isNaN(d.getTime())?null:d;}
function dueDays(o){const d=due(o);if(!d)return null;const x=new Date();x.setHours(12,0,0,0);return Math.round((d-x)/86400000);}
function orders(){return arr("orders").filter(o=>norm(o.type||"Pedido")==="pedido"&&!["cancelado","anulado"].includes(norm(o.status)));}
function percent(o){try{if(window.CorpartesAI&&typeof window.CorpartesAI.orderProgress==="function")return window.CorpartesAI.orderProgress(o);}catch(_){}
const list=arr("movements"),items=Array.isArray(o.items)?o.items:[];let qty=0,done=0;
items.forEach(i=>{(i.routes||i.route||[]).forEach(r=>{const required=Number(r.requiredQty||i.qty||0);if(required<=0)return;qty+=required;done+=Math.min(required,list.filter(m=>txt(m.orderId)===txt(o.id)&&txt(m.itemId)===txt(i.id)&&txt(m.processId)===txt(r.processId)).reduce((n,m)=>n+Number(m.qty||0),0));});});
return qty?Math.round(done/qty*100):null;}
function riskOrders(){return orders().map(o=>({o,days:dueDays(o),progress:percent(o)})).filter(x=>x.days!==null&&x.days<=5&&x.progress!==100).sort((a,b)=>a.days-b.days).slice(0,30);}
function criticalStocks(){return arr("sheetStocks").filter(s=>{const q=Number(s.stock??s.qty??s.quantity??NaN),min=Number(s.minStock??s.minimumStock??s.minimum??0);return Number.isFinite(q)&&(min>0?q<=min:q<=1);}).slice(0,25);}
function crmRows(){return arr("crmCompanies");}
function context(){const ro=orders(),r=riskOrders(),low=criticalStocks(),crm=crmRows();
return {company:"Corpartes",date:today(),ordersActive:ro.length,ordersAtRisk:r.length,criticalSheetStocks:low.length,crmCompanies:crm.length,
  riskSamples:r.slice(0,12).map(x=>({order:orderName(x.o).slice(0,60),client:orderClient(x.o).slice(0,90),daysToDue:x.days,progress:x.progress})),
  stockSamples:low.slice(0,12).map(s=>({material:txt(s.material||s.materialType||s.type).slice(0,80),gauge:txt(s.gauge||s.caliber||s.thickness).slice(0,30),available:Number(s.stock??s.qty??s.quantity??0)})),
  crmStages:crm.reduce((acc,x)=>{const k=txt(x.stage||"Prospecto").slice(0,30);acc[k]=(acc[k]||0)+1;return acc;},{}),
  visibleModules:["pedidos","produccion","remisiones","lamina","cotizaciones","seguimiento","informes","crm","administracion"].filter(can)
};}
function card(title,text,action){return '<div class="cpc-result"><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p>'+(action?'<button type="button" data-cpc-nav="'+esc(action)+'">Abrir '+esc(action)+'</button>':"")+'</div>';}
function diagnosis(){const d=context();return "Resumen del ERP: "+d.ordersActive+" pedidos activos, "+d.ordersAtRisk+" con fechas para revisar, "+d.criticalSheetStocks+" referencias de lámina críticas y "+d.crmCompanies+" empresas ingresadas directamente en el CRM. Estas cifras dependen de los registros presentes; no equivalen a una conciliación contable.";}
function add(role,message){transcript.push({role,text:txt(message)});transcript=transcript.slice(-25);renderMessages();}
function renderMessages(){const box=byId("cpcMessages");if(!box)return;box.innerHTML=transcript.map(m=>'<div class="cpc-message '+esc(m.role)+'"><b>'+(m.role==="user"?"Tú":"Copiloto")+'</b><p>'+esc(m.text)+'</p></div>').join("");box.scrollTop=box.scrollHeight;}
function setStatus(message){const el=byId("cpcStatus");if(el)el.textContent=txt(message);}
function doSkill(id){
if(!user())return;
if(id==="resumen"){add("assistant",diagnosis());return;}
if(id==="riesgos"){const list=riskOrders();add("assistant",list.length?"Pedidos para revisar: "+list.slice(0,10).map(x=>orderName(x.o)+" · "+orderClient(x.o)+" · "+(x.days<0?"vencido "+Math.abs(x.days)+" d":"vence en "+x.days+" d")+" · "+(x.progress==null?"avance por validar":x.progress+"%")).join("; ")+".":"No se detectaron pedidos con entrega vencida o próxima en los registros analizados.");return;}
if(id==="stock"){const list=criticalStocks();add("assistant",list.length?"Referencias para validar: "+list.slice(0,10).map(s=>txt(s.material||s.materialType||s.type||"Lámina")+" "+txt(s.gauge||s.caliber||s.thickness||"")+" · disponibles "+txt(s.stock??s.qty??s.quantity??0)).join("; ")+".":"No hay referencias críticas detectadas con la regla de existencias configurada.");return;}
if(id==="crm"){if(!can("crm")){add("assistant","Tu rol no permite modificar el CRM.");return;}byId("cpcFollowup").classList.remove("hidden");renderCompanies();byId("cpcFollowup").scrollIntoView({behavior:"smooth",block:"nearest"});return;}
if(id==="exportar"){exportCRM();return;}
if(id==="ayuda"){byId("cpcGuides").classList.remove("hidden");byId("cpcGuides").scrollIntoView({behavior:"smooth",block:"nearest"});return;}
}
function renderCompanies(){const sel=byId("cpcCompany");if(!sel)return;sel.innerHTML='<option value="">Selecciona una empresa</option>'+crmRows().slice().sort((a,b)=>txt(a.company).localeCompare(txt(b.company),"es")).map(r=>'<option value="'+esc(r.id)+'">'+esc(r.company)+'</option>').join("");}
function followup(e){
e.preventDefault();if(!can("crm")){setStatus("Acceso denegado por permisos.");return;}
if(typeof nativeCloudReady==="undefined"||!nativeCloudReady){setStatus("Acción bloqueada: Firebase CORPARTES no está sincronizado. No se guardaron cambios.");return;}
const id=byId("cpcCompany").value,date=byId("cpcDate").value,detail=byId("cpcDetail").value.trim();
const row=crmRows().find(x=>txt(x.id)===id);
if(!row||!date||!detail||detail.length>300){setStatus("Selecciona empresa, fecha válida y una nota de hasta 300 caracteres.");return;}
if(!/^\d{4}-\d\d-\d\d$/.test(date)||isNaN(new Date(date+"T12:00:00").getTime())){setStatus("Fecha inválida.");return;}
const company=txt(row.company);
if(!window.confirm("¿Confirmas programar la siguiente gestión de "+company+" para el "+date+"? Se modificará su ficha real de CRM."))return;
const who=txt(user().name||user().code||"Usuario");
row.nextDate=date;
row.notes=(txt(row.notes)+"\n["+new Date().toLocaleString("es-CO")+"] "+who+" · Copiloto: "+detail).trim().slice(-2000);
row.updatedAt=new Date().toISOString();
try{if(typeof saveData!=="function")throw new Error("Guardado del ERP no disponible");saveData();setStatus("Gestión registrada en la ficha del CRM. Revisa el indicador de sincronización de la nube.");add("assistant","Gestión comercial registrada para "+company+" el "+date+". La confirmación definitiva requiere verificar que Firestore quedó sincronizado.");byId("cpcFollowup").classList.add("hidden");}
catch(err){setStatus("No se pudo guardar: "+txt(err.message));}
}
function exportCRM(){
if(!can("crm")){add("assistant","No tienes permiso para exportar el CRM.");return;}
const rows=crmRows();if(!rows.length){add("assistant","No hay fichas comerciales para exportar.");return;}
const keys=["company","sector","stage","source","contact","email","phone","assigned","amount","nextDate","notes"];
const quote=v=>'"'+txt(v).replace(/"/g,'""').replace(/^[=+\-@\t\r]/,"'$&")+'"';
const csv="\uFEFF"+[keys.join(";")].concat(rows.map(r=>keys.map(k=>quote(r[k])).join(";"))).join("\r\n");
const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="CORPARTES_CRM_"+today()+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
add("assistant","Descarga preparada: "+rows.length+" fichas CRM. Trata este archivo como información comercial confidencial.");
}
function guide(id){const g=GUIDES.find(x=>x.id===id);if(!g)return;const area=byId("cpcGuideResult");
area.innerHTML='<h3>'+esc(g.title)+'</h3><ol>'+g.steps.map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol>'+(can(g.module)?'<button type="button" data-cpc-nav="'+esc(g.module)+'">Ir a '+esc(g.module)+'</button>':"<p>Tu rol no permite abrir este módulo.</p>");}
async function ask(q){
q=txt(q).trim().slice(0,1600);if(!q||busy||!user())return;
add("user",q);
const n=norm(q);
if(/(crear|registrar|agendar|programar).*(gestion|seguimiento|llamada)/.test(n)){doSkill("crm");add("assistant","Selecciona la empresa y la fecha. No cambiaré ningún registro sin tu confirmación.");return;}
if(/(exportar|descargar).*(crm|cliente|prospect|empresa)/.test(n)){add("assistant","Para evitar descargas involuntarias, utiliza la habilidad «Exportar prospectos a CSV».");return;}
if(/(como|ensena|ayuda|guia|instruccion|aprend)/.test(n)){doSkill("ayuda");add("assistant","Abrí las guías. Selecciona el procedimiento que necesitas y te indicaré cómo realizarlo.");return;}
if(/(riesgo|vencid|atrasad)/.test(n)){doSkill("riesgos");return;}
if(/(inventario|lamina|stock|material)/.test(n)){doSkill("stock");return;}
if(/(resumen|como va|estado de la empresa|que debo revisar)/.test(n)){doSkill("resumen");return;}
busy=true;setStatus("Consultando IA segura…");
try{
  const auth=window.ESS_AUTH&&window.ESS_AUTH.auth&&window.ESS_AUTH.auth.currentUser;
  if(!auth||typeof auth.getIdToken!=="function")throw new Error("Sesión Firebase no disponible.");
  const token=await auth.getIdToken();
  const resp=await fetch("/api/copilot",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({question:q,context:context()})});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(resp.status===503?"IA externa pendiente de configuración en Vercel.":(data.error||"La IA no está disponible."));
  add("assistant",txt(data.answer||"No se recibió respuesta."));
  setStatus("IA generativa conectada · Respuestas basadas en el contexto enviado.");
}catch(err){
  add("assistant","El modelo generativo no está disponible: "+txt(err.message)+" Puedes utilizar las habilidades de diagnóstico, navegación, aprendizaje y CRM que funcionan directamente con el ERP.");
  setStatus("Modo local · IA externa todavía sin configurar.");
}finally{busy=false;}
}
function html(){return '<section id="module-copiloto" class="module cpc-root">'+
'<header class="cpc-hero"><div><small>CORPARTES · SISTEMA OPERATIVO INTELIGENTE</small><h2>Copiloto empresarial</h2><p>Entiende, enseña, recomienda y ejecuta acciones autorizadas. Tus módulos industriales siguen funcionando igual.</p></div><div class="cpc-pill">CONTROL DE PERMISOS ACTIVO</div></header>'+
'<div class="cpc-main"><div class="cpc-panel"><div class="cpc-heading"><h3>Habla con tu ERP</h3><span id="cpcStatus">Modo local · conexión IA externa pendiente</span></div><div id="cpcMessages" class="cpc-messages"></div>'+
'<form id="cpcAskForm" class="cpc-ask"><input id="cpcPrompt" maxlength="1600" placeholder="Ej.: ¿qué pedidos están en riesgo?, ¿cómo creo una remisión?" autocomplete="off"><button>Preguntar</button></form><p class="cpc-footnote">No realiza cambios a partir de texto libre. Las acciones requieren permiso y confirmación.</p></div>'+
'<div class="cpc-panel"><h3>Habilidades del Copiloto</h3><p class="cpc-muted">Operaciones reales conectadas con los datos y módulos de la empresa.</p><div class="cpc-skills">'+SKILLS.map(s=>'<button class="cpc-skill" type="button" data-cpc-skill="'+s.id+'"><b>'+s.icon+' '+esc(s.title)+'</b><small>'+esc(s.description)+'</small><span>'+esc(s.group)+'</span></button>').join("")+'</div></div></div>'+
'<div id="cpcFollowup" class="cpc-panel cpc-drawer hidden"><h3>Programar gestión en CRM · acción con confirmación</h3><form id="cpcFollowupForm"><label>Empresa<select id="cpcCompany" required></select></label><label>Fecha<input id="cpcDate" type="date" required></label><label>Nota de gestión<textarea id="cpcDetail" maxlength="300" required placeholder="Ej.: llamar para presentar servicios de corte láser"></textarea></label><div><button type="submit">Revisar y confirmar</button><button type="button" id="cpcCancel">Cancelar</button></div></form></div>'+
'<div id="cpcGuides" class="cpc-panel cpc-drawer hidden"><h3>Centro de aprendizaje · sin videos ni soporte externo</h3><div class="cpc-guides">'+GUIDES.map(g=>'<button type="button" data-cpc-guide="'+g.id+'">'+esc(g.title)+'</button>').join("")+'</div><div id="cpcGuideResult"></div></div>'+
'</section>';}
function css(){return '.cpc-root{padding-bottom:36px}.cpc-root .hidden{display:none!important}.cpc-hero{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 28px;margin-bottom:16px;border-radius:20px;background:linear-gradient(115deg,#0f2746,#146184);color:white}.cpc-hero small{font-weight:800;letter-spacing:.13em;font-size:11px}.cpc-hero h2{font-size:30px;margin:5px 0}.cpc-hero p{margin:0;font-size:13px;opacity:.85}.cpc-pill{white-space:nowrap;font-size:10px;font-weight:900;background:#ffffff26;padding:9px 12px;border-radius:999px}.cpc-main{display:grid;grid-template-columns:1.2fr 1fr;gap:16px}.cpc-panel{background:#fff;border:1px solid #dce6ee;border-radius:16px;padding:18px;box-shadow:0 7px 22px #11335a0a;min-width:0}.cpc-panel h3{font-size:17px;margin:0 0 9px;color:#173856}.cpc-heading{display:flex;justify-content:space-between;align-items:center;gap:10px}.cpc-heading span,.cpc-muted{font-size:11px;color:#66788a}.cpc-messages{height:365px;overflow:auto;background:#f7fafc;border:1px solid #e7eff6;border-radius:12px;padding:12px;margin-top:12px}.cpc-message{border-radius:12px;padding:10px 13px;margin:8px 0;background:#e9f1f8;max-width:92%;font-size:12px}.cpc-message.user{background:#173d67;color:white;margin-left:auto}.cpc-message p{margin:4px 0;white-space:pre-wrap;line-height:1.55}.cpc-ask{display:flex;gap:7px;margin-top:12px}.cpc-ask input{flex:1;min-width:0;border:1px solid #c5d5e4;border-radius:10px;padding:11px;font-size:12px}.cpc-root button{cursor:pointer}.cpc-ask button,.cpc-drawer form button[type=submit],#cpcGuideResult button{border:0;background:#154f78;color:white;border-radius:10px;padding:11px 14px;font-weight:850}.cpc-footnote{font-size:10px;color:#718093}.cpc-skills{display:grid;grid-template-columns:1fr 1fr;gap:9px}.cpc-skill{background:#f6faff;border:1px solid #d9e7f3;border-radius:12px;padding:13px;text-align:left;display:flex;flex-direction:column;gap:6px}.cpc-skill:hover{background:#e9f5ff;border-color:#91c6ea}.cpc-skill b{color:#1a4a70;font-size:12px}.cpc-skill small{color:#667c8e;font-size:11px;line-height:1.4}.cpc-skill span{font-size:9px;color:#256b8e;text-transform:uppercase;font-weight:850}.cpc-drawer{margin-top:16px}.cpc-drawer form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cpc-drawer label{font-size:12px;font-weight:700;display:flex;flex-direction:column;gap:6px}.cpc-drawer label:nth-child(3),.cpc-drawer form>div{grid-column:1/-1}.cpc-drawer select,.cpc-drawer input,.cpc-drawer textarea{border:1px solid #c5d5e4;border-radius:9px;padding:9px;font:inherit}.cpc-drawer textarea{min-height:60px}.cpc-drawer form>div{display:flex;gap:10px}.cpc-guides{display:flex;gap:7px;flex-wrap:wrap}.cpc-guides button{padding:8px;border:1px solid #cbd5e1;background:#eef5fa;border-radius:9px;font-size:11px}.cpc-drawer ol li{margin-bottom:8px;font-size:13px}.cpc-drawer #cpcGuideResult{margin-top:16px}.cpc-drawer #cpcCancel{border:1px solid #bdcbd6;background:#f8fafc;color:#334155;border-radius:9px;padding:8px 12px}@media(max-width:1000px){.cpc-main{grid-template-columns:1fr}.cpc-hero{flex-direction:column;align-items:flex-start}}@media(max-width:650px){.cpc-skills{grid-template-columns:1fr}.cpc-drawer form{grid-template-columns:1fr}.cpc-ask{flex-direction:column}}';}
function mount(){
if(started||!document.querySelector(".main-nav")||!document.querySelector(".main-content"))return;
const root=document.createElement("div");root.innerHTML=html();document.querySelector(".main-content").appendChild(root.firstElementChild);
const style=document.createElement("style");style.id="cpc-style";style.textContent=css();document.head.appendChild(style);
const nav=document.createElement("button");nav.type="button";nav.className="nav-button";nav.dataset.module=MODULE;nav.innerHTML='<span class="nav-icon">✧</span><span class="nav-copy"><strong>Copiloto IA V2</strong><small>Aprende y ejecuta</small></span>';
const old=document.querySelector('.main-nav [data-module="ai"]');if(old)old.insertAdjacentElement("afterend",nav);else document.querySelector(".main-nav").appendChild(nav);
const originalCan=canAccess;canAccess=function(m){return m===MODULE?!!user():originalCan(m);};
const originalOpen=openModule;openModule=function(m){const out=originalOpen(m);if(m===MODULE&&user()){const title=byId("topbarModuleTitle"),sub=byId("topbarModuleSubtitle");if(title)title.textContent="Copiloto empresarial";if(sub)sub.textContent="Habilidades, aprendizaje y acciones autorizadas";}return out;};
nav.addEventListener("click",()=>openModule(MODULE));
byId("cpcAskForm").addEventListener("submit",e=>{e.preventDefault();const input=byId("cpcPrompt"),q=input.value;input.value="";ask(q);});
byId("cpcFollowupForm").addEventListener("submit",followup);
byId("cpcCancel").addEventListener("click",()=>byId("cpcFollowup").classList.add("hidden"));
document.querySelector("#module-copiloto").addEventListener("click",e=>{
const s=e.target.closest("[data-cpc-skill]");if(s){doSkill(s.dataset.cpcSkill);return;}
const g=e.target.closest("[data-cpc-guide]");if(g){guide(g.dataset.cpcGuide);return;}
const v=e.target.closest("[data-cpc-nav]");if(v&&can(v.dataset.cpcNav))openModule(v.dataset.cpcNav);
});
transcript=[{role:"assistant",text:"Hola. Soy el Copiloto de Corpartes. Puedo revisar pedidos, inventario y CRM; enseñarte a usar los módulos; exportar prospectos y programar una gestión comercial autorizada. La IA generativa se activará al configurar el servidor seguro."}];
renderMessages();started=true;
}
window.CorpartesCopiloto={ask:ask,context:context,skills:SKILLS.map(s=>s.id),guides:GUIDES.map(g=>g.id)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();