# CORPARTES — Nuevo Firebase independiente

## Estado
La rama `corpartes-firebase-v1` prepara una instancia **nueva y vacía** de Firebase, para reemplazar exclusivamente en pruebas el Firebase ESS anterior. El ERP público en producción **no cambia**. Firebase CORPARTES todavía debe crearse en la cuenta de Google propietaria.

## Crear Firebase desde cero (Firebase Console)
1. Abrir https://console.firebase.google.com/ con la cuenta Google que administrará CORPARTES.
2. Elegir **Crear / Agregar proyecto**.
3. Nombre visible: **CORPARTES ERP**.
4. ID sugerido: `corpartes-erp-prod-2026` (si está disponible; el ID final lo confirma Firebase).
5. Registrar aplicación **Web** con alias `Corpartes ERP Web`, sin Firebase Hosting porque la web ya usa Vercel.
6. Activar Authentication, proveedor **Correo y contraseña**.
7. Crear Firestore en **modo producción** (reglas cerradas); escoger la ubicación adecuada. La ubicación luego no se puede cambiar.
8. Mantener el plan Spark mientras sus límites basten. La migración masiva gestionada entre proyectos exige Blaze/facturación.
9. Crear usuario admin en Firebase Authentication con un correo real que puedas controlar y una contraseña única y fuerte. El usuario administrativo visible en el ERP seguirá siendo `ADM01`.

## Antes de abrir el ERP en el proyecto nuevo
- Configurar `corpartes-firebase-config.js` con el objeto de configuración SDK Web (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId). Es configuración pública del cliente, **no** una llave de servicio privada.
- Configurar `window.CORPARTES_ADMIN_LOGIN_EMAIL` con el correo real usado para el administrador.
- Aplicar `firebase/firestore.rules` (permisos sólo propietario). Las reglas de Storage, `firebase/storage.rules`, niegan acceso por defecto.
- Ejecutar el bootstrap servidor en el proyecto destino. Requiere `firebase-admin` y credenciales de administrador de Google Cloud asociadas a la cuenta CORPARTES. No poner el JSON de cuenta de servicio en GitHub ni compartirlo por chat.

### Ejemplo de ejecución en Cloud Shell o máquina administradora
```bash
npm install --no-save firebase-admin
export CORPARTES_FIREBASE_PROJECT_ID="ID_REAL_DEL_PROYECTO_CORPARTES"
export CORPARTES_ADMIN_EMAIL="CORREO_REAL_DE_ADMIN"
export CONFIRM_CORPARTES_EMPTY_BOOTSTRAP=SI
node scripts/bootstrap-corpartes.mjs
```
Estos comandos deben ejecutarse desde una copia del repositorio `steimercadeo/corpartes-erp` en la rama `corpartes-firebase-v1`, en un entorno con ADC configuradas para el proyecto indicado. El script **rechaza** IDs que no empiecen por `corpartes-` y no toca proyectos existentes ya inicializados.

## Protección contra herencia de ESS
- La instancia nueva NO recibe configuración de `ess-produccion-piloto-7a794`.
- Se desactiva migración automática desde copia local y desde `ess_sync`.
- No se crean usuarios ni contraseñas débiles desde el navegador.
- El login usa el email real asociado a ADM01; password directo de Firebase Auth, sin prefijo `ESS#`.
- Se renombran las claves locales de sesión/respaldo.
- Login falla si no se pudo sincronizar Firestore.

## Por qué no abrir accesos para operarios aún
Los documentos actuales de Pedidos y metadatos incluyen costos, precios y datos comerciales. Las reglas nuevas inicialmente conceden lectura/escritura solo al propietario. Antes de incorporar Jefes de Planta, Pintura, operarios y agentes CRM, dividir estos datos y agregar reglas de acceso por rol; no basta con ocultar botones en pantalla.

## Puesta en marcha
1. Proyecto nuevo creado y Web Config completa.
2. Reglas publicadas y bootstrap inicial terminado.
3. Probar preview separado de CORPARTES con ADM01 y una contraseña fuerte.
4. Crear un pedido temporal, verificar lectura desde otro equipo y borrar el pedido temporal.
5. Comprobar Remisiones, Inventario, Producción, IA y CRM.
6. Planificar respaldo/migración selectiva si se necesita conservar registros ESS, previa autorización. **Nunca hacer switch del dominio principal antes de pruebas**.

Documentación oficial:
- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/firestore/manage-data/move-data
