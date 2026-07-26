(function () {
    'use strict';

    const houseButtons = Array.from(document.querySelectorAll('[data-house-target]'));
    const housePanels = Array.from(document.querySelectorAll('[data-house-panel]'));

    const activateHousePoint = (target) => {
        houseButtons.forEach((button) => {
            const isActive = button.dataset.houseTarget === target;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-expanded', String(isActive));
        });

        housePanels.forEach((panel) => {
            const isActive = panel.dataset.housePanel === target;
            panel.classList.toggle('is-active', isActive);
            panel.hidden = !isActive;
        });
    };

    houseButtons.forEach((button) => {
        button.addEventListener('click', () => activateHousePoint(button.dataset.houseTarget));
        button.addEventListener('focus', () => activateHousePoint(button.dataset.houseTarget));

        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            button.addEventListener('mouseenter', () => activateHousePoint(button.dataset.houseTarget));
        }
    });

    const lightbox = document.querySelector('.pueblito-lightbox');
    const galleryItems = document.querySelectorAll('[data-gallery-item]');

    if (lightbox && typeof lightbox.showModal === 'function') {
        const lightboxImage = lightbox.querySelector('img');
        const lightboxCaption = lightbox.querySelector('figcaption');
        const lightboxClose = lightbox.querySelector('.pueblito-lightbox__close');

        galleryItems.forEach((item) => {
            item.addEventListener('click', (event) => {
                event.preventDefault();
                const thumbnail = item.querySelector('img');
                lightboxImage.src = item.href;
                lightboxImage.alt = thumbnail ? thumbnail.alt : '';
                lightboxCaption.textContent = item.dataset.caption || '';
                lightbox.showModal();
            });
        });

        lightboxClose.addEventListener('click', () => lightbox.close());
        lightbox.addEventListener('click', (event) => {
            if (event.target === lightbox) {
                lightbox.close();
            }
        });
    }

    const revealItems = document.querySelectorAll('.pueblito-reveal');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion && 'IntersectionObserver' in window) {
        document.documentElement.classList.add('pueblito-motion-ready');
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '0px 0px -8% 0px',
            threshold: 0.08
        });

        revealItems.forEach((item) => revealObserver.observe(item));
    }
}());
