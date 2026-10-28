"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPlan, isStopped } = require("../corpartes-crm-playbooks-v1");

test("construye cuatro borradores, sin envío", () => {
  const result = buildPlan({ company: "Industria Ejemplo", contact: "Laura", sector: "Construcción", stage: "Prospecto" });
  assert.equal(result.steps.length, 4);
  assert.deepEqual(result.steps.map(x => x.day), [0, 3, 7, 14]);
  assert.deepEqual(result.steps.map(x => x.channel), ["Correo", "WhatsApp", "Correo", "Correo"]);
  assert.match(result.steps[0].body, /corte y doblez/);
  assert.match(result.steps[0].subject, /Industria Ejemplo/);
  assert.equal(result.stopped, false);
});

test("diferencia sector de tableros eléctricos y mobiliario", () => {
  const cabinet = buildPlan({ company: "Tableros", sector: "Tableros eléctricos" });
  const furniture = buildPlan({ company: "Muebles", sector: "Mobiliario" });
  assert.match(cabinet.steps[0].body, /gabinetes/);
  assert.match(furniture.steps[0].body, /mobiliario comercial/);
  assert.notEqual(cabinet.steps[0].body, furniture.steps[0].body);
});

test("marca baja y estados terminales como detenidos", () => {
  assert.equal(isStopped({ stage: "Prospecto", doNotContact: true }), true);
  assert.equal(isStopped({ stage: "Cliente", doNotContact: false }), true);
  assert.equal(isStopped({ stage: "Perdido" }), true);
  assert.equal(isStopped({ stage: "Negociación" }), false);
  assert.equal(buildPlan({ company: "No contactar", doNotContact: true }).stopped, true);
});

test("sectores desconocidos tienen plantilla segura y sin promesas inventadas", () => {
  const result = buildPlan({ company: "X", sector: "Desconocido" });
  assert.match(result.steps[0].body, /fabricación metalmecánica/);
  assert.doesNotMatch(result.steps[0].body, /garantizamos|fabricamos para Éxito|descuento del/);
});

test("datos del prospecto no modifican el registro", () => {
  const row = { company: "Original", stage: "Prospecto", doNotContact: false };
  const before = JSON.stringify(row);
  buildPlan(row);
  assert.equal(JSON.stringify(row), before);
});
