/* CORPARTES CRM PLAYBOOKS V1
 * Borradores comerciales por sector, sin envíos ni programación automática.
 * No se enlaza a APIs de Apollo, Hunter, email o WhatsApp.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) {
    root.CorpartesCRMPlaybooks = api;
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", api.mount, { once: true });
    } else { api.mount(); }
  }
})(typeof window === "object" ? window : null, function () {
  "use strict";
  const SERVICES = Object.freeze({
    "Metalmecánica": "corte láser, punzonado, doblez, soldadura y pintura de piezas metálicas",
    "Exhibición comercial": "estructuras y componentes para exhibidores, estanterías y puntos de venta",
    "Tableros eléctricos": "gabinetes, tapas y soportes en lámina, con perforaciones y doblez bajo plano",
    "Construcción": "componentes metálicos a medida, corte y doblez de lámina para proyectos",
    "Mobiliario": "bases, estructuras y componentes metálicos para mobiliario comercial e industrial",
    "Autopartes": "piezas y soportes metálicos a partir de planos, prototipos y lotes",
    "Maquinaria": "mecanizado CNC, torneado y fabricación de componentes bajo especificación",
    "Otro": "fabricación metalmecánica bajo plano, corte, doblez y acabados"
  });
  const STOP_STAGES = ["Cliente", "Perdido"];
  const asText = value => String(value == null ? "" : value);
  const escapeHTML = value => asText(value).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const getRecords = () => {
    try {
      return Array.isArray(window.state.data.crmCompanies) ? window.state.data.crmCompanies : [];
    } catch (_) { return []; }
  };
  function isStopped(row) {
    return Boolean(row && (row.doNotContact === true || STOP_STAGES.includes(row.stage)));
  }
  function buildPlan(row) {
    const business = asText(row && row.company || "su empresa").trim();
    const contact = asText(row && row.contact || "equipo de compras").trim();
    const sector = asText(row && row.sector || "Otro");
    const service = SERVICES[sector] || SERVICES.Otro;
    const hello = "Buen día, " + contact + ":";
    const steps = [
      { day: 0, channel: "Correo", subject: "Corpartes | Fabricación metalmecánica para " + business,
        body: hello + "\n\nSomos Corpartes, una empresa metalmecánica de Medellín. Apoyamos proyectos de " +
          service + ".\n\n¿Podemos conocer qué piezas necesitan fabricar o recibir un plano para cotizar?\n\nSaludos,\nEquipo comercial Corpartes" },
      { day: 3, channel: "WhatsApp", subject: "",
        body: "Hola, " + contact + ". Soy del equipo de Corpartes. Te escribo para saber si recibiste nuestra presentación sobre " +
          service + ". ¿Te sirve que conversemos, o prefieres que no volvamos a contactarte?" },
      { day: 7, channel: "Correo", subject: "¿Hay proyectos por cotizar? | Corpartes",
        body: hello + "\n\nDoy seguimiento a nuestra presentación. Tenemos experiencia en procesos industriales como " +
          service + ".\n\nPodemos revisar material, cantidades y planos y preparar una propuesta técnica.\n\nQuedo atento,\nEquipo comercial Corpartes" },
      { day: 14, channel: "Correo", subject: "Último seguimiento | Corpartes",
        body: hello + "\n\nEste será nuestro último seguimiento. Si más adelante necesitan apoyo con " +
          service + ", estaremos disponibles para evaluar su proyecto.\n\nSaludos,\nEquipo comercial Corpartes" }
    ];
    return { company: business, sector, stopped: isStopped(row), steps };
  }
  const $ = id => document.getElementById(id);
  let mounted = false;
  function html() {
    return '<section class="crm-real-card cp-playbook" id="cpPlaybook">' +
      '<div class="cp-playbook-head"><div><h3>Secuencias comerciales por sector</h3>' +
      '<p>Borradores personalizados de correo y WhatsApp. No se envía ni se agenda ningún mensaje. ' +
      'Antes de contactar, verifica la base legal, la oposición del destinatario y sus preferencias.</p></div>' +
      '<label>Empresa<select id="cpPlaybookCompany"><option value="">Selecciona un prospecto</option></select></label></div>' +
      '<div id="cpPlaybookDetails" class="cp-playbook-note">Selecciona una ficha para preparar los mensajes.</div>' +
      '<div id="cpPlaybookMessages" class="cp-playbook-grid"></div></section>';
  }
  const css = '.cp-playbook{margin-top:14px}.cp-playbook-head{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap}' +
    '.cp-playbook-head label{display:flex;flex-direction:column;gap:5px;font-weight:800;font-size:11px;color:#475569}' +
    '.cp-playbook-head select{min-width:240px;max-width:380px;padding:10px;border-radius:9px;border:1px solid #cbd5e1}' +
    '.cp-playbook-note{font-size:12px;color:#52657a;margin:10px 0;line-height:1.5}' +
    '.cp-playbook-flag{display:inline-flex;align-items:center;gap:7px;margin-left:10px;font-weight:700}' +
    '.cp-playbook-flag input{width:16px;height:16px}.cp-playbook-warning{color:#b91c1c;font-weight:800}' +
    '.cp-playbook-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}' +
    '.cp-playbook-step{padding:13px;background:#f8fafc;border:1px solid #dce6ef;border-radius:11px}' +
    '.cp-playbook-step h4{margin:0 0 8px;font-size:13px}.cp-playbook-step small{color:#64748b}' +
    '.cp-playbook-step pre{font-family:inherit;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.5;margin:10px 0}' +
    '.cp-playbook-step button{border:0;border-radius:8px;background:#155d92;color:#fff;font-weight:800;padding:9px 11px;cursor:pointer}' +
    '.cp-playbook-step button:disabled{opacity:.45;cursor:not-allowed}' +
    '@media(max-width:720px){.cp-playbook-grid{grid-template-columns:1fr}.cp-playbook-head select{min-width:180px}}';
  function refresh() {
    const select = $("cpPlaybookCompany"), target = $("cpPlaybookMessages"), info = $("cpPlaybookDetails");
    if (!select || !target || !info) return;
    const current = select.value;
    const records = getRecords().slice().sort((a, b) => asText(a.company).localeCompare(asText(b.company), "es"));
    select.innerHTML = '<option value="">Selecciona un prospecto</option>' + records.map(r =>
      '<option value="' + escapeHTML(r.id) + '">' + escapeHTML(r.company) + '</option>').join("");
    if (records.some(r => r.id === current)) select.value = current;
    const row = records.find(r => r.id === select.value);
    if (!row) { info.textContent = "Selecciona una ficha para preparar los mensajes."; target.innerHTML = ""; return; }
    const plan = buildPlan(row);
    const flag = '<label class="cp-playbook-flag"><input type="checkbox" id="cpPlaybookOptOut" ' +
      (row.doNotContact ? "checked" : "") + '> No contactar</label>';
    const warning = plan.stopped
      ? '<span class="cp-playbook-warning">Contacto detenido. No copies ni envíes estos mensajes.</span>'
      : 'Días 0, 3, 7 y 14 desde el inicio manual. Solo borradores.' +
        (row.email ? "" : " Falta correo.") + (row.phone ? "" : " Falta teléfono.");
    info.innerHTML = '<strong>' + escapeHTML(plan.sector) + '</strong> · ' + warning + flag;
    target.innerHTML = plan.steps.map((s, i) =>
      '<article class="cp-playbook-step"><h4>Día ' + s.day + ' · ' + escapeHTML(s.channel) + '</h4>' +
      (s.subject ? '<small>Asunto: ' + escapeHTML(s.subject) + '</small>' : '<small>Mensaje corto</small>') +
      '<pre>' + escapeHTML(s.body) + '</pre><button type="button" data-cp-play-copy="' + i + '"' +
      (plan.stopped ? " disabled" : "") + '>Copiar borrador</button></article>').join("");
  }
  async function copyDraft(index) {
    const row = getRecords().find(r => r.id === $("cpPlaybookCompany").value);
    if (!row || isStopped(row)) return false;
    const draft = buildPlan(row).steps[index];
    if (!draft) return false;
    const message = (draft.subject ? "Asunto: " + draft.subject + "\n\n" : "") + draft.body;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const box = document.createElement("textarea");
        box.value = message;box.style.position = "fixed";box.style.left = "-9999px";
        document.body.appendChild(box);box.select();
        const copied = document.execCommand("copy");box.remove();
        if (!copied) throw new Error("copy failed");
      }
      $("cpPlaybookDetails").setAttribute("aria-live", "polite");
      $("cpPlaybookDetails").appendChild(document.createTextNode(" · Copiado; no se envió nada."));
      return true;
    } catch (_) {
      alert("No se pudo copiar automáticamente. Selecciona el texto del borrador.");
      return false;
    }
  }
  function mount() {
    if (mounted || !$("module-crm")) return;
    const host = $("module-crm"), editor = $("crmRealEditor");
    if (!editor) return;
    const style = document.createElement("style");style.textContent = css;document.head.appendChild(style);
    editor.insertAdjacentHTML("beforebegin", html());
    $("cpPlaybookCompany").addEventListener("change", refresh);
    $("cpPlaybookMessages").addEventListener("click", event => {
      const button = event.target.closest("[data-cp-play-copy]");
      if (button) copyDraft(Number(button.dataset.cpPlayCopy));
    });
    $("cpPlaybookDetails").addEventListener("change", event => {
      if (event.target.id !== "cpPlaybookOptOut") return;
      const row = getRecords().find(r => r.id === $("cpPlaybookCompany").value);
      if (!row) return;
      row.doNotContact = event.target.checked;
      row.updatedAt = new Date().toISOString();
      if (typeof window.saveData === "function") window.saveData();
      refresh();
    });
    mounted = true;
    refresh();
  }
  return { mount, refresh, buildPlan, isStopped };
});
