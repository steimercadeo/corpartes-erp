/* CORPARTES AI OS · BETA 1 · 2026-10-27
   Primer cerebro empresarial conectado al estado real del ERP.
   - Centro de decisiones
   - Indicadores explicables
   - Chat gerencial sobre datos reales
   - Chat interno persistente usando el documento meta ya existente en Firestore
*/
(function(){
  "use strict";

  var AI_MODULE = "ai";
  var CHAT_KEY = "companyChat";
  var mounted = false;
  var aiMessages = [];

  function esc(value){
    if (typeof escapeHtml === "function") return escapeHtml(String(value == null ? "" : value));
    return String(value == null ? "" : value).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
    });
  }

  function fmt(n){
    return Number(n || 0).toLocaleString("es-CO");
  }

  function dateOnly(value){
    if(!value) return null;
    var d = new Date(String(value).length <= 10 ? String(value) + "T12:00:00" : value);
    return isNaN(d.getTime()) ? null : d;
  }

  function daysFromToday(value){
    var d = dateOnly(value);
    if(!d) return null;
    var today = new Date();
    today.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    return Math.round((d.getTime()-today.getTime())/86400000);
  }

  function getOrders(){
    var rows = (state && state.data && state.data.orders) || [];
    return rows.filter(function(o){
      var type = String(o && o.type || "Pedido").toLowerCase();
      var status = String(o && o.status || "").toLowerCase();
      return type === "pedido" && status !== "anulado" && status !== "cancelado";
    });
  }

  function getProcesses(){
    return ((state && state.data && state.data.processes) || []).filter(function(p){
      return String(p && p.status || "Activo").toLowerCase() !== "inactivo";
    });
  }

  function orderProgress(order){
    if(!order) return 0;
    var total = 0;
    var done = 0;
    var items = order.items || [];
    var processes = getProcesses();

    try{
      if(typeof routeFor === "function" && typeof itemProcessInfo === "function"){
        items.forEach(function(item){
          processes.forEach(function(process){
            var route = routeFor(item,process.id);
            if(!route) return;
            var req = Number(route.requiredQty || item.qty || 0);
            if(req <= 0) return;
            var info = itemProcessInfo(order,item,process.id) || {};
            var dn = Number(info.done || 0);
            total += req;
            done += Math.min(req,Math.max(0,dn));
          });
        });
      }
    }catch(_e){}

    if(total <= 0){
      var movements = (state && state.data && state.data.movements) || [];
      items.forEach(function(item){
        var routes = item.routes || item.route || [];
        if(!Array.isArray(routes)) return;
        routes.forEach(function(route){
          var req = Number(route.requiredQty || item.qty || 0);
          if(req <= 0) return;
          var dn = movements.filter(function(m){
            return String(m.orderId)===String(order.id) &&
              String(m.itemId)===String(item.id) &&
              String(m.processId)===String(route.processId);
          }).reduce(function(sum,m){ return sum + Number(m.qty || 0); },0);
          total += req;
          done += Math.min(req,Math.max(0,dn));
        });
      });
    }

    return total > 0 ? Math.max(0,Math.min(100,Math.round(done/total*100))) : 0;
  }

  function activeOrders(){
    return getOrders().filter(function(o){ return orderProgress(o) < 100; });
  }

  function riskForOrder(order){
    var p = orderProgress(order);
    if(p >= 100) return null;
    var days = daysFromToday(order.deliveryDate || order.dueDate || order.promiseDate);
    if(days == null) return null;
    if(days < 0) return {level:"high",label:"Vencido",days:days,progress:p};
    if(days <= 2 && p < 90) return {level:"high",label:"Riesgo alto",days:days,progress:p};
    if(days <= 5 && p < 70) return {level:"medium",label:"Riesgo medio",days:days,progress:p};
    if(days <= 7 && p < 45) return {level:"medium",label:"Riesgo medio",days:days,progress:p};
    return null;
  }

  function riskOrders(){
    return activeOrders().map(function(o){
      return {order:o,risk:riskForOrder(o)};
    }).filter(function(x){return !!x.risk;}).sort(function(a,b){
      var rank = {high:0,medium:1,low:2};
      return (rank[a.risk.level]-rank[b.risk.level]) || (a.risk.days-b.risk.days);
    });
  }

  function dueSoon(){
    return activeOrders().map(function(o){
      return {order:o,days:daysFromToday(o.deliveryDate || o.dueDate || o.promiseDate),progress:orderProgress(o)};
    }).filter(function(x){return x.days != null && x.days >= 0 && x.days <= 7;})
      .sort(function(a,b){return a.days-b.days;});
  }

  function inventoryCritical(){
    var rows = (state && state.data && state.data.sheetStocks) || [];
    return rows.filter(function(s){
      var stock = Number(s.stock != null ? s.stock : (s.qty != null ? s.qty : s.quantity));
      var min = Number(s.minStock != null ? s.minStock : (s.minimumStock != null ? s.minimumStock : (s.minimum || 0)));
      if(!isFinite(stock)) return false;
      return min > 0 ? stock <= min : stock <= 1;
    }).sort(function(a,b){
      return Number(a.stock || a.qty || 0)-Number(b.stock || b.qty || 0);
    });
  }

  function stockLabel(s){
    var material = s.material || s.materialType || s.type || "Lámina";
    var gauge = s.gauge || s.caliber || s.thickness || "";
    var size = "";
    if(s.width && s.height) size = " · " + s.width + "×" + s.height;
    return String(material) + (gauge ? " · " + gauge : "") + size;
  }

  function summary(){
    var active = activeOrders();
    var risks = riskOrders();
    var low = inventoryCritical();
    var progresses = active.map(function(o){return orderProgress(o);});
    var avg = progresses.length ? Math.round(progresses.reduce(function(a,b){return a+b;},0)/progresses.length) : 100;
    var piecesPending = active.reduce(function(sum,o){
      return sum + (o.items || []).reduce(function(s,i){return s + Number(i.qty || 0);},0);
    },0);
    var remissions = (state && state.data && state.data.remissions) || [];
    var works = (state && state.data && state.data.activeWorks) || {};
    return {
      activeOrders:active.length,
      riskOrders:risks.length,
      avgProgress:avg,
      criticalStocks:low.length,
      piecesPending:piecesPending,
      remissions:remissions.length,
      activeWorks:Object.keys(works || {}).filter(function(k){return !!works[k];}).length
    };
  }

  function orderName(o){
    return o.number || o.code || o.orderNumber || o.id || "Pedido";
  }

  function orderClient(o){
    return o.client || o.customer || o.clientName || "Cliente";
  }

  function riskHtml(){
    var risks = riskOrders().slice(0,6);
    if(!risks.length){
      return '<div class="cpai-empty"><strong>Sin alertas críticas.</strong><span>No detecto pedidos con riesgo alto o medio usando fechas y avance actuales.</span></div>';
    }
    return risks.map(function(x){
      var cls = x.risk.level === "high" ? "danger" : "warning";
      var when = x.risk.days < 0 ? Math.abs(x.risk.days) + " día(s) vencido" : "vence en " + x.risk.days + " día(s)";
      return '<div class="cpai-alert '+cls+'">'+
        '<div><strong>'+esc(orderName(x.order))+' · '+esc(orderClient(x.order))+'</strong>'+
        '<span>'+esc(when)+' · avance estimado '+x.risk.progress+'%</span></div>'+
        '<button type="button" data-cpai-open="seguimiento">Ver</button></div>';
    }).join("");
  }

  function renderKpis(){
    var s = summary();
    var box = document.getElementById("cpaiKpis");
    if(!box) return;
    var cards = [
      ["Pedidos activos",s.activeOrders,"¿Qué pedidos están activos?","Operación en curso"],
      ["Pedidos en riesgo",s.riskOrders,"¿Qué pedidos están en riesgo?","Entrega y cumplimiento"],
      ["Avance promedio",s.avgProgress+"%","Explícame el avance de producción","Promedio de pedidos activos"],
      ["Inventario crítico",s.criticalStocks,"¿Cómo está el inventario?","Lámina en nivel crítico"]
    ];
    box.innerHTML = cards.map(function(c){
      return '<button class="cpai-kpi" type="button" data-cpai-question="'+esc(c[2])+'">'+
        '<span>'+esc(c[0])+'</span><strong>'+esc(c[1])+'</strong><small>'+esc(c[3])+' · ✦ Explícame</small></button>';
    }).join("");
    var alerts = document.getElementById("cpaiAlerts");
    if(alerts) alerts.innerHTML = riskHtml();
    var sync = document.getElementById("cpaiDataStatus");
    if(sync){
      sync.textContent = (typeof nativeCloudReady !== "undefined" && nativeCloudReady) ? "● Datos sincronizados con Firestore" : "● Datos del ERP disponibles";
      sync.className = "cpai-data-status " + ((typeof nativeCloudReady !== "undefined" && nativeCloudReady) ? "online" : "local");
    }
  }

  function answerQuestion(question){
    var q = String(question || "").trim();
    if(window.CorpartesKnowledge && typeof window.CorpartesKnowledge.answer==="function"){
      var documented=window.CorpartesKnowledge.answer(q);
      if(documented)return documented;
    }
    var k = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    var s = summary();
    var risks = riskOrders();
    var due = dueSoon();
    var low = inventoryCritical();

    if(!q) return "Escribe una pregunta sobre la operación de la empresa.";

    if(k.indexOf("como va")>=0 || k.indexOf("estado")>=0 || k.indexOf("resumen")>=0 || k.indexOf("empresa")>=0){
      var text = "Estado actual según el ERP: "+s.activeOrders+" pedido(s) activo(s), "+s.riskOrders+" con riesgo, avance promedio de "+s.avgProgress+"% y "+s.criticalStocks+" referencia(s) de lámina en nivel crítico.";
      if(due.length) text += " Hay "+due.length+" entrega(s) previstas dentro de los próximos 7 días.";
      if(s.activeWorks) text += " En este momento aparecen "+s.activeWorks+" trabajo(s) activo(s) registrados.";
      return text;
    }

    if(k.indexOf("riesgo")>=0 || k.indexOf("atras")>=0 || k.indexOf("venc")>=0){
      if(!risks.length) return "No detecto pedidos con riesgo alto o medio usando las fechas de entrega y el avance actualmente registrado.";
      return "Los principales pedidos para revisar son: " + risks.slice(0,5).map(function(x){
        var when = x.risk.days < 0 ? "vencido "+Math.abs(x.risk.days)+" día(s)" : "vence en "+x.risk.days+" día(s)";
        return orderName(x.order)+" ("+orderClient(x.order)+", "+when+", "+x.risk.progress+"% de avance)";
      }).join("; ") + ".";
    }

    if(k.indexOf("inventario")>=0 || k.indexOf("lamina")>=0 || k.indexOf("stock")>=0){
      var totalStocks = ((state && state.data && state.data.sheetStocks) || []).length;
      if(!low.length) return "El ERP tiene "+totalStocks+" registro(s) de inventario de lámina y no detecto niveles críticos con la regla actual.";
      return "Detecto "+low.length+" referencia(s) en nivel crítico. Las primeras son: " + low.slice(0,6).map(function(x){
        return stockLabel(x)+" ("+fmt(x.stock != null ? x.stock : x.qty)+" disponible)";
      }).join("; ") + ".";
    }

    if(k.indexOf("produccion")>=0 || k.indexOf("avance")>=0 || k.indexOf("fabric")>=0){
      return "Producción: "+s.activeOrders+" pedido(s) siguen abiertos, con avance promedio estimado de "+s.avgProgress+"%. La cantidad total registrada en esos pedidos es "+fmt(s.piecesPending)+" pieza(s). "+(s.riskOrders ? s.riskOrders+" pedido(s) necesitan atención por riesgo de fecha." : "No detecto riesgos relevantes de fecha.");
    }

    if(k.indexOf("entrega")>=0 || k.indexOf("semana")>=0 || k.indexOf("proximo")>=0){
      if(!due.length) return "No encuentro entregas pendientes con fecha dentro de los próximos 7 días.";
      return "Próximas entregas: " + due.slice(0,7).map(function(x){
        return orderName(x.order)+" · "+orderClient(x.order)+" · "+(x.days===0?"hoy":"en "+x.days+" día(s)")+" · "+x.progress+"%";
      }).join("; ") + ".";
    }

    if(k.indexOf("remision")>=0 || k.indexOf("despacho")>=0){
      return "Actualmente el ERP contiene "+s.remissions+" remisión(es) registradas. Puedes abrir Remisiones para revisar soportes y trazabilidad documental.";
    }

    if(k.indexOf("que debo")>=0 || k.indexOf("prior")>=0 || k.indexOf("hoy")>=0 || k.indexOf("preocupa")>=0){
      var actions = [];
      if(risks.length) actions.push("revisar primero "+orderName(risks[0].order)+" de "+orderClient(risks[0].order));
      if(low.length) actions.push("validar abastecimiento de "+stockLabel(low[0]));
      if(due.length) actions.push("confirmar capacidad para "+due.length+" entrega(s) de los próximos 7 días");
      if(!actions.length) actions.push("no hay alertas críticas detectadas; conviene revisar seguimiento y carga de producción");
      return "Prioridades sugeridas: " + actions.join("; ") + ".";
    }

    if(k.indexOf("ayuda")>=0 || k.indexOf("puedes")>=0){
      return "Puedo responder con datos del ERP sobre estado general, pedidos en riesgo, producción, entregas próximas, remisiones e inventario. Prueba: “¿qué debo revisar hoy?” o “¿qué pedidos están en riesgo?”.";
    }

    return "Con la primera versión puedo razonar sobre operación, pedidos, producción, entregas, remisiones e inventario. Para esta pregunta te sugiero reformularla con uno de esos temas. La siguiente capa conectará este mismo chat a un modelo de IA para preguntas abiertas y acciones autorizadas.";
  }

  function addAiMessage(role,text){
    aiMessages.push({role:role,text:String(text || "")});
    if(aiMessages.length > 30) aiMessages = aiMessages.slice(-30);
    renderAiConversation();
  }

  function renderAiConversation(){
    var box = document.getElementById("cpaiConversation");
    if(!box) return;
    if(!aiMessages.length){
      aiMessages.push({role:"assistant",text:"Soy Corpartes IA. Ya estoy leyendo los datos operativos del ERP. Pregúntame cómo va la empresa, qué pedidos están en riesgo o qué debes revisar hoy."});
    }
    box.innerHTML = aiMessages.map(function(m){
      return '<div class="cpai-msg '+(m.role==="user"?"user":"assistant")+'"><div class="cpai-avatar">'+(m.role==="user"?"TÚ":"✦")+'</div><div>'+esc(m.text)+'</div></div>';
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  function ask(question){
    var q = String(question || "").trim();
    if(!q) return;
    addAiMessage("user",q);
    window.setTimeout(function(){
      addAiMessage("assistant",answerQuestion(q));
    },120);
  }

  function ensureCompanyChat(){
    if(!state || !state.data) return [];
    if(!Array.isArray(state.data[CHAT_KEY])) state.data[CHAT_KEY] = [];
    return state.data[CHAT_KEY];
  }

  function renderCompanyChat(){
    var list = document.getElementById("cpaiCompanyMessages");
    if(!list) return;
    var channel = document.getElementById("cpaiChannel") ? document.getElementById("cpaiChannel").value : "general";
    var rows = ensureCompanyChat().filter(function(m){return String(m.channel || "general")===channel;}).slice(-80);
    if(!rows.length){
      list.innerHTML = '<div class="cpai-empty"><strong>#'+esc(channel)+'</strong><span>Todavía no hay mensajes en este canal.</span></div>';
      return;
    }
    list.innerHTML = rows.map(function(m){
      var mine = state.currentUser && String(m.userId)===String(state.currentUser.id);
      var time = "";
      try{time = new Date(m.createdAt).toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});}catch(_e){}
      return '<div class="cpai-company-msg '+(mine?"mine":"")+'"><div class="cpai-company-head"><strong>'+esc(m.userName || "Usuario")+'</strong><span>'+esc(time)+'</span></div><div>'+esc(m.text)+'</div></div>';
    }).join("");
    list.scrollTop = list.scrollHeight;
  }

  function sendCompanyMessage(){
    var input = document.getElementById("cpaiCompanyInput");
    var channelEl = document.getElementById("cpaiChannel");
    var text = String(input && input.value || "").trim();
    if(!text || !state.currentUser) return;
    var rows = ensureCompanyChat();
    rows.push({
      id:"chat-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
      channel:channelEl ? channelEl.value : "general",
      userId:state.currentUser.id,
      userName:state.currentUser.name || state.currentUser.code || "Usuario",
      text:text,
      createdAt:new Date().toISOString()
    });
    if(rows.length > 300) state.data[CHAT_KEY] = rows.slice(-300);
    input.value = "";
    if(typeof saveData === "function") saveData();
    renderCompanyChat();
  }

  function setTab(tab){
    document.querySelectorAll("[data-cpai-tab]").forEach(function(b){
      b.classList.toggle("active",b.dataset.cpaiTab===tab);
    });
    var a = document.getElementById("cpaiAssistantPanel");
    var c = document.getElementById("cpaiCompanyPanel");
    if(a) a.classList.toggle("hidden",tab!=="assistant");
    if(c) c.classList.toggle("hidden",tab!=="company");
    if(tab==="company") renderCompanyChat();
  }

  function moduleHtml(){
    return ''+
      '<section class="module cpai-module" id="module-ai">'+
        '<div class="cpai-hero">'+
          '<div><span class="cpai-eyebrow">CORPARTES AI OS · BETA 1</span><h2>El cerebro de la empresa</h2><p>Pregunta, entiende y decide usando la información real del ERP.</p></div>'+
          '<div class="cpai-hero-right"><span id="cpaiDataStatus" class="cpai-data-status">● Datos del ERP</span><button type="button" class="cpai-refresh" id="cpaiRefresh">↻ Actualizar análisis</button></div>'+
        '</div>'+
        '<div class="cpai-kpis" id="cpaiKpis"></div>'+
        '<div class="cpai-grid">'+
          '<div class="cpai-card cpai-decisions"><div class="cpai-card-head"><div><span>Centro de decisiones</span><h3>Lo que requiere atención</h3></div><span class="cpai-live">EN VIVO</span></div><div id="cpaiAlerts"></div></div>'+
          '<div class="cpai-card cpai-priorities"><div class="cpai-card-head"><div><span>Preguntas rápidas</span><h3>Habla con tu empresa</h3></div></div>'+
            '<div class="cpai-quick">'+
              '<button type="button" data-cpai-question="¿Cómo va la empresa?">¿Cómo va la empresa?</button>'+
              '<button type="button" data-cpai-question="¿Qué debo revisar hoy?">¿Qué debo revisar hoy?</button>'+
              '<button type="button" data-cpai-question="¿Qué pedidos están en riesgo?">Pedidos en riesgo</button>'+
              '<button type="button" data-cpai-question="¿Cómo está el inventario?">Inventario crítico</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="cpai-tabs"><button class="active" type="button" data-cpai-tab="assistant">✦ Asistente IA</button><button type="button" data-cpai-tab="company">💬 Chat interno</button></div>'+
        '<div id="cpaiAssistantPanel" class="cpai-card cpai-chat">'+
          '<div id="cpaiConversation" class="cpai-conversation"></div>'+
          '<form id="cpaiAskForm" class="cpai-composer"><input id="cpaiAskInput" autocomplete="off" placeholder="Pregúntale a Corpartes IA: ¿qué debería preocuparme hoy?"><button type="submit">Preguntar ✦</button></form>'+
          '<div class="cpai-source-note">Respuestas locales basadas en registros del ERP o conocimientos documentados. En DEMO todo es ilustrativo; IA en nube, aprendizaje permanente y acciones autorizadas requieren servicios configurados.</div>'+
        '</div>'+
        '<div id="cpaiCompanyPanel" class="cpai-card cpai-company hidden">'+
          '<div class="cpai-company-top"><div><span class="cpai-eyebrow">COLABORACIÓN</span><h3>Chat interno de la empresa</h3><p>Conversaciones guardadas junto con el ERP y sincronizadas por la misma nube.</p></div>'+
          '<select id="cpaiChannel"><option value="general"># general</option><option value="produccion"># producción</option><option value="ventas"># ventas</option><option value="compras"># compras</option></select></div>'+
          '<div id="cpaiCompanyMessages" class="cpai-company-messages"></div>'+
          '<form id="cpaiCompanyForm" class="cpai-composer"><input id="cpaiCompanyInput" autocomplete="off" placeholder="Escribe un mensaje al equipo"><button type="submit">Enviar</button></form>'+
        '</div>'+
      '</section>';
  }

  function css(){
    return ''+
      '.cpai-module{padding-bottom:40px}.cpai-hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding:26px 28px;border-radius:22px;background:linear-gradient(135deg,#102b4e,#124f75 60%,#167fa3);color:#fff;box-shadow:0 18px 42px rgba(15,45,78,.18);margin-bottom:18px}.cpai-hero h2{font-size:32px;margin:4px 0 8px}.cpai-hero p{margin:0;opacity:.84}.cpai-eyebrow{font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.78}.cpai-hero-right{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.cpai-data-status{font-size:12px;font-weight:800;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.12)}.cpai-data-status.online{background:rgba(34,197,94,.18)}.cpai-refresh{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;border-radius:10px;padding:9px 12px;font-weight:800}.cpai-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.cpai-kpi{display:flex;flex-direction:column;align-items:flex-start;text-align:left;border:1px solid #dbe3ee;background:#fff;border-radius:16px;padding:17px;box-shadow:0 7px 20px rgba(15,23,42,.05)}.cpai-kpi:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(15,23,42,.08)}.cpai-kpi span{font-size:12px;color:#64748b;font-weight:800}.cpai-kpi strong{font-size:28px;color:#143a66;margin:5px 0}.cpai-kpi small{font-size:10px;color:#2563eb;font-weight:800}.cpai-grid{display:grid;grid-template-columns:1.35fr .8fr;gap:16px;margin-bottom:16px}.cpai-card{background:#fff;border:1px solid #dbe3ee;border-radius:18px;padding:20px;box-shadow:0 7px 20px rgba(15,23,42,.05)}.cpai-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:13px}.cpai-card-head span{font-size:11px;color:#64748b;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.cpai-card-head h3{margin:3px 0 0;font-size:18px}.cpai-live{color:#15803d!important;background:#dcfce7;border-radius:999px;padding:5px 8px}.cpai-alert{display:flex;justify-content:space-between;gap:12px;align-items:center;border-left:4px solid #f59e0b;background:#fffbeb;border-radius:10px;padding:11px 12px;margin-bottom:8px}.cpai-alert.danger{border-left-color:#dc2626;background:#fff1f2}.cpai-alert strong,.cpai-alert span{display:block}.cpai-alert strong{font-size:13px}.cpai-alert span{font-size:11px;color:#64748b;margin-top:2px}.cpai-alert button{border:0;background:#fff;border-radius:8px;padding:7px 9px;font-size:11px;font-weight:900;color:#1d4ed8}.cpai-quick{display:grid;gap:8px}.cpai-quick button{border:1px solid #dbeafe;background:#eff6ff;color:#1e40af;border-radius:10px;padding:10px 12px;text-align:left;font-size:12px;font-weight:800}.cpai-tabs{display:flex;gap:8px;margin:4px 0 10px}.cpai-tabs button{border:1px solid #dbe3ee;background:#fff;color:#475569;border-radius:10px;padding:10px 14px;font-weight:900}.cpai-tabs button.active{background:#12386b;color:#fff;border-color:#12386b}.cpai-chat{padding:0;overflow:hidden}.cpai-conversation{height:390px;overflow:auto;padding:20px;background:linear-gradient(180deg,#f8fbff,#fff)}.cpai-msg{display:flex;gap:10px;align-items:flex-start;max-width:85%;margin-bottom:13px}.cpai-msg.user{margin-left:auto;flex-direction:row-reverse}.cpai-msg>div:last-child{background:#eef4fb;border:1px solid #dbe3ee;border-radius:14px 14px 14px 4px;padding:11px 13px;font-size:13px;line-height:1.5}.cpai-msg.user>div:last-child{background:#12386b;color:#fff;border-color:#12386b;border-radius:14px 14px 4px 14px}.cpai-avatar{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;background:#143a66;color:#fff;font-size:10px;font-weight:900;flex:0 0 30px}.cpai-composer{display:grid;grid-template-columns:1fr auto;gap:9px;padding:14px;border-top:1px solid #e2e8f0}.cpai-composer input{min-height:46px;border:1px solid #cbd5e1;border-radius:11px;padding:10px 13px;outline:0}.cpai-composer input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}.cpai-composer button{border:0;border-radius:11px;background:#143a66;color:#fff;font-weight:900;padding:0 16px}.cpai-source-note{font-size:10px;color:#64748b;padding:0 15px 13px}.cpai-company-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.cpai-company-top h3{margin:3px 0 4px}.cpai-company-top p{margin:0;color:#64748b;font-size:12px}.cpai-company-top select{min-width:150px;border:1px solid #cbd5e1;border-radius:10px;padding:9px}.cpai-company-messages{height:360px;overflow:auto;margin-top:16px;padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.cpai-company-msg{max-width:75%;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px 11px;margin-bottom:9px;font-size:12px}.cpai-company-msg.mine{margin-left:auto;background:#eaf2ff;border-color:#bfdbfe}.cpai-company-head{display:flex;justify-content:space-between;gap:14px;font-size:10px;color:#64748b;margin-bottom:4px}.cpai-company-head strong{color:#334155}.cpai-empty{display:flex;flex-direction:column;gap:4px;color:#64748b;padding:18px;text-align:center}.cpai-empty strong{color:#334155}.cpai-floating{position:fixed;right:22px;bottom:22px;z-index:80;border:0;border-radius:999px;background:linear-gradient(135deg,#12386b,#167fa3);color:#fff;padding:12px 16px;font-weight:900;box-shadow:0 12px 30px rgba(18,56,107,.3)}@media(max-width:1000px){.cpai-kpis{grid-template-columns:repeat(2,1fr)}.cpai-grid{grid-template-columns:1fr}}@media(max-width:650px){.cpai-hero{flex-direction:column}.cpai-kpis{grid-template-columns:1fr}.cpai-composer{grid-template-columns:1fr}.cpai-composer button{min-height:42px}.cpai-company-top{flex-direction:column}.cpai-company-msg{max-width:92%}}';
  }

  function mount(){
    if(mounted) return;
    var main = document.querySelector(".main-content");
    var nav = document.querySelector(".main-nav");
    if(!main || !nav) return;

    try{
      if(typeof CLOUD_META_KEYS !== "undefined" && CLOUD_META_KEYS.indexOf(CHAT_KEY) < 0) CLOUD_META_KEYS.push(CHAT_KEY);
      if(state && state.data && !Array.isArray(state.data[CHAT_KEY])) state.data[CHAT_KEY]=[];
    }catch(_e){}

    var style = document.createElement("style");
    style.id = "corpartesAiStyles";
    style.textContent = css();
    document.head.appendChild(style);

    var holder = document.createElement("div");
    holder.innerHTML = moduleHtml();
    main.appendChild(holder.firstElementChild);

    var button = document.createElement("button");
    button.type = "button";
    button.className = "nav-button";
    button.dataset.module = AI_MODULE;
    button.innerHTML = '<span class="nav-icon">✦</span><span class="nav-copy"><strong>Corpartes IA</strong><small>Cerebro empresarial</small></span>';
    var adminButton = nav.querySelector('[data-module="administracion"]');
    if(adminButton) nav.insertBefore(button,adminButton);
    else nav.appendChild(button);

    var floating = document.createElement("button");
    floating.type = "button";
    floating.className = "cpai-floating";
    floating.textContent = "✦ Corpartes IA";
    document.body.appendChild(floating);

    var oldCanAccess = canAccess;
    canAccess = function(module){
      if(module === AI_MODULE) return !!state.currentUser;
      return oldCanAccess(module);
    };

    var oldOpenModule = openModule;
    openModule = function(module){
      var result = oldOpenModule(module);
      if(module === AI_MODULE){
        if(document.getElementById("topbarModuleTitle")) document.getElementById("topbarModuleTitle").textContent = "Corpartes IA";
        if(document.getElementById("topbarModuleSubtitle")) document.getElementById("topbarModuleSubtitle").textContent = "Cerebro empresarial, decisiones y colaboración";
        refresh();
      }
      return result;
    };

    var oldRenderAll = renderAll;
    renderAll = function(){
      var result = oldRenderAll.apply(this,arguments);
      if(document.getElementById("module-ai") && document.getElementById("module-ai").classList.contains("active")) refresh();
      renderCompanyChat();
      return result;
    };

    floating.addEventListener("click",function(){ if(state.currentUser) openModule(AI_MODULE); });
    document.getElementById("cpaiRefresh").addEventListener("click",refresh);
    document.getElementById("cpaiAskForm").addEventListener("submit",function(e){
      e.preventDefault();
      var input = document.getElementById("cpaiAskInput");
      ask(input.value);
      input.value = "";
    });
    document.getElementById("cpaiCompanyForm").addEventListener("submit",function(e){e.preventDefault();sendCompanyMessage();});
    document.getElementById("cpaiChannel").addEventListener("change",renderCompanyChat);

    document.addEventListener("click",function(e){
      var q = e.target.closest && e.target.closest("[data-cpai-question]");
      if(q){ ask(q.dataset.cpaiQuestion); setTab("assistant"); }
      var tab = e.target.closest && e.target.closest("[data-cpai-tab]");
      if(tab) setTab(tab.dataset.cpaiTab);
      var open = e.target.closest && e.target.closest("[data-cpai-open]");
      if(open && typeof openModule === "function") openModule(open.dataset.cpaiOpen);
    });

    mounted = true;
    renderAiConversation();
    renderKpis();
  }

  function refresh(){
    ensureCompanyChat();
    renderKpis();
    renderAiConversation();
    renderCompanyChat();
  }

  window.CorpartesAI = {mount:mount,refresh:refresh,ask:ask,answer:answerQuestion,summary:summary};

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",mount,{once:true});
  }else{
    mount();
  }
})();