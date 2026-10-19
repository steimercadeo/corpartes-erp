
/* CORPARTES ERP · FINAL UX 2026-10-19 */
(function(){
"use strict";
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
let busy=false;

function enhanceReprocess(){
  const box=document.getElementById("reprocessProcessChecks"); if(!box)return;
  const field=box.closest(".field");
  if(field){
    field.classList.add("cp-reprocess-stage-box");
    const lab=[...field.children].find(x=>x.tagName==="LABEL");
    if(lab)lab.textContent="Etapas del reproceso";
    const small=[...field.children].find(x=>x.tagName==="SMALL");
    if(small)small.textContent="Selecciona una o varias etapas que necesita repetir esta pieza. El valor del reproceso se calcula una sola vez por pieza.";
  }
  box.querySelectorAll("label").forEach(card=>{
    const input=card.querySelector('input[type="checkbox"]'); if(!input)return;
    card.classList.toggle("cp-selected",input.checked);
    if(!input.dataset.cpFinalBound){
      input.dataset.cpFinalBound="1";
      input.addEventListener("change",()=>card.classList.toggle("cp-selected",input.checked));
    }
  });
}

function enhanceLibrary(){
  const body=document.getElementById("v801ProductsBody"); if(!body)return;
  const card=body.closest("article.card");
  if(card&&!card.querySelector(".cp-library-guide")){
    const g=document.createElement("div");g.className="cp-library-guide";
    g.innerHTML="<strong>Vista resumida por producto.</strong> Haz clic en un encabezado azul para desplegar sus ítems.";
    const filters=card.querySelector(".v801-filters"); (filters||card.firstElementChild)?.insertAdjacentElement("afterend",g);
  }
  body.querySelectorAll(".v801-product-group").forEach(group=>{
    const h=group.querySelector(".v801-product-group-header"),grid=group.querySelector(".v801-product-card-grid"); if(!h||!grid)return;
    if(!h.querySelector(".cp-library-chevron")){
      const c=document.createElement("span");c.className="cp-library-chevron";c.textContent="▾";c.setAttribute("aria-hidden","true");h.appendChild(c);
    }
    h.setAttribute("role","button");h.setAttribute("tabindex","0");
  });
}

function toggleLibrary(group){
  const body=document.getElementById("v801ProductsBody");if(!body)return;
  const open=!group.classList.contains("cp-open");
  body.querySelectorAll(".v801-product-group").forEach(g=>g.classList.remove("cp-open"));
  if(open)group.classList.add("cp-open");
}

function enhanceProductionSheet(){
  const box=document.getElementById("productionSheetConsumption"); if(!box||box.querySelector(".cp-sheet-guide"))return;
  const guide=document.createElement("div");guide.className="cp-sheet-guide";
  guide.innerHTML="<span><b>1</b> Material requerido</span><span><b>2</b> Lámina disponible</span><span><b>3</b> Cantidad a consumir</span><span><b>4</b> Confirmar consumo</span>";
  box.insertBefore(guide,box.firstElementChild?.nextSibling||box.firstChild);
}

function ensureReportLabels(){
  const mod=document.getElementById("module-informes"); if(!mod)return;
  mod.querySelectorAll("h3").forEach(h=>{
    if(/cartera de clientes/i.test(h.textContent||""))h.textContent="Ingresos por clientes";
  });
  if(!mod.querySelector(".cp-report-note")){
    const filters=mod.querySelector(".report-filters");
    if(filters){const n=document.createElement("div");n.className="cp-report-note";n.textContent="El cumplimiento operativo mensual se evalúa con la fecha de entrega pactada del pedido.";filters.insertAdjacentElement("afterend",n)}
  }
}

function installTrackingByDelivery(){
  if(window.__cpTrackingFinalInstalled||typeof window.trackingOrders!=="function"||typeof window.getTrackingFilters!=="function")return;
  window.__cpTrackingFinalInstalled=true;
  window.trackingOrders=function(){
    const f=getTrackingFilters();
    return state.data.orders.filter(o=>o.type==="Pedido").filter(o=>{
      if(!f.year)return true;
      const d=new Date(String(o.deliveryDate||"")+"T12:00:00");
      return !Number.isNaN(d.getTime())&&d.getFullYear()===f.year&&(f.month===-1||d.getMonth()===f.month);
    }).filter(o=>clientMatchesFilter(o.client,f.client))
      .filter(o=>!f.state||orderState(o)===f.state||complianceStatus(o)===f.state)
      .filter(o=>String(o.number+" "+o.client).toLowerCase().includes(f.q));
  };
}

function installDeliveryBlock(){
  const btn=document.getElementById("finishWorkButton"); if(!btn||btn.dataset.cpDeliveryBlock)return;
  btn.dataset.cpDeliveryBlock="1";
  btn.addEventListener("click",function(e){
    try{
      const work=state?.activeWork;if(!work||work.processId!==DELIVERY_PROCESS_ID)return;
      const order=getOrder(work.orderId);if(!order)return;
      const pending=distinctOrderProcesses(order)
        .filter(p=>p.id!==DELIVERY_PROCESS_ID)
        .map(p=>({p,info:orderProcessInfo(order,p.id)}))
        .filter(x=>Number(x.info?.pending||0)>0);
      if(!pending.length)return;
      e.preventDefault();e.stopImmediatePropagation();
      const msg=pending.map(x=>x.p.name+": "+Number(x.info.pending||0).toLocaleString("es-CO")+" pieza(s) pendientes").join("\n");
      alert("Entrega bloqueada. Hay procesos anteriores pendientes:\n\n"+msg+"\n\nCompleta o corrige esos procesos antes de registrar la entrega.");
      const pm=document.getElementById("productionMessage");if(pm){pm.textContent="Entrega bloqueada: existen piezas pendientes en procesos anteriores.";pm.classList.add("error")}
    }catch(_e){}
  },true);
}

function ensureRemissionFilters(){
  const toolbar=document.querySelector("#module-remisiones .v19-rem-toolbar");if(!toolbar)return;
  if(!document.getElementById("cpRemNumberFilter")){
    const f=document.createElement("div");f.className="v19-rem-field";
    f.innerHTML='<label>Número de remisión</label><input id="cpRemNumberFilter" placeholder="Ej. 1025" autocomplete="off">';
    toolbar.insertBefore(f,toolbar.firstChild);
    f.querySelector("input").addEventListener("input",()=>enhanceRemissions());
  }
  if(!document.getElementById("cpRemStatusFilter")){
    const f=document.createElement("div");f.className="v19-rem-field";
    f.innerHTML='<label>Estado soporte</label><select id="cpRemStatusFilter"><option value="">Todos</option><option value="ok">Con soporte</option><option value="pending">Pendiente soporte</option></select>';
    toolbar.insertBefore(f,document.getElementById("v19ClearFilters")||null);
    f.querySelector("select").addEventListener("change",()=>enhanceRemissions());
  }
  const clear=document.getElementById("v19ClearFilters");
  if(clear&&!clear.dataset.cpFinalBound){
    clear.dataset.cpFinalBound="1";
    clear.addEventListener("click",()=>{const n=document.getElementById("cpRemNumberFilter"),s=document.getElementById("cpRemStatusFilter");if(n)n.value="";if(s)s.value="";setTimeout(enhanceRemissions,0)});
  }
}

function remRecordByNumber(num){
  try{return (state?.data?.remissions||[]).find(r=>String(r.number||"").trim()===String(num||"").trim())||null}catch(_e){return null}
}
function remDetail(r,actions){
  const items=r.items||[];
  const rows=items.map((x,i)=>'<tr><td>'+(i+1)+'</td><td><strong>'+esc(x.code||x.reference||"-")+'</strong></td><td>'+esc(x.description||x.name||"-")+'</td><td>'+Number(x.qty||0).toLocaleString("es-CO")+'</td><td>'+esc(x.note||x.observation||x.color||"-")+'</td></tr>').join("")||'<tr><td colspan="5">Sin ítems registrados.</td></tr>';
  const units=items.reduce((s,x)=>s+Number(x.qty||0),0);
  return '<div class="cp-rem-detail-panel"><div><strong>Remisión '+esc(r.number||"-")+' · Pedido '+esc(r.orderNumber||"-")+'</strong><div class="cp-rem-meta"><span>'+esc(r.client||"-")+'</span><span>'+items.length+' ítem(s)</span><span>'+units.toLocaleString("es-CO")+' unidades</span><span>Creada por '+esc(r.createdByName||r.createdByCode||"-")+'</span></div></div><div class="cp-rem-items"><table><thead><tr><th>#</th><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Observación</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="cp-rem-actions">'+actions+'</div></div>';
}
function enhanceRemissions(){
  if(busy)return;
  const body=document.getElementById("v19HistoryBody");if(!body)return;
  busy=true;
  try{
    ensureRemissionFilters();
    const head=document.querySelector("#module-remisiones .v19-rem-table thead tr");
    if(head)head.innerHTML="<th>Remisión</th><th>Cliente</th><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Soporte</th><th>Detalle</th>";
    [...body.querySelectorAll("tr")].filter(x=>!x.classList.contains("cp-rem-detail-row")).forEach(row=>{
      if(row.querySelector(".v19-rem-empty")){row.querySelector("td")?.setAttribute("colspan","7");return}
      if(row.dataset.cpFinalRem==="1")return;
      const cells=[...row.children];if(cells.length<9)return;
      const number=cells[0]?.textContent?.trim()||"",r=remRecordByNumber(number);if(!r)return;
      const actions=cells[8]?.querySelector(".v19-rem-actions")?.innerHTML||"";
      const supported=!!r.receiptSupport?.id;
      row.dataset.cpFinalRem="1";row.dataset.cpRemNumber=String(r.number||"");
      row.innerHTML='<td><strong>'+esc(r.number||"-")+'</strong></td><td><strong>'+esc(r.client||"-")+'</strong></td><td>'+esc(r.orderNumber||"-")+'</td><td>'+esc(typeof v19FormatDate==="function"?v19FormatDate(r.date,false):String(r.date||"").slice(0,10))+'</td><td><span class="status-pill '+(supported?"status-done":"status-pending")+'">'+(supported?"Con soporte":"Pendiente")+'</span></td><td>'+(supported?"Firmado ✓":"Sin soporte")+'</td><td><button type="button" class="button secondary small" data-cp-rem-detail="'+esc(r.number||"")+'">Ver detalle</button></td>';
      const d=document.createElement("tr");d.className="cp-rem-detail-row hidden";d.dataset.cpRemDetail=String(r.number||"");d.innerHTML='<td colspan="7">'+remDetail(r,actions)+'</td>';row.after(d);
    });
    const num=String(document.getElementById("cpRemNumberFilter")?.value||"").trim().toLowerCase();
    const status=document.getElementById("cpRemStatusFilter")?.value||"";let visible=0;
    [...body.querySelectorAll("tr[data-cp-final-rem='1']")].forEach(row=>{
      const r=remRecordByNumber(row.dataset.cpRemNumber);let show=!!r;
      if(show&&num&&!String(r.number||"").toLowerCase().includes(num))show=false;
      if(show&&status==="ok"&&!r.receiptSupport?.id)show=false;
      if(show&&status==="pending"&&r.receiptSupport?.id)show=false;
      row.style.display=show?"":"none";const d=row.nextElementSibling?.classList.contains("cp-rem-detail-row")?row.nextElementSibling:null;if(d){if(!show)d.classList.add("hidden");d.style.display=show?"":"none"}if(show)visible++;
    });
    let c=document.querySelector("#module-remisiones .cp-rem-count");const wrap=document.querySelector("#module-remisiones .v19-rem-table-wrap");
    if(!c&&wrap){c=document.createElement("div");c.className="cp-rem-count";wrap.before(c)}
    if(c)c.textContent=visible+" remisión"+(visible===1?"":"es")+" visible"+(visible===1?"":"s");
  }finally{busy=false}
}
function installRemissionWrapper(){
  if(window.__cpRemWrapper||typeof window.v19RenderHistory!=="function")return;
  window.__cpRemWrapper=true;
  const original=window.v19RenderHistory;
  window.v19RenderHistory=function(){const out=original.apply(this,arguments);setTimeout(enhanceRemissions,0);return out};
}

function enhanceAll(){
  enhanceReprocess();enhanceLibrary();enhanceProductionSheet();ensureReportLabels();
  installTrackingByDelivery();installDeliveryBlock();installRemissionWrapper();
  if(document.getElementById("module-remisiones"))enhanceRemissions();
}

document.addEventListener("click",e=>{
  const h=e.target.closest("#orders-tab-biblioteca .v801-product-group-header");
  if(h&&!e.target.closest("input,button,.v801-group-order-controls")){e.preventDefault();toggleLibrary(h.closest(".v801-product-group"))}
  const b=e.target.closest("[data-cp-rem-detail]");
  if(b){
    const id=b.dataset.cpRemDetail,row=[...document.querySelectorAll("#v19HistoryBody .cp-rem-detail-row")].find(x=>x.dataset.cpRemDetail===id);if(!row)return;
    const open=row.classList.contains("hidden");document.querySelectorAll("#v19HistoryBody .cp-rem-detail-row").forEach(x=>x.classList.add("hidden"));document.querySelectorAll("[data-cp-rem-detail]").forEach(x=>x.textContent="Ver detalle");
    if(open){row.classList.remove("hidden");b.textContent="Ocultar detalle"}
  }
},true);

let timer=null;
const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhanceAll,80)});
function start(){enhanceAll();mo.observe(document.body,{childList:true,subtree:true});setTimeout(enhanceAll,500);setTimeout(enhanceAll,1500)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
