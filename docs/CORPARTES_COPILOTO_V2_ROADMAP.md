# CORPARTES ERP–CRM + COPILOTO IA V2
Fecha de trabajo: 2026-10-28. Rama: corpartes-copiloto-v2.

## Objetivo
Conservar íntegro el ERP industrial ESS que ya construimos e integrar el CRM Corpartes y las funciones de un copiloto capaz de **explicar, proponer, guiar y ejecutar solo acciones permitidas y confirmadas**. No sustituir la operación industrial por una demo.

## Primera entrega implementada en código
1. Se corrigió un error de integración: las referencias a corpartes-ai-v1.js y corpartes-crm-v1.js estaban dentro de una plantilla HTML de impresión, no al final del HTML principal. Ahora se cargan en el documento ERP principal.
2. Se agregó corpartes-copiloto-v2.js, módulo nativo en la barra lateral junto a Corpartes IA V1, preservando los originales.
3. Seis habilidades:
   - Diagnóstico operacional con pedidos y CRM.
   - Pedido próximo o vencido.
   - Inventario de lámina crítico.
   - Programar siguiente gestión comercial sobre ficha existente de CRM, solo con rol autorizado, Firestore sincronizado y confirmación explícita.
   - Exportar CRM real a CSV, respetando permiso CRM, sin enviar datos a sistemas externos.
   - Guías con instrucciones de pedidos, producción, remisiones, inventario, cotizaciones, CRM, informes y administración.
4. Endpoint **api/copilot.js**: respuestas en lenguaje natural vía Vercel AI Gateway, solo lectura. Verifica token JWT de Firebase por la firma oficial de Google y exige proyecto separado con prefijo corpartes-, email verificado y allowlist del servidor. Limpia y limita el contexto. El navegador nunca recibe la clave.
5. Cuando la IA no está configurada o falla, el módulo no inventa resultados: muestra modo local y conserva habilidades deterministas.
6. Se detectó que las fichas CRM y el chat V1 se guardan en un documento meta compartido. Este enfoque no es óptimo para alta concurrencia: migrarlos a colecciones por registro es tarea crítica pendiente.

## Estado de despliegue
**No está publicado en producción**. La rama Firebase original sigue sin Web SDK config de la nueva cuenta, sin usuario propietario de Authentication, sin reglas desplegadas ni bootstrap. Por eso el nuevo Copiloto NO debe conectarse al antiguo ESS ni desplegarse aún como sistema de trabajo. La producción estable de CORPARTES no se modifica con esta rama.

## Activación del endpoint IA
En el Vercel project autorizado configurar las siguientes variables únicamente en servidor:
- CORPARTES_FIREBASE_PROJECT_ID=corpartes-... (ID REAL del proyecto creado).
- CORPARTES_COPILOT_ALLOWED_EMAILS=correo real del propietario, o lista separada por comas.
- AI_GATEWAY_API_KEY=clave privada que se ingresa en Vercel, NUNCA aquí ni en GitHub.
- CORPARTES_AI_MODEL=openai/gpt-5.5 (ejemplo configurable; comprobar disponibilidad/costos en Gateway).

Los tokens se verifican contra el mismo ID CORPARTES. Las respuestas de IA no permiten mutaciones. Para entornos productivos añadir rate limiting distribuido, presupuestos de Gateway, App Check y monitoreo. Validar planes/facturación del proveedor antes de activar.

## Criterios de aprobación — antes de cambiar producción
- Login en nuevo Firebase; ADM01 corresponde al correo propietario, contraseña segura NO genérica.
- Firestore inicializado en entorno propio; roles y documentos correctos.
- El menú abre Pedidos, Producción, Remisiones, Programación, Punzonado, Doblez, Soldadura, Pintura, Entrega, Lámina, Cotizaciones, Seguimiento, Informes, Mantenimiento, Usuarios, CRM, Corpartes IA y Copiloto.
- Un pedido creado en sesión A se ve en sesión B y los movimientos no se duplican.
- La gestión comercial escrita desde Copiloto aparece en CRM y persiste tras recargar; se bloquea sin permiso o sin nube; se cancela sin alterar datos.
- Los CSV se exportan en UTF-8 para Excel y solo incluyen registros autorizados.
- La IA responde preguntas abiertas solamente cuando Firebase y Gateway están configurados; no acepta llamadas sin token, proyecto ajeno, usuarios no incluidos, ni devuelve contraseñas.
- Remisiones y entrega siguen respetando sus bloqueos; recuadros de scroll no se alteran.
- Comparar registros y balances antes de cualquier migración; documentar estrategia de recuperación y copias de seguridad.

