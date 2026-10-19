const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const start = script.indexOf('const ssPreloader = function() {');
const end = script.indexOf('   /* move header', start);
assert.ok(start >= 0 && end > start, 'existing preloader function is present');
const preloaderFunction = script.slice(start, end).trim()
    .replace(/^const ssPreloader = /, '').replace(/;\s*$/, '');

function openWelcome(randomValue = 0) {
    const dom = new JSDOM(page, { url: 'https://hidrogenoverdeturquesa.com/', runScripts: 'outside-only' });
    const { window } = dom;
    const timers = [];
    window.Math.random = () => randomValue;
    window.setTimeout = (callback) => { timers.push(callback); return timers.length; };
    window.Element.prototype.scrollIntoView = () => {};
    window.HTMLMediaElement.prototype.play = function () { this.dataset.playing = 'true'; return Promise.resolve(); };
    window.HTMLMediaElement.prototype.pause = function () { this.dataset.playing = 'false'; };
    window.eval(`(${preloaderFunction})()`);
    return { window, timers };
}

test('welcome stays visible after loading until the visitor enters', () => {
    const { window, timers } = openWelcome();
    const button = window.document.querySelector('[data-loader-enter]');
    assert.equal(button.disabled, true);
    window.dispatchEvent(new window.Event('load'));
    timers.shift()();
    assert.equal(button.disabled, false);
    assert.equal(window.document.documentElement.classList.contains('ss-loaded'), false);
    button.click();
    assert.equal(window.document.documentElement.classList.contains('ss-loaded'), true);
    assert.equal(window.document.querySelector('header').inert, false);
    window.close();
});

test('an early service choice opens contact when the page is ready', () => {
    const { window, timers } = openWelcome();
    const choices = window.document.querySelectorAll('[data-loader-destination]');
    assert.equal(choices.length, 2);
    assert.deepEqual(Array.from(choices, (choice) => choice.textContent), [
        'Contratar un servicio', 'Desarrollar una idea'
    ]);
    choices[0].click();
    assert.equal(window.location.hash, '');
    window.dispatchEvent(new window.Event('load'));
    timers.shift()();
    assert.equal(window.document.documentElement.classList.contains('ss-loaded'), true);
    assert.equal(window.location.hash, '#contact');
    window.close();
});

test('each visit selects exactly one of the three background videos', () => {
    const expected = [
        'videos/portafolio/planta-investigacion.mp4',
        'videos/portafolio/casa-campestre.mp4',
        'videos/bienvenida/auto-combustion-hidrogeno.mp4'
    ];
    [0.1, 0.5, 0.9].forEach((value, index) => {
        const { window } = openWelcome(value);
        const video = window.document.querySelector('[data-welcome-background]');
        assert.equal(video.dataset.selectedVideo, expected[index]);
        assert.ok(video.src.endsWith(expected[index]));
        assert.equal(video.dataset.playing, 'true');
        assert.equal(window.document.querySelectorAll('[data-welcome-background]').length, 1);
        window.close();
    });
});
