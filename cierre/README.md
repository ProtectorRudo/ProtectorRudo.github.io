# CIERRE — Portal alternativo de prueba

**Objetivo:** poder probar cuentas, comercios y configuración mientras Vercel rechaza compilaciones nuevas por su límite de builds.

## Abrir
- Portal: https://protectorrudo.github.io/cierre/
- Código: `cierre/index.html`
- Base: Supabase del proyecto activo de Viralio, con tablas `cierre_*` y RLS activado.

## Qué se puede probar
1. Crear una cuenta de comercio con correo y contraseña. Si Supabase exige confirmación, confirmar el correo y volver a la dirección del portal. **No** se ha verificado desde aquí la configuración de redirecciones del proyecto.
2. Crear un corralón propio y entrar al panel privado.
3. Guardar las preferencias de seguimiento: 24, 36, 48 o 72 horas; todos, agendados o no agendados; un texto único. Las preferencias quedan persistidas en Supabase.
4. Consultar los presupuestos reales de la empresa, en caso de que existan registros asociados.
5. Marcar una oportunidad como **Vendido**, **Ya contactado** o **No contactar**. La función RPC `cierre_block_quote` exige un JWT autenticado y comprueba en la base que el usuario es propietario de ese comercio. Registra auditoría y bloquea presupuestos correspondientes.
6. Cerrar sesión y volver a iniciar para confirmar la persistencia de datos.

## Qué NO hace
- No conecta WhatsApp con un simple número o QR generado por terceros.
- No envía ni responde a WhatsApp.
- No procesa PDF en GitHub Pages: eso requiere el receptor de Meta y el backend privado de Viralio.
- No sincroniza contactos sin completar la conexión y la verificación de Meta.
- No obtiene autorización de consentimiento ni prueba ventas presenciales.

El servidor Next.js con Meta Embedded Signup y lector de PDF está en el repositorio `ProtectorRudo/viralio`, pero su **último despliegue está bloqueado en Vercel**. La publicación GitHub Pages de esta ruta no sustituye las APIs secretas de ese backend.

## Seguridad y datos
- Sólo se incluye la clave *publishable* de Supabase en el HTML público. No hay claves de servidor, Meta ni OpenAI.
- Las tablas `cierre_*` usan RLS. La función RPC de cierre es sólo para `authenticated` (no `anon` ni `PUBLIC`) y valida propietario.
- El token del usuario permanece en `sessionStorage` de la pestaña, no se comparte con otros sitios.
- No subas información privada de clientes al repositorio público.
- El portal no se ha verificado de extremo a extremo en un navegador autenticado dentro de este entorno; hace falta probarlo con un usuario de prueba real.

## Pendientes para operación comercial
1. Resolver permisos y límite de despliegue de Vercel, o migrar el backend a una infraestructura con credenciales verificadas.
2. Configurar Meta Embedded Signup oficial y validar coexistencia, webhooks de mensajes y PDFs, incluyendo los dispositivos del negocio.
3. Configurar IA y probar extracción de número/total de presupuestos autorizados.
4. Completar control de ventas del sistema externo, consentimiento, plantillas Meta y un sistema de envío único idempotente.
