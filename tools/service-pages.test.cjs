const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require(process.env.HVT_JSDOM || 'jsdom');
const root = path.resolve(__dirname, '..');
const lines = ['energia', 'bioeconomia', 'inteligencia-territorial', 'infraestructura'];
const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const workLines = main.slice(main.indexOf('const ssWorkLines = function()'), main.indexOf('/* impact counters'));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const text = node => node.textContent.replace(/\s+/g, ' ').trim();
const pause = () => new Promise(resolve => setTimeout(resolve, 25));

for (const locale of ['', 'en/', 'ru/']) {
    for (const [index, slug] of lines.entries()) {
        test(`${locale || 'es/'}${slug}: source content, metadata and navigation`, () => {
            const code = '00' + (index + 1);
            const source = new JSDOM(read(locale + 'index.html')).window.document;
            const url = `https://hidrogenoverdeturquesa.com/${locale}lineas/${slug}/`;
            const dom = new JSDOM(read(locale + `lineas/${slug}/index.html`), {url});
            const d = dom.window.document;
            const sourcePanel = source.querySelector('#line-detail-' + code);
            const card = source.querySelector(`[data-line-card="${code}"]`);
            assert.equal(d.querySelectorAll('h1').length, 1);
            assert.equal(text(d.querySelector('h1')), text(card.querySelector('.services-item__title')));
            assert.deepEqual([...d.querySelectorAll('.line-service')].map(text), [...sourcePanel.querySelectorAll('.line-service')].map(text));
            assert.deepEqual([...d.querySelectorAll('.line-projects a')].map(text), [...sourcePanel.querySelectorAll('.line-projects a')].map(text));
            assert.equal(d.querySelector('.line-detail').hidden, false);
            assert.equal(d.querySelector('[data-close-line]'), null);
            assert.equal(d.querySelector('.line-detail__explore'), null);
            assert.equal(d.querySelector('.line-page__back').getAttribute('href'), `/${locale}#line-detail-${code}`);
            assert.equal(d.querySelector('.line-page__contact a').getAttribute('href'), `/${locale}#contact`);
            assert.equal(d.querySelector('link[rel=canonical]').href, url);
            for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
                assert.equal(d.querySelector(selector).content, text(d.querySelector('h1')));
            }
            for (const selector of ['meta[name=description]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
                assert.equal(d.querySelector(selector).content, text(d.querySelector('.line-page__summary')));
            }
            assert.equal(d.querySelectorAll('.work-gallery__photo').length, index === 3 ? 8 : 0);
            const social = d.querySelector('meta[property="og:image"]');
            const editorial = locale === '';
            assert.equal(!!social, index === 3 || editorial);
            if (social) assert.equal(social.content, d.querySelector(editorial ? '.energy-hero__image' : '.work-gallery__photo img').src);
            const ids = [...d.querySelectorAll('[id]')].map(n => n.id);
            assert.equal(new Set(ids).size, ids.length);
            for (const node of d.querySelectorAll('[src], a[href], link[rel=stylesheet]')) {
                const value = node.getAttribute('src') || node.getAttribute('href');
                if (!value || /^(https?:|mailto:|tel:|data:)/.test(value)) continue;
                const target = new URL(value, url);
                const file = path.join(root, decodeURIComponent(target.pathname));
                assert.ok(fs.existsSync(file) || fs.existsSync(file + '.html'), `Missing ${value}`);
                if (target.pathname === new URL(url).pathname && target.hash) assert.ok(d.getElementById(target.hash.slice(1)));
            }
            for (const link of d.querySelectorAll('.s-header__language-menu a')) {
                assert.ok(link.pathname.endsWith(`/lineas/${slug}/`), 'Language switch stays on this line');
            }
            dom.window.close();
        });
    }

    test(`${locale || 'es/'}home: inline cards, return link and closing still work`, () => {
        const dom = new JSDOM(read(locale + 'index.html'), {url: `https://hidrogenoverdeturquesa.com/${locale}#line-detail-004`, runScripts: 'outside-only'});
        const w = dom.window, d = w.document;
        w.HTMLElement.prototype.scrollIntoView = function() {};
        w.eval(workLines + '\nssWorkLines();');
        const panels = [...d.querySelectorAll('.line-detail')];
        assert.equal(d.querySelector('#line-detail-004').hidden, false, 'Return link opens the relevant line');
        for (const [index, trigger] of [...d.querySelectorAll('.services-item__trigger')].entries()) {
            trigger.click();
            const active = d.getElementById(trigger.getAttribute('aria-controls'));
            assert.equal(active.hidden, false);
            assert.equal(trigger.getAttribute('aria-expanded'), 'true');
            assert.equal(panels.filter(p => !p.hidden).length, 1);
            assert.ok(active.parentElement.classList.contains('services-list'));
            const explore = active.querySelector('.line-detail__explore a');
            assert.equal(new URL(explore.href).pathname, `/${locale}lineas/${lines[index]}/`);
            active.querySelector('[data-close-line]').click();
            assert.ok(panels.every(p => p.hidden));
            assert.equal(d.activeElement, trigger);
        }
        dom.window.close();
    });
}

