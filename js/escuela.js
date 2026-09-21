(() => {
    const search = document.querySelector('#school-search');
    const category = document.querySelector('#school-category');
    const level = document.querySelector('#school-level');
    const cards = [...document.querySelectorAll('.school-card')];
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const filter = () => {
        const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
        let count = 0;
        for (const card of cards) {
            const matches = terms.every(term => normalize(card.textContent).includes(term));
            card.hidden = !matches || (category.value !== 'all' && category.value !== card.dataset.category)
                || (level.value !== 'all' && level.value !== card.querySelector('.school-card-image > span').textContent);
            if (!card.hidden) count++;
        }
        document.querySelector('#school-count').textContent = `${count} ${count === 1 ? 'curso disponible' : 'cursos disponibles'}`;
        document.querySelector('.school-empty').hidden = count > 0;
    };
    search.addEventListener('input', filter);
    category.addEventListener('change', filter);
    level.addEventListener('change', filter);
    const showPanel = () => {
        const active = location.hash === '#guia' ? 'guia' : 'catalogo';
        for (const id of ['catalogo', 'guia']) document.getElementById(id).hidden = id !== active;
        document.querySelectorAll('.school-tabs [data-panel]').forEach(link => {
            if (link.dataset.panel === active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    };
    window.addEventListener('hashchange', showPanel);
    showPanel();
})();
