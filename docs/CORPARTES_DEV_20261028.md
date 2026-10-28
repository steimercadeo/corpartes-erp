# CORPARTES ERP–CRM · corte de desarrollo 28-oct-2026

**Repositorio:** steimercadeo/corpartes-erp  
**Rama de trabajo:** corpartes-dev-20261028  
**Base:** corpartes-ai-os-v2  
**Producción:** NO desplegar ni promover; mantener intacto el dominio corpartes-erp.vercel.app.

## Conservado
La aplicación real heredada de ESS sigue en index.html. No se sustituyeron Pedidos, Producción, Remisiones, Seguimiento, Informes, Lámina, Almacén, Mantenimiento, Cotizaciones, usuarios ni motores PDF/DXF/TruTops. Se conserva el código de Centro de Control, Finanzas, Compras, Contabilidad, MRP, Calidad y Corpartes IA de la rama anterior.

## Implementado en esta iteración
1. **Autenticación del endpoint /api/ai.**
   - Requiere Bearer ID Token de Firebase Auth con firma RS256 validada contra JWKS públicos de Firebase.
   - Verifica proyecto (audience e issuer), identificador del usuario y vigencia del token.
   - Sin token válido, la API no consulta al modelo. El endpoint no ejecuta escrituras ni acciones empresariales.
   - Se limitan modo, pregunta, contexto enviado y tiempo de espera del proveedor.
   - La interfaz distingue explícitamente respuestas locales de respuestas generativas.
2. **Playbooks comerciales por sector.**
   - Genera cuatro borradores personalizados de correo/WhatsApp para días sugeridos 0, 3, 7 y 14.
   - Sectores: construcción, tableros eléctricos, exhibición comercial, mobiliario, autopartes, maquinaria, metalmecánica y genérico.
   - Integrado sobre el CRM real; no reemplaza la base de empresas ni envía mensajes.
   - Acción manual «Copiar borrador»; la baja «No contactar» inhabilita las acciones. Las etapas Cliente y Perdido también detienen la secuencia.
   - La exclusión es un atributo del registro CRM actual; **aún no es un servicio de preferencias centralizado ni una sincronización con proveedores externos**.
3. **Pruebas automatizadas.**
   - Tests Node para tokens: válido, adulterado, proyecto incorrecto, expirado, algoritmo inválido y Bearer.
   - Tests Node para plantillas, sectorización, cronograma, no alteración de datos y stop rules.
   - Workflow de sintaxis y tests sin comandos de promoción a producción.

## Configuración requerida antes de probar Corpartes IA generativa
Definir en el entorno **Preview** (sin divulgar claves):
- FIREBASE_PROJECT_ID (ID del proyecto de Firebase usado por el login).
- AI_GATEWAY_MODEL (modelo válido habilitado en Vercel AI Gateway).
- AI_GATEWAY_API_KEY o mecanismo OIDC soportado por el proyecto.

Esta validación del token no es autorización RBAC completa. Antes de permitir herramientas que modifiquen registros, es indispensable comprobar permisos del usuario en el servidor, auditar cada operación y exigir confirmación para acciones sensibles.

## Límites y pendientes
- **No hay envíos automáticos:** Apollo, Hunter, correo y WhatsApp aún no están integrados a este playbook. Tampoco se lanzan campañas ni se programan mensajes. Los días son sugerencias, no tareas ya agendadas.
- **Concurrencia:** CRM, Finanzas, Compras, Contabilidad, MRP y Calidad siguen usando metadatos compartidos de Firestore; falta migrar a colecciones separadas y reglas de seguridad, evitando sobreescrituras simultáneas.
- **Consentimiento y exclusiones:** mantener lista central de bajas, validar requisitos jurídicos por canal y sincronizar los opt-out con futuros proveedores antes de enviar mensajes.
- **Producción:** no se tocó la rama main ni se promovieron Preview a dominio productivo.

## Validación manual obligatoria antes de un futuro release
1. Iniciar sesión con cuenta válida de Firebase; confirmar que los usuarios no autenticados no pueden utilizar /api/ai.
2. Verificar Pedidos, Producción, Remisiones, Seguimiento, Inventario, Almacén, Cotizaciones, Informes y roles con datos de pruebas.
3. Revisar Centro de Control, Finanzas, Compras, Contabilidad, MRP y Calidad, sin escribir registros financieros en la base real.
4. Abrir CRM; crear ficha de ensayo **únicamente en ambiente aislado**; revisar todos los sectores, copiar borrador y activar «No contactar».
5. Validar que no se enviaron correos ni WhatsApp y que no existen salidas automáticas.
6. Revisar reglas de acceso, sincronización multiusuario y errores de consola antes de decidir liberación.

## Próxima iteración recomendada
1. Separar colecciones del CRM y registro de actividades en Firestore con reglas, migración y control de concurrencia.
2. Implementar una bandeja de tareas y secuencias con opt-out y auditoría; solo después, conectar proveedores por backend con credenciales seguras.
3. Agregar capa de autorización servidor, catálogo de herramientas del copiloto, confirmación y auditoría.
4. Validar integración financiera/NIIF y DIAN con profesional contable y proveedor habilitado, antes de uso legal o fiscal.