test('energy editorial sections preserve navigation and service interaction', async () => {
    const dom = new JSDOM(read('lineas/energia/index.html'), {runScripts: 'outside-only'});
    const w = dom.window, d = w.document;
    assert.equal(d.querySelectorAll('#servicios .line-service').length, 6);
    assert.equal(d.querySelectorAll('#proyectos .line-projects a').length, 4);
    for (const link of d.querySelectorAll('.energy-chapter-nav a')) {
        const section = d.querySelector(link.getAttribute('href'));
        assert.ok(section && d.getElementById(section.getAttribute('aria-labelledby')));
    }
    for (const photo of d.querySelectorAll('main img')) assert.ok(photo.alt.trim());
    w.eval(workLines + '\nssWorkLines();');
    const [first, second] = d.querySelectorAll('.line-service');
    assert.equal(first.open, true);
    await pause();
    second.open = true;
    await pause();
    assert.equal(first.open, false);
    assert.equal(second.open, true);
    dom.window.close();
});

for (const slug of lines.slice(1)) {
    test(`${slug}: photography, keyboard gallery and original specialist content`, () => {
        const dom = new JSDOM(read(`lineas/${slug}/index.html`), {runScripts: 'outside-only'});
        const w = dom.window, d = w.document;
        const sourceDom = new JSDOM(read('index.html'));
        const source = sourceDom.window.document;
        const code = '00' + (lines.indexOf(slug) + 1);
        const sourcePanel = source.querySelector('#line-detail-' + code);
        for (const selector of ['.line-detail__note', '.line-project-card--protected']) {
            assert.deepEqual([...d.querySelectorAll(selector)].map(text), [...sourcePanel.querySelectorAll(selector)].map(text));
        }
        const originalPhotos = [...sourcePanel.querySelectorAll('.work-gallery__photo img')].map(img => img.getAttribute('src').replace(/^\//, ''));
        assert.deepEqual([...d.querySelectorAll('.work-gallery__photo img')].map(img => img.getAttribute('src').replace(/^\//, '')), originalPhotos);
        assert.equal(d.querySelectorAll('dialog.work-gallery__viewer').length, slug === 'infraestructura' ? 1 : 0);
        for (const img of d.querySelectorAll('main img')) {
            assert.ok(img.alt.trim());
            if (img.srcset) for (const candidate of img.srcset.split(',')) assert.ok(fs.existsSync(path.join(root, candidate.trim().split(' ')[0])));
        }
        for (const link of d.querySelectorAll('.energy-chapter-nav a')) assert.ok(d.querySelector(link.getAttribute('href')));
        const controls = d.querySelector('.energy-gallery-controls');
        assert.equal(controls.hidden, true);
        w.eval(read('js/energy-gallery.js'));
        assert.equal(controls.hidden, false);
        const buttons = [...controls.querySelectorAll('button')];
        buttons.at(-1).click();
        assert.equal(d.querySelectorAll('[data-energy-photo].is-active').length, 1);
        assert.equal(d.querySelector('[data-energy-credit]').textContent, d.querySelector('[data-energy-photo].is-active').dataset.credit);
        buttons.at(-1).dispatchEvent(new w.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
        assert.equal(d.activeElement, buttons[0]);
        assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
        assert.ok(d.querySelector('#creditos-fotograficos a[href="https://www.pexels.com/license/"]'));
        sourceDom.window.close();
        dom.window.close();
    });
}

test('dedicated services preserve accordion behavior without home cards', async () => {
    const dom = new JSDOM(read('lineas/infraestructura/index.html'), {runScripts: 'outside-only'});
    const w = dom.window;
    w.eval(workLines + '\nssWorkLines();');
    const [first, second] = w.document.querySelectorAll('.line-service');
    first.open = true;
    await pause();
    second.open = true;
    await pause();
    assert.equal(first.open, false);
    assert.equal(second.open, true);
    dom.window.close();
});

test('energy photographic gallery keeps a fallback and supports keyboard selection', () => {
    const dom = new JSDOM(read('lineas/energia/index.html'), {runScripts: 'outside-only'});
    const w = dom.window, d = w.document;
    const photos = [...d.querySelectorAll('[data-energy-photo]')];
    const controls = d.querySelector('.energy-gallery-controls');
    const buttons = [...controls.querySelectorAll('button')];
    assert.equal(controls.hidden, true, 'No inactive controls are shown without JavaScript');
    assert.equal(photos.filter(p => p.classList.contains('is-active')).length, 1);
    w.eval(read('js/energy-gallery.js'));
    assert.equal(controls.hidden, false);
    buttons[1].click();
    assert.equal(photos[1].classList.contains('is-active'), true);
    assert.equal(photos[0].getAttribute('aria-hidden'), 'true');
    assert.equal(d.querySelector('[data-energy-credit]').textContent, 'Solar · Red Zeppelin');
    buttons[1].dispatchEvent(new w.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    assert.equal(d.activeElement, buttons[2]);
    assert.equal(buttons[2].getAttribute('aria-pressed'), 'true');
    buttons[2].dispatchEvent(new w.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    assert.equal(d.activeElement, buttons[0], 'Selection wraps at the end');
    assert.equal(photos.filter(p => p.classList.contains('is-active')).length, 1);
    assert.equal(buttons.filter(b => b.getAttribute('aria-pressed') === 'true').length, 1);
    buttons[0].dispatchEvent(new w.KeyboardEvent('keydown', {key: 'End', bubbles: true}));
    assert.equal(d.activeElement, buttons[2]);
    buttons[2].dispatchEvent(new w.KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
    assert.equal(d.activeElement, buttons[0]);
    dom.window.close();
});
