# CORPARTES · ERP–CRM con IA accionable
Fecha: 28-oct-2026 · Rama: corpartes-copilot-v2 · Estado: desarrollo aislado

## Lo que ya está implementado en este commit

- Mantiene el ERP industrial ESS existente y sus rutas de producción.
- Corrige carga de scripts para que Corpartes IA y CRM Comercial se incorporen al DOM real (antes los src sólo aparecían dentro de un template para imprimir).
- Corpartes Copiloto V2 visible dentro del módulo IA: **guías y explicación de 11 módulos**, navegación de acuerdo con los permisos, contextualización de preguntas.
- Endpoint `POST /api/assistant`: respuesta con modelo real a través de AI Gateway, después de verificar token Firebase y propietario activo. Los datos usados proceden de consultas del servidor a Firestore CORPARTES: una muestra recortada de pedidos, inventario, remisiones y CRM. **Sólo lectura**, y declara límites. Si no está configurado el gateway, el chat responde explícitamente en modo local por reglas.
- `GET /api/actions` y `POST /api/actions`: consulta de gestiones comerciales y alta de **seguimiento comercial** con vista previa, confirmación humana, idempotencia, validación de fecha y escritura en transacción de `corpartes_crm_tasks` + `corpartes_audit`.
- Reglas Firestore: acceso a leer gestiones y auditoría limitado al propietario; ninguna escritura desde el navegador. Guardado mediante Firebase Admin solamente.
- `package.json` para dependencias serverless de Firebase Admin.

## Estado de integraciones — sin marketing engañoso

| Sistema | Estado exacto |
|---|---|
| Pedidos/Producción/Seguimiento/Remisiones/Almacén | Código ESS original preservado en ERP |
| CRM Comercial básico | Código UI existente, empresas y etapas manuales |
| Corpartes IA por reglas | Existente; se marca explícitamente como modo local |
| Copiloto — guías y navegación | Implementado V2 |
| Consulta IA real | Endpoint implementado, **pendiente** Firebase propietario + credencial AI Gateway |
| Seguimiento comercial auditado | Endpoint/UI implementados, **pendiente** Firebase propietario + credencial Admin |
| CRM Atlas histórico | No importado; se necesita archivo original verificable |
| Apollo / Hunter en ERP | No conectado a API; los conectores ChatGPT no integran automáticamente al sitio |
| WhatsApp Business API / correo masivo | No configurados; no hay mensajes salientes |
| Contabilidad completa, NIIF/PUC, cartera, bancos | No implementados como libro contable certificado |
| Factura electrónica DIAN / nómina | No integrado ni habilitado |
| Shopify / e-commerce | No integrado |
| Sistema multiempresa SaaS | Requiere modelo tenant seguro, pruebas de aislamiento y migración |

## Activación del backend (nunca en el navegador)

1. Crear Firebase independiente de ESS; registrar proyecto que comience por `corpartes-`, app web, Auth Email/Password y Firestore. Usar `docs/FIREBASE_CORPARTES_NUEVO.md` para el bootstrap del propietario.
2. Publicar reglas Firestore actualizadas en la consola o mediante CLI, y verificar `corpartes_members/{uid}` sólo desde admin.
3. Configurar las variables **secretas** en el entorno de Vercel, **no GitHub ni chat**:
   - `CORPARTES_FIREBASE_PROJECT_ID` = ID exacto del nuevo proyecto.
   - `CORPARTES_FIREBASE_SERVICE_ACCOUNT_JSON` = JSON del servicio admin del nuevo proyecto; preferible identidad administrada cuando sea viable.
   - `AI_GATEWAY_API_KEY` = credencial privada AI Gateway.
   - `CORPARTES_AI_MODEL` = modelo opcional; valor por defecto `openai/gpt-5.5`.
4. Completar `corpartes-firebase-config.js` con los datos **públicos** Web SDK y el email real del administrador.
5. Desplegar **sólo preview**, probar login seguro, preguntas, fallos, tareas e idempotencia, permisos de otros usuarios, CRM, pedidos, remisiones, informes, inventarios, documentos y nesting. Crear respaldo y plan de rollback antes de publicar en el dominio principal.

## Referencias de diseño (funciones, no copias de software)

- **Odoo**: modularidad integrada de Ventas/CRM/Inventario/Manufactura/Contabilidad.
- **ERPNext**: cadena de documentos trazables, fabricación con consumo de materiales y asientos.
- **Dynamics 365 Business Central**: agente comercial que prepara, pide revisión y ejecuta sólo tras controles.
- **NetSuite / SAP**: controles, dimensiones financieras, auditoría y métricas para empresas.
- **World Office**: localización contable Colombia, DIAN, bancos, exógena, cuentas por pagar/cobrar, nómina, pero con experiencia más contextual y educativa.
- **Nuestra diferenciación**: cotizar, planificar y fabricar metalmecánica desde planos PDF/DXF y programas de punzonado/TruTops hasta inventario, entrega, cartera y contabilidad, con IA que enseña dentro de cada tarea.

## Arquitectura objetivo

### Dominios

