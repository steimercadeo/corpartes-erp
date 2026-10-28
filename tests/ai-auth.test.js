"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { generateKeyPairSync, sign } = require("node:crypto");
const { AuthError, bearerToken, verifyFirebaseIdToken } = require("../api/_firebase-auth");

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "local-test", alg: "RS256", use: "sig" };
const projectId = "corpartes-test";
const now = Math.floor(Date.now() / 1000);
function jwt(override = {}, headerOverride = {}) {
  const header = { alg: "RS256", kid: "local-test", typ: "JWT", ...headerOverride };
  const claims = {
    aud: projectId,
    iss: "https://securetoken.google.com/" + projectId,
    sub: "user-test-01",
    exp: now + 1800,
    iat: now - 20,
    auth_time: now - 60,
    ...override
  };
  const b64 = x => Buffer.from(JSON.stringify(x)).toString("base64url");
  const input = b64(header) + "." + b64(claims);
  return input + "." + sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
}
const verifyLocal = token => verifyFirebaseIdToken(token, projectId, { keys: [jwk] });
const rejects = (token, status = 401) => assert.rejects(verifyLocal(token), error => error instanceof AuthError && error.status === status);

test("valida token auténtico de Firebase (firma, proyecto y vigencia)", async () => {
  const result = await verifyLocal(jwt({ email: "usuario@corpartes.com" }));
  assert.equal(result.uid, "user-test-01");
  assert.equal(result.email, "usuario@corpartes.com");
});

test("no acepta tokens ausentes o malformados", async () => {
  await rejects("");
  await rejects("a.b.c");
});

test("no acepta firma adulterada", async () => {
  const valid = jwt();
  const parts = valid.split(".");
  parts[2] = parts[2].slice(0, -5) + "AAAAA";
  await rejects(parts.join("."));
});

test("no acepta tokens de otro proyecto Firebase", async () => {
  await rejects(jwt({ aud: "otro-proyecto" }));
  await rejects(jwt({ iss: "https://securetoken.google.com/otro-proyecto" }));
});

test("no acepta vencimiento ni autenticación futura", async () => {
  await rejects(jwt({ exp: now - 120 }));
  await rejects(jwt({ auth_time: now + 120 }));
  await rejects(jwt({ iat: now + 120 }));
});

test("no acepta algoritmos o firmas de claves desconocidas", async () => {
  await rejects(jwt({}, { alg: "none" }));
  await rejects(jwt({}, { kid: "otro-kid" }));
});

test("falla cerrado si falta FIREBASE_PROJECT_ID", async () => {
  await assert.rejects(verifyFirebaseIdToken(jwt(), "", { keys: [jwk] }), error => error.status === 503);
});

test("solo extrae credenciales con formato Bearer válido", () => {
  assert.equal(bearerToken("Bearer abc.def-12"), "abc.def-12");
  assert.equal(bearerToken("Basic abc.def"), "");
  assert.equal(bearerToken("Bearer token otro"), "");
  assert.equal(bearerToken(undefined), "");
});
