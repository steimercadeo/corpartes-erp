# CORPARTES ERP–CRM–AI OS V2

## Visión
Corpartes debe ser un sistema operativo empresarial para metalmecánica: el usuario no tiene que memorizar rutas ni aprender un ERP pesado. La IA explica, enseña, propone y ejecuta acciones autorizadas sobre una interfaz simple.

## Implementado en esta rama
- Centro de Control 360.
- Buscador global Ctrl/Cmd + K.
- Ayuda contextual.
- CRM Atlas+ con pipeline visual y score comercial básico.
- Finanzas 360 V1: CxC, CxP, ingresos, egresos, vencimientos y estados.
- Corpartes IA con modos Preguntar, Explicar, Enseñar, Proponer y Ejecutar.
- Ejecución local segura de navegación por lenguaje natural.
- Backend /api/ai preparado para Vercel AI Gateway sin secretos en navegador.
- Centro de integraciones con estados explícitos y verificables.

## Siguiente capa
Finanzas: PUC configurable, comprobantes, partida doble, centros de costo, bancos, conciliación, impuestos, activos fijos y nómina.
CRM: empresas/contactos/actividades/oportunidades en colecciones separadas; Apollo, Hunter, email y WhatsApp server-side.
Producción: BOM/MRP, capacidad, costeo real vs cotizado, calidad, OEE y mayor integración TruTops.
DIAN: conectar por proveedor tecnológico/API o desarrollo habilitado, con auditoría.
IA: herramientas server-side con RBAC, confirmaciones, auditoría y memoria documental/RAG.

## Seguridad
No almacenar claves privadas en GitHub. Las acciones financieras, eliminaciones, envíos y cambios de permisos requieren confirmación humana. La futura base Firebase debe separar información financiera/comercial sensible por colecciones y roles.

## IA en Vercel
Configurar AI_GATEWAY_MODEL con un modelo vigente del catálogo de AI Gateway. Autenticar con VERCEL_OIDC_TOKEN en Vercel o AI_GATEWAY_API_KEY como secreto. No exponer credenciales al navegador.

## Regla de despliegue
No promover a producción hasta probar en preview: login, Pedidos, Producción, Remisiones, Seguimiento, Lámina, Almacén, Mantenimiento, Cotizaciones, Informes, CRM, Centro de Control, Finanzas e IA.
