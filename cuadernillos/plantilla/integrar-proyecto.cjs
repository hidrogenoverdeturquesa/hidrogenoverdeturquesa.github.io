/* Integración web para VC-01 y MH-01. El contenido procede únicamente del .tex. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const slug = process.argv[2];
if (!['casa-campestre', 'motor-hidrogeno'].includes(slug)) throw new Error('Proyecto no admitido');
const texPath = path.join(root, 'cuadernillos', slug, slug + '.tex');
const tex = fs.readFileSync(texPath, 'utf8');
const output = path.join(root, `proyecto-${slug}-latex.html`);
execFileSync(process.execPath, [path.join(__dirname, 'generar-html.js'), texPath, output], { stdio: 'inherit' });
let html = fs.readFileSync(output, 'utf8');
const header = fs.readFileSync(path.join(root, 'proyecto-reactores-pulsantes.html'), 'utf8').match(/<header class="s-header">[\s\S]*?<\/header>/)[0];
const number = tex.match(/\\HVTNumero\{([^}]+)\}/)[1];
const pdf = `cuadernillos/salidas/${slug}.pdf`;
const house = slug === 'casa-campestre';
const title = tex.match(/\\HVTTitulo\{([^}]+)\}/)[1];
const author = house ? 'Juan Camilo Trujillo Botero' : 'K';
const mediaURL = house ? 'https://www.pexels.com/video/aerial-view-of-historic-colombian-town-37195962/' : 'https://www.pexels.com/video/close-up-of-car-engine-with-belt-9737950/';
const description = house ? 'Arquitectura colonial: patio, muros claros y teja de barro.' : 'Motor de combustión y almacenamiento de hidrógeno para una aplicación vehicular.';
const photoCredit = house
  ? '<a href="https://www.pexels.com/photo/spanish-villa-with-red-tiled-roofs-and-courtyard-34533806/">Petra Nesti / Pexels</a>. Fotografía reducida y encuadre de presentación. <a href="https://www.pexels.com/license/">Licencia Pexels</a>.'
  : '<a href="https://commons.wikimedia.org/wiki/File:BMW_Hydrogen_7_Engine.jpg">BMW Hydrogen 7 Engine — Sachi Gahan, 2007</a>. Archivo sin modificar; encuadre de presentación. <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA 2.0</a>.';
html = html.replace(/<header class="s-header">[\s\S]*?<\/header>/, header)
  .replace('class="course-book"', 'class="course-book project-research-book"')
  .replace('</head>', '<link rel="stylesheet" href="css/project-research.css?v=20261010b"><meta name="twitter:card" content="summary_large_image"></head>')
  .replace('js/main.js?v=urls-limpias-20260727', 'js/main.js?v=mobile-navigation-20260828a');
html = html.replace(/<section class="book-sheet"[^>]*>([\s\S]*?)<\/section>/g, (_, body) => {
  const label = body.match(/<aside[^>]*><span>(.*?)<\/span>/)[1];
  const chapter = label.match(/^Capítulo (\d+)/);
  const id = chapter ? 'capitulo-' + chapter[1] : label === 'Contenido' ? 'indice' : label === 'Lámina' ? 'lamina' : 'referencias';
  return `<section class="book-sheet" id="${id}">${body}</section>`;
});
html = html.replace('href="#capitulo-1"', 'href="#indice"')
  .replace(/<li>(\d+)\. ([^<]*)<\/li>/g, (_, n, label) => `<li><a href="#capitulo-${n}">${n}. ${label}</a></li>`)
  .replace('<div class="course-book__actions">', `<p class="project-status">Proyecto en formulación · ${number} · Octubre de 2026</p><div class="course-book__actions"><a class="btn btn--stroke" href="${pdf}" download>Descargar cuadernillo PDF</a>`);
html = html.replace(/<figure class="book-cover-figure">[\s\S]*?<\/figure>/, `<figure class="book-cover-figure"><video controls muted playsinline preload="none" poster="images/portfolio/${slug}.jpg?v=20261010b" aria-label="${house ? 'Video de referencia de arquitectura colonial en Villa de Leyva' : 'Video de referencia de un motor convencional, no un ensayo con hidrógeno'}"><source src="videos/portafolio/${slug}.mp4?v=20261010b" type="video/mp4"><a href="videos/portafolio/${slug}.mp4">Ver video de referencia</a></video><figcaption>${description}<details class="project-media-credits"><summary>Créditos de imagen y video</summary><p>Imagen: ${photoCredit}</p><p>Video: <a href="${mediaURL}" target="_blank" rel="noopener">${author} / Pexels</a>. ${house ? 'Arquitectura colonial de Villa de Leyva.' : 'Detalle de un motor convencional; no muestra funcionamiento con hidrógeno.'} Extracto de 9 segundos sin audio, reducido para la web. <a href="https://www.pexels.com/license/" target="_blank" rel="noopener">Licencia Pexels</a>. Las referencias no representan obras, prototipos ni personal de HVT.</p></details></figcaption></figure>`);
let reference = 0;
html = html.replace(/(<div class="book-references"><h3>Referencias<\/h3><ol>)([\s\S]*?)(<\/ol>)/g, (_, start, body, end) => start + body.replace(/<li>/g, () => `<li id="ref-${++reference}">`) + end);
html = html.replace(/<sup>\[([\d,]+)\]<\/sup>/g, (_, refs) => `<sup>${refs.split(',').map(n => `<a href="#ref-${n}" aria-label="Referencia ${n}">[${n}]</a>`).join(' ')}</sup>`);
html = html.replace(/<table class="project-parameter-table">([\s\S]*?)<\/table>/g, (_, content) => `<div class="project-table-wrap" role="region" aria-label="Tabla técnica desplazable" tabindex="0"><table class="project-parameter-table">${content.replaceAll('<th>', '<th scope="col">')}</table></div>`);
// El conversor común incorpora PCI al subíndice cuando encuentra H_2 anidado.
// Mantener el poder calorífico como factor separado del caudal másico.
html = html.replace('<mrow><msub><mi>H</mi><mn>2</mn></msub><mi>P</mi><mi>C</mi><mi>I</mi></mrow></msub>', '<mrow><msub><mi>H</mi><mn>2</mn></msub></mrow></msub><mi mathvariant="normal">PCI</mi>');
html = html.replace('</main>', `<div class="row project-book-end"><div class="column"><h2>Conversemos sobre el proyecto</h2><p>Podemos empezar por definir el alcance del piloto y las capacidades necesarias para desarrollarlo.</p><div class="course-book__actions"><a href="/#contact" class="btn btn--primary">Contactar a HVT</a><a href="${pdf}" class="btn btn--stroke" download>Descargar PDF</a><a href="/#portfolio" class="btn btn--stroke">Volver a proyectos</a></div></div></div></main>`);
const schema = { '@context': 'https://schema.org', '@type': 'TechArticle', headline: title, inLanguage: 'es-CO', datePublished: '2026-10-10', author: { '@type': 'Organization', name: 'Hidrógeno Verde Turquesa' }, url: `https://hidrogenoverdeturquesa.com/proyecto-${slug}`, image: `https://hidrogenoverdeturquesa.com/images/portfolio/${slug}.jpg` };
html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(schema)}</script></head>`);
fs.writeFileSync(output, html, 'utf8');
fs.writeFileSync(path.join(root, `proyecto-${slug}.html`), html, 'utf8');
console.log(`${number}: contenido, referencias, navegación, video y PDF integrados.`);