## Diseño final deseado: aprender de ERPs líderes, no copiarlos ciegamente
- Odoo 19: IA contextual accesible desde cada aplicación, con «Temas», «Herramientas» y «Fuentes». Fuente: https://www.odoo.com/documentation/19.0/es_419/applications/productivity/ai/agents.html
- Odoo: comando global Ctrl+K, navegación en lenguaje natural, ayuda sin salir del módulo. Fuente: https://www.odoo.com/documentation/19.0/es_419/applications/productivity/ai.html
- Sistemas internacionales (SAP, Business Central, NetSuite): separar maestros, movimientos, contabilidad, permisos, auditoría, aprobaciones y análisis. Diseño de referencia, no paridad funcional afirmada.
- La diferencia de Corpartes será el cálculo metalmecánico, trazabilidad de procesos físicos, integración de planos/nesting y la IA que enseña/apoya tareas con claridad.

## Roadmap de integración REAL
**P0 (seguridad y datos):**
- Firebase aislado: credenciales individuales, Firestore rules por rol, Storage seguro, MFA/App Check, backup/recovery.
- CRM ATLAS: importar datos de los Excel/versiones del usuario (archivo original requerido), deduplicación por NIT, dominio y empresa; contactos, actividades y oportunidades en colecciones separadas; jamás inventar base histórica.
- Mensajería interna en colección por mensaje con paginación y reglas por canal.
- Registro de acciones inmutable del lado servidor, permisos por empresa y usuario, idempotencia y confirmación.

**P1 (operación y CRM):**
- Asistente global Ctrl+K con contexto por pantalla, explicación de campo y acción sugerida.
- Automatización comercial Apollo/Hunter: OAuth/keys server-side, sync incremental, dedupe, lista de exclusión, consentimiento y cancelación de suscripción, borradores, seguimiento, límites de frecuencia. Apollo conectado a ChatGPT NO equivale a conexión de envíos en ERP.
- WhatsApp Business Platform oficial: plantillas aprobadas, consentimiento, webhook, colas de envío, costos y registro de conversación. Sin enviar masivos de forma impropia.
- Email empresarial con SPF/DKIM/DMARC y servicio de envío real. No mandar correos sin proveedor o autorización.
- Mejorar IA con herramientas de lectura verificada y acciones estructuradas; todas las acciones relevantes con revisión/confirmación previa y registro de auditoría.

**P2 (finanzas/contabilidad colombiana):**
- Plan de cuentas, terceros/NIT, diarios, asientos de doble partida, impuestos y retenciones parametrizables, cartera, tesorería, conciliaciones bancarias, compras, proveedores, costos por orden, inventarios valorados, centros de costos, cierres y periodos bloqueados; históricos no mutables y trazabilidad.
- Informes: balance de comprobación, estado de situación financiera, resultados, auxiliares, cartera por edad, costos y márgenes por pedido.
- Integración DIAN mediante proveedor tecnológico/API con pruebas habilitadas y validación de anexos técnicos, CUFE, numeración, notas, contingencia, facturas, nómina y documentos soporte según aplicabilidad. DIAN ofrece modo gratuito, desarrollo propio o proveedor tecnológico; no presumir conformidad hasta pruebas completas. Fuentes:
  - https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/requerimientos-para-ser-facturador-electronico/
  - https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/
- NIIF y políticas contables deben ser aprobadas por contador y asesor tributario; **no** crear facturas válidas o libros oficiales por una simple respuesta del chat.

**P3 (SaaS metalmecánico):**
- Organizaciones separadas, roles y suscripciones por compañía, módulos opcionales; multi-tenant con aislamiento demostrado; KPI y costos específicos de corte láser, punzonado, doblez, soldadura y pintura.
- Sincronización con equipos/CNC y TruTops GMT con motor bajo control.
- Paneles visuales, experiencia móvil, búsquedas por lenguaje natural, simulación de costos, alertas predictivas con datos suficientes.

## Riesgos conocidos
- El estado calculado en browser puede estar desactualizado: verificar sincronización y escritura en nube.
- El CSV puede contener contactos comerciales; solo usuarios con permiso y con políticas de protección de datos.
- El historial CRM actual se adjunta a notas de 2000 caracteres: no sustituye bitácora server-side inmutable.
- La IA generativa es LECTORA, no ejecutora autónoma. «Ejecutar» significa habilidad determinista con controles, no tool calling libre.
- El motor de IA externa no está activo mientras falten Firebase Corpartes y AI Gateway.
