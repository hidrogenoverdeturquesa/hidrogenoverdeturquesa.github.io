# Reactores pulsantes · RP-01

La fuente editorial es `reactores-pulsantes.tex`. Usa la clase institucional
`../plantilla/hvtbook.cls`. El proyecto se encuentra en formulación: las cifras
didácticas, el diseño de 24 corridas y las etapas propuestas no son resultados.

Después de editar el LaTeX, compilar y revisar todas las páginas del PDF.
`generar.cmd` compila dos veces y ejecuta `generar-web.cjs`. Las salidas son:

- `../salidas/reactores-pulsantes.pdf`.
- `../../proyecto-reactores-pulsantes.html`.
- `../../proyecto-reactores-pulsantes-latex.html` (mismo contenido).

El integrador web usa el generador compartido y agrega la navegación vigente,
el índice enlazado, las referencias continuas, la descarga del PDF, el video
con sus créditos y ajustes locales de MathML. No editar las salidas a mano.
Si cambia la paginación, actualizar su etiqueta en `generar-web.cjs`.

El video de la tarjeta usa el comportamiento existente `ssPortfolioVideos`:
puntero o foco reproducen; salida pausa y reinicia; respeta la preferencia de
movimiento reducido. En el cuadernillo el video dispone de controles manuales.
Fuente, licencia y modificaciones: `../../THIRD_PARTY_NOTICES.md`.

Fuentes: nueve referencias enlazadas en el LaTeX. Se consultaron resúmenes
científicos de las fuentes 1–4, texto completo de WIT Press (5), las secciones
NIST (6–7), la guía GUM (8) y el artículo/suplemento de PeerJ (9). Las fuentes
1–5 sustentan los antecedentes; el DOE, la selección de aplicación inicial y
los cálculos ilustrativos son la propuesta de trabajo de HVT.
