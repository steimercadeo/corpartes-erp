# CORPARTES AI OS — plan de continuidad real (27-oct-2026)

Este proyecto es una evolución del ERP CORPARTES construido desde ESS V70.2; **no debe reemplazarse por maquetas**. Producción continúa en corpartes-erp.vercel.app, rama reconstruccion-v1. Las pruebas incrementales van en corpartes-ai-os-v1.

## Módulos existentes
Pedidos, Programación/Producción, Remisiones, Seguimiento, Informes, Inventario de lámina, Almacén, Mantenimiento, Cotizaciones industriales, DXF/PDF, nesting/TruTops, roles/usuarios, Firestore y autenticación Firebase.

## Nuevo en rama de pruebas
- Corpartes IA v1: análisis y chat por reglas basados en registros reales del ERP (no LLM todavía).
- CRM comercial v1: fichas de empresa, sector, contacto, fuente, etapa, valor potencial, notas y próxima gestión. Reconoce nombres de clientes en Pedidos y Cotizaciones. Persiste en el documento de metadatos existente en Firestore cuando hay sesión válida y nube online.
- Chat interno v1: prototipo experimental en metadatos. No está listo para alta concurrencia.

## Pendiente (NO afirmar implementado)
Sincronización API con Apollo/Hunter, buzones y secuencias de email, WhatsApp Business API, contabilidad/NIIF/DIAN, Shopify, transportadoras, agentes IA generativos y multiempresa en este ERP actual.

## Prioridades
1. Recuperar acceso válido a Firebase Auth (sin contraseña administradora pública).
2. Migrar CRM y chat a colecciones Firestore separadas con reglas de acceso y cambios transaccionales para evitar pérdida por concurrencia.
3. Integrar Apollo/Hunter por backend seguro, deduplicación y consentimiento.
4. Motor de comunicación con opt-out, secuencias y auditoría.
5. IA con consultas autorizadas al ERP, fuentes verificables y aprobación para acciones.
6. Modularizar de forma gradual a Next.js/PostgreSQL sin perder los motores ESS.
