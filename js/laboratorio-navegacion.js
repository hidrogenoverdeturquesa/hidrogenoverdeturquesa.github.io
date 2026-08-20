(function () {
    'use strict';

    const toggle = document.querySelector('.lab-site-header__toggle');
    const navigation = document.querySelector('.lab-global-nav');
    if (!toggle || !navigation) return;

    function setOpen(open, returnFocus) {
        navigation.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', function () {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true', false);
    });

    navigation.addEventListener('click', function (event) {
        if (event.target.closest('a') && window.matchMedia('(max-width: 900px)').matches) setOpen(false, false);
    });

    document.addEventListener('pointerdown', function (event) {
        if (toggle.getAttribute('aria-expanded') === 'true' && !navigation.contains(event.target) && !toggle.contains(event.target)) {
            setOpen(false, false);
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });

    window.addEventListener('resize', function () {
        if (!window.matchMedia('(max-width: 900px)').matches) setOpen(false, false);
    });
})();
