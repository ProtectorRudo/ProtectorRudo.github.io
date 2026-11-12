# CASA VIVA — Plan maestro y validación (12/11/2026)

## Producto
Episodio 001: «La última señal», experiencia web de terror con cámara opcional, reconocimiento local TensorFlow.js/COCO-SSD y modo demostración.

## Entorno y publicación
- Repositorio: `ProtectorRudo/ProtectorRudo.github.io`
- Carpeta exclusiva: `/casa-viva/`
- Commit de código v0.2: `b5321256a2f889759b91b8841b6f6f34f1743f40`
- Vista publicada: https://casa-viva-episodio-001.onrender.com/
- Servicio Render: `casa-viva-episodio-001`; despliegue `dep-dbqrr5dckfvc73daatm0`
- Estado informado por Render: `live` a las 13:22 UTC del 12/11/2026.
- Despliegue automático: **desactivado** para no publicar cambios involuntarios.
- Vercel: bloqueado por cuota diaria HTTP 402; no dependemos de él para esta vista.

## Checklist técnico
- [x] UI de terror, prólogo, tres pistas, temporizador y desenlace.
- [x] Modo demostración completado en pruebas automáticas de Chromium (1280×800 y 390×844).
- [x] Combinación correcta/incorrecta, victoria y reinicio.
- [x] Detección por cámara integrada con modelo COCO-SSD y umbral de confianza.
- [x] Prueba de integración con modelo y cámara **simulados**: tres objetos, captura, cámara detenida entre escenas, carga única del modelo, victoria.
- [x] Permiso denegado → fallback de demostración con mensaje.
- [x] Sitio estático publicado en Render: deploy `live`.
- [ ] Verificar carga web, scripts externos y reconocimiento de IA real en **Android Chrome físico**.
- [ ] Verificar cámara trasera, reconocimiento y audio en **iPhone Safari físico**.
- [ ] Pruebas de iluminación pobre, objetos similares y abandono/reanudación.
- [ ] Pruebas con 5 usuarios externos y registro de duración/tasa de finalización.
- [ ] Segunda aventura con historia verdaderamente dinámica.
- [ ] Multijugador, pagos, analítica y experiencia comercial.

## Cómo validar un teléfono
1. Abrir https://casa-viva-episodio-001.onrender.com/ en Chrome Android o Safari iPhone.
2. Elegir ABRIR EXPEDIENTE → USAR CÁMARA REAL; aceptar permiso.
3. Apuntar a libro, silla y taza (u otros compatibles) con buena luz y registrar cada evidencia.
4. Resolver las tres cifras y completar la misión.
5. Si falla, informar marca/modelo de teléfono, navegador, pantalla exacta del fallo y si hubo solicitud de permiso. No compartir imágenes personales.

## Criterio de aceptación
No declarar el reconocimiento en móviles como terminado sin evidencia de ejecución física. El test automatizado sustituye únicamente el sensor y las predicciones; no comprueba la precisión de COCO-SSD en condiciones reales.

## Aspectos por mejorar
La historia v0.2 usa guion reactivo prefijado, **no** IA generativa en tiempo real. No hay anclaje espacial 3D. La cámara no sube vídeo al servidor: las predicciones son locales; recursos del modelo se descargan de proveedores externos.
