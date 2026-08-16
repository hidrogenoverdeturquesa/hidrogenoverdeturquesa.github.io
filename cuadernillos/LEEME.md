# Cuadernillos editables

Cada cuadernillo tiene una carpeta propia. Abra en TeXstudio el `.tex` de la
publicación que quiera modificar:

- Parque Solar: `parque-solar/parque-solar.tex`.
- Ecoaldea Sostenible: `ecoaldea/ecoaldea.tex`.
- Sistemas del viento y del agua: `sistemas-viento-agua/sistemas-viento-agua.tex`.
- HidroEcoCaja: `hidroecocaja/hidroecocaja.tex`.
- Hogares eficientes: `hogares-eficientes/hogares-eficientes.tex`.
- Planta de hidrógeno: `planta-hidrogeno/planta-hidrogeno.tex`.
- Electrolizadores: `electrolizadores/electrolizadores.tex`.
- Orgánicos y fermentación: `organicos-fermentacion/organicos-fermentacion.tex`.
- ESP32: `esp32/esp32.tex`.
- Micro:bit: `microbit/microbit.tex`.

Ese `.tex` es la fuente principal del contenido. No edite los archivos de
`plantilla` salvo que quiera cambiar el diseño de todos los cuadernillos.

## Regla de trabajo

El LaTeX se termina y se aprueba antes de actualizar la página web. El orden
obligatorio para completar o corregir un cuadernillo es:

1. Modificar únicamente el archivo `.tex` del cuadernillo.
2. Compilarlo en TeXstudio y revisar el PDF completo.
3. Confirmar que contenido, títulos, tablas, fórmulas display, diagramas,
   figuras, referencias y diseño sean correctos.
4. Ejecutar `generar.cmd` para producir nuevamente el PDF definitivo y el HTML.
5. Comparar la página generada con el LaTeX aprobado antes de publicarla.

El HTML con terminación `-latex.html` es una salida generada: no debe editarse
manualmente. Si algo está mal en la página, se corrige en el `.tex` o, cuando el
problema afecta a todos los cuadernillos, en la plantilla compartida; después
se vuelve a generar.

## Cómo generar los resultados

1. Guarde los cambios en TeXstudio.
2. Compile allí para revisar rápidamente el PDF.
3. Ejecute `generar.cmd` dentro de la carpeta del cuadernillo.

El tercer paso crea las dos salidas definitivas:

- `salidas/<nombre>.pdf` para compartir o imprimir.
- El HTML con terminación `-latex.html`, situado en la raíz del sitio, para
  publicarlo.

La página web no se actualiza únicamente al guardar o compilar en TeXstudio:
hay que ejecutar `generar.cmd`, porque ese archivo transforma el mismo LaTeX en
HTML estático.

## Qué se publica en GitHub Pages

Se incluyen el HTML generado, `plantilla/pdf.css`, las imágenes y los demás
archivos normales del sitio. GitHub Pages no necesita ejecutar LaTeX ni Node:
recibe una página HTML ya generada y compatible con publicación estática.

La carpeta `temporales` y los archivos `.aux`, `.log`, `.out` y `.synctex.gz`
son residuos técnicos de compilación; `.gitignore` evita que entren al commit.
