# CIERRE — piloto de decisión comercial (v0.1)

Prototipo gratuito en **modo sombra**: no envía WhatsApps ni se conecta a cuentas reales.

## Uso

1. Abrí `cierre-piloto/index.html` en un navegador moderno o accedé a GitHub Pages si está habilitado.
2. Pulsá **Probar 7 ejemplos**. Revisá por qué recomienda seguimiento, espera, cancelación o revisión.
3. En **Laboratorio**, importá un chat exportado desde WhatsApp como `.txt` o pegá una conversación con fechas y remitentes.
4. Indicá los nombres del vendedor tal como figuran en el TXT.
5. Observá el diagnóstico; en **Configuración** podés modificar el plazo y el texto fijo.
6. Exportá el reporte JSON antes de cerrar la sesión si necesitás conservar las conclusiones.

## Privacidad y alcance

- El análisis ocurre en el navegador: sin servidores, APIs ni telemetría añadida por el prototipo.
- Usa `sessionStorage` temporal. No publiques en GitHub archivos TXT o reportes con conversaciones de clientes.
- El prototipo **no abre ni extrae el contenido de los PDF**. Solo detecta referencias a nombres terminados en `.pdf` en los mensajes del vendedor.
- Las decisiones se generan con **reglas** y no con un modelo de IA.
- No verifica consentimientos, compras fuera de WhatsApp, estado real del pedido ni que los mensajes exportados estén completos.
- Está **prohibido usar estas decisiones directamente para envíos automáticos reales** sin integrar la API oficial, la base de datos transaccional, permisos de mensajería y los controles de sincronización.

## Casos de prueba

- Cliente: «gracias» → posible seguimiento luego del plazo.
- Rechazo claro → bloqueo.
- Seguimiento manual del vendedor → bloqueo.
- Pregunta pendiente del cliente → espera.
- Compra acordada → bloqueo.
- Interacción reciente → espera.
- «Lo voy a pensar» → revisión conservadora.
- Reimportación del mismo chat → bloquea duplicado.

## Próxima etapa

Integración de eventos oficiales de WhatsApp Business en modo sombra, previa autorización del titular, y verificación de recepción de mensajes salientes desde los dispositivos reales del corralón. Recién después evaluar envíos usando plantillas aprobadas, consentimiento y límites por presupuesto y contacto.
