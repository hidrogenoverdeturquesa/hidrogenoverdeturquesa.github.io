const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require(process.env.HVT_JSDOM || 'jsdom');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const project = 'proyecto-reactores-pulsantes.html';

test('RP-01: índice y referencias llevan a contenido existente', () => {
  const d = new JSDOM(read(project)).window.document;
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.equal(d.querySelector('h1').textContent, 'Reactores pulsantes');
  for (let chapter=1;chapter<=12;chapter++) assert(d.getElementById('capitulo-'+chapter));
  for (let ref=1;ref<=9;ref++) assert(d.getElementById('ref-'+ref));
  const ids = [...d.querySelectorAll('[id]')].map(n=>n.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of d.querySelectorAll('a[href^="#"]')) assert(d.getElementById(a.hash.slice(1)), a.hash);
  assert.equal(d.querySelector('#referencias-adicionales ol').start, 6);
});

test('RP-01: todos los recursos y enlaces locales existen', () => {
  const d = new JSDOM(read(project)).window.document;
  for (const el of d.querySelectorAll('[href], [src]')) {
    const url = el.getAttribute('href') || el.getAttribute('src');
    if (!url || /^(https?:|mailto:|tel:|#)/.test(url)) continue;
    const clean = url.split(/[?#]/)[0].replace(/^\//, '') || 'index.html';
    assert([clean,clean+'.html',clean+'/index.html'].some(f=>fs.existsSync(path.join(root,f))), url);
  }
  assert(d.querySelector('a[download][href$="reactores-pulsantes.pdf"]'));
  assert(d.querySelector('video[controls] source[type="video/mp4"]'));
  assert.equal(read(project), read('proyecto-reactores-pulsantes-latex.html'));
});

test('RP-01: fórmulas, tablas y fuentes son legibles y accesibles', () => {
  const d = new JSDOM(read(project)).window.document;
  assert(d.querySelector('math mover mo').textContent);
  for (const m of d.querySelectorAll('math')) assert(!/varepsilon|quad|\bbar\b|\btau\b/.test(m.textContent));
  assert(d.querySelector('math').getAttribute('aria-label'));
  for (const t of d.querySelectorAll('table')) {
    assert.equal(t.parentElement.getAttribute('tabindex'),'0');
    assert(t.querySelector('th[scope="col"]'));
  }
  const caption = d.querySelector('.reactores-video-figure figcaption');
  assert(caption.textContent.includes('Shinji Sugiura'));
  assert(caption.querySelector('a[href="https://creativecommons.org/licenses/by/4.0/"]'));
});

function hoverFixture({hover=true,reduced=false}={}) {
  const dom = new JSDOM(read('index.html'), {runScripts:'outside-only'});
  const w = dom.window;
  w.matchMedia = q=>({matches:q.includes('prefers-reduced-motion')?reduced:hover});
  const card = w.document.querySelector('a[href="/proyecto-reactores-pulsantes"]');
  const video = card.querySelector('video');
  assert(video, 'La tarjeta debe contener su video');
  assert(video.hasAttribute('muted') && video.loop && video.hasAttribute('playsinline'));
  assert.equal(video.preload, 'none');
  let plays=0, pauses=0, loads=0;
  video.load = ()=>loads++;
  video.play = ()=>{plays++;return Promise.resolve();};
  video.pause = ()=>pauses++;
  const main = read('js/main.js');
  const fragment = main.slice(main.indexOf('const ssPortfolioVideos = function()'),main.indexOf('/* work lines expandable details'));
  w.eval(fragment+'\nssPortfolioVideos();');
  return {w,card,video,counts:()=>({plays,pauses,loads})};
}

test('La tarjeta reproduce al entrar y se detiene y reinicia al salir', () => {
  const f=hoverFixture();
  f.card.dispatchEvent(new f.w.Event('pointerenter'));
  assert.equal(f.counts().plays,1);
  f.video.currentTime=3;
  f.card.dispatchEvent(new f.w.Event('pointerleave'));
  assert.equal(f.counts().pauses,1);
  assert.equal(f.video.currentTime,0);
  f.card.dispatchEvent(new f.w.FocusEvent('focusin'));
  assert.equal(f.counts().plays,2);
  f.card.dispatchEvent(new f.w.FocusEvent('focusout',{relatedTarget:f.w.document.body}));
  assert.equal(f.counts().pauses,2);
  f.w.close();
});

test('El video automático respeta movimiento reducido y dispositivos sin hover', () => {
  for (const opts of [{reduced:true},{hover:false}]) {
    const f=hoverFixture(opts);
    f.card.dispatchEvent(new f.w.Event('pointerenter'));
    f.card.dispatchEvent(new f.w.FocusEvent('focusin'));
    assert.equal(f.counts().plays,0);
    f.w.close();
  }
});
