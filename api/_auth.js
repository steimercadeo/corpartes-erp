"use strict";
const { initializeApp, getApps, applicationDefault, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

function firebaseServices() {
  const projectId = process.env.CORPARTES_FIREBASE_PROJECT_ID;
  if (!projectId || !/^corpartes-[a-z0-9-]+$/.test(projectId)) {
    throw new Error("Firebase CORPARTES no configurado.");
  }
  if (!getApps().length) {
    const raw = process.env.CORPARTES_FIREBASE_SERVICE_ACCOUNT_JSON;
    let credential;
    if (raw) {
      const key = JSON.parse(raw);
      if (key.project_id !== projectId) throw new Error("La credencial no pertenece a Firebase CORPARTES.");
      credential = cert(key);
    } else {
      credential = applicationDefault();
    }
    initializeApp({ credential, projectId });
  }
  return { auth: getAuth(), db: getFirestore(), projectId };
}

async function authenticate(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
  if (!match) return null;
  const { auth, db } = firebaseServices();
  const token = await auth.verifyIdToken(match[1], true);
  const member = await db.collection("corpartes_members").doc(token.uid).get();
  const data = member.exists ? member.data() : null;
  if (!data || data.active !== true || data.companyId !== "corpartes" || data.role !== "owner") return null;
  return { uid: token.uid, email: token.email || "", db, role: data.role };
}
function json(res, status, payload) {
  res.status(status).setHeader("Cache-Control", "no-store").setHeader("Content-Type", "application/json; charset=utf-8").end(JSON.stringify(payload));
}
function errorMessage(error) {
  const code = String(error?.code || "");
  if (/auth\//.test(code)) return "Sesión no válida o caducada.";
  return "El servicio no está listo. Revisa Firebase CORPARTES y sus credenciales de servidor.";
}
module.exports = { authenticate, firebaseServices, json, errorMessage };
