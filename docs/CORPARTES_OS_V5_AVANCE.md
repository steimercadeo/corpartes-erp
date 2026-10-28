# CORPARTES OS V5 — Estado verificado (28-oct-2026)

Rama: corpartes-dev-20261028. No fusionar ni promover a producción.

## Módulos nuevos (vista de desarrollo)
- Atlas 360: importación de CSV/XLSX local, consulta, filtros, detalle y exportación CSV. Archivos solo en memoria; no se sincronizan con Firestore todavía.
- Mercadeo: planificación de campañas, presupuesto, metas, canales y responsables. No envía correos ni mensajes.
- Logística: registro de revisión de despachos con referencias, transportador, fecha prometida y estado. No actualiza remisiones reales.
- Colombia / DIAN: matriz de preparación NIIF, factura electrónica, documento soporte, nómina, impuestos, bancos y exógena. No certifica cumplimiento ni transmite a DIAN.
- Integraciones: muestra con transparencia el estado pendiente de Apollo, Hunter, correo, WhatsApp, DIAN y sincronización con Revenue OS.

## CRM Atlas original
Base privada encontrada: CRM_ATLAS_CORPARTES_V42_LOTE_18_CONTACTOS_VERIFICADOS.xlsx; hoja CRM_ATLAS, 3041 empresas y campos de prospectos, fuentes y contactos.
El archivo NO fue agregado al repositorio público GitHub. Se debe cargar privadamente desde Atlas 360 usando el selector de archivos.
Mapa de columnas: ID, Empresa, Sector, Subsector, Municipio/Base, Oportunidad para CORPARTES, Potencial, Estado, Fuente, correos compras/comercial, teléfono y WhatsApp.
Para una migración persistente: colecciones CRM independientes en Firestore, permisos server-side, deduplicación, auditoría y cambios transaccionales multiusuario.

## Estado de los conectores
Apollo/Hunter tienen conectores disponibles en ChatGPT; no significa que estén configurados como APIs del ERP en Vercel. Sus claves nunca deben guardarse en JavaScript público.
Revenue OS privado permanece separado y conserva su base online; no fue reemplazado por este módulo.
Mensajería automática y DIAN real requieren servicios backend, permisos, autenticación y homologaciones o proveedor habilitado.

## Referencias para la futura implementación tributaria
- Normativa DIAN de facturación electrónica: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/normatividad/
- Documento soporte: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documento-soporte-adquisiciones-no-obligados/
- Nómina electrónica: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/soporte-de-pago-de-nomina-electronica/
- CTCP y grupos contables NIIF: https://www.ctcp.gov.co/

## Continuidad recomendada
1. Colecciones CRM y login seguro con reglas verificadas.
2. Migración privada de las 3041 empresas y contactos del Atlas sin publicar datos.
3. Integración server-side de Apollo y Hunter + exclusiones, consentimiento y auditoría.
4. Cadencias email/WhatsApp, control de entregabilidad y opt-out.
5. Completar compras -> inventarios -> costos -> contabilidad, y logística desde remisiones.
6. Implementar facturación, documento soporte y nómina mediante integración autorizada con software habilitado, tras validación fiscal y contable.

## Validación
CI comprueba sintaxis y pruebas unitarias; la navegación en navegador y la persistencia multiusuario quedan pendientes de validación.
Producción no cambia hasta aprobación expresa.