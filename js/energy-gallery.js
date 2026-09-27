/* Manual photography gallery. The first image remains visible without JavaScript. */
(() => {
    'use strict';
    const gallery = document.querySelector('[data-energy-gallery]');
    if (!gallery) return;
    const photos = [...gallery.querySelectorAll('[data-energy-photo]')];
    const controls = gallery.querySelector('.energy-gallery-controls');
    const buttons = [...gallery.querySelectorAll('[data-energy-select]')];
    const credit = gallery.querySelector('[data-energy-credit]');
    if (!photos.length || buttons.length !== photos.length || !controls || !credit) return;

    const select = index => {
        photos.forEach((photo, i) => {
            photo.classList.toggle('is-active', i === index);
            photo.setAttribute('aria-hidden', String(i !== index));
        });
        buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        credit.textContent = photos[index].dataset.credit;
    };
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => select(index));
        button.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % photos.length;
            if (event.key === 'ArrowLeft') next = (index + photos.length - 1) % photos.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = photos.length - 1;
            if (next === undefined) return;
            event.preventDefault();
            select(next);
            buttons[next].focus();
        });
    });
    controls.hidden = false;
})();
