/* CORPARTES OS · AUTOMATION STUDIO V7
   Taller de automatización. Flujo 100 % SIMULADO, sin APIs externas ni escritura
   en registros ERP. Demo voluntaria; los números de guía son ficticios. */
(function(){
"use strict";
var mounted=false, sequence=0, selected=null, jobs=[], activity=[];
var catalog=[
  {id:"shopify",icon:"🛒",label:"Shopify → despacho",step:"Pedido validado → inventario/fabricación → guía → seguimiento",group:"E-commerce",status:"Simulación interactiva"},
  {id:"prospect",icon:"🎯",label:"Atlas + Apollo + Hunter",step:"Prospecto → verificación → segmento → tarea → secuencia aprobada",group:"Ventas",status:"Diseño pendiente de APIs"},
  {id:"quoting",icon:"📐",label:"Plano → cotización",step:"PDF/DXF → materiales → procesos → costos → aprobación",group:"Cotizaciones",status:"Diseño pendiente de motor"},
  {id:"stock",icon:"📦",label:"Inventario → compras",step:"Mínimos → requisición → cotizar → autorizar OC → recibir",group:"Suministros",status:"Diseño de integración"},
  {id:"factory",icon:"🏭",label:"Pedido → planta",step:"Pedido confirmado → programación → operarios → calidad",group:"Producción",status:"Conectar al ESS"},
  {id:"quality",icon:"🔍",label:"No conformidad → reproceso",step:"Rechazo → responsable → lote → seguimiento → costo",group:"Calidad",status:"Diseño pendiente"},
  {id:"finance",icon:"🧾",label:"Entrega → contabilidad/DIAN",step:"Remisión → documentos soporte → asiento → conciliación",group:"Finanzas",status:"Requiere proveedor habilitado"},
  {id:"collections",icon:"💬",label:"Cartera → seguimiento",step:"Vencimiento → priorización → borrador → aprobación → contacto",group:"Finanzas",status:"Diseño pendiente"},
  {id:"service",icon:"🛠",label:"Mantenimiento inteligente",step:"Horas de equipo → mantenimiento → reserva → paro → alerta",group:"Operación",status:"Diseño pendiente"},
  {id:"reputation",icon:"⭐",label:"Entrega → postventa",step:"Entregado → satisfacción → reclamo → gestión CRM",group:"Clientes",status:"Diseño pendiente"}
];
function $(id){return document.getElementById(id);}
function h(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&quot;","'":"&#39;"}[c];});}
function format(v){return new Intl.NumberFormat("es-CO").format(v);}
function record(job,icon,label,detail){
 var x={id:"EVT-"+(++sequence),date:new Date().toISOString(),type:icon,title:label,detail:detail};
 if(job){job.events.push(x);job.updatedAt=x.date;}activity.unshift(Object.assign({order:job?job.reference:"Sistema"},x));activity=activity.slice(0,90);
}
function create(data){
 var city=String(data.city||"").trim(),sku=String(data.sku||"").trim(),name=String(data.customer||"").trim();
 var qty=Math.max(1,Math.min(1000,Number(data.quantity)||1)),requiresProduction=Boolean(data.production);
 if(!city||!sku||!name)throw Error("Completa cliente, ciudad y referencia SKU.");
 var number=String(jobs.length+1).padStart(3,"0"),ref="SHP-DEMO-"+number;
 var order={id:ref,reference:ref,customer:name,city:city,sku:sku,qty:qty,requiresProduction:requiresProduction,
  paid:!!data.paid,stockConfirmed:!requiresProduction?!!data.stockConfirmed:false,
  produced:false,stage:"nuevo",carrier:"",tracking:"",approval:false,events:[],createdAt:new Date().toISOString()};
 record(order,"shopify","Pedido Shopify simulado","Pedido de demostración "+ref+" ingresado. No existe en Shopify.");
 jobs.unshift(order);selected=order.id;return order;
}
function chosen(){return jobs.find(function(j){return j.id===selected;})||null;}
function evaluate(job){
 if(!job)throw Error("Selecciona un pedido.");
 if(!job.paid)throw Error("El pedido no tiene el pago confirmado: no puede despacharse.");
 if(!job.city||!job.sku||!job.customer)throw Error("La dirección, el cliente o la referencia están incompletos.");
 if(job.requiresProduction&&!job.produced)throw Error("Este artículo se fabrica bajo pedido. Debe terminar producción antes de programar el envío.");
 if(!job.stockConfirmed)throw Error("Falta confirmar existencias y reserva del artículo antes de despachar.");
 if(job.stage==="guiado"||job.stage==="sincronizado")throw Error("Esta orden ya tiene guía de ejemplo; no dupliques el envío.");
 job.stage="validado";record(job,"check","Pedido prevalidado","Pago, datos y disponibilidad declarados correctos (sólo demostración).");
 return job;
}
function production(job){
 if(!job||!job.requiresProduction)throw Error("Esta orden no requiere fabricación.");
 if(!job.paid)throw Error("Primero confirma el pago del pedido.");
 job.produced=true;job.stockConfirmed=true;record(job,"factory","Fabricación simulada completada","Producción, calidad y disponibilidad marcadas como completadas únicamente en el simulador.");
}
function requestApproval(job,carrier){
 if(!job||job.stage!=="validado")throw Error("Primero prevalidar pago, referencia y disponibilidad.");
 if(!carrier)throw Error("Selecciona una transportadora.");
 job.carrier=carrier;job.stage="aprobacion";record(job,"request","Solicitud de autorización","Se preparó un despacho con "+carrier+". No se contactó a ninguna transportadora.");
}
function approve(job){
 if(!job||job.stage!=="aprobacion")throw Error("No hay un despacho pendiente de autorización.");
 job.approval=true;job.stage="aprobado";record(job,"approved","Despacho aprobado","Confirmación de prueba. No se generó etiqueta ni guía real.");
}
function guide(job){
 if(!job||job.stage!=="aprobado"||!job.approval)throw Error("Falta la aprobación del despacho.");
 job.tracking="DEMO-CO-"+job.reference.slice(-3).padStart(5,"0");
 job.stage="guiado";record(job,"truck","Guía ficticia creada",job.tracking+" · "+job.carrier+". NO válida para transportar paquetes.");
 return job.tracking;
}
function synchronize(job){
 if(!job||job.stage!=="guiado")throw Error("Primero necesitas una guía de demostración.");
 job.stage="sincronizado";record(job,"shopify","Sincronización simulada","Se preparó el tracking para Shopify sin hacer llamadas a la API ni notificar clientes.");
}
function status(j){
 return {"nuevo":"Nuevo · Sin validar","validado":"Listo para despacho","aprobacion":"Requiere aprobación","aprobado":"Despacho autorizado","guiado":"Guía DEMO emitida","sincronizado":"Seguimiento simulado"}[j.stage]||j.stage;
}
function controls(j){
 if(!j)return "";
 var state=j.stage;
 return '<div class="cp7-actions">'+
 (j.requiresProduction&&!j.produced?'<button type="button" data-cp7-step="production">Simular fabricación terminada</button>':"")+
 (state==="nuevo"?'<button type="button" data-cp7-step="evaluate">1. Prevalidar pedido</button>':"")+
 (state==="validado"?'<label>Transportadora simulada<select id="cp7Carrier"><option>Coordinadora</option><option>Servientrega</option><option>Envía</option><option>Operador propio</option></select></label><button type="button" data-cp7-step="request">2. Solicitar autorización</button>':"")+
 (state==="aprobacion"?'<button type="button" data-cp7-step="approve">3. Aprobar despacho DEMO</button>':"")+
 (state==="aprobado"?'<button type="button" data-cp7-step="guide">4. Crear guía ficticia</button>':"")+
 (state==="guiado"?'<button type="button" data-cp7-step="synchronize">5. Simular tracking Shopify</button>':"")+
 (state==="sincronizado"?'<span class="cp7-ok">Flujo simulado completo ✔</span>':"")+
 '</div>';
}
function render(){
 if(!mounted)return;
 var total=jobs.length, guides=jobs.filter(function(j){return !!j.tracking;}).length, pending=jobs.filter(function(j){return j.stage==="aprobacion";}).length;
 $("cp7Kpis").innerHTML=[["Pedidos en simulación",format(total)],["Guías DEMO",format(guides)],["Pendientes aprobación",format(pending)],["Eventos auditados",format(activity.length)]].map(function(x){return '<div class="cp7-kpi"><span>'+h(x[0])+'</span><strong>'+h(x[1])+'</strong></div>';}).join("");
 $("cp7Orders").innerHTML=jobs.map(function(j){
 return '<button type="button" class="cp7-order '+(selected===j.id?"sel":"")+'" data-cp7-select="'+h(j.id)+'"><span><strong>'+h(j.reference)+'</strong><small>'+h(j.customer+" · "+j.city)+'</small></span><em>'+h(status(j))+'</em></button>';
 }).join("")||'<div class="cp7-empty">No hay pedidos simulados. Crea uno con el formulario para probar el flujo.</div>';
 var j=chosen();
 $("cp7Detail").innerHTML=j?'<div class="cp7-order-head"><div><small>Pedido de prueba</small><h3>'+h(j.reference)+'</h3><p>'+h(j.customer+" · "+j.city+" · "+j.sku+" · "+j.qty+" unidad(es)")+'</p></div><span class="cp7-chip">'+h(status(j))+'</span></div>'+
 '<div class="cp7-route"><span>Shopify</span><b>→</b><span>'+(j.requiresProduction?"Fabricación":"Existencias")+'</span><b>→</b><span>Autorización</span><b>→</b><span>Guía</span><b>→</b><span>Tracking</span></div>'+
 '<div class="cp7-bits"><span>'+(j.paid?"✓":"×")+' Pago confirmado</span><span>'+(j.stockConfirmed?"✓":"×")+' Disponibilidad</span><span>'+(j.approval?"✓":"·")+' Aprobación</span><span>'+(j.tracking?"✓":"·")+' '+h(j.tracking||"Sin guía")+'</span></div>'+
 controls(j)+
 '<h4>Auditoría de este pedido</h4><div class="cp7-timeline">'+j.events.slice().reverse().map(function(a){return '<div class="cp7-event"><b>'+h(a.title)+'</b><p>'+h(a.detail)+'</p><small>'+h(new Date(a.date).toLocaleString("es-CO"))+'</small></div>';}).join("")+'</div>':
 '<div class="cp7-empty"><strong>Selecciona un pedido para ver su proceso.</strong><p>Todo ocurre en memoria. Ninguna acción real de Shopify o de transportadoras se ejecuta aquí.</p></div>';
 $("cp7Recent").innerHTML=activity.slice(0,9).map(function(a){return '<div class="cp7-log"><strong>'+h(a.title)+'</strong><span>'+h(a.order)+" · "+h(a.detail)+'</span></div>';}).join("")||'<p class="cp7-muted">Sin actividad de demostración.</p>';
 $("cp7Catalog").innerHTML=catalog.map(function(x){return '<article class="cp7-flow"><div class="cp7-flow-icon">'+h(x.icon)+'</div><div><strong>'+h(x.label)+'</strong><small>'+h(x.group)+'</small><p>'+h(x.step)+'</p><span>'+h(x.status)+'</span></div></article>';}).join("");
}
function download(){
 var snapshot=JSON.stringify({version:"CORPARTES_AUTOMATION_STUDIO_V7_DEMO",note:"SIMULACIÓN: sin documentos o números de guía reales",orders:jobs,events:activity},null,2);
 var u=URL.createObjectURL(new Blob([snapshot],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="corpartes_automatizaciones_demo.json";a.click();
 setTimeout(function(){URL.revokeObjectURL(u);},1000);
}
function styles(){return ".cp7{--ink:#123755;--edge:#e2e8ef;color:var(--ink);padding-bottom:45px}.cp7 *{box-sizing:border-box}.cp7-hero{background:linear-gradient(118deg,#092840 10%,#135e80 66%,#238ca4);padding:28px;border-radius:20px;color:white;margin:0 0 15px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.cp7-hero small{font-weight:900;letter-spacing:.12em;opacity:.76}.cp7-hero h2{font-size:28px;margin:10px 0}.cp7-hero p{font-size:13px;color:#e0f3fa;max-width:720px;line-height:1.5}.cp7-dry{border:1px solid #bddde1;background:#ffffff20;border-radius:999px;padding:9px 12px;white-space:nowrap;font-size:11px;font-weight:bold}.cp7-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 16px}.cp7-kpi{background:#fff;border:1px solid var(--edge);padding:15px 18px;border-radius:14px}.cp7-kpi span{display:block;font-size:11px;font-weight:750;color:#64748b}.cp7-kpi strong{display:block;font-size:29px;margin-top:8px;color:#184d74}.cp7-box{background:#fff;border:1px solid var(--edge);padding:19px;border-radius:15px;min-width:0}.cp7-box h3{margin:0 0 11px;font-size:17px}.cp7-box h4{font-size:12px;margin:20px 0 8px}.cp7-grid{display:grid;grid-template-columns:minmax(280px,0.85fr) minmax(0,1.65fr);gap:15px;margin-bottom:16px}.cp7-form{display:grid;grid-template-columns:1fr 1fr;gap:11px}.cp7-form label,.cp7-actions label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:750;color:#526579}.cp7-form input,.cp7-actions select{width:100%;border:1px solid #cddae5;border-radius:9px;min-height:39px;padding:9px;font:inherit}.cp7-form .cp7-wide{grid-column:span 2}.cp7-check{flex-direction:row!important;align-items:center;gap:7px!important}.cp7-check input{min-height:0;width:auto}.cp7 button{cursor:pointer}.cp7-primary,.cp7-actions button,.cp7-link{border:0;border-radius:9px;background:#135a84;color:#fff;padding:11px 13px;font-weight:bold}.cp7-actions button:hover,.cp7-primary:hover,.cp7-link:hover{background:#0a4264}.cp7-actions{display:flex;align-items:end;flex-wrap:wrap;gap:10px;margin:15px 0}.cp7-actions label{min-width:180px}.cp7-actions select{min-width:185px}.cp7-muted{font-size:12px;color:#64748b;line-height:1.5}.cp7-note{background:#eef7fd;border:1px solid #cde8f6;color:#245675;padding:13px 15px;border-radius:12px;margin:0 0 15px;font-size:12px;line-height:1.5}.cp7-orders{max-height:450px;overflow:auto}.cp7-order{display:flex;justify-content:space-between;gap:8px;width:100%;padding:13px 10px;border:0;background:#fff;border-bottom:1px solid #e7edf4;text-align:left;color:#194360}.cp7-order.sel{background:#ebf6fc}.cp7-order small{display:block;font-size:11px;color:#64748b;margin-top:5px}.cp7-order em{font-size:10px;white-space:nowrap;color:#235778;font-style:normal}.cp7-order-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.cp7-order-head h3{font-size:21px;margin:4px 0}.cp7-order-head small{color:#71849a}.cp7-order-head p{font-size:12px;color:#64748b}.cp7-chip{font-size:11px;border-radius:20px;padding:7px 10px;background:#dff4e8;color:#1b684a}.cp7-route{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:17px 0}.cp7-route span{padding:8px 9px;background:#edf5fa;border:1px solid #daeaf3;border-radius:8px;font-size:11px;font-weight:750}.cp7-route b{color:#95a6b8}.cp7-bits{display:flex;flex-wrap:wrap;gap:7px}.cp7-bits span{font-size:11px;background:#f4f7fa;border-radius:7px;padding:9px;color:#345775}.cp7-ok{padding:10px;color:#147b52;font-weight:800}.cp7-timeline{max-height:250px;overflow:auto;padding-left:12px;border-left:2px solid #c8e5f2}.cp7-event{margin:0 0 14px;padding-left:10px;position:relative}.cp7-event:before{content:' ';position:absolute;left:-17px;top:5px;width:8px;height:8px;border-radius:50%;background:#1980ad}.cp7-event b{font-size:12px}.cp7-event p{font-size:11px;color:#526a80;margin:5px 0}.cp7-event small{font-size:10px;color:#8ba0b2}.cp7-empty{padding:28px 9px;font-size:13px;color:#64748b;text-align:center}.cp7-bottom{display:grid;grid-template-columns:1.35fr 0.65fr;gap:15px}.cp7-flow-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.cp7-flow{display:flex;gap:9px;padding:12px;border:1px solid #e0eaf2;border-radius:12px;background:#fdfefe}.cp7-flow-icon{font-size:20px}.cp7-flow strong,.cp7-log strong{display:block;font-size:12px}.cp7-flow small{display:block;margin:3px 0;font-size:10px;color:#7188a0}.cp7-flow p{font-size:11px;line-height:1.45;color:#586e81}.cp7-flow span{font-size:10px;color:#2b658a}.cp7-log{padding:11px 0;border-bottom:1px solid #edf2f7}.cp7-log span{display:block;margin-top:4px;font-size:11px;color:#64748b;line-height:1.45}.cp7-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cp7-warning{font-size:11px;color:#8b5907;margin:10px 0}.cp7-hero .cp7-link{background:#ffffff18;border:1px solid #ffffff55}@media(max-width:1100px){.cp7-grid,.cp7-bottom{grid-template-columns:1fr}}@media(max-width:650px){.cp7-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.cp7-form,.cp7-flow-list{grid-template-columns:1fr}.cp7-form .cp7-wide{grid-column:span 1}.cp7-hero{flex-direction:column}}";}
function html(){
 return '<section id="module-automatizaciones" class="module cp7">'+
 '<div class="cp7-hero"><div><small>CORPARTES OS · OPERACIONES CONECTADAS</small><h2>Automation Studio</h2><p>Diseña flujos que unan ventas, fábrica, inventario, logística y finanzas. Prueba el recorrido Shopify → despacho → tracking sin impactar sistemas reales.</p></div><span class="cp7-dry">● ENTORNO DE SIMULACIÓN</span></div>'+
 '<div class="cp7-note"><b>Importante:</b> todavía no existe conexión autenticada a Shopify ni a transportadoras. No se envían pedidos, no se reservan inventarios, no se generan guías reales y no se transmiten facturas. Esta vista permite probar reglas, excepciones y aprobaciones antes de activar APIs.</div>'+
 '<div class="cp7-kpis" id="cp7Kpis"></div>'+
 '<div class="cp7-grid"><div class="cp7-box"><h3>1. Simular pedido entrante</h3><p class="cp7-muted">Crea un pedido ficticio para explorar qué ocurre cuando llega desde Shopify.</p>'+
 '<form id="cp7NewForm" class="cp7-form"><label>Cliente<input name="customer" maxlength="90" required value="Cliente industrial de prueba"></label><label>Ciudad de entrega<input name="city" maxlength="65" required value="Medellín"></label><label>SKU / referencia<input name="sku" maxlength="55" required value="BASE-MET-001"></label><label>Cantidad<input name="quantity" type="number" min="1" max="1000" value="2"></label><label class="cp7-check"><input type="checkbox" name="paid" checked>Pago confirmado (simulado)</label><label class="cp7-check"><input type="checkbox" name="stockConfirmed" checked>Disponibilidad confirmada (simulada)</label><label class="cp7-check cp7-wide"><input type="checkbox" name="production">Fabricación bajo pedido</label><button type="submit" class="cp7-primary cp7-wide">+ Recibir pedido de prueba</button></form>'+
 '<hr style="border:0;border-top:1px solid #e5edf5;margin:18px 0 12px"><h3>Pedidos de simulación</h3><div class="cp7-orders" id="cp7Orders"></div></div>'+
 '<div class="cp7-box" id="cp7Detail"></div></div>'+
 '<div class="cp7-bottom"><div class="cp7-box"><div class="cp7-row"><h3>2. Biblioteca de automatizaciones</h3><span class="cp7-muted">10 flujos diseñados</span></div><div class="cp7-flow-list" id="cp7Catalog"></div></div><div class="cp7-box"><div class="cp7-row"><h3>3. Trazabilidad</h3><button type="button" class="cp7-link" id="cp7Export">Exportar simulación</button></div><p class="cp7-muted">Cada transición deja evidencia del estado, aprobación y pasos realizados.</p><div id="cp7Recent"></div><p class="cp7-warning">Los registros sólo permanecen abiertos en esta pestaña. No son registros de transporte ni contabilidad.</p></div></div></section>';
}
function handleStep(step){
 var j=chosen();
 try{
 if(step==="production")production(j);
 if(step==="evaluate")evaluate(j);
 if(step==="request")requestApproval(j,$("cp7Carrier")?.value);
 if(step==="approve")approve(j);
 if(step==="guide")guide(j);
 if(step==="synchronize")synchronize(j);

 }catch(err){alert(err.message||String(err));}
 render();
}
function mount(){
 if(mounted||!document.querySelector(".main-nav")||!document.querySelector(".main-content")||typeof state==="undefined")return;
 var st=document.createElement("style");st.id="corpartesAutomationV7Styles";st.textContent=styles();document.head.appendChild(st);
 var root=document.createElement("div");root.innerHTML=html();document.querySelector(".main-content").appendChild(root.firstElementChild);
 var nav=document.createElement("button");nav.type="button";nav.className="nav-button";nav.dataset.module="automatizaciones";nav.innerHTML='<span class="nav-icon">⚡</span><span class="nav-copy"><strong>Automatizaciones</strong><small>Shopify · Guías · IA</small></span>';
 var conn=document.querySelector('.main-nav [data-module="conexiones"]');if(conn)conn.insertAdjacentElement("afterend",nav);else document.querySelector(".main-nav").appendChild(nav);
 nav.addEventListener("click",function(){openModule("automatizaciones");});
 var origCan=canAccess;canAccess=function(m){return m==="automatizaciones"?!!state.currentUser&&typeof isAdmin==="function"&&isAdmin():origCan(m);};
 var origOpen=openModule;openModule=function(m){var r=origOpen(m);if(m==="automatizaciones"){var title=$("topbarModuleTitle");if(title)title.textContent="Automation Studio";render();}return r;};
 var home=$("module-inicio");if(home){var top=document.createElement("div");top.className="cp7-note";top.innerHTML='<strong>⚡ NUEVO · Automation Studio</strong><p>Prueba el circuito de pedido Shopify → producción/inventario → transportadora → guía ficticia → tracking, con validaciones y aprobaciones.</p><button type="button" class="cp7-primary" id="cp7HomeOpen">Explorar automatizaciones</button>';home.insertBefore(top,home.firstChild);$("cp7HomeOpen").onclick=function(){openModule("automatizaciones");};}
 $("cp7NewForm").addEventListener("submit",function(ev){ev.preventDefault();var f=ev.target;try{var get=function(k){var el=f.elements.namedItem(k);return el.type==="checkbox"?el.checked:el.value;};create({customer:get("customer"),city:get("city"),sku:get("sku"),quantity:get("quantity"),paid:get("paid"),stockConfirmed:get("stockConfirmed"),production:get("production")});render();}catch(err){alert(err.message||String(err));}});
 $("cp7Orders").addEventListener("click",function(ev){var btn=ev.target.closest("[data-cp7-select]");if(!btn)return;selected=btn.dataset.cp7Select;render();});
 $("cp7Detail").addEventListener("click",function(ev){var btn=ev.target.closest("[data-cp7-step]");if(btn)handleStep(btn.dataset.cp7Step);});
 $("cp7Export").onclick=download;
 mounted=true;render();
 if(state.currentUser&&typeof configurePermissions==="function")configurePermissions();
}
window.CorpartesAutomationsV7={mount:mount,flowCatalog:catalog.slice(),createDemoOrder:create,evaluate:evaluate,production:production,requestApproval:requestApproval,approve:approve,createDemoGuide:guide,simulateTracking:synchronize,snapshot:function(){return JSON.parse(JSON.stringify(jobs));}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();