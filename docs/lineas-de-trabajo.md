# Páginas de las líneas de trabajo

La página de inicio sigue siendo la fuente del contenido. Sus tarjetas abren
las secciones dentro de la misma página. El enlace «Explorar esta línea →»
ofrece una entrada adicional a cada línea, sin reemplazar ese comportamiento.

Las páginas dedicadas se generan con:

```powershell
python tools/build_service_pages.py
python tools/build_service_pages.py --check
```

El generador toma títulos y descripciones de las tarjetas, y servicios,
proyectos y galería de los paneles existentes en `index.html`, `en/index.html`
y `ru/index.html`. Reutiliza encabezado, pie de página y visor de imágenes.
También actualiza los enlaces de entrada y el sitemap. No requiere red.

No editar directamente `lineas/*/index.html`, `en/lineas/*/index.html` ni
`ru/lineas/*/index.html`: son resultados generados. Después de cambiar textos
o fotos en las fuentes, ejecutar el generador antes de publicar. El proceso
existente `tools/build_localized_home.py` lo ejecuta automáticamente al terminar.

Rutas: `energia`, `bioeconomia`, `inteligencia-territorial`, `infraestructura`.
Cada página dispone de su título, descripción, URL canónica e idiomas. Solo
Infraestructura usa una foto de la galería como imagen al compartir; las otras
líneas no heredan imágenes genéricas ni de otra línea.

El enlace de regreso usa `#line-detail-001` a `#line-detail-004`. La página de
inicio reconoce esos enlaces y abre el panel correspondiente. La navegación
normal de las tarjetas sigue funcionando sin cambiar de página.
