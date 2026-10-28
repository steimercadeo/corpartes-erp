/* Validación criptográfica de Firebase ID Tokens para funciones Vercel.
   No confiar en datos de rol ni usuario enviados por el navegador.
   Certificados públicos de Google; nunca se descargan secretos privados. */
"use strict";
const { createPublicKey, verify, constants } = require("node:crypto");

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const CACHE_MS = 30 * 60 * 1000;
let cached = null;
let expiresAt = 0;

class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function segmentJson(part) {
  if (!part || !/^[A-Za-z0-9_-]+$/.test(part)) throw new AuthError("Token inválido.");
  try { return JSON.parse(Buffer.from(part, "base64url").toString("utf8")); }
  catch (_) { throw new AuthError("Token inválido."); }
}

async function publicKeys(fetcher = fetch) {
  if (cached && Date.now() < expiresAt) return cached;
  let result;
  try {
    const response = await fetcher(JWKS_URL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("JWKS HTTP " + response.status);
    result = await response.json();
  } catch (_) {
    throw new AuthError("No fue posible validar la sesión de Firebase.", 503);
  }
  if (!result || !Array.isArray(result.keys) || !result.keys.length) {
    throw new AuthError("Respuesta de autenticación no válida.", 503);
  }
  cached = result.keys;
  expiresAt = Date.now() + CACHE_MS;
  return cached;
}

async function verifyFirebaseIdToken(token, projectId, options = {}) {
  if (!projectId || !/^[a-zA-Z0-9-]+$/.test(projectId)) {
    throw new AuthError("Falta configurar FIREBASE_PROJECT_ID.", 503);
  }
  if (typeof token !== "string" || token.length > 8192 || token.length < 50) {
    throw new AuthError("Debes iniciar sesión en el ERP.");
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new AuthError("Token inválido.");
  const header = segmentJson(parts[0]), claims = segmentJson(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    throw new AuthError("Token no admitido.");
  }
  const now = Math.floor(Date.now() / 1000), leeway = 30;
  if (claims.aud !== projectId ||
      claims.iss !== "https://securetoken.google.com/" + projectId ||
      typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 128 ||
      !Number.isInteger(claims.exp) || claims.exp <= now - leeway ||
      !Number.isInteger(claims.iat) || claims.iat > now + leeway ||
      !Number.isInteger(claims.auth_time) || claims.auth_time > now + leeway ||
      claims.iat > claims.exp ||
      (claims.nbf != null && (!Number.isInteger(claims.nbf) || claims.nbf > now + leeway))) {
    throw new AuthError("Sesión caducada o no válida.");
  }
  const keys = options.keys || await publicKeys(options.fetcher);
  const key = keys.find(k => k.kid === header.kid && k.kty === "RSA" && (!k.alg || k.alg === "RS256"));
  if (!key) throw new AuthError("No se encontró la clave de autenticación.");
  let valid = false;
  try {
    valid = verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), {
      key: createPublicKey({ key, format: "jwk" }),
      padding: constants.RSA_PKCS1_PADDING
    }, Buffer.from(parts[2], "base64url"));
  } catch (_) { valid = false; }
  if (!valid) throw new AuthError("Firma de sesión no válida.");
  return { uid: claims.sub, email: claims.email || "", claims };
}

function bearerToken(header) {
  if (typeof header !== "string") return "";
  const match = /^Bearer\s+([A-Za-z0-9._-]+)$/i.exec(header.trim());
  return match ? match[1] : "";
}

module.exports = { AuthError, bearerToken, verifyFirebaseIdToken };
