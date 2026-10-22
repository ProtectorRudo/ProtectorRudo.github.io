# CIERRE — piloto 0.2 (modo sombra)

Prototipo funcional y gratuito, orientado a validar el seguimiento de presupuestos de un corralón sin conectar WhatsApp ni enviar mensajes a clientes.

## Funciones verificadas

- Radar de oportunidades con filtros: posible seguimiento, esperar, revisar, bloqueado.
- Carga de historiales TXT exportados desde WhatsApp en el propio navegador.
- Identificación de archivos PDF por nombre en el historial (NO lee el contenido interno del PDF).
- Motor de clasificación local para agradecimientos, consultas sin responder, rechazo, intención de compra, baja y seguimiento previo del empleado.
- Decisiones explicables: motivos, frases decisivas y límites del diagnóstico.
- Marcado manual de venta cerrada, baja, mensaje ya enviado o seguimiento humano. Se puede restablecer.
- Evita duplicar la importación de un mismo presupuesto e incorpora mensajes nuevos al reimportar el TXT. Cuando aparecen versiones posteriores del PDF, bloquea propuestas anteriores detectadas.
- Configuración de demora y único mensaje fijo; nunca envía ese mensaje.
- 12 conversaciones ficticias precargadas, 16 pruebas automáticas en la sección «Pruebas».
- Exportación local de un reporte JSON o CSV.

## Instrucciones

1. Abrí `index.html` en navegador moderno o GitHub Pages si está habilitado para el repositorio.
2. Pulsá **Cargar 12 ejemplos**, luego inspeccioná distintos presupuestos.
3. En **Pruebas**, ejecutá la batería automática: el objetivo es 16/16.
4. En **Laboratorio**, pegá una conversación ficticia o un TXT autorizado, con remitentes y fechas; ingresá los nombres de los vendedores que aparecen en el chat.
5. Evaluá las propuestas y registrá manualmente ventas o bajas en el radar. Volvé a importar el chat si hubo mensajes nuevos.
6. Exportá resultados antes de cerrar la sesión.

## Seguridad y limitaciones

- Solo análisis en navegador, con datos conservados temporalmente en `sessionStorage`. No hay APIs externas, base de datos ni telemetría propia.
- **No se envía ningún WhatsApp real**. Copiar un texto de ejemplo no constituye consentimiento ni autorización.
- Las decisiones vienen de **reglas locales**, no de un modelo de IA. No alcanzan para seguir clientes automáticamente.
- Los TXT exportados pueden omitir contenidos multimedia o nombres de documentos, y pueden no reflejar mensajes recientes o enviados desde ciertos dispositivos.
- No se detectan compras presenciales, transacciones del sistema de ventas, consentimientos ni mensajes que no estén en el TXT. Una recomendación positiva no garantiza que un contacto deba recibir seguimiento.
- No subas conversaciones privadas, teléfonos ni datos reales de clientes al repositorio público. Para cargar datos reales en el navegador, obtené antes autorización del responsable y usá el mínimo necesario.
- Los reportes JSON y CSV incluyen identificadores del chat; manejarlos como información confidencial.

## Próximos hitos (no implementados)

1. Aprobación del comercio y prueba técnica de coexistencia oficial de WhatsApp Business con su configuración real de dispositivos.
2. Webhook verificado, sincronización de eventos, almacenamiento cifrado y aislamiento por comercio.
3. Evaluación del motor de clasificación con casos reales anonimizados; reglas de bloqueo y consultas abiertas.
4. Plantilla aprobada por Meta, consentimiento, base de datos transaccional para un solo envío e informes de entrega.
5. Medición real de costo por comercio y rentabilidad de ventas recuperadas.

**Estado:** v0.2 validada mediante simulaciones. No apta todavía para actuar automáticamente sobre clientes.
