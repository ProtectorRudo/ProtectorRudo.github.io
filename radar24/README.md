# VIRAL LAB · Radar 24H

Módulo funcional de monitorización de tendencias para **TikTok** e **Instagram**. Panel propio, API HTTP, almacenamiento SQLite, capturas históricas, análisis de aceleración y conexión opcional con OpenAI. No utiliza datos sintéticos en el panel.

> **Estado de entrega:** código y tests funcionales; requiere `APIFY_TOKEN` y despliegue para descubrir tendencias reales. Se diseñó como aplicación independiente integrable mediante un enlace o proxy dentro del editor de VIRAL LAB. No modifica la aplicación preexistente en Render.

## Persistencia: solución al panel en cero tras reinicios

Los servicios web gratuitos de Render eliminan archivos SQLite cuando reinician. El radar admite `RADAR_DATABASE_URL` con una **URL interna PostgreSQL privada**, conectada a la base independiente `viral-lab-radar24-history`. Al arrancar, recupera el inventario SQLite; después de cada escaneo guarda una copia de la base completa (videos, instantáneas, rondas y análisis). Los backups son automáticos. Si no se configura la URL, el panel informa que el historial es temporal y no presenta el cero inicial como una búsqueda finalizada.

Para conectar: Render → PostgreSQL → `viral-lab-radar24-history` → **Internal Database URL** (copiar la URL completa sin mostrarla en el chat). En Render → Web Service → `viral-lab-radar24` → Environment → añadir `RADAR_DATABASE_URL` con ese valor, guardar y comprobar que los logs digan `Radar: historial externo listo`. El código no imprime credenciales ni las expone al frontend. El escaneo se evita después de reinicios si hay una ronda guardada en las últimas 24 horas.

**Límite:** la base PostgreSQL gratuita de Render expira el **23 de diciembre de 2026**. Antes de esa fecha hay que migrar a un Postgres duradero (por ejemplo Supabase dedicado o Render de pago). No es una solución permanente más allá de la caducidad del plan gratuito.

## Ejecutar

```bash
node --version # >= 22.13
npm test
RADAR_DB_PATH=./data/radar.sqlite npm start
# abrir http://localhost:3000
```

Sin credenciales muestra un estado vacío explícito; no inventa videos ni métricas. En producción:

1. Crear un servicio **Render Node 22** a partir de esta carpeta (`render.yaml` sirve como referencia de configuración). Añadir **disco persistente** en `/var/data`; SQLite en disco efímero pierde el historial tras un despliegue. Si ya hay un servicio VIRAL LAB, integrar la ruta en su menú sin cambiar el procesador de videos.
2. Crear un token personal de **Apify** y guardarlo como `APIFY_TOKEN` solamente en Render (no en el navegador ni en GitHub). El scraper de TikTok usado es `clockworks/tiktok-scraper`, el de Instagram `apify/instagram-scraper`.
3. Crear `RADAR_ADMIN_KEY` (clave larga, aleatoria), confirmar límites de gasto y configurar `RADAR_AUTO_SCAN=true` para scans automáticos; intervalo por defecto 6h si se configura `RADAR_POLL_MINUTES=360`, máximo 4 scans en 24 horas. Cada scan efectúa varias ejecuciones pagas del proveedor, incluidos seguimientos.
4. Opcional: `OPENAI_API_KEY` privada y `OPENAI_MODEL` para análisis individual bajo demanda.
5. Ejecutar un escaneo real, validar fechas y métricas contra los originales y volver a consultar tras al menos una hora. La aceleración requiere tres observaciones y no puede medirse instantáneamente.

### Seguridad y privacidad

- Tokens solo en backend; `/api/refresh` y generación de análisis tienen autenticación por encabezado `X-Radar-Key`. Si falta clave, las rutas de escritura manual permanecen bloqueadas.
- Límite diario básico en el backend para evitar gastos involuntarios. Ajustar además un **límite de gasto real en Apify**, ya que el contador local no sustituye la facturación del proveedor.
- No descarga ni copia los videos originales. Se almacena una URL, datos del creador y estadísticas visibles en fuentes externas; cualquier adaptación debe ser original y respetar derechos de autor, privacidad y condiciones de las plataformas.
- No proporciona precisión de país de audiencia: mercado `AR` es un sesgo de consulta por términos/proxy; no es una geolocalización validada.
- El scraper de Instagram mezcla post y reel: se conservan únicamente videos. Con hashtags, puede no devolver los más nuevos ni todos los disponibles.
- El proveedor es externo y puede dejar de funcionar o restringir consultas; los errores se registran por fuente sin sustituirlos por datos ficticios.

### Modos

- **Nuevos 24H:** videos con fecha de publicación en últimas 24 horas.
- **Aceleraron 24H:** videos anteriores que aumentaron su velocidad al menos 50% tras 3 muestras en la ventana observada (y 100 vistas adicionales).
- **Todos:** permite inspeccionar el inventario histórico.

`viewsGained` significa variación desde la primera captura disponible en las últimas 24 horas; el campo `observedHours` informa el período real. Se evita atribuir 24h de observación cuando solo existen 2 horas de datos. La puntuación 0–100 es heurística experimental, **no probabilidad de viralidad**.

### API

- `GET /healthz`: salud.
- `GET /api/status`: datos de conexión, escaneos, contadores.
- `GET /api/videos?mode=new24|accelerated24|all&platform=all|tiktok|instagram`: listado.
- `GET /api/videos/tiktok:123456789`: video e historial.
- `GET /api/videos/tiktok:123456789/insight`: análisis generado (si existe).
- `POST /api/refresh` con `X-Radar-Key`: iniciar exploración y re-medir videos previos.
- `POST /api/videos/:id/insight` con `X-Radar-Key`: solicitar análisis original a OpenAI.

### Test y despliegue

```bash
npm run check
npm test
```

**Integración con VIRAL LAB existente:** añadir en la navegación del editor de Render un enlace **Radar 24H** apuntando al URL del nuevo servicio. Si comparten dominio, crear reverse proxy `/radar24` y actualizar las rutas a un prefijo; este paquete se entrega aislado para evitar alterar el código que genera los 30 clips.

## Fuentes verificadas para el desarrollo

- [Input de TikTok Scraper](https://apify.com/clockworks/tiktok-scraper/input-schema): `videoSearchDateFilter=PAST_24_HOURS`, `searchSection=/video`, `videoSearchSorting=LATEST`.
- [Input de Instagram Scraper](https://apify.com/apify/instagram-scraper/input-schema): `resultsType=posts`, `searchType=hashtag`, `onlyPostsNewerThan=1 day`.
- [TikTok Research API FAQ](https://developers.tiktok.com/docs/en/research-api-faq): no es fuente adecuada de 24h, puede tener retraso de 48 horas para videos nuevos.
