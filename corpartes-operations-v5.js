/* CORPARTES OPERACIONES V5 · 28-oct-2026
  Módulos operativos de revisión. Datos importados y registros nuevos se guardan
  EN MEMORIA DE ESTA PESTAÑA; no hay envíos, facturación ni escritura a Firebase. */
(function(){
"use strict";
var started=false, atlas=[], selectedId="", campaigns=[], shipments=[], fiscalReviewed=new Set();
var FISCAL=[
 {id:"politicas",name:"Políticas contables NIIF y grupo aplicable",detail:"Definir marco NIIF aplicable, plan de cuentas, reconocimiento, medición y revelaciones. Validación con contador y revisor fiscal, cuando aplique.",url:"https://www.ctcp.gov.co/"},
 {id:"factura",name:"Factura electrónica de venta y notas",detail:"Habilitación, numeración, validación previa, anexos técnicos, CUFE y eventos según el sistema DIAN. Sin emisión activa.",url:"https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/normatividad/"},
 {id:"soporte",name:"Documento soporte a no obligados a facturar",detail:"Numeración autorizada, CUDS y transmisión cuando proceda. Sin transmisión activa.",url:"https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documento-soporte-adquisiciones-no-obligados/"},
 {id:"nomina",name:"Nómina electrónica",detail:"Definir obligación, terceros, novedades y proveedor de documento soporte. Sin transmisión activa.",url:"https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/"},
 {id:"impuestos",name:"IVA, retenciones e impuestos locales",detail:"Parametrizar responsabilidades RUT, bases, tarifas, calendarios y conciliación fiscal; no presumir un régimen.",url:"https://www.dian.gov.co/"},
 {id:"conciliacion",name:"Bancos, soportes y conciliación",detail:"Comprobantes, facturas, recibos, conciliaciones bancarias, activos fijos y cierres contables.",url:"https://www.ctcp.gov.co/"},
 {id:"exogena",name:"Información exógena y reportes",detail:"Validar obligados, formatos y vencimientos de cada vigencia antes de generar reportes.",url:"https://www.dian.gov.co/"}
];
function e(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function n(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();}
function money(v){return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(v)||0);}
function byId(id){return document.getElementById(id);}
function csvCell(v){return '"'+String(v==null?"":v).replace(/"/g,'""')+'"';}
function line(items){return items.map(csvCell).join(",");}
function current(){try{return !!state.currentUser;}catch(_){return false;}}
function isDemo(){return window.__CORPARTES_OFFLINE_DEMO__===true;}
function head(sub,title,desc){return '<div class="ops5-head"><div><small>'+e(sub)+'</small><h2>'+e(title)+'</h2><p>'+e(desc)+'</p></div><span class="ops5-stage">DESARROLLO · SIN ENVÍOS</span></div>';}
function content(){
return '<section id="module-atlas" class="module ops5">'+head("ATLAS · CRM CORPARTES","Base comercial Atlas","Importa tu archivo Atlas privado sin subirlo a GitHub ni enviarlo a un servidor. Busca, filtra y revisa prospectos industriales.")+
'<div class="ops5-grid four" id="ops5AtlasKpis"></div><div class="ops5-card"><div class="ops5-tool"><label class="ops5-upload"><strong>Importar CRM Atlas .xlsx o .csv</strong><input type="file" id="ops5AtlasFile" accept=".xlsx,.xls,.csv"></label><button type="button" id="ops5AtlasExport">Exportar resultados CSV</button></div><p class="ops5-hint" id="ops5AtlasMessage">La base no está cargada en este navegador. Los datos permanecerán en memoria mientras esté abierta esta vista.</p></div>'+
'<div class="ops5-card"><div class="ops5-tool"><input id="ops5AtlasSearch" placeholder="Buscar empresa, municipio, sector u oportunidad"><select id="ops5AtlasSector"><option value="">Todos los sectores</option></select></div><div class="ops5-scroll"><table><thead><tr><th>Empresa / municipio</th><th>Sector</th><th>Potencial</th><th>Estado</th><th>Contacto</th><th></th></tr></thead><tbody id="ops5AtlasRows"></tbody></table></div><p class="ops5-hint" id="ops5AtlasCount"></p><div id="ops5AtlasDetail"></div></div>'+
'<div class="ops5-card"><strong>Atlas + Apollo + Hunter</strong><p class="ops5-hint">Atlas se consulta con su archivo original; Apollo y Hunter requieren conexión backend autenticada, permisos y reglas de exclusión. Ningún contacto se enviará a campañas automáticamente.</p></div></section>'+
'<section id="module-mercadeo" class="module ops5">'+head("GROWTH · CORPARTES","Mercadeo y campañas","Planificación de campañas industriales por sector, presupuesto, responsables y objetivos, vinculables después al CRM y a canales autorizados.")+
'<div class="ops5-grid four" id="ops5MarketingKpis"></div><div class="ops5-card"><h3>Crear campaña</h3><form id="ops5MarketingForm" class="ops5-form"><label>Campaña<input name="name" required maxlength="100" placeholder="Captación tableristas Medellín"></label><label>Sector<select name="sector"><option>Tableros eléctricos</option><option>Exhibición comercial</option><option>Construcción</option><option>Mobiliario</option><option>Autopartes</option><option>Metalmecánica</option><option>Otro</option></select></label><label>Canal<select name="channel"><option>Correo B2B</option><option>WhatsApp Business</option><option>LinkedIn</option><option>Google Ads</option><option>Instagram</option><option>TikTok</option><option>Visitas comerciales</option></select></label><label>Presupuesto COP<input name="budget" type="number" min="0" value="0"></label><label>Objetivo (reuniones o leads)<input name="goal" type="number" min="1" value="10"></label><label>Responsable<input name="owner" maxlength="80" placeholder="Equipo comercial"></label><button type="submit">Agregar plan</button></form><p class="ops5-hint">Se registran planes en memoria de la pestaña, sin gastar presupuesto ni enviar comunicaciones.</p></div><div class="ops5-card"><h3>Plan de campañas</h3><div class="ops5-scroll"><table><thead><tr><th>Campaña</th><th>Sector</th><th>Canal</th><th>Presupuesto</th><th>Meta</th><th>Estado</th></tr></thead><tbody id="ops5MarketingRows"></tbody></table></div></div></section>'+
'<section id="module-logistica" class="module ops5">'+head("ENTREGAS · TRANSPORTE","Logística y despachos","Control inicial de guías, transportadoras, fecha prometida y cumplimiento. No altera las remisiones existentes.")+
'<div class="ops5-grid four" id="ops5LogisticsKpis"></div><div class="ops5-card"><h3>Registrar despacho de revisión</h3><form id="ops5LogisticsForm" class="ops5-form"><label>Remisión / pedido<input name="reference" required placeholder="REM-0001"></label><label>Cliente<input name="client" required></label><label>Transportadora<input name="carrier" required placeholder="Transportador o ruta"></label><label>Fecha prometida<input name="date" type="date" required></label><label>Estado<select name="status"><option>Pendiente</option><option>En tránsito</option><option>Entregado</option><option>Novedad</option></select></label><label>Guía / referencia<input name="tracking" placeholder="Opcional"></label><button type="submit">Registrar despacho</button></form></div><div class="ops5-card"><h3>Tablero de entregas</h3><div class="ops5-scroll"><table><thead><tr><th>Referencia</th><th>Cliente</th><th>Transporte</th><th>Promesa</th><th>Estado</th><th>Guía</th></tr></thead><tbody id="ops5LogisticsRows"></tbody></table></div></div></section>'+
'<section id="module-fiscal" class="module ops5">'+head("COLOMBIA · NIIF · DIAN","Preparación contable y tributaria","Panel de implementación y controles. NO certifica cumplimiento normativo ni expide documentos a DIAN.")+
'<div class="ops5-grid four" id="ops5FiscalKpis"></div><div class="ops5-card"><h3>Matriz de implementación normativa</h3><p class="ops5-hint">Las verificaciones que marques son avances de revisión dentro de esta sesión, no constancias de habilitación ni certificados de cumplimiento.</p><div id="ops5FiscalRows"></div></div>'+
'<div class="ops5-card"><h3>Módulos relacionados</h3><div class="ops5-tool"><button type="button" data-ops5-open="contabilidad">Abrir contabilidad existente</button><button type="button" data-ops5-open="compras">Abrir compras existentes</button><button type="button" data-ops5-open="finanzas">Abrir finanzas</button></div><p class="ops5-hint">Para transmitir documentos electrónicos a DIAN se necesita parametrización validada y una integración con software habilitado o un proveedor tecnológico. No hay envío en esta versión.</p></div></section>'+
'<section id="module-conexiones" class="module ops5">'+head("INTEGRACIONES · CONECTIVIDAD","Centro de integraciones","Separa los conectores reales de ChatGPT de las conexiones que todavía faltan dentro del ERP.")+
'<div class="ops5-grid two">'+
integr("CRM Atlas (archivo)", "Importación privada dentro del ERP disponible", "Parcial", "")+
integr("Revenue OS / Atlas web", "CRM privado existente; todavía no comparte una base con este ERP", "Separado", "https://corpartes-crm-revenue.steimercadeo.chatgpt.site")+
integr("Shopify · E-commerce", "Conector webhook HMAC y recepción de revisión preparados, pero desactivados; la versión V7 permite simular pedidos.", "Backend preparado", "https://shopify.dev/docs/apps/build/webhooks")+
integr("Transportadoras · Guías", "Coordinadora, Servientrega y Envía presentes como opciones ficticias de V7. Sin credenciales ni generación real de guías.", "Pendiente", "")+
integr("Apollo.io", "Conector accesible en ChatGPT; aún no habilitado como integración del ERP", "Pendiente", "https://www.apollo.io/")+
integr("Hunter", "Conector accesible en ChatGPT; faltan credenciales del backend ERP y sincronización", "Pendiente", "https://hunter.io/")+
integr("Correo corporativo", "Sin envío automatizado ni sincronización IMAP/OAuth con este ERP", "Pendiente", "")+
integr("WhatsApp Business API", "Sin API oficial, consentimiento y webhooks conectados", "Pendiente", "")+
integr("DIAN", "Sin proveedor/API configurado ni habilitación certificada", "Pendiente", "https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/normatividad/")+
integr("Firebase para Atlas", "Migración a colecciones CRM con control transaccional y permisos pendiente", "Pendiente", "")+'</div></section>';
}
function integr(name,desc,status,url){return '<article class="ops5-card ops5-integration"><div><h3>'+e(name)+'</h3><p>'+e(desc)+'</p></div><div><span class="ops5-status">'+e(status)+'</span>'+(url?'<a href="'+e(url)+'" target="_blank" rel="noopener noreferrer">Abrir sitio</a>':"")+'</div></article>';}
function css(){return '.ops5{padding-bottom:40px}.ops5-head{padding:24px;border-radius:18px;background:linear-gradient(125deg,#112f52,#17658c);color:white;display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:15px}.ops5-head small{font-size:10px;letter-spacing:.16em;font-weight:900;opacity:.8}.ops5-head h2{font-size:28px;margin:7px 0}.ops5-head p{max-width:800px;opacity:.85;font-size:12px;line-height:1.5}.ops5-stage{border:1px solid #fff6;padding:7px 10px;border-radius:999px;font-size:10px;white-space:nowrap}.ops5-grid{display:grid;gap:12px;margin-bottom:14px}.ops5-grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}.ops5-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.ops5-card,.ops5-kpi{padding:17px;border-radius:13px;background:white;border:1px solid #dce5ec;margin-bottom:14px}.ops5-card h3{font-size:16px;margin:0 0 9px}.ops5-kpi small{display:block;color:#61748b;font-weight:800}.ops5-kpi strong{display:block;color:#0e4770;font-size:24px;margin-top:8px}.ops5-hint{color:#64748b;font-size:12px;line-height:1.5}.ops5-tool{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0}.ops5 input,.ops5 select{border:1px solid #cbd5e1;border-radius:8px;min-height:38px;padding:8px;max-width:100%}.ops5-tool input{flex:1;min-width:220px}.ops5 button{padding:9px 12px;background:#185d8e;color:white;border:0;border-radius:8px;font-weight:800;cursor:pointer}.ops5 button:hover{background:#104569}.ops5-upload{font-size:12px;display:flex;flex-direction:column;gap:7px;font-weight:800}.ops5-upload input{max-width:280px}.ops5-scroll{overflow:auto;max-height:460px;border:1px solid #e2e8f0;border-radius:9px}.ops5 table{width:100%;min-width:740px;border-collapse:collapse}.ops5 th{font-size:11px;position:sticky;top:0;color:white;background:#14436b;text-align:left;padding:9px}.ops5 td{padding:9px;border-bottom:1px solid #edf2f7;font-size:12px;vertical-align:middle}.ops5 td small{color:#64748b;display:block}.ops5-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ops5-form label{font-size:11px;color:#475569;font-weight:800;display:flex;flex-direction:column;gap:5px}.ops5-form button{align-self:end;min-height:39px}.ops5-check{display:flex;align-items:flex-start;gap:13px;padding:12px;border-bottom:1px solid #e8eef4}.ops5-check input{min-height:18px}.ops5-check strong{font-size:13px}.ops5-check p{color:#64748b;font-size:11px;margin:5px 0}.ops5-check a{font-size:11px;color:#155d92}.ops5-status{font-size:11px;color:#8a4c09;background:#fff6e7;border-radius:99px;padding:5px 9px;display:inline-block;margin:4px 8px 4px 0}.ops5-integration{display:flex;justify-content:space-between;gap:12px}.ops5-integration a{font-size:12px;color:#155d92}.ops5-banner{margin:12px 0;padding:15px;border:1px solid #d5e7f6;border-radius:13px;background:#eef7ff}.ops5-banner strong{font-size:14px}.ops5-banner p{font-size:12px;color:#64748b;margin:6px 0 10px}.ops5-banner-actions{display:flex;gap:8px;flex-wrap:wrap}.ops5-banner button{padding:8px 11px;font-size:12px}@media(max-width:1000px){.ops5-grid.four{grid-template-columns:repeat(2,1fr)}.ops5-grid.two{grid-template-columns:1fr}.ops5-form{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.ops5-grid.four,.ops5-form{grid-template-columns:1fr}.ops5-head{flex-direction:column}.ops5-tool input{min-width:0;width:100%}}';}
function kpi(label,value){return '<div class="ops5-kpi"><small>'+e(label)+'</small><strong>'+e(value)+'</strong></div>';}
function parseCSV(text){
 var delimiter=((text.split(/\r?\n/,1)[0].match(/;/g)||[]).length>(text.split(/\r?\n/,1)[0].match(/,/g)||[]).length)?";":",";
 var out=[],row=[],cell="",quote=false;
 for(var i=0;i<text.length;i++){var c=text[i];
 if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}
 else if(c===delimiter&&!quote){row.push(cell);cell="";}
 else if((c==="\n"||c==="\r")&&!quote){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);if(row.some(Boolean))out.push(row);row=[];cell="";}
 else cell+=c;}
 row.push(cell);if(row.some(Boolean))out.push(row);
 return out;
}
function fromRows(matrix){
 if(!Array.isArray(matrix)||matrix.length<2)throw Error("Archivo sin empresas.");
 var h=matrix[0].map(n),find=function(prefix){return h.findIndex(function(x){return x===n(prefix)||x.indexOf(n(prefix))>=0;});};
 var keys={id:find("ID"),company:find("Empresa"),sector:find("Sector"),subsector:find("Subsector"),city:find("Municipio/Base"),opportunity:find("Oportunidad para CORPARTES"),potential:find("Potencial"),status:find("Estado"),source:find("Fuente"),email1:find("Correo compras"),email2:find("Correo comercial"),phone:find("Teléfono fijo"),cell:find("Celular"),whatsapp:find("WhatsApp"),next:find("Próxima gestión"),priority:find("Prioridad acción")};
 if(keys.company<0||keys.sector<0)throw Error("No se encontraron las columnas Empresa y Sector de Atlas.");
 var seen=new Set(),records=[];
 matrix.slice(1,15001).forEach(function(row,i){var v=function(key){return keys[key]>=0?String(row[keys[key]]==null?"":row[keys[key]]).trim():"";};
 var company=v("company"),unique=n(company);if(!company||unique==="EMPRESA"||seen.has(unique))return;
 seen.add(unique);records.push({id:v("id")||"AT-"+(i+1),company:company,sector:v("sector"),subsector:v("subsector"),city:v("city"),opportunity:v("opportunity"),potential:v("potential"),status:v("status"),source:v("source"),email:v("email1")||v("email2"),phone:v("phone")||v("cell"),whatsapp:v("whatsapp"),next:v("next"),priority:v("priority")});});
 if(!records.length)throw Error("No se encontraron registros importables.");
 return records;
}
async function importAtlas(file){
 if(!file)return;
 var message=byId("ops5AtlasMessage");
 if(file.size>13*1024*1024){message.textContent="Archivo demasiado grande (máximo 13 MB).";return;}
 try{
 var rows;
 if(/\.csv$/i.test(file.name)){rows=parseCSV(await file.text().then(function(t){return t.replace(/^\uFEFF/,"");}));}
 else{
 if(!window.XLSX)throw Error("El lector Excel no está disponible. Abre como CSV UTF-8 o habilita la librería XLSX de esta aplicación.");
 var book=window.XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});
 var sheet=book.Sheets.CRM_ATLAS||book.Sheets[book.SheetNames[0]];
 rows=window.XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false,blankrows:false});
 }
 atlas=fromRows(rows);selectedId="";
 message.textContent=atlas.length.toLocaleString("es-CO")+" empresas cargadas solo en memoria. No se enviaron contactos a la nube.";
 renderAtlas();
 }catch(err){message.textContent="No fue posible importar Atlas: "+String(err.message||err);}
}
function filteredAtlas(){
 var q=n(byId("ops5AtlasSearch")?.value||""),sector=byId("ops5AtlasSector")?.value||"";
 return atlas.filter(function(x){return(!sector||x.sector===sector)&&(!q||n([x.company,x.city,x.sector,x.opportunity,x.potential].join(" ")).includes(q));});
}
function renderAtlas(){
 var sectors=[...new Set(atlas.map(function(x){return x.sector;}).filter(Boolean))].sort(),select=byId("ops5AtlasSector"),sel=select?.value||"";
 if(select){select.innerHTML='<option value="">Todos los sectores</option>'+sectors.map(function(s){return '<option value="'+e(s)+'">'+e(s)+'</option>';}).join("");select.value=sectors.includes(sel)?sel:"";}
 var list=filteredAtlas();
 byId("ops5AtlasKpis").innerHTML=kpi("Empresas cargadas",atlas.length.toLocaleString("es-CO"))+kpi("Con correo registrado",atlas.filter(function(x){return Boolean(x.email);}).length.toLocaleString("es-CO"))+kpi("Con teléfono",atlas.filter(function(x){return Boolean(x.phone);}).length.toLocaleString("es-CO"))+kpi("Sectores",sectors.length);
 byId("ops5AtlasRows").innerHTML=list.slice(0,100).map(function(x){return '<tr><td><strong>'+e(x.company)+'</strong><small>'+e(x.city)+'</small></td><td>'+e(x.sector)+'</td><td>'+e(x.potential)+'</td><td>'+e(x.status)+'</td><td>'+e(x.email||x.phone||"Sin contacto")+'</td><td><button type="button" data-ops5-detail="'+e(x.id)+'">Ver</button></td></tr>';}).join("")||'<tr><td colspan="6">Sin resultados. Importa la base Atlas para comenzar.</td></tr>';
 byId("ops5AtlasCount").textContent="Mostrando "+Math.min(100,list.length)+" de "+list.length+" coincidencias. Importación de lectura, no modifica los datos originales.";
 var row=atlas.find(function(x){return x.id===selectedId;});
 byId("ops5AtlasDetail").innerHTML=row?'<div class="ops5-banner"><strong>'+e(row.company)+'</strong><p>'+e(row.sector+" · "+row.city)+"</p><p><b>Oportunidad:</b> "+e(row.opportunity||"Sin definir")+"</p><p><b>Prioridad:</b> "+e(row.priority||"Sin definir")+" · <b>Fuente:</b> "+e(row.source||"Sin registrar")+"</p><p><b>Contacto:</b> "+e([row.email,row.phone,row.whatsapp].filter(Boolean).join(" · ")||"No disponible")+"</p></div>":"";
}
function exportAtlas(){
 var matches=filteredAtlas();if(!matches.length){alert("Primero importa la base Atlas.");return;}
 var headers=["ID","Empresa","Sector","Subsector","Municipio/Base","Oportunidad CORPARTES","Potencial","Estado","Correo","Telefono","WhatsApp","Fuente"];
 var csv=[line(headers)].concat(matches.map(function(x){return line([x.id,x.company,x.sector,x.subsector,x.city,x.opportunity,x.potential,x.status,x.email,x.phone,x.whatsapp,x.source]);})).join("\r\n");
 var blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="atlas_corpartes_resultados.csv";a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function renderMarketing(){
 var budget=campaigns.reduce(function(sum,c){return sum+c.budget;},0);
 byId("ops5MarketingKpis").innerHTML=kpi("Campañas planificadas",campaigns.length)+kpi("Presupuesto planeado",money(budget))+kpi("Objetivo total",campaigns.reduce(function(sum,c){return sum+c.goal;},0))+kpi("Contactos enviados","0");
 byId("ops5MarketingRows").innerHTML=campaigns.map(function(c){return '<tr><td>'+e(c.name)+'<small>'+e(c.owner)+'</small></td><td>'+e(c.sector)+'</td><td>'+e(c.channel)+'</td><td>'+money(c.budget)+'</td><td>'+e(c.goal)+'</td><td>Borrador</td></tr>';}).join("")||'<tr><td colspan="6">Sin campañas planificadas.</td></tr>';
}
function renderLogistics(){
 var pending=shipments.filter(function(s){return s.status!=="Entregado";}),late=pending.filter(function(s){return s.date&&s.date<new Date().toLocaleDateString("en-CA");});
 byId("ops5LogisticsKpis").innerHTML=kpi("Despachos de revisión",shipments.length)+kpi("Entregados",shipments.length-pending.length)+kpi("Pendientes",pending.length)+kpi("Vencidos (estimado)",late.length);
 byId("ops5LogisticsRows").innerHTML=shipments.map(function(s){return '<tr><td>'+e(s.reference)+'</td><td>'+e(s.client)+'</td><td>'+e(s.carrier)+'</td><td>'+e(s.date)+'</td><td>'+e(s.status)+'</td><td>'+e(s.tracking||"—")+'</td></tr>';}).join("")||'<tr><td colspan="6">Sin despachos en revisión.</td></tr>';
}
function renderFiscal(){
 byId("ops5FiscalKpis").innerHTML=kpi("Controles considerados",FISCAL.length)+kpi("Revisados esta sesión",fiscalReviewed.size)+kpi("Habilitación DIAN","No verificada")+kpi("Documentos transmitidos","0");
 byId("ops5FiscalRows").innerHTML=FISCAL.map(function(x){return '<label class="ops5-check"><input type="checkbox" data-ops5-fiscal="'+e(x.id)+'" '+(fiscalReviewed.has(x.id)?"checked":"")+'><span><strong>'+e(x.name)+'</strong><p>'+e(x.detail)+'</p><a href="'+e(x.url)+'" target="_blank" rel="noopener noreferrer">Consultar referencia oficial</a></span></label>';}).join("");
}
function openSafe(id){if(typeof openModule==="function")openModule(id);}
function bind(){
 byId("ops5AtlasFile").addEventListener("change",function(){importAtlas(this.files&&this.files[0]);});
 byId("ops5AtlasExport").onclick=exportAtlas;
 byId("ops5AtlasSearch").addEventListener("input",renderAtlas);
 byId("ops5AtlasSector").addEventListener("change",renderAtlas);
 byId("ops5AtlasRows").addEventListener("click",function(ev){var b=ev.target.closest("[data-ops5-detail]");if(b){selectedId=b.dataset.ops5Detail;renderAtlas();}});
 byId("ops5MarketingForm").addEventListener("submit",function(ev){ev.preventDefault();var f=ev.currentTarget;var g=function(k){return String(f.elements.namedItem(k).value||"").trim();};if(!g("name"))return;campaigns.push({name:g("name"),sector:g("sector"),channel:g("channel"),budget:Math.max(0,Number(g("budget")||0)),goal:Math.max(1,Number(g("goal")||1)),owner:g("owner")});f.reset();renderMarketing();});
 byId("ops5LogisticsForm").addEventListener("submit",function(ev){ev.preventDefault();var f=ev.currentTarget;var g=function(k){return String(f.elements.namedItem(k).value||"").trim();};if(!g("reference")||!g("client")||!g("carrier")||!g("date"))return;shipments.push({reference:g("reference"),client:g("client"),carrier:g("carrier"),date:g("date"),status:g("status"),tracking:g("tracking")});f.reset();renderLogistics();});
 byId("ops5FiscalRows").addEventListener("change",function(ev){var t=ev.target;if(!t.matches("[data-ops5-fiscal]"))return;if(t.checked)fiscalReviewed.add(t.dataset.ops5Fiscal);else fiscalReviewed.delete(t.dataset.ops5Fiscal);renderFiscal();});
 document.addEventListener("click",function(ev){var b=ev.target.closest("[data-ops5-open]");if(b){openSafe(b.dataset.ops5Open);}});
}
function mount(){
 if(started||!document.querySelector(".main-nav")||!document.querySelector(".main-content"))return;
 var nav=document.querySelector(".main-nav"),main=document.querySelector(".main-content");
 var style=document.createElement("style");style.id="ops5-style";style.textContent=css();document.head.appendChild(style);
 var root=document.createElement("div");root.innerHTML=content();while(root.firstChild)main.appendChild(root.firstChild);
 var labels=[["atlas","Atlas 360","Base industrial"],["mercadeo","Mercadeo","Campañas"],["logistica","Logística","Despachos"],["fiscal","Colombia / DIAN","Cumplimiento"],["conexiones","Integraciones","Apollo · Hunter"]];
 labels.forEach(function(x){var button=document.createElement("button");button.className="nav-button";button.type="button";button.dataset.module=x[0];button.innerHTML='<span class="nav-icon">◉</span><span class="nav-copy"><strong>'+e(x[1])+'</strong><small>'+e(x[2])+'</small></span>';nav.appendChild(button);button.onclick=function(){openSafe(x[0]);};});
 var home=byId("module-inicio");if(home){var banner=document.createElement("div");banner.className="ops5-banner";banner.innerHTML='<strong>CORPARTES OS · Nuevos módulos de desarrollo</strong><p>Atlas 360, Mercadeo, Logística, Colombia/DIAN e Integraciones. Los datos importados no se publican ni se envían.</p><div class="ops5-banner-actions">'+labels.map(function(x){return '<button type="button" data-ops5-open="'+e(x[0])+'">'+e(x[1])+'</button>';}).join("")+'</div>';home.insertBefore(banner,home.firstChild);}
 var originalCan=canAccess;
 canAccess=function(m){if(labels.some(function(x){return x[0]===m;}))return current()&&typeof isAdmin==="function"&&isAdmin();return originalCan(m);};
 var originalOpen=openModule;
 openModule=function(m){var result=originalOpen(m);if(labels.some(function(x){return x[0]===m;})&&byId("topbarModuleTitle"))byId("topbarModuleTitle").textContent=labels.find(function(x){return x[0]===m;})[1];return result;};
 var originalRender=renderAll;
 renderAll=function(){var r=originalRender.apply(this,arguments);if(started){renderAtlas();renderMarketing();renderLogistics();renderFiscal();}return r;};
 bind();started=true;renderAtlas();renderMarketing();renderLogistics();renderFiscal();
 if(current()&&typeof configurePermissions==="function")configurePermissions();
}
window.CorpartesOperationsV5={mount:mount,refresh:function(){if(started){renderAtlas();renderMarketing();renderLogistics();renderFiscal();}},importFromMatrix:fromRows};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();