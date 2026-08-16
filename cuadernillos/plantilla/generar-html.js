const fs = require('fs');
const path = require('path');

const base = __dirname;
const input = path.resolve(base, process.argv[2] || 'cuadernillo-prueba.tex');
const output = path.resolve(base, process.argv[3] || '..', process.argv[3] ? '' : 'prueba-cuadernillo-latex.html');
const tex = fs.readFileSync(input, 'utf8');

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function balancedArgument(source, start) {
  while (/\s/.test(source[start] || '')) start++;
  if (source[start] !== '{') throw new Error(`Se esperaba { cerca de: ${source.slice(start, start + 40)}`);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{' && source[i - 1] !== '\\') depth++;
    if (source[i] === '}' && source[i - 1] !== '\\') depth--;
    if (depth === 0) return { value: source.slice(start + 1, i), end: i + 1 };
  }
  throw new Error('Llaves sin cerrar en el archivo LaTeX.');
}

function command(name, count = 1, source = tex) {
  const marker = `\\${name}`;
  const at = source.indexOf(`${marker}{`);
  if (at < 0) throw new Error(`No se encontró \\${name}.`);
  const values = [];
  let cursor = at + marker.length;
  for (let i = 0; i < count; i++) {
    const arg = balancedArgument(source, cursor);
    values.push(arg.value);
    cursor = arg.end;
  }
  return values;
}

function commands(name, count = 1, source = tex) {
  const marker = `\\${name}`;
  const found = [];
  let cursor = 0;
  while ((cursor = source.indexOf(`${marker}{`, cursor)) >= 0) {
    const values = [];
    let argsAt = cursor + marker.length;
    for (let i = 0; i < count; i++) {
      const arg = balancedArgument(source, argsAt);
      values.push(arg.value);
      argsAt = arg.end;
    }
    found.push(values);
    cursor = argsAt;
  }
  return found;
}

function environments(name, source = tex) {
  const open = `\\begin{${name}}`;
  const close = `\\end{${name}}`;
  const found = [];
  let cursor = 0;
  while ((cursor = source.indexOf(open, cursor)) >= 0) {
    let argsAt = cursor + open.length;
    const args = [];
    while (source[argsAt] === '{' || /\s/.test(source[argsAt] || '')) {
      while (/\s/.test(source[argsAt] || '')) argsAt++;
      if (source[argsAt] !== '{') break;
      const arg = balancedArgument(source, argsAt);
      args.push(arg.value);
      argsAt = arg.end;
    }
    const end = source.indexOf(close, argsAt);
    if (end < 0) throw new Error(`Falta ${close}.`);
    found.push({ args, body: source.slice(argsAt, end) });
    cursor = end + close.length;
  }
  return found;
}

function inline(value) {
  let html = escapeHtml(value.trim());
  html = html.replace(/\\textbf\{([^{}]*)\}/g, '<strong>$1</strong>');
  html = html.replace(/\\emph\{([^{}]*)\}/g, '<em>$1</em>');
  html = html.replace(/\\texttt\{([^{}]*)\}/g, '<code>$1</code>');
  html = html.replace(/\\textbackslash\s*/g, '\\');
  html = html.replace(/\\HVTCite\{([^{}]*)\}/g, '<sup>[$1]</sup>');
  html = html.replace(/\$([^$]+)\$/g, (_, math) => `<span class="math-inline">${formula(math)}</span>`);
  html = html.replace(/\\%/g, '%').replace(/\\&/g, '&amp;').replace(/~/g, ' ');
  return html.replace(/\s+/g, ' ').trim();
}

function list(body, ordered = false, css = '') {
  const items = body.split(/\\item\s+/).slice(1).map(item => `<li>${inline(item)}</li>`).join('\n');
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag}${css ? ` class="${css}"` : ''}>${items}</${tag}>`;
}

function formula(value) {
  let html = escapeHtml(value.trim());
  html = html.replace(/\\mathrm\{([^{}]+)\}/g, '$1');
  html = html.replace(/\\text\{([^{}]+)\}/g, '$1');
  html = html.replace(/\\mathcal\{O\}/g, '𝒪');
  html = html.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="math-fraction"><span>$1</span><span>$2</span></span>');
  html = html.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
  html = html.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
  html = html.replace(/_([A-Za-z0-9])/g, '<sub>$1</sub>');
  html = html.replace(/\^([A-Za-z0-9])/g, '<sup>$1</sup>');
  const symbols = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', eta: 'η', lambda: 'λ',
    mu: 'μ', rho: 'ρ', sigma: 'σ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ',
    Omega: 'Ω', cdot: '·', times: '×', approx: '≈', sum: 'Σ', int: '∫',
    leq: '≤', geq: '≥'
  };
  html = html.replace(/\\([A-Za-z]+)/g, (_, name) => symbols[name] || name);
  return html;
}

function formulaMathML(value) {
  let cursor = 0;
  const symbols = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', eta: 'η', lambda: 'λ',
    mu: 'μ', rho: 'ρ', sigma: 'σ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ',
    Omega: 'Ω', cdot: '·', times: '×', approx: '≈', sum: 'Σ', int: '∫',
    leq: '≤', geq: '≥'
  };
  const groupText = () => {
    while (/\s/.test(value[cursor] || '')) cursor++;
    if (value[cursor] !== '{') return '';
    let depth = 1;
    const start = ++cursor;
    while (cursor < value.length && depth) {
      if (value[cursor] === '{') depth++;
      if (value[cursor] === '}') depth--;
      cursor++;
    }
    return value.slice(start, cursor - 1);
  };
  const parse = stop => {
    let out = '';
    while (cursor < value.length && value[cursor] !== stop) {
      if (/\s/.test(value[cursor])) { cursor++; continue; }
      let atom = '';
      if (value[cursor] === '\\') {
        cursor++;
        const match = value.slice(cursor).match(/^[A-Za-z]+/);
        const name = match ? match[0] : value[cursor++];
        cursor += match ? name.length : 0;
        if (name === 'frac') {
          const numerator = groupText();
          const denominator = groupText();
          atom = `<mfrac><mrow>${formulaMathMLInner(numerator)}</mrow><mrow>${formulaMathMLInner(denominator)}</mrow></mfrac>`;
        } else if (name === 'mathrm' || name === 'text' || name === 'mathcal') {
          const content = escapeHtml(groupText());
          atom = name === 'text' || name === 'mathrm' ? `<mtext>${content}</mtext>` : `<mi mathvariant="script">${content}</mi>`;
        } else if (name === 'left' || name === 'right' || name === ',') atom = '';
        else atom = symbols[name] ? `<mo>${symbols[name]}</mo>` : `<mi>${escapeHtml(name)}</mi>`;
      } else if (value[cursor] === '{') {
        cursor++;
        atom = `<mrow>${parse('}')}</mrow>`;
        cursor++;
      } else {
        const char = value[cursor++];
        atom = /[0-9]/.test(char) ? `<mn>${char}</mn>` : /[A-Za-zÁ-ÿ]/.test(char) ? `<mi>${escapeHtml(char)}</mi>` : `<mo>${escapeHtml(char)}</mo>`;
      }
      let sub = null;
      let sup = null;
      while (value[cursor] === '_' || value[cursor] === '^') {
        const kind = value[cursor++];
        const script = value[cursor] === '{' ? (cursor++, `<mrow>${parse('}')}</mrow>`) : parseSingle();
        if (value[cursor] === '}') cursor++;
        if (kind === '_') sub = script; else sup = script;
      }
      if (sub && sup) atom = `<msubsup>${atom}${sub}${sup}</msubsup>`;
      else if (sub) atom = `<msub>${atom}${sub}</msub>`;
      else if (sup) atom = `<msup>${atom}${sup}</msup>`;
      out += atom;
    }
    return out;
  };
  const parseSingle = () => {
    const char = value[cursor++] || '';
    return /[0-9]/.test(char) ? `<mn>${char}</mn>` : `<mi>${escapeHtml(char)}</mi>`;
  };
  const formulaMathMLInner = text => formulaMathML(text).replace(/^<math[^>]*><mrow>|<\/mrow><\/math>$/g, '');
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${escapeHtml(value)}"><mrow>${parse()}</mrow></math>`;
}

function renderBody(body) {
  const commandTypes = { HVTLead: 1, HVTText: 1, HVTHeading: 1, HVTEquation: 2, HVTImagen: 2, HVTContact: 2 };
  const environmentTypes = ['HVTGrid','HVTFlow','HVTGallery','HVTExample','HVTSteps','HVTTable','HVTWarning','HVTTaskOrdered','HVTTask','HVTCode','HVTReferences'];
  const tokens = [];
  for (const [name, count] of Object.entries(commandTypes)) {
    const marker = `\\${name}`;
    let at = 0;
    while ((at = body.indexOf(`${marker}{`, at)) >= 0) {
      const args = []; let end = at + marker.length;
      for (let i = 0; i < count; i++) { const arg = balancedArgument(body, end); args.push(arg.value); end = arg.end; }
      tokens.push({ at, end, name, args, body: '' }); at = end;
    }
  }
  for (const name of environmentTypes) {
    const open = `\\begin{${name}}`, close = `\\end{${name}}`; let at = 0;
    while ((at = body.indexOf(open, at)) >= 0) {
      let argsAt = at + open.length; const args = [];
      while (true) { while (/\s/.test(body[argsAt] || '')) argsAt++; if (body[argsAt] !== '{') break; const arg = balancedArgument(body,argsAt); args.push(arg.value); argsAt=arg.end; }
      const closeAt = body.indexOf(close,argsAt); if (closeAt < 0) throw new Error(`Falta ${close}.`);
      tokens.push({ at, end: closeAt + close.length, name, args, body: body.slice(argsAt,closeAt) }); at = closeAt + close.length;
    }
  }
  tokens.sort((a,b) => a.at-b.at);
  const top = tokens.filter((token, index) => !tokens.some((parent, parentIndex) => parentIndex !== index && parent.at < token.at && parent.end >= token.end));
  const rendered = top.map(token => {
    const a=token.args, b=token.body, name=token.name;
    if (name==='HVTLead') return `<p class="book-lead">${inline(a[0])}</p>`;
    if (name==='HVTText') return `<p>${inline(a[0])}</p>`;
    if (name==='HVTHeading') return `<h3>${inline(a[0])}</h3>`;
    if (name==='HVTEquation') return `<div class="project-equation hvt-display-equation"><div class="math-display">${formulaMathML(a[0])}</div>${a[1].trim()?`<p>${inline(a[1])}</p>`:''}</div>`;
    if (name==='HVTImagen') return `<figure class="book-figure book-figure--wide"><img src="${escapeHtml(a[0].replace(/^(\.\.\/)+/,''))}" alt="${escapeHtml(a[1])}"><figcaption>${inline(a[1])}</figcaption></figure>`;
    if (name==='HVTContact') return `<a class="btn btn--primary" href="${escapeHtml(a[1])}" target="_blank" rel="noopener">${inline(a[0])}</a>`;
    if (name==='HVTGrid') return `<div class="book-learning-grid">${environments('HVTColumn',b).map(c=>{const items=environments('itemize',c.body)[0];return `<div><h3>${inline(c.args[0])}</h3>${items?list(items.body):`<p>${inline(c.body)}</p>`}</div>`}).join('')}</div>`;
    if (name==='HVTFlow') return `<div class="book-flow">${commands('HVTFlowItem',3,b).map(i=>`<div><span>${inline(i[0])}</span><strong>${inline(i[1])}</strong><p>${inline(i[2])}</p></div>`).join('')}</div>`;
    if (name==='HVTGallery') return `<div class="book-learning-grid book-figure-grid">${commands('HVTImagen',2,b).map(i=>`<figure class="book-figure"><img src="${escapeHtml(i[0].replace(/^(\.\.\/)+/,''))}" alt="${escapeHtml(i[1])}"><figcaption>${inline(i[1])}</figcaption></figure>`).join('')}</div>`;
    if (name==='HVTExample') { const numbered=environments('enumerate',b)[0]; return `<div class="book-example"><p class="book-example__label">${inline(a[0])}</p><h3>${inline(a[1])}</h3><div class="book-solution">${numbered?list(numbered.body,true):`<p>${inline(b)}</p>`}</div></div>`; }
    if (name==='HVTSteps') return list(b,true,'book-steps');
    if (name==='HVTTable') return `<table class="project-parameter-table"><thead><tr>${a.map(x=>`<th>${inline(x)}</th>`).join('')}</tr></thead><tbody>${commands('HVTTableRow',3,b).map(r=>`<tr>${r.map(x=>`<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    if (name==='HVTWarning') return `<div class="project-warning"><strong>${inline(a[0])}:</strong> ${inline(b)}</div>`;
    if (name==='HVTTask' || name==='HVTTaskOrdered') return `<div class="book-task"><h3>${inline(a[0])}</h3>${list(b,name==='HVTTaskOrdered')}</div>`;
    if (name==='HVTCode') return `<div class="book-code-card"><h3>${inline(a[0])}</h3><pre><code>${escapeHtml(b.trim())}</code></pre></div>`;
    if (name==='HVTReferences') return `<div class="book-references"><h3>Referencias</h3><ol>${commands('HVTReference',2,b).map(r=>`<li><a href="${escapeHtml(r[1])}" target="_blank" rel="noopener">${inline(r[0])}</a>.</li>`).join('')}</ol></div>`;
    return '';
  }).join('');
  return rendered.replace(/<\/ol><\/div><div class="book-references"><h3>Referencias<\/h3><ol>/g, '');
}

const title = command('HVTTitulo')[0];
const subtitle = command('HVTSubtitulo')[0];
const level = command('HVTNivel')[0];
const number = command('HVTNumero')[0];
const series = (commands('HVTSerie')[0] || ['Guía formativa'])[0];
const action = (commands('HVTAccion')[0] || ['Empezar'])[0];
const description = (commands('HVTDescripcion')[0] || ['Cuadernillo de Hidrógeno Verde Turquesa generado desde LaTeX.'])[0];
const canonical = (commands('HVTCanonical')[0] || [''])[0];
const back = commands('HVTRegreso', 2)[0] || ['Volver al catálogo', '/fundacion#cursos'];
const isProject = series.toLocaleLowerCase('es').includes('publicación técnica');
const cover = command('HVTPortada', 2);
const sourcePages = environments('HVTPage');
const groupedPages = [];
for (const page of sourcePages) {
  const previous = groupedPages[groupedPages.length-1];
  if (previous && previous.args[0] === page.args[0]) {
    previous.body += page.body;
  } else groupedPages.push({ args: [...page.args], body: page.body });
}
const pages = groupedPages.map((page, index) => `
<section class="book-sheet"${index === 0 ? ' id="capitulo-1"' : ''}>
  <div class="book-page">
    <aside class="book-page__index"><span>${inline(page.args[0])}</span><strong>${inline(page.args[1].replace(/\s*·\s*\d+$/, ''))}</strong></aside>
    <article class="book-page__content"><h2>${inline(page.args[2])}</h2>${renderBody(page.body)}</article>
  </div>
</section>`).join('\n');

const html = `<!DOCTYPE html>
<html class="no-js" lang="es">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${escapeHtml(title)} | Hidrógeno Verde Turquesa</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(new URL(cover[0].replace(/^(\.\.\/)+/, ''), canonical).href)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:type" content="article">` : ''}
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="css/styles.css?v=fuentes-locales-20260726">
  <link rel="stylesheet" href="css/vendor.css?v=sin-prism-20260726">
  <link rel="stylesheet" href="cuadernillos/plantilla/pdf.css">
  <script src="js/modernizr.js"></script>
  <script defer src="js/fontawesome/all.min.js"></script>
</head>
<body id="top">
  <div id="preloader"><div id="loader"></div></div>
  <header class="s-header"><div class="row">
    <div class="s-header__logo"><a href="/"><img src="images/logo-hvt.svg" alt="Hidrógeno Verde Turquesa" style="height:40px;width:auto"></a></div>
    <nav class="s-header__nav"><ul><li><a href="/">Inicio</a></li>${isProject ? '<li class="current"><a href="/#portfolio">Proyectos</a></li>' : '<li><a href="/fundacion">Fundación</a></li><li class="current"><a href="/fundacion#cursos">Cursos</a></li>'}<li><a href="/investors">Apoyar proyectos</a></li><li><a href="/#contact">Contacto</a></li></ul></nav>
    <a class="s-header__menu-toggle" href="#0" title="Menu"><span class="s-header__menu-icon"></span></a>
  </div></header>
  <main class="course-book">
    <section class="course-book__hero"><div class="row">
      <div class="column large-7 medium-12"><p class="course-book__eyebrow">${inline(series)} ${inline(number)} · ${inline(level)}</p><h1>${inline(title)}</h1><p class="course-book__lead">${inline(subtitle)}</p><div class="course-book__actions"><a href="#capitulo-1" class="btn btn--primary smoothscroll">${inline(action)}</a><a href="${escapeHtml(back[1].replace(/\\#/g, '#'))}" class="btn btn--stroke">${inline(back[0])}</a></div></div>
      <div class="column large-5 medium-12"><figure class="book-cover-figure"><img src="${escapeHtml(cover[0].replace(/^(\.\.\/)+/, ''))}" alt="${escapeHtml(title)}"><figcaption>${inline(cover[1])}</figcaption></figure></div>
    </div></section>
${pages}
  </main>
  <footer class="s-footer"><div class="row"><div class="column large-7 medium-6 w-1000-stack ss-copyright"><span>© Hidrógeno Verde Turquesa 2026</span><span>${isProject ? 'Publicaciones técnicas de proyectos' : 'Cuadernillos formativos'}</span></div></div><div class="ss-go-top"><a class="smoothscroll" title="Volver arriba" href="#top"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 4h12v2H6zm5 10v6h2v-6h5l-6-6-6 6z"/></svg></a></div></footer>
  <script src="js/jquery-3.7.1.min.js"></script><script src="js/plugins.js?v=sin-prism-20260726"></script><script src="js/main.js?v=urls-limpias-20260727"></script>
</body></html>`;

fs.writeFileSync(output, html, 'utf8');
console.log(`HTML generado: ${output}`);
