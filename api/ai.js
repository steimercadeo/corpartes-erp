/* CORPARTES AI SERVER · acceso protegido por Firebase Auth.
   Solo responde consultas; jamás modifica datos ni ejecuta envíos. */
"use strict";
const { AuthError, bearerToken, verifyFirebaseIdToken } = require("./_firebase-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "GET") return res.status(200).json({ ok: true });
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  const token = bearerToken(req.headers && req.headers.authorization);
  if (!token) return res.status(401).json({ error: "Debes iniciar sesión en Corpartes ERP para utilizar la IA." });

  try {
    await verifyFirebaseIdToken(token, process.env.FIREBASE_PROJECT_ID);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 503;
    return res.status(status).json({ error: status === 503
      ? "No se pudo validar tu sesión. Consulta al administrador."
      : "Sesión inválida o vencida. Ingresa nuevamente al ERP." });
  }

  const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const model = process.env.AI_GATEWAY_MODEL;
  if (!gatewayToken || !model) {
    return res.status(503).json({ error: "Corpartes IA todavía no está configurada en este entorno." });
  }

  try {
    const length = Number(req.headers && req.headers["content-length"] || 0);
    if (length > 35000) return res.status(413).json({ error: "Consulta demasiado extensa." });
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const question = String(body.question || "").trim().slice(0,4000);
    const allowedModes = ["preguntar","explicar","enseñar","proponer","ejecutar"];
    const mode = allowedModes.includes(body.mode) ? body.mode : "preguntar";
    if (!question) return res.status(400).json({ error: "Pregunta vacía." });

    // Datos agregados autorizados por la interfaz, nunca permisos inferidos del cuerpo.
    const sentContext = body.context && typeof body.context === "object" && !Array.isArray(body.context) ? body.context : {};
    const context = {
      company: "CORPARTES",
      module: String(sentContext.module || "").slice(0,50),
      summary: sentContext.summary && typeof sentContext.summary === "object" ? sentContext.summary : {}
    };
    const contextText = JSON.stringify(context).slice(0,12000);
    const system = [
      "Eres Corpartes IA, copiloto del ERP-CRM de una empresa metalmecánica colombiana.",
      "Responde en español claro y práctico. Las cifras recibidas son contexto de interfaz, no datos auditados del servidor.",
      "No inventes clientes, cifras, pedidos, normas ni estados. Si falta información, dilo.",
      "Modo: " + mode + ".",
      mode === "enseñar" ? "Enseña paso a paso y explica el porqué." : "",
      mode === "explicar" ? "Explica causas probables y qué revisar." : "",
      mode === "proponer" ? "Propón acciones por impacto, urgencia y riesgo, sin afirmar ejecución." : "",
      mode === "ejecutar" ? "No ejecutes cambios: solo explica cómo solicitar y confirmar acciones permitidas." : "",
      "Nunca solicites contraseñas, llaves ni secretos. Para pagos, borrados, envíos, permisos y contabilidad exige aprobación humana."
    ].filter(Boolean).join("\n");

    const upstream = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + gatewayToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, temperature: 0.2, max_tokens: 900,
        messages: [
          { role: "system", content: system },
          { role: "user", content: "CONTEXTO DE INTERFAZ:\n" + contextText + "\n\nSOLICITUD:\n" + question }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(502).json({ error: "No fue posible consultar el modelo de IA." });
    const answer = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({ error: "El modelo no devolvió respuesta." });
    }
    return res.status(200).json({ answer: answer.slice(0,12000) });
  } catch (error) {
    if (error instanceof SyntaxError) return res.status(400).json({ error: "Solicitud JSON inválida." });
    console.error("CORPARTES_AI_ERROR", error && error.name || "unknown");
    return res.status(500).json({ error: "No fue posible procesar la consulta de IA." });
  }
};
