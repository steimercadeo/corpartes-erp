/* CORPARTES CRM V1 · sobre el ERP real de ESS. Sin integración Apollo automatizada aún. */
(function(){
"use strict";
const KEY="crmCompanies", STAGES=["Prospecto","Contactado","Calificado","Oportunidad","Cotización","Negociación","Cliente","Perdido"];
const SECTORS=["Metalmecánica","Exhibición comercial","Tableros eléctricos","Construcción","Mobiliario","Autopartes","Maquinaria","Otro"];
let started=false,editId="",stage="todos";
const $=id=>document.getElementById(id);
const str=v=>String(v===null||v===undefined?"":v);
const esc=v=>str(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=v=>str(v).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const today=()=>new Date().toISOString().slice(0,10);
const canCRM=()=>!!state.currentUser && (isAdmin() || (getRole()?.modules||[]).includes("crm"));
function rows(){if(!Array.isArray(state.data[KEY]))state.data[KEY]=[];return state.data[KEY];}
function allRows(){
  const real=rows(),names=new Map(),present=new Set(real.map(r=>norm(r.company)));
  (state.data.orders||[]).forEach(o=>{const name=str(o.client||o.customer||o.clientName).trim();if(name)names.set(norm(name),name);});
  (state.data.quotations||[]).forEach(o=>{const name=str(o.client||o.customer||o.clientName).trim();if(name)names.set(norm(name),name);});
  const derived=[...names.values()].filter(name=>!present.has(norm(name))).map(name=>({id:"erp:"+norm(name),company:name,stage:"Cliente",source:"Pedidos ERP",derived:true}));
  return real.concat(derived);
}
const select=(name,choices)=>'<select name="'+name+'">'+choices.map(x=>'<option value="'+esc(x)+'">'+esc(x||"Sin definir")+'</option>').join("")+'</select>';
const field=(name,label,type)=>'<label>'+esc(label)+'<input name="'+name+'" type="'+(type||"text")+'" '+(name==="company"?"required":"")+'></label>';
function markup(){
 return '<section id="module-crm" class="module">'+
  '<div class="crm-real-hero"><div><small>COMERCIAL · CORPARTES ERP</small><h2>CRM Comercial 360°</h2><p>Empresas, oportunidades, contactos y próximas gestiones, usando los clientes ya existentes en Pedidos.</p></div><button id="crmRealAdd" type="button">＋ Nueva empresa</button></div>'+
  '<div class="crm-real-kpis" id="crmRealKpis"></div>'+
  '<div class="crm-real-card"><h3>Conectividad comercial</h3><p>El CRM conserva clientes reales del ERP y permite registrar prospectos. <b>Apollo y Hunter aún no sincronizan automáticamente</b> con esta versión; las secuencias de correo y WhatsApp tampoco están activas. No se enviará ningún mensaje sin configuración.</p></div>'+
  '<div class="crm-real-card"><div class="crm-real-toolbar"><h3>Empresas y oportunidades</h3><input id="crmRealSearch" type="search" placeholder="Buscar empresa, sector, contacto..."></div><div id="crmRealStages" class="crm-real-stages"></div>'+
  '<div class="crm-real-scroll"><table><thead><tr><th>Empresa</th><th>Sector</th><th>Estado</th><th>Origen</th><th>Próxima gestión</th><th></th></tr></thead><tbody id="crmRealRows"></tbody></table></div><p id="crmRealCount"></p></div>'+
  '<div id="crmRealEditor" class="crm-real-card hidden"><h3 id="crmRealEditTitle">Nueva empresa</h3><form id="crmRealForm" class="crm-real-form">'+
   field("company","Empresa *")+ '<label>Sector'+select("sector",[""].concat(SECTORS))+'</label>'+
   '<label>Estado comercial'+select("stage",STAGES)+'</label>'+
   '<label>Fuente'+select("source",["Manual","Pedidos ERP","Apollo","Hunter","Correo","WhatsApp","Referido","Web","Otra"])+'</label>'+
   field("contact","Contacto principal")+field("email","Email","email")+field("phone","Teléfono","tel")+
   field("assigned","Responsable")+field("amount","Potencial (COP)","number")+field("nextDate","Próxima gestión","date")+
   '<label class="crm-real-wide">Observaciones<textarea name="notes" maxlength="2000"></textarea></label>'+
   '<div class="crm-real-actions"><button type="submit">Guardar ficha</button><button id="crmRealCancel" type="button">Cancelar</button><span id="crmRealError"></span></div></form></div></section>';
}
function css(){
 return '#module-crm{padding-bottom:45px}#module-crm .crm-real-hero{background:linear-gradient(130deg,#0b304f,#147a9f);color:#fff;border-radius:20px;display:flex;justify-content:space-between;gap:22px;padding:24px;margin-bottom:16px}'+
 '#module-crm .crm-real-hero small{letter-spacing:.15em;font-weight:900;font-size:11px;opacity:.7}#module-crm h2{margin:7px 0;font-size:29px}#module-crm .crm-real-hero p{font-size:13px;max-width:620px;line-height:1.5}'+
 '#module-crm .crm-real-hero button{border:1px solid #fff8;background:#ffffff22;color:#fff;border-radius:9px;padding:10px 12px;font-weight:900;align-self:flex-start;white-space:nowrap}'+
 '#module-crm .crm-real-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'+
 '#module-crm .crm-real-kpi,#module-crm .crm-real-card{background:white;border:1px solid #dde7ef;border-radius:15px;padding:17px;margin-bottom:16px}'+
 '#module-crm .crm-real-kpi span{display:block;color:#657789;font-size:12px;font-weight:800}#module-crm .crm-real-kpi strong{display:block;font-size:26px;color:#16446c;margin-top:7px}'+
 '#module-crm .crm-real-card h3{margin:0 0 8px;font-size:17px}#module-crm .crm-real-card p{font-size:12px;color:#617489;line-height:1.5}'+
 '#module-crm .crm-real-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}'+
 '#module-crm .crm-real-toolbar input{border:1px solid #cddbe7;border-radius:10px;padding:11px;min-width:230px}'+
 '#module-crm .crm-real-stages{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}#module-crm .crm-real-stages button{background:#eef5fb;border:1px solid #dae7ef;color:#22506b;padding:7px 9px;border-radius:9px;font-size:11px;font-weight:800}'+
 '#module-crm .crm-real-stages button.active{background:#155783;color:white}#module-crm .crm-real-scroll{max-height:490px;overflow:auto;border:1px solid #e2e8f0;border-radius:11px}'+
 '#module-crm table{min-width:850px;width:100%;border-collapse:collapse}#module-crm th{position:sticky;top:0;color:white;background:#154367;font-size:12px;text-align:left;padding:11px}'+
 '#module-crm td{padding:11px;border-bottom:1px solid #e5edf4;font-size:12px}#module-crm td small{display:block;color:#6a7b8c;margin-top:4px}'+
 '#module-crm td button{padding:6px 10px;background:#eaf5fc;color:#18577e;border:1px solid #c4dcea;border-radius:8px;font-weight:800}'+
 '#module-crm .crm-real-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}#module-crm .crm-real-form label{display:flex;flex-direction:column;gap:6px;font-size:11px;color:#475569;font-weight:900}'+
 '#module-crm .crm-real-form input,#module-crm .crm-real-form select,#module-crm .crm-real-form textarea{width:100%;min-height:40px;border:1px solid #cbd5e1;border-radius:9px;padding:9px;font-size:13px}'+
 '#module-crm .crm-real-wide,#module-crm .crm-real-actions{grid-column:1/-1}#module-crm textarea{min-height:75px}'+
 '#module-crm .crm-real-actions{display:flex;gap:9px;align-items:center}#module-crm .crm-real-actions button{background:#155d92;color:white;border:0;border-radius:9px;padding:10px 14px;font-weight:800}'+
 '#module-crm .crm-real-actions button+button{background:#e7eef6;color:#294862}#module-crm #crmRealError{color:#c32b44;font-size:12px}'+
 '@media(max-width:980px){#module-crm .crm-real-form{grid-template-columns:repeat(2,1fr)}#module-crm .crm-real-kpis{grid-template-columns:repeat(2,1fr)}}'+
 '@media(max-width:650px){#module-crm .crm-real-form{grid-template-columns:1fr}#module-crm .crm-real-hero{flex-direction:column}}';
}
function render(){
 if(!started||!canCRM())return;
 const a=allRows(),active=rows().filter(r=>["Oportunidad","Cotización","Negociación"].includes(r.stage)),due=rows().filter(r=>r.nextDate&&r.nextDate<=today());
 $("crmRealKpis").innerHTML=[["Empresas",a.length],["Prospectos",rows().filter(r=>r.stage!=="Cliente"&&r.stage!=="Perdido").length],["Oportunidades",active.length],["Gestiones pendientes",due.length]].map(x=>'<div class="crm-real-kpi"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join("");
 $("crmRealStages").innerHTML=["todos"].concat(STAGES).map(x=>'<button type="button" data-crm-stage="'+esc(x)+'" class="'+(stage===x?"active":"")+'">'+esc(x==="todos"?"Todos":x)+' <b>'+a.filter(r=>x==="todos"||r.stage===x).length+'</b></button>').join("");
 const query=norm($("crmRealSearch").value);
 const list=a.filter(r=>(stage==="todos"||r.stage===stage)&&(!query||norm([r.company,r.sector,r.contact,r.email].join(" ")).includes(query))).sort((p,q)=>str(p.company).localeCompare(str(q.company),"es"));
 $("crmRealRows").innerHTML=list.slice(0,120).map(r=>'<tr><td><strong>'+esc(r.company)+'</strong><small>'+esc(r.contact||"")+'</small></td><td>'+esc(r.sector||"Sin clasificar")+'</td><td>'+esc(r.stage||"Prospecto")+'</td><td>'+esc(r.source||"Manual")+'</td><td>'+esc(r.nextDate||"No programada")+'</td><td><button data-crm-edit="'+esc(r.id)+'">'+(r.derived?"Completar":"Editar")+'</button></td></tr>').join("")||'<tr><td colspan="6">No hay empresas para los filtros seleccionados.</td></tr>';
 $("crmRealCount").textContent=list.length>120?"Mostrando 120 de "+list.length+" empresas":"Mostrando "+list.length+" empresas";
}
function showForm(row){
 if(!canCRM())return;
 editId=row?.id||"";
 const form=$("crmRealForm");
 ["company","sector","stage","source","contact","email","phone","assigned","amount","nextDate","notes"].forEach(name=>{
  const input=form.elements.namedItem(name);
  if(input)input.value=row?.[name]??(name==="stage"?"Prospecto":name==="source"?"Manual":"");
 });
 $("crmRealEditTitle").textContent=row?"Editar ficha comercial":"Crear nueva ficha";
 $("crmRealError").textContent="";
 $("crmRealEditor").classList.remove("hidden");
 $("crmRealEditor").scrollIntoView({block:"nearest",behavior:"smooth"});
}
function save(e){
 e.preventDefault();if(!canCRM())return;
 const form=$("crmRealForm"),get=name=>str(form.elements.namedItem(name)?.value).trim();
 const company=get("company");if(company.length<2){$("crmRealError").textContent="Nombre de empresa requerido.";return;}
 const data=rows(),index=data.findIndex(r=>r.id===editId);
 if(data.some((r,i)=>i!==index&&norm(r.company)===norm(company))){$("crmRealError").textContent="Ya existe una ficha de esta empresa.";return;}
 const old=index<0?null:data[index];
 const obj={id:old?.id||("crm-"+Date.now()+"-"+Math.random().toString(36).slice(2,7)),company,
  sector:get("sector"),stage:get("stage"),source:get("source"),contact:get("contact"),email:get("email"),
  phone:get("phone"),assigned:get("assigned"),amount:Number(get("amount")||0),nextDate:get("nextDate"),
  notes:get("notes"),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 if(index<0)data.push(obj);else data[index]=obj;
 if(typeof saveData==="function")saveData();
 $("crmRealEditor").classList.add("hidden");editId="";render();
}
function mount(){
 if(started||!document.querySelector(".main-nav")||!document.querySelector(".main-content"))return;
 try{if(typeof CLOUD_META_KEYS!=="undefined"&&!CLOUD_META_KEYS.includes(KEY))CLOUD_META_KEYS.push(KEY);}catch(_){}
 if(state && state.data && !Array.isArray(state.data[KEY])) state.data[KEY]=[];
 const style=document.createElement("style");style.textContent=css();document.head.appendChild(style);
 const holder=document.createElement("div");holder.innerHTML=markup();
 document.querySelector(".main-content").appendChild(holder.firstElementChild);
 const b=document.createElement("button");b.className="nav-button economic-only";b.type="button";b.dataset.module="crm";
 b.innerHTML='<span class="nav-icon">◈</span><span class="nav-copy"><strong>CRM Comercial</strong><small>Prospectos y oportunidades</small></span>';
 const quote=document.querySelector('.main-nav [data-module="cotizaciones"]');
 if(quote)quote.insertAdjacentElement("afterend",b);else document.querySelector(".main-nav").appendChild(b);
 const access=canAccess;canAccess=function(m){return m==="crm"?canCRM():access(m);};
 const open=openModule;openModule=function(m){const result=open(m);if(m==="crm"&&canCRM()){
   if($("topbarModuleTitle"))$("topbarModuleTitle").textContent="CRM Comercial";
   if($("topbarModuleSubtitle"))$("topbarModuleSubtitle").textContent="Clientes, prospectos y oportunidades";
   render();
 }return result;};
 b.addEventListener("click",()=>openModule("crm"));
 $("crmRealAdd").addEventListener("click",()=>showForm(null));
 $("crmRealSearch").addEventListener("input",render);
 $("crmRealForm").addEventListener("submit",save);
 $("crmRealCancel").addEventListener("click",()=>$("crmRealEditor").classList.add("hidden"));
 $("crmRealStages").addEventListener("click",e=>{const x=e.target.closest("[data-crm-stage]");if(x){stage=x.dataset.crmStage;render();}});
 $("crmRealRows").addEventListener("click",e=>{const x=e.target.closest("[data-crm-edit]");if(x){
  const row=allRows().find(r=>r.id===x.dataset.crmEdit);if(row)showForm(row);
 }});
 const oldRender=renderAll;renderAll=function(){const result=oldRender.apply(this,arguments);if($("module-crm")?.classList.contains("active"))render();return result;};
 started=true;render();
}
window.CorpartesCRM={refresh:render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();