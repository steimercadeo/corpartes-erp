/* CORPARTES COPILOTO V2 · guía contextual, IA segura y primera acción auditada. */
(function(){
"use strict";
var installed=false, pending=null, busy=false;
var help={
  "pedidos":{name:"Pedidos",purpose:"Centraliza órdenes, referencias, cantidades, documentos y fechas.",steps:["Abre Pedidos y busca el cliente o la orden.","Expande la barra azul del ítem para revisar cantidades, planos y procesos.","Valida fecha de entrega, rutas habilitadas y observaciones antes de programar."],ask:"¿Qué pedidos necesitan atención?"},
  "remisiones":{name:"Remisiones",purpose:"Trazabilidad de entregas y documentos de salida.",steps:["Abre Remisiones y ajusta los filtros.","Revisa el pedido y las cantidades realmente terminadas.","Comprueba autorización, soporte y destino antes de emitir una remisión."],ask:"Explícame cómo controlar remisiones."},
  "produccion":{name:"Producción",purpose:"Operación por procesos, cantidades buenas, no conformes y avances.",steps:["Abre Producción y selecciona el pedido activo.","Registra únicamente cantidades comprobadas por el operario.","Revisa programación, punzonado, doblez, soldadura, pintura y entrega según la ruta de cada ítem."],ask:"¿Cómo va la producción?"},
  "seguimiento":{name:"Seguimiento",purpose:"Avance, riesgo y vencimientos por orden.",steps:["Abre Seguimiento y filtra por estado o cliente.","Contrasta avance real con promesa de entrega.","Revisa los ítems atrasados y deja nota de gestión si procede."],ask:"¿Qué pedidos están en riesgo?"},
  "lamina":{name:"Inventario de lámina",purpose:"Entradas, disponibilidad, mínimos y consumo asociado a programación.",steps:["Abre Lámina y revisa existencias por material y calibre.","Identifica referencias con mínimo crítico.","Valida las reservas y el descuento de materia prima antes de programar."],ask:"¿Qué láminas tienen poco inventario?"},
  "cotizaciones":{name:"Cotizaciones",purpose:"Preparación de ofertas a partir de materiales, rutas y costos.",steps:["Abre Cotizaciones y selecciona el cliente.","Comprueba material, medidas, tiempos, procesos, desperdicio y margen.","Solicita aprobación cuando la política de precios lo exija."],ask:"¿Qué revisar antes de cotizar?"},
  "crm":{name:"CRM Comercial",purpose:"Empresas, etapas de venta, contactos y próximas gestiones.",steps:["Abre CRM Comercial y filtra empresas por etapa o sector.","Completa contacto, potencial y próxima gestión.","Registra seguimiento; el envío de correo/WhatsApp requiere integraciones autorizadas."],ask:"¿Qué gestiones comerciales debo priorizar?"},
  "almacen":{name:"Almacén",purpose:"Movimientos, existencias y suministro de consumibles.",steps:["Abre Almacén.","Revisa saldos, movimientos y consumos.","Registra entradas o salidas solo con el soporte correspondiente."],ask:"Explícame el control de almacén."},
  "mantenimiento":{name:"Mantenimiento",purpose:"Máquinas, novedades, mantenimiento preventivo y correctivo.",steps:["Abre Mantenimiento.","Selecciona la máquina y revisa historial, pendientes y alertas.","Registra la intervención con responsable y fecha."],ask:"¿Cómo priorizar mantenimiento?"},
  "informes":{name:"Informes",purpose:"Indicadores de entregas, cumplimiento, carga y resultados.",steps:["Abre Informes y define año, mes y cliente.","Compara planificado, terminado y entregado.","Verifica filtros y origen de datos antes de tomar decisiones."],ask:"Explícame los informes de producción."},
  "administracion":{name:"Administración",purpose:"Usuarios, roles, seguridad y parámetros.",steps:["Abre Administración solo si tienes autorización.","Revisa perfiles y permisos por necesidad real.","Nunca compartas contraseñas ni concedas accesos genéricos."],ask:"¿Cómo gestionar permisos?"}
};
function $(id){return document.getElementById(id)}
function esc(x){return String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function currentUserReady(){return !!(window.ESS_AUTH?.auth?.currentUser&&typeof state!=="undefined"&&state.currentUser)}
function isOwner(){return currentUserReady() && typeof isAdmin==="function" && isAdmin()}
async function authToken(){
  if(!currentUserReady())throw new Error("Debes iniciar sesión en Firebase CORPARTES.");
  return window.ESS_AUTH.auth.currentUser.getIdToken();
}
async function callApi(path,body){
  var token=await authToken();
  var res=await fetch(path,{method:body?"POST":"GET",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    ...(body?{body:JSON.stringify(body)}:{})});
  var data={};
  try{data=await res.json()}catch(_e){}
  if(!res.ok)throw new Error(data.error||"Servicio no disponible.");
  return data;
}
function status(text,ok){
  const el=$("cp2Status");if(!el)return;
  el.textContent=text;el.className="cp2-status "+(ok?"success":"warn");
}
function feedback(text,ok){
  const el=$("cp2TaskStatus");if(!el)return;
  el.textContent=text;el.className="cp2-task-status "+(ok?"success":"warn");
}
function guide(){
  const key=$("cp2Module")?.value||"pedidos",g=help[key];if(!g)return;
  $("cp2Guide").innerHTML='<h4>'+esc(g.name)+'</h4><p>'+esc(g.purpose)+'</p><ol>'+
    g.steps.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol>';
  const b=$("cp2OpenModule");
  b.disabled=typeof canAccess==="function"&&!canAccess(key);
  b.textContent=b.disabled?"Sin permiso para abrir":"Abrir "+g.name;
}
function navigate(){
  const key=$("cp2Module").value;
  if(typeof canAccess==="function"&&!canAccess(key)){status("Tu rol no tiene acceso a ese módulo.",false);return;}
  if(typeof openModule==="function")openModule(key);
}
function suggestQuestion(){
  const key=$("cp2Module")?.value||"pedidos";
  if(typeof window.CorpartesAI?.ask==="function"){
    window.CorpartesAI.ask(help[key].ask);
    if(typeof openModule==="function")openModule("ai");
  }
}
async function askReal(question){
  const q=String(question||"").trim();
  const key=q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const isCommand=!/^(como|que|cual|cuando|explicame|ayudame|por que|dime)/.test(key) &&
    /\b(crea|crear|agenda|agendar|programa|programar|registra|registrar|anota|hazme)\b/.test(key) &&
    /\b(seguimiento|gestion|tarea|llamada|contacto)\b/.test(key);
  if(isCommand){
    const planned=await callApi("/api/plan",{instruction:q});
    if(planned.kind==="clarification")return "Aún no se creó nada. "+planned.message;
    if(planned.kind==="proposal"&&planned.proposal){
      if(typeof openModule==="function")openModule("ai");
      const a=planned.proposal;
      $("cp2Company").value=a.company;
      $("cp2Subject").value=a.subject;
      $("cp2Due").value=a.dueDate;
      $("cp2Note").value=a.note||"";
      taskPreview({preventDefault:function(){}});
      if(!pending)return "La propuesta se pudo preparar, pero no cumple los controles de la interfaz. No se guardó nada.";
      $("cp2Pending").scrollIntoView({behavior:"smooth",block:"nearest"});
      return "He preparado un borrador de seguimiento comercial para "+a.company+" ("+a.dueDate+"). No se ha ejecutado todavía. Revisa el recuadro «Nueva gestión comercial» y pulsa «Confirmar y crear gestión» sólo si todo está correcto.";
    }
    return "No pude preparar una acción segura. No se ejecutó ningún cambio.";
  }
  const out=await callApi("/api/assistant",{question:q});
  return out.answer+"\n\n[IA conectada · muestra limitada de datos del servidor. Solo lectura.]";
}
function taskPreview(ev){
  ev.preventDefault();
  if(busy)return;
  const company=$("cp2Company").value.trim(),subject=$("cp2Subject").value.trim(),
    dueDate=$("cp2Due").value,note=$("cp2Note").value.trim();
  if(company.length<2||subject.length<4||!dueDate){feedback("Completa empresa, actividad y fecha.",false);return;}
  if(!isOwner()){feedback("Solo el propietario puede crear gestiones desde el copiloto por ahora.",false);return;}
  const dt=new Date(dueDate+"T12:00:00Z");let today=new Date();today.setUTCHours(0,0,0,0);
  if(!Number.isFinite(dt.getTime())||dt.getTime()<today.getTime()){feedback("Selecciona una fecha válida desde hoy.",false);return;}
  const id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
    "cp2-"+Date.now()+"-"+Math.random().toString(36).slice(2,15);
  pending={action:"create_followup",requestId:id,company,subject,dueDate,note};
  $("cp2Pending").innerHTML='<strong>Revisión previa (todavía no se ha guardado)</strong><p>Empresa: '+esc(company)+
    '<br>Actividad: '+esc(subject)+'<br>Fecha: '+esc(dueDate)+
    (note?'<br>Nota: '+esc(note):"")+'</p>'+
    '<button type="button" id="cp2Confirm">Confirmar y crear gestión</button> '+
    '<button type="button" id="cp2Cancel">Cancelar</button>';
  $("cp2Pending").hidden=false;
  $("cp2Confirm").addEventListener("click",confirmTask);
  $("cp2Cancel").addEventListener("click",()=>{pending=null;$("cp2Pending").hidden=true;feedback("Creación cancelada. No se guardó nada.",true);});
  feedback("Revisa la información. El servidor solo ejecuta tras tu confirmación.",true);
}
async function confirmTask(){
  if(!pending||busy)return;
  busy=true;
  const button=$("cp2Confirm");if(button)button.disabled=true;
  try{
    const answer=await callApi("/api/actions",{...pending,confirmed:true});
    feedback(answer.alreadyExists?"Esta gestión ya se había registrado.":"Gestión comercial creada y auditada en Firebase CORPARTES.",true);
    pending=null;$("cp2Pending").hidden=true;$("cp2TaskForm").reset();
    await refreshTasks();
  }catch(err){
    feedback(err.message||"No se pudo registrar la gestión.",false);
    if(button)button.disabled=false;
  }finally{busy=false;}
}
async function refreshTasks(){
  const container=$("cp2Tasks");if(!container)return;
  container.textContent="Consultando gestiones...";
  try{
    const res=await callApi("/api/actions");
    container.innerHTML=res.tasks.length?res.tasks.map(t=>'<div class="cp2-task"><b>'+esc(t.company)+
      '</b> · '+esc(t.subject)+'<small>'+esc(t.dueDate)+' · '+esc(t.status)+'</small></div>').join(""):
      '<p>Sin seguimientos registrados por el copiloto.</p>';
    status("Servidor seguro conectado · acciones auditadas",true);
  }catch(err){
    container.textContent="No se pudieron consultar las gestiones: "+err.message;
    status("Integraciones privadas pendientes: "+err.message,false);
  }
}
function markup(){
return '<section class="cp2-shell"><header class="cp2-head"><div><small>PRODUCTIVIDAD · COPILOTO V2</small>'+
  '<h3>Pregunta. Aprende. Ejecuta con control.</h3><p>IA sobre datos reales, ayuda de cada módulo y primeras acciones autorizadas. Sin claves en el navegador.</p></div>'+
  '<span id="cp2Status" class="cp2-status warn">Esperando Firebase CORPARTES</span></header>'+
  '<div class="cp2-columns"><div class="cp2-panel"><h4>Guía de uso contextual</h4><p>Elige qué necesitas aprender y abre el módulo sin buscar tutoriales.</p>'+
  '<label for="cp2Module">Módulo del ERP</label><select id="cp2Module">'+Object.entries(help).map(([k,v])=>
    '<option value="'+esc(k)+'">'+esc(v.name)+'</option>').join("")+'</select>'+
  '<div class="cp2-guide" id="cp2Guide"></div><div class="cp2-actions"><button type="button" id="cp2OpenModule">Abrir módulo</button>'+
  '<button type="button" id="cp2Explain">Preguntar a la IA</button></div></div>'+
  '<div class="cp2-panel"><div class="cp2-panel-title"><h4>Nueva gestión comercial</h4><span>Acción con aprobación</span></div>'+
  '<p>Registra un seguimiento. Primero revisas el resumen y después confirmas.</p>'+
  '<form id="cp2TaskForm"><label>Empresa<input id="cp2Company" maxlength="120" required placeholder="Empresa o prospecto"></label>'+
  '<label>Actividad<input id="cp2Subject" maxlength="200" required placeholder="Llamar para seguimiento de cotización"></label>'+
  '<label>Fecha<input id="cp2Due" type="date" required></label>'+
  '<label>Nota opcional<textarea id="cp2Note" maxlength="500" rows="2" placeholder="Objetivo y contexto"></textarea></label>'+
  '<button type="submit">Revisar antes de guardar</button></form>'+
  '<div id="cp2Pending" class="cp2-pending" hidden></div><div id="cp2TaskStatus" class="cp2-task-status"></div>'+
  '<div class="cp2-latest"><div class="cp2-panel-title"><h4>Gestiones recientes</h4><button id="cp2Reload" type="button">Actualizar</button></div>'+
  '<div id="cp2Tasks"><p>Inicia sesión para consultarlas.</p></div></div></div></div>'+
  '<p class="cp2-disclaimer">La IA conversacional es de solo lectura. Las gestiones son acciones separadas que requieren confirmación, permisos, registro de auditoría y servidor conectado. Puedes escribir «Crea un seguimiento para HMV mañana: llamar por la cotización» en el chat de IA; la propuesta requerirá confirmación. Contabilidad, DIAN y envíos de correo/WhatsApp no están habilitados todavía.</p></section>';
}
function styles(){
return '.cp2-shell{margin:16px 0 24px;border-radius:19px;padding:17px;background:#eef5fc;border:1px solid #c8dceb}'+
'.cp2-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:16px}.cp2-head small{color:#28759c;letter-spacing:.13em;font-weight:900}'+
'.cp2-head h3{font-size:22px;margin:5px 0 7px;color:#0f3557}.cp2-head p,.cp2-panel p{margin:0 0 12px;font-size:12px;color:#57697e;line-height:1.5}'+
'.cp2-status{font-size:11px;border-radius:10px;padding:9px;max-width:275px}.cp2-status.success,.cp2-task-status.success{color:#166534;background:#dcfce7}.cp2-status.warn,.cp2-task-status.warn{color:#854d0e;background:#fef3c7}'+
'.cp2-columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}.cp2-panel{padding:17px;background:#fff;border:1px solid #dce7f0;border-radius:14px;min-width:0}'+
'.cp2-panel h4{margin:0 0 9px;font-size:17px;color:#14385f}.cp2-panel label{display:flex;flex-direction:column;font-size:11px;font-weight:850;color:#52647c;gap:6px;margin-bottom:10px}'+
'.cp2-panel input,.cp2-panel select,.cp2-panel textarea{width:100%;border:1px solid #c8d6e3;border-radius:9px;min-height:37px;padding:8px;color:#173a52;background:#fff;font-size:13px}'+
'.cp2-guide{min-height:167px;padding:12px;background:#f6faff;border-radius:11px;margin:12px 0}.cp2-guide h4{font-size:14px}.cp2-guide ol{padding-left:19px;font-size:12px;line-height:1.65;color:#425b71}'+
'.cp2-actions{display:flex;gap:8px;flex-wrap:wrap}.cp2-shell button{background:#175b86;color:white;padding:9px 12px;border:0;border-radius:9px;font-weight:850;font-size:12px;cursor:pointer}'+
'.cp2-shell button:disabled{opacity:.45;cursor:not-allowed}.cp2-actions button+button{background:#e6f2ff;color:#134d76}.cp2-panel-title{display:flex;align-items:center;justify-content:space-between;gap:10px}'+
'.cp2-panel-title span{color:#1d6e96;font-size:10px;text-align:right;font-weight:900}.cp2-pending{margin-top:10px;padding:12px;border:1px solid #78abd1;border-radius:11px;background:#eaf5ff;font-size:12px}'+
'.cp2-pending p{margin:8px 0}.cp2-pending button+button{background:#e1e9f2;color:#345}.cp2-task-status{margin-top:10px;border-radius:8px;padding:8px;font-size:11px}'+
'.cp2-task-status:empty{display:none}.cp2-latest{margin-top:14px;border-top:1px solid #e6ebf2;padding-top:12px}.cp2-latest .cp2-panel-title h4{font-size:14px}.cp2-latest .cp2-panel-title button{background:#e6f2ff;color:#134d76}'+
'#cp2Tasks{max-height:148px;overflow-y:auto;margin-top:10px}.cp2-task{padding:8px 3px;border-bottom:1px solid #e5e9ef;font-size:12px}.cp2-task small{display:block;color:#64748b;margin-top:3px}'+
'.cp2-disclaimer{font-size:11px;line-height:1.5;color:#56677e;margin:14px 0 0}@media(max-width:870px){.cp2-columns{grid-template-columns:1fr}.cp2-head{flex-direction:column;align-items:flex-start}}';
}
function mount(){
  if(installed)return;
  const root=$("module-ai");if(!root)return;
  let node=document.createElement("div");node.innerHTML=markup();
  const tabs=root.querySelector(".cpai-tabs");
  if(tabs)root.insertBefore(node.firstElementChild,tabs);else root.appendChild(node.firstElementChild);
  const css=document.createElement("style");css.id="cp2-styles";css.textContent=styles();document.head.appendChild(css);
  $("cp2Module").addEventListener("change",guide);
  $("cp2OpenModule").addEventListener("click",navigate);
  $("cp2Explain").addEventListener("click",suggestQuestion);
  $("cp2TaskForm").addEventListener("submit",taskPreview);
  $("cp2Reload").addEventListener("click",refreshTasks);
  const date=new Date();const str=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
  $("cp2Due").min=str;guide();installed=true;
  if(currentUserReady())refreshTasks();
}
window.CorpartesCopilot={askReal,mount,refreshTasks,help};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
