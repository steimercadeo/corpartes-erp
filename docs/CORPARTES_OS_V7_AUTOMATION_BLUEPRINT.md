# CORPARTES OS V7 — Plataforma de automatización industrial

## Alcance de esta entrega (rama de desarrollo; producción intacta)
- Automation Studio V7: módulo visual y simulador ejecutable. Enlace en menú y en la barra superior del acceso DEMO.
- Flujo Shopify → validación de pago → disponibilidad/fabricación → selección de transportadora → aprobación → número de guía ficticio → seguimiento ficticio.
- Reglas de bloqueo: sin pago confirmado, sin SKU/ciudad/cliente, sin disponibilidad, sin fabricación completada o sin autorización, no se genera ni siquiera una guía de demostración.
- Auditoría local: cada transición tiene evento, hora, detalle y referencia; exportación JSON para revisión.
- Catálogo de diez automatizaciones para ventas, cotización industrial, compras, producción, calidad, contabilidad/DIAN, cartera, postventa y mantenimiento.
- IA local: biblioteca ampliada para explicar este flujo; comando 'abre Shopify' disponible desde la IA en modo ejecutar.
- El acceso de revisión se mantiene con Nico123/Nico123, sin Firebase ni persistencia.

## Lo que NO está activo
- Sin conexión OAuth, token Admin API ni webhooks inscritos en una tienda Shopify.
- Sin guía auténtica ni tarifa real de Coordinadora/Servientrega/Envía.
- Sin pedidos, movimientos de inventario, notas contables o facturación real generados por esta simulación.
- Sin mensajería enviada a clientes. No confundir enlace de preview ni cuenta DEMO con credenciales seguras.

## Backend Shopify — estado
- api/_shopify-intake.js implementa verificación HMAC (sha256 + timingSafeEqual), dominio permitido, normalización redactada de órdenes e identificación idempotente del webhook.
- api/shopify-webhook.js sólo responde si SHOPIFY_WEBHOOK_ENABLED=true y existen los secretos protegidos; de lo contrario falla cerrado con HTTP 503.
- Al habilitarse con una cuenta de servicio y Firestore configurado, únicamente almacena eventos de revisión bajo shopifyWebhookEvents con ID hash determinístico; HTTP 409 en Firestore se trata como duplicado.
- En ningún escenario este endpoint ejecuta órdenes de producción, reservas, pagos, entregas o facturación. Esa orquestación debe implementarse con cola, transacciones, reglas y aprobaciones.
- No enviar datos personales completos del comprador en la integración inicial: se guarda ciudad, SKU, estado, IDs y metadatos mínimos.

## Variables de servidor necesarias para la recepción segura (aún no se deben activar)
SHOPIFY_WEBHOOK_ENABLED=false
SHOPIFY_WEBHOOK_SECRET=secreto_de_la_app_shopify
SHOPIFY_ALLOWED_SHOP_DOMAIN=tu-tienda.myshopify.com
CORPARTES_SHOPIFY_ORG_ID=org_corpartes
FIREBASE_PROJECT_ID=proyecto_autorizado
FIREBASE_SERVICE_ACCOUNT_JSON=credencial_secreta_de_servicio
El servicio debe tener acceso mínimo al proyecto correcto; NUNCA colocar secretos en JS, GitHub, chat ni archivos públicos.

## Arquitectura futura para automatización REAL
1. Importador de productos y SKUs con mapa a referencias de ESS; clasificar stock versus fabricar.
2. Tienda Shopify conectada con permisos mínimos y suscripciones orders/create y eventos de cambios, siempre verificados con HMAC.
3. Cola durable con reintentos, deduplicación por delivery y por orden, reconciliación programada y bandeja de errores.
4. Validación de pago, dirección, stock reservado/resultado de producción, embalaje, peso y dimensiones.
5. Cotización de flete y selección de carrier por reglas verificadas (precio, SLA, cobertura, mercancía y contrato).
6. Creación de guía real mediante API de transportadora con credenciales server-side, idempotencia y almacenamiento del PDF/etiqueta.
7. Registrar cumplimiento con Shopify GraphQL fulfillmentCreate o actualización de tracking según el estado; no crear cumplimiento antes de despacho real.
8. Enviar eventos de seguimiento al ERP y, con permiso, al cliente; conciliación de facturas/DIAN como flujo separado.
9. Panel de monitoreo, auditoría, métricas de errores y reintentos; pausa de emergencia para cada automatización.
10. Multiempresa SaaS: aislamiento por organizationId, roles, consentimientos y acceso por mínimos privilegios.

## Fuentes oficiales consultadas (29 oct 2026)
- Shopify webhooks y deduplicación: https://shopify.dev/docs/apps/build/webhooks
- Verificación de entregas: https://shopify.dev/docs/apps/build/webhooks/verify-deliveries
- Creación de entregas/tracking: https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate
- Estado objetivo de ERP con sincronización Shopify: https://www.odoo.com/documentation/19.0/applications/sales/sales/shopify_connector.html

## Validación y despliegue
- Tests unitarios en tests/automation-studio.test.js.
- Prueba de navegación DEMO en tests/demo-browser.test.cjs con Chromium (Shopify: pedido, validación, aprobación, guía demo, tracking).
- Se despliega preview automáticamente desde corpartes-dev-20261028.
- No publicar a producción ni habilitar webhooks hasta aprobación y pruebas con tienda sandbox, transportadora sandbox, reglas Firestore y auditoría.