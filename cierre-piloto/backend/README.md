# CIERRE 0.4 — recepción real de WhatsApp en modo sombra

ESTADO: motor probado con 39 comprobaciones sintéticas (28 unitarias + 11 de integración con D1 simulado). Código en GitHub. Cloudflare Worker y base de datos aún NO desplegados. WhatsApp del corralón aún NO vinculado. NINGÚN MENSAJE se envía.

## Qué hace
- Endpoint GET/POST /webhook que verifica desafío y firma X-Hub-Signature-256 de Meta.
- Procesa messages (cliente) y smb_message_echoes (mensajes del vendedor desde dispositivos compatibles).
- Registra eventos únicos y marca los ya procesados para tolerar reintentos.
- Clasifica texto por reglas sin IA externa y reconoce PDF comercial por el nombre de archivo; PDF sin nombre va a revisión.
- No almacena texto, teléfonos ni contenido del PDF: conserva hashes HMAC, fechas, estados y razones.
- Bloquea rechazos, pagos, bajas y seguimientos humanos detectados; sustituye presupuestos anteriores con cuidado ante eventos desordenados.
- Panel autenticado en /api/overview y /api/opportunities; bloqueos manuales en /api/block.
- Eliminación automática de eventos tras 30 días y casos tras 90 días. Las bajas se mantienen anonimizadas.
- NO existe código para enviar mensajes o responder conversaciones.

## Alternativa de publicación desde GitHub, sin GitHub Actions

La integración de Git de Cloudflare permite vincular el repositorio y configurar la carpeta raíz de un Worker. Se debe indicar el directorio `cierre-piloto/backend`, donde está `wrangler.jsonc`. Antes del primer despliegue, creá una base D1, reemplazá el identificador de ejemplo y configurá los secretos. No activar el número real antes de aprobarlo con la empresa.

Referencia: https://developers.cloudflare.com/workers/ci-cd/builds/

## Cómo desplegarlo en la cuenta Cloudflare autorizada
1. Descargá el repositorio y abrí la carpeta cierre-piloto/backend con Node.js 20 o superior.
2. Ingresá a tu cuenta Cloudflare y verificá los límites de Workers y D1.
3. Autorizá desde tu equipo con: npx wrangler login
4. Creá la base: npx wrangler d1 create cierre-shadow
5. Reemplazá REPLACE_WITH_YOUR_D1_DATABASE_ID en wrangler.jsonc con el identificador obtenido.
6. Creá las tablas en esa NUEVA base: npx wrangler d1 execute cierre-shadow --remote --file=schema.sql
7. Desplegá: npx wrangler deploy
8. Configurá cada secreto en la carpeta backend con: npx wrangler secret put NOMBRE
9. Secretos obligatorios: META_VERIFY_TOKEN, META_APP_SECRET, DATA_HASH_KEY, ADMIN_API_KEY y ALLOWED_PHONE_NUMBER_ID.
10. META_VERIFY_TOKEN es una cadena aleatoria para la verificación; META_APP_SECRET viene de la aplicación Meta autorizada; DATA_HASH_KEY y ADMIN_API_KEY deben ser secretos independientes y fuertes; ALLOWED_PHONE_NUMBER_ID identifica el número comercial autorizado.
11. Ejecutá primero los tests locales: npm test. Comprobá HTTPS /health: mode=shadow, can_send=false, configured=true. Esto NO prueba que Meta ya esté conectado.
12. Configurá en Meta el callback HTTPS /webhook y el mismo META_VERIFY_TOKEN; registrá los eventos messages y smb_message_echoes. Coexistencia necesita el flujo oficial de Embedded Signup autorizado para WhatsApp Business existente.
13. Abrí la interfaz ../live.html; ingresá solo la URL del Worker y ADMIN_API_KEY (NUNCA el token de Meta).
14. Probá con conversaciones y números de prueba: un PDF desde el dispositivo del vendedor debe generar un echo; la respuesta del cliente, un messages. Confirmá que los eventos duplicados no se procesen nuevamente.

## Cómo probar el motor sin conectar un cliente real
- Ejecutá: node --test tests/core.test.js
- Con npx wrangler dev podés hacer pruebas locales, preparando una base D1 local y secretos de desarrollo.

## Límites críticos antes del corralón
- Un número Cloud API de prueba no equivale al flujo de coexistencia de una línea WhatsApp Business ya existente.
- Algunos WhatsApp Desktop de Windows no generan echoes. Probar los dispositivos reales antes de depender de estos eventos.
- Sin acceso al sistema de facturación no sabemos si el cliente pagó presencialmente; no autorizar seguimientos reales.
- Sin consentimiento verificable y plantillas aprobadas no se pueden iniciar seguimientos automáticamente fuera de la ventana aplicable.
- El clasificador por reglas puede fallar en frases nuevas o sarcásticas. Toda ambigüedad debe quedar en revisión.
- Los webhooks pueden llegar repetidos o desordenados, y pueden faltar eventos en dispositivos no compatibles; falta medir cobertura.
- No enviar WhatsApps hasta desarrollar una versión posterior con bloqueo transaccional y política de permisos.
- Obtener autorización expresa del responsable del negocio antes de conectar la cuenta o procesar datos reales.

## Archivos
- core.js: clasificación y normalización de webhooks.
- worker.js: seguridad HTTPS, procesamiento D1, API del panel.
- schema.sql: tablas e índices.
- wrangler.jsonc: configuración sin secretos.
- tests/core.test.js: pruebas unitarias.
- ../live.html: monitor administrativo sin envío.

NOTA: la conexión a Cloudflare y Meta requiere cuentas/permisos que todavía no están presentes en este chat. No pegues credenciales en GitHub ni en mensajes.
