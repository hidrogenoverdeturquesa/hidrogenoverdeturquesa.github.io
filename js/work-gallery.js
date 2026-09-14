(function () {
    'use strict';
    const gallery = document.querySelector('[data-work-gallery]');
    const viewer = document.querySelector('[data-work-viewer]');
    if (!gallery || !viewer) return;

    const photos = Array.from(gallery.querySelectorAll('.work-gallery__photo'));
    const more = gallery.querySelector('[data-work-more]');
    const extra = gallery.querySelector('.work-gallery__extra');
    const full = viewer.querySelector('.work-gallery__full');
    const caption = viewer.querySelector('.work-gallery__caption');
    const count = viewer.querySelector('.work-gallery__count');
    const close = viewer.querySelector('[data-work-close]');
    let current = 0;
    let opener = null;

    // The extra images remain available when JavaScript is disabled.
    extra.hidden = true;
    more.hidden = false;
    more.addEventListener('click', function () {
        const expanded = more.getAttribute('aria-expanded') !== 'true';
        more.setAttribute('aria-expanded', String(expanded));
        extra.hidden = !expanded;
        more.querySelector('[data-more-label]').hidden = expanded;
        more.querySelector('[data-less-label]').hidden = !expanded;
    });

    function show(index) {
        current = (index + photos.length) % photos.length;
        const photo = photos[current];
        full.src = photo.href;
        full.alt = photo.querySelector('img').alt;
        caption.textContent = photo.querySelector('span').textContent;
        count.textContent = (current + 1) + ' / ' + photos.length;
    }

    photos.forEach(function (photo, index) {
        photo.addEventListener('click', function (event) {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof viewer.showModal !== 'function') return;
            event.preventDefault();
            opener = photo;
            show(index);
            viewer.showModal();
            document.body.classList.add('work-gallery-is-open');
            close.focus();
        });
    });

    close.addEventListener('click', function () { viewer.close(); });
    viewer.querySelector('[data-work-prev]').addEventListener('click', function () { show(current - 1); });
    viewer.querySelector('[data-work-next]').addEventListener('click', function () { show(current + 1); });
    viewer.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            // Close the image without collapsing the containing service panel.
            event.stopPropagation();
            event.preventDefault();
            viewer.close();
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            event.stopPropagation();
            show(current + (event.key === 'ArrowRight' ? 1 : -1));
        }
    });
    viewer.addEventListener('click', function (event) {
        if (event.target === viewer || event.target === viewer.querySelector('figure')) viewer.close();
        // The img element includes letterboxing; clicking that empty area closes it.
        if (event.target === full && full.naturalWidth && full.naturalHeight) {
            const box = full.getBoundingClientRect();
            const scale = Math.min(box.width / full.naturalWidth, box.height / full.naturalHeight);
            const width = full.naturalWidth * scale, height = full.naturalHeight * scale;
            const left = box.left + (box.width - width) / 2, top = box.top + (box.height - height) / 2;
            if (event.clientX < left || event.clientX > left + width || event.clientY < top || event.clientY > top + height) viewer.close();
        }
    });
    viewer.addEventListener('close', function () {
        document.body.classList.remove('work-gallery-is-open');
        if (opener && opener.isConnected) opener.focus({ preventScroll: true });
        full.removeAttribute('src');
    });
}());