- `tenant`, `users`, `roles`, `permissions`, `audit`
- `crm_companies`, `crm_contacts`, `crm_opportunities`, `crm_activities`, `outreach_sequences`, `consents`
- `quotes`, `quote_items`, `price_lists`, `manufacturing_boms`, `manufacturing_routes`
- `orders`, `order_items`, `work_orders`, `operation_events`, `quality_events`, `remissions`
- `inventory_items`, `lots`, `stock_movements`, `sheet_materials`, `machine_assets`, `maintenance_orders`
- `accounting_chart`, `journal_entries`, `journal_lines`, `tax_rates`, `fiscal_periods`, `ap`, `ar`, `bank_reconciliations`, `fixed_assets`
- `electronic_documents`, `dian_events`, `integrations`, `webhooks`, `automation_runs`, `agent_actions`, `agent_approvals`

Esta estructura es el **modelo futuro**, no una migración realizada. Hay que definir tenencia, invariantes, eventos, conciliación y seguridad antes de traspasar ESS.

### Reglas obligatorias de IA ejecutora

- **Leer**: contextual y con fuente y límites visibles, filtrando por rol.
- **Proponer**: explicar qué hará, por qué y qué datos afectará.
- **Solicitar aprobación**: acciones externas (correo/WhatsApp), borrados, precios, autorizaciones, pagos, nómina, movimientos, documentos DIAN.
- **Ejecutar**: en servidor, con validación de roles, transacción, idempotencia, control de concurrencia y log.
- **Enseñar**: ayuda dentro del módulo, pasos específicos y aclaración de errores, sin inventar datos.
- **Auditar**: actor, hora, entidad, antes/después, resultado, rollback cuando aplique.
- **Límites**: nunca dar al modelo control arbitrario sobre SQL, Firestore Admin, secretos o llamadas HTTP a destinos abiertos.

### Contabilidad de Colombia: se construirá con pruebas

Plan único de cuentas parametrizable, terceros y NIT, centros de costos, doble partida en asientos inmutables, reversos, cierres, IVA y retenciones, causación, cuentas por pagar/cobrar, cartera, conciliación bancaria, activos, costos de fabricación, nómina, estados NIIF, información exógena. Diseñar condiciones de balance y trazabilidad antes de activar contabilizaciones. Las declaraciones y normas deben validarse con contador.

Para facturación electrónica usar un proveedor tecnológico autorizado por la DIAN o software propio habilitado y probado. No declarar funciones DIAN operativas por el solo hecho de crear interfaces.

### Prioridad de sprints

1. **Fundación segura y QA**: Firebase CORPARTES, roles, tareas, CRM y chat como documentos independientes (no arrays globales), backup y observabilidad.
2. **Ventas que convierten**: recuperar Atlas, limpieza/deduplicación, cuentas Apollo/Hunter, vincular correo, consentimientos y secuencias.
3. **Planta conectada**: BOM, rutas, cotizaciones, costo real, DXF/PDF/TruTops/GMT, capacidad de máquinas, mantenimiento, calidad.
4. **Finanzas/DIAN**: compras/cartera/bancos/contabilidad de doble partida, integración certificada con DIAN y nómina.
5. **Agent OS**: catálogo creciente de habilidades aprobadas, simulaciones, sugerencias predictivas y comandos de voz; multiempresa luego de aislamiento probado.

## QA de aceptación mínimo

- Todas las pestañas originales ESS abren, la navegación se conserva y los módulos nuevos no afectan impresión.
- Pedidos conserva barras azules apiladas, cuadrantes de scroll; Remisiones, Producción, Seguimiento e Informes continúan funcionales.
- Sin configuración: chat marca explícitamente modo local, acciones fallan cerradas, el usuario no ve un falso éxito.
- Sin usuario/otro rol: API 403 y ninguna escritura.
- Acción confirmada: 1 tarea + 1 log; repetición mismo requestId no crea duplicados.
- No confirmada/cancelada: cero cambios.
- Autorización admin y aislamiento Firebase CORPARTES antes de cualquier despliegue productivo.
- Concurrencia en 2 navegadores antes de migrar CRM/chat.

## Referencias documentales

https://docs.erpnext.com/index
https://learn.microsoft.com/en-us/dynamics365/business-central/sales-order-agent-process
https://vercel.com/docs/ai-gateway/authentication-and-byok
https://firebase.google.com/docs/auth/admin/verify-id-tokens
https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/requerimientos-para-ser-facturador-electronico/
https://worldoffice.com.co/

## Planificación de acciones por lenguaje natural (añadido)

- `POST /api/plan`: interpreta **únicamente** solicitudes de crear seguimientos comerciales, verificando antes Firebase Auth y membresía propietaria. El modelo **sólo prepara JSON**; no tiene herramientas de escritura.
- Si faltan empresa, actividad o fecha, pide aclaración. Todas las propuestas se validan en servidor, pasan a la ficha del copiloto y requieren clic explícito de confirmación.
- `POST /api/actions` valida por segunda vez la acción y la ejecuta con transacción y auditoría. El modelo nunca decide el permiso.
- Prueba conversacional futura cuando esté configurado el modelo: «Crea un seguimiento para HMV mañana: llamar para revisar la cotización».
- No equivale a una automatización programada ni envía notificaciones: crea una gestión pendiente en Firestore. Se añadirán calendarios y recordatorios en una fase posterior.
