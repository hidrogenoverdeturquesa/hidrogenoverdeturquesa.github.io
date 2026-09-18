/* Integración específica de RP-01. Contenido editorial: reactores-pulsantes.tex. */
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'proyecto-reactores-pulsantes-latex.html');
execFileSync(process.execPath, [path.join(__dirname, '../plantilla/generar-html.js'), path.join(__dirname, 'reactores-pulsantes.tex'), output], {stdio: 'inherit'});
let html = fs.readFileSync(output, 'utf8');
const header = fs.readFileSync(path.join(root, 'proyecto-geotermodinamica.html'), 'utf8').match(/<header class="s-header">[\s\S]*?<\/header>/)[0];
html = html.replace(/<header class="s-header">[\s\S]*?<\/header>/, header)
  .replace('class="course-book"', 'class="course-book reactores-book"')
  .replace('</head>', '  <link rel="stylesheet" href="css/reactores-pulsantes.css?v=20260917">\n  <meta name="twitter:card" content="summary_large_image">\n</head>')
  .replace('js/main.js?v=urls-limpias-20260727', 'js/main.js?v=mobile-navigation-20260828a');
html = html.replace(/<section class="book-sheet"[^>]*>([\s\S]*?)<\/section>/g, (match, body) => {
  const label = body.match(/<aside[^>]*><span>(.*?)<\/span>/)[1];
  const chapter = label.match(/^Capítulo ([\d.]+)/);
  const id = chapter ? 'capitulo-' + chapter[1].replaceAll('.', '-') : label === 'Contenido' ? 'indice' : label === 'Referencias' ? 'referencias' : 'referencias-adicionales';
  return `<section class="book-sheet" id="${id}">${body}</section>`;
});
html = html.replace('href="#capitulo-1"', 'href="#indice"');
html = html.replace(/<li>(\d+)\. ([^<]*)<\/li>/g, (_, n, label) => `<li><a href="#capitulo-${n}">${n}. ${label}</a></li>`);
const pdf = 'cuadernillos/salidas/reactores-pulsantes.pdf';
html = html.replace('<div class="course-book__actions">', `<p class="reactores-status"><strong>Proyecto en formulación · RP-01</strong><br>26 páginas · 12 capítulos y sus apartados · 9 referencias · Septiembre de 2026</p><div class="course-book__actions"><a class="btn btn--stroke" href="${pdf}" download>Descargar cuadernillo PDF</a>`);
html = html.replace('Fotografía reducida de Wikimedia Commons.</figcaption>', 'Fotografía reducida de <a href="https://commons.wikimedia.org/wiki/File:Brachinus_crepitans_(Linnaeus,_1758).png" target="_blank" rel="noopener">Wikimedia Commons</a>. <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">Licencia CC BY-SA 4.0</a>.</figcaption>');
const video = `<figure class="reactores-video-figure"><video class="reactores-video" controls muted playsinline preload="metadata" aria-label="Video científico del escarabajo bombardero expulsando su secreción"><source src="videos/portafolio/reactores-pulsantes-escarabajo.mp4?v=20260917" type="video/mp4"><a href="videos/portafolio/reactores-pulsantes-escarabajo.mp4">Descargar video</a></video><figcaption><strong>Observación del organismo.</strong> <em>Pheropsophus occipitalis jessoensis</em>, video de Shinji Sugiura. Sugiura y Hayashi (2023), <em>PeerJ</em>, <a href="https://doi.org/10.7717/peerj.15380/supp-1" target="_blank" rel="noopener">Video S1</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Extracto de los segundos 4 a 13, sin audio y reducido a 960 × 540. Se conserva la velocidad de la escena. Muestra la descarga visible; no permite medir los pulsos internos ni representa un ensayo de HVT.</figcaption></figure>`;
html = html.replace('<h2>Cómo se relacionan cámara, flujo y pulsación</h2>', '<h2>Cómo se relacionan cámara, flujo y pulsación</h2>' + video);
let reference = 0;
html = html.replace(/(<div class="book-references"><h3>Referencias<\/h3>)<ol>([\s\S]*?)<\/ol>/g, (_, heading, body) => {
  const start = reference + 1;
  return `${heading}<ol start="${start}">${body.replace(/<li>/g, () => `<li id="ref-${++reference}">`)}</ol>`;
});
html = html.replace(/<sup>\[([\d,]+)\]<\/sup>/g, (_, refs) => `<sup>${refs.split(',').map(n => `<a href="#ref-${n}" aria-label="Referencia ${n}">[${n}]</a>`).join(' ')}</sup>`);
// Símbolos utilizados por RP-01 que la plantilla común aún no convierte.
html = html.replaceAll('<mi>varepsilon</mi>', '<mi>ε</mi>')
  .replaceAll('<mi>tau</mi>', '<mi>τ</mi>')
  .replaceAll('<mi>quad</mi>', '<mspace width="1em"/>')
  .replaceAll('<mi>bar</mi><msub><mrow><mi>m</mi></mrow><mrow><mi>p</mi></mrow></msub>', '<msub><mover accent="true"><mi>m</mi><mo>¯</mo></mover><mi>p</mi></msub>')
  .replaceAll('<mo>Σ</mo>', '<mo>∑</mo>');
html = html.replace(/<table class="project-parameter-table">([\s\S]*?)<\/table>/g, (_, content) => `<div class="reactores-table-wrap" role="region" aria-label="Tabla técnica; desplazar horizontalmente en pantallas pequeñas" tabindex="0"><table class="project-parameter-table">${content.replaceAll('<th>', '<th scope="col">')}</table></div>`);
html = html.replace('</main>', `<div class="row reactores-downloads"><div class="column"><div class="course-book__actions"><a class="btn btn--primary" href="${pdf}" download>Descargar cuadernillo PDF</a><a class="btn btn--stroke" href="https://wa.me/573209574884?text=Hola%2C%20quiero%20conversar%20sobre%20Reactores%20pulsantes." target="_blank" rel="noopener">Conversar sobre el proyecto</a><a class="btn btn--stroke" href="/#portfolio">Volver a proyectos</a></div></div></div></main>`);
// El mismo contenido se publica en la ruta principal y la variante editorial.
fs.writeFileSync(output, html, 'utf8');
fs.writeFileSync(path.join(root, 'proyecto-reactores-pulsantes.html'), html, 'utf8');
console.log('RP-01: navegación, referencias, video y PDF integrados.');
