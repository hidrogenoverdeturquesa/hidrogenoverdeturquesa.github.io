(function () {
    'use strict';

    if (window.__hvtMobileNavigationLoaded) return;
    window.__hvtMobileNavigationLoaded = true;

    const mobile = window.matchMedia('(max-width: 1100px)');
    const lang = (document.documentElement.lang || 'es').toLowerCase();
    const locale = lang.indexOf('en') === 0 ? 'en' : (lang.indexOf('ru') === 0 ? 'ru' : 'es');

    const copy = {
        es: {
            home: 'Inicio', projects: 'Proyectos', lab: 'Laboratorio', more: 'M\u00e1s',
            nav: 'Navegaci\u00f3n principal', menuTitle: 'Explorar HVT', menuEyebrow: 'Navegaci\u00f3n',
            languageTitle: 'Selecciona un idioma', languageEyebrow: 'Idioma', close: 'Cerrar',
            work: 'Qu\u00e9 hacemos', workLines: 'L\u00edneas de trabajo', knowledge: 'Conocimiento',
            library: 'Biblioteca', ecosystem: 'Ecosistema', foundation: 'Fundaci\u00f3n',
            logistyka: 'Logistyka', support: 'Apoyar proyectos', about: 'Nosotros',
            who: 'Qui\u00e9nes somos', careers: 'Trabaja con nosotros', contact: 'Contacto',
            heroCta: 'Explorar proyectos', quickTitle: 'Explora HVT', research: 'Investigaci\u00f3n',
            alliances: 'Alianzas', mentor: 'Mentor',
            researchDescription: 'Explora experimentos, l\u00edneas y conocimiento aplicado.',
            projectsDescription: 'Conoce soluciones, pilotos y casos desarrollados por HVT.',
            alliancesDescription: 'Descubre oportunidades de colaboraci\u00f3n aplicada.',
            mentorDescription: 'Recibe orientaci\u00f3n dentro del ecosistema HVT.',
            explore: 'Explorar', viewProjects: 'Ver proyectos', learnMore: 'Conocer m\u00e1s', openMentor: 'Abrir Mentor'
        },
        en: {
            home: 'Home', projects: 'Projects', lab: 'Laboratory', more: 'More',
            nav: 'Main navigation', menuTitle: 'Explore HVT', menuEyebrow: 'Navigation',
            languageTitle: 'Select a language', languageEyebrow: 'Language', close: 'Close',
            work: 'What we do', workLines: 'Work areas', knowledge: 'Knowledge',
            library: 'Library', ecosystem: 'Ecosystem', foundation: 'Foundation',
            logistyka: 'Logistyka', support: 'Support projects', about: 'About us',
            who: 'Who we are', careers: 'Work with us', contact: 'Contact',
            heroCta: 'Explore projects', quickTitle: 'Explore HVT', research: 'Research',
            alliances: 'Partnerships', mentor: 'Mentor',
            researchDescription: 'Explore experiments, research areas and applied knowledge.',
            projectsDescription: 'Discover solutions, pilots and cases developed by HVT.',
            alliancesDescription: 'Explore opportunities for applied collaboration.',
            mentorDescription: 'Get guidance across the HVT ecosystem.',
            explore: 'Explore', viewProjects: 'View projects', learnMore: 'Learn more', openMentor: 'Open Mentor'
        },
        ru: {
            home: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f', projects: '\u041f\u0440\u043e\u0435\u043a\u0442\u044b', lab: '\u041b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u0438\u044f', more: '\u0415\u0449\u0451',
            nav: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f', menuTitle: '\u0418\u0437\u0443\u0447\u0438\u0442\u044c HVT', menuEyebrow: '\u041d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f',
            languageTitle: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u044f\u0437\u044b\u043a', languageEyebrow: '\u042f\u0437\u044b\u043a', close: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c',
            work: '\u0427\u0442\u043e \u043c\u044b \u0434\u0435\u043b\u0430\u0435\u043c', workLines: '\u041d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f', knowledge: '\u0417\u043d\u0430\u043d\u0438\u044f',
            library: '\u0411\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0430', ecosystem: '\u042d\u043a\u043e\u0441\u0438\u0441\u0442\u0435\u043c\u0430', foundation: '\u0424\u043e\u043d\u0434',
            logistyka: 'Logistyka', support: '\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u0430\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442\u044b', about: '\u041e \u043d\u0430\u0441',
            who: '\u041a\u0442\u043e \u043c\u044b', careers: '\u0420\u0430\u0431\u043e\u0442\u0430 \u0443 \u043d\u0430\u0441', contact: '\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b',
            heroCta: '\u0418\u0437\u0443\u0447\u0438\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442\u044b', quickTitle: '\u0418\u0437\u0443\u0447\u0438\u0442\u044c HVT', research: '\u0418\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u043d\u0438\u044f',
            alliances: '\u041f\u0430\u0440\u0442\u043d\u0451\u0440\u0441\u0442\u0432\u043e', mentor: 'Mentor',
            researchDescription: '\u0418\u0437\u0443\u0447\u0430\u0439\u0442\u0435 \u044d\u043a\u0441\u043f\u0435\u0440\u0438\u043c\u0435\u043d\u0442\u044b, \u043d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u0438 \u043f\u0440\u0438\u043a\u043b\u0430\u0434\u043d\u044b\u0435 \u0437\u043d\u0430\u043d\u0438\u044f.',
            projectsDescription: '\u041f\u043e\u0437\u043d\u0430\u043a\u043e\u043c\u044c\u0442\u0435\u0441\u044c \u0441 \u0440\u0435\u0448\u0435\u043d\u0438\u044f\u043c\u0438, \u043f\u0438\u043b\u043e\u0442\u0430\u043c\u0438 \u0438 \u043f\u0440\u043e\u0435\u043a\u0442\u0430\u043c\u0438 HVT.',
            alliancesDescription: '\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438 \u043f\u0440\u0438\u043a\u043b\u0430\u0434\u043d\u043e\u0433\u043e \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0430.',
            mentorDescription: '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 \u043f\u043e\u043c\u043e\u0449\u044c \u0432 \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438 \u043f\u043e \u044d\u043a\u043e\u0441\u0438\u0441\u0442\u0435\u043c\u0435 HVT.',
            explore: '\u0418\u0437\u0443\u0447\u0438\u0442\u044c', viewProjects: '\u0421\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442\u044b', learnMore: '\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435', openMentor: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c Mentor'
        }
    }[locale];

    const localeRoot = locale === 'es' ? '/' : '/' + locale + '/';
    const paths = {
        home: localeRoot,
        projects: localeRoot + '#portfolio',
        services: localeRoot + '#services',
        about: localeRoot + '#about',
        contact: localeRoot + '#contact',
        library: '/blog',
        lab: '/laboratorio/',
        foundation: '/fundacion',
        support: '/investors',
        careers: '/trabaja-con-nosotros'
    };

    const icons = {
        home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M9 20.5v-6h6v6"/></svg>',
        projects: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h6l1.7 2H20v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M7 12.5h10M7 16h7"/></svg>',
        lab: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7 16h10M9 13h6"/></svg>',
        more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
        globe: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z"/></svg>'
    };

    function activeDestination() {
        const path = location.pathname.toLowerCase();
        if (path.indexOf('/laboratorio') === 0) return 'lab';
        if (path.indexOf('/experimentos/') !== -1 || path.indexOf('/experiments/') !== -1 || path.indexOf('/proyecto-') !== -1 || path.indexOf('/project-') !== -1 || location.hash === '#portfolio') return 'projects';
        if (path === '/' || path === '/index.html' || /^\/(en|ru)\/(index\.html)?$/.test(path)) return location.hash && location.hash !== '#home' ? 'more' : 'home';
        return 'more';
    }

    function languageLinks() {
        const source = Array.from(document.querySelectorAll('.s-header__language-menu a'));
        const defaults = { es: '/', en: '/en/', ru: '/ru/' };
        return [
            { code: 'ES', key: 'es', name: 'Espa\u00f1ol' },
            { code: 'EN', key: 'en', name: 'English' },
            { code: 'RU', key: 'ru', name: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' }
        ].map(function (item) {
            const existing = source.find(function (link) { return (link.getAttribute('hreflang') || '').toLowerCase() === item.key; });
            item.href = existing ? existing.getAttribute('href') : defaults[item.key];
            return item;
        });
    }

    function menuGroup(title, links, extraClass) {
        return '<section class="hvt-mobile-sheet__group' + (extraClass ? ' ' + extraClass : '') + '">' +
            (title ? '<h3>' + title + '</h3>' : '') +
            links.map(function (link) { return '<a href="' + link[1] + '">' + link[0] + '</a>'; }).join('') +
            '</section>';
    }

    const root = document.createElement('div');
    root.className = 'hvt-mobile-nav-shell';
    root.innerHTML = '<div class="hvt-mobile-backdrop" data-mobile-sheet-backdrop aria-hidden="true"></div>' +
        '<section class="hvt-mobile-sheet" id="hvt-more-sheet" data-mobile-sheet="more" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="hvt-more-title" hidden>' +
            '<span class="hvt-mobile-sheet__handle" aria-hidden="true"></span>' +
            '<header class="hvt-mobile-sheet__header"><div><span class="hvt-mobile-sheet__eyebrow">' + copy.menuEyebrow + '</span><h2 class="hvt-mobile-sheet__title" id="hvt-more-title">' + copy.menuTitle + '</h2></div><button class="hvt-mobile-sheet__close" type="button" data-mobile-sheet-close aria-label="' + copy.close + '">&times;</button></header>' +
            '<div class="hvt-mobile-sheet__body"><div class="hvt-mobile-sheet__groups">' +
                menuGroup(copy.work, [[copy.workLines, paths.services], [copy.projects, paths.projects]]) +
                menuGroup(copy.knowledge, [[copy.library, paths.library], [copy.lab, paths.lab]]) +
                menuGroup(copy.ecosystem, [[copy.foundation, paths.foundation], [copy.logistyka, 'https://hidrogenoverdeturquesa.github.io/logistyka/'], [copy.support, paths.support]]) +
                menuGroup(copy.about, [[copy.who, paths.about], [copy.careers, paths.careers]]) +
                menuGroup('', [[copy.contact, paths.contact]], 'hvt-mobile-sheet__group--contact') +
            '</div></div>' +
        '</section>' +
        '<section class="hvt-mobile-sheet" id="hvt-language-sheet" data-mobile-sheet="language" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="hvt-language-title" hidden>' +
            '<span class="hvt-mobile-sheet__handle" aria-hidden="true"></span>' +
            '<header class="hvt-mobile-sheet__header"><div><span class="hvt-mobile-sheet__eyebrow">' + copy.languageEyebrow + '</span><h2 class="hvt-mobile-sheet__title" id="hvt-language-title">' + copy.languageTitle + '</h2></div><button class="hvt-mobile-sheet__close" type="button" data-mobile-sheet-close aria-label="' + copy.close + '">&times;</button></header>' +
            '<div class="hvt-mobile-sheet__body"><div class="hvt-language-options">' + languageLinks().map(function (item) {
                return '<a class="hvt-language-option" href="' + item.href + '" hreflang="' + item.key + '" lang="' + item.key + '"' + (item.key === locale ? ' aria-current="page"' : '') + '><span class="hvt-language-option__code">' + item.code + '</span><span>' + item.name + '</span><span class="hvt-language-option__check" aria-hidden="true">&#10003;</span></a>';
            }).join('') + '</div></div>' +
        '</section>' +
        '<nav class="hvt-mobile-nav" aria-label="' + copy.nav + '">' +
            '<a class="hvt-mobile-nav__item" data-mobile-destination="home" href="' + paths.home + '">' + icons.home + '<span>' + copy.home + '</span></a>' +
            '<a class="hvt-mobile-nav__item" data-mobile-destination="projects" href="' + paths.projects + '">' + icons.projects + '<span>' + copy.projects + '</span></a>' +
            '<a class="hvt-mobile-nav__item" data-mobile-destination="lab" href="' + paths.lab + '">' + icons.lab + '<span>' + copy.lab + '</span></a>' +
            '<button class="hvt-mobile-nav__item" data-mobile-destination="more" data-mobile-sheet-trigger="more" type="button" aria-controls="hvt-more-sheet" aria-expanded="false">' + icons.more + '<span>' + copy.more + '</span></button>' +
        '</nav>';
    document.body.appendChild(root);
    document.body.classList.add('hvt-mobile-navigation-enabled');

    function enhanceHome() {
        const home = document.getElementById('home');
        if (!home || document.querySelector('.hvt-mobile-home-access')) return;
        home.querySelectorAll('.s-home__slide-text').forEach(function (slideText) {
            if (slideText.querySelector('.hvt-mobile-hero-cta')) return;
            const cta = document.createElement('a');
            cta.className = 'hvt-mobile-hero-cta';
            cta.href = paths.projects;
            cta.textContent = copy.heroCta;
            slideText.appendChild(cta);
        });

        const quickIcons = {
            research: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
            projects: icons.projects,
            alliances: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 12.5 11 15a2 2 0 0 0 3 0l4.5-4.5"/><path d="m3.5 10.5 4-4 4 2-5 5zM20.5 10.5l-4-4-4 2 5 5z"/><path d="m8 15 2 2M15.5 15.5 14 17"/></svg>',
            mentor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13c0-4.5 3-8 7-8s7 3.5 7 8"/><path d="M7 13v4M17 13v4M9 19h6"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><path d="M11 12h2"/></svg>'
        };
        const quickArrow = '<svg class="hvt-mobile-home-access__arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4"/></svg>';
        function quickAccessContent(icon, title, description, action) {
            return '<span class="hvt-mobile-home-access__icon">' + icon + '</span>' +
                '<span class="hvt-mobile-home-access__content"><strong>' + title + '</strong><span class="hvt-mobile-home-access__description">' + description + '</span></span>' +
                '<span class="hvt-mobile-home-access__action"><span>' + action + '</span>' + quickArrow + '</span>';
        }
        const section = document.createElement('section');
        section.className = 'hvt-mobile-home-access';
        section.setAttribute('aria-labelledby', 'hvt-mobile-home-access-title');
        section.innerHTML = '<div class="hvt-mobile-home-access__inner"><p class="hvt-mobile-home-access__eyebrow">HVT</p><h2 id="hvt-mobile-home-access-title">' + copy.quickTitle + '</h2><div class="hvt-mobile-home-access__list">' +
            '<a class="hvt-mobile-home-access__item" href="/experimentos/fibras-queratinicas-suelo/">' + quickAccessContent(quickIcons.research, copy.research, copy.researchDescription, copy.explore) + '</a>' +
            '<a class="hvt-mobile-home-access__item" href="' + paths.projects + '">' + quickAccessContent(quickIcons.projects, copy.projects, copy.projectsDescription, copy.viewProjects) + '</a>' +
            '<a class="hvt-mobile-home-access__item" href="' + paths.contact + '">' + quickAccessContent(quickIcons.alliances, copy.alliances, copy.alliancesDescription, copy.learnMore) + '</a>' +
            '<button class="hvt-mobile-home-access__item" type="button" data-open-mentor>' + quickAccessContent(quickIcons.mentor, copy.mentor, copy.mentorDescription, copy.openMentor) + '</button>' +
            '</div></div>';
        home.insertAdjacentElement('afterend', section);
    }

    enhanceHome();

    const corporateLanguageTrigger = document.querySelector('.s-header__language-toggle');
    let languageTrigger = corporateLanguageTrigger;
    if (!languageTrigger) {
        const languageHost = document.querySelector('.s-header .row') || document.querySelector('.lab-site-header__inner');
        if (languageHost) {
            languageTrigger = document.createElement('button');
            languageTrigger.className = 'hvt-mobile-language-button';
            languageTrigger.type = 'button';
            languageTrigger.setAttribute('aria-label', copy.languageTitle);
            languageTrigger.setAttribute('aria-controls', 'hvt-language-sheet');
            languageTrigger.setAttribute('aria-expanded', 'false');
            languageTrigger.innerHTML = icons.globe + '<span class="hvt-mobile-language-button__current">' + locale.toUpperCase() + '</span><span aria-hidden="true">\u2304</span>';
            languageHost.appendChild(languageTrigger);
        }
    }

    const backdrop = root.querySelector('[data-mobile-sheet-backdrop]');
    const moreTrigger = root.querySelector('[data-mobile-sheet-trigger="more"]');
    let currentSheet = null;
    let returnFocus = null;
    let closeTimer = 0;

    function updateActive() {
        const active = activeDestination();
        root.querySelectorAll('[data-mobile-destination]').forEach(function (item) {
            if (item.dataset.mobileDestination === active) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
        });
    }

    function closeDesktopLanguageMenu() {
        if (!corporateLanguageTrigger) return;
        const menu = document.getElementById(corporateLanguageTrigger.getAttribute('aria-controls'));
        corporateLanguageTrigger.classList.remove('is-open');
        corporateLanguageTrigger.setAttribute('aria-expanded', 'false');
        if (menu) menu.hidden = true;
    }

    function closeSheet(restore, immediate) {
        if (!currentSheet) return;
        window.clearTimeout(closeTimer);
        const sheet = currentSheet;
        const focusTarget = returnFocus;
        currentSheet = null;
        returnFocus = null;
        sheet.classList.remove('is-open');
        sheet.setAttribute('aria-hidden', 'true');
        backdrop.classList.remove('is-visible');
        document.body.classList.remove('hvt-mobile-overlay-open');
        moreTrigger.setAttribute('aria-expanded', 'false');
        if (languageTrigger) languageTrigger.setAttribute('aria-expanded', 'false');
        const finish = function () { sheet.hidden = true; };
        if (immediate) finish();
        else closeTimer = window.setTimeout(finish, 230);
        if (restore !== false && focusTarget && document.contains(focusTarget)) focusTarget.focus({ preventScroll: true });
    }

    function openSheet(name, trigger) {
        if (!mobile.matches) return;
        window.clearTimeout(closeTimer);
        closeTimer = 0;
        if (currentSheet && currentSheet.dataset.mobileSheet === name) {
            closeSheet(true, false);
            return;
        }
        if (currentSheet) closeSheet(false, true);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        closeDesktopLanguageMenu();
        currentSheet = root.querySelector('[data-mobile-sheet="' + name + '"]');
        if (!currentSheet) return;
        returnFocus = trigger;
        currentSheet.hidden = false;
        currentSheet.setAttribute('aria-hidden', 'false');
        backdrop.classList.add('is-visible');
        document.body.classList.add('hvt-mobile-overlay-open');
        if (name === 'more') moreTrigger.setAttribute('aria-expanded', 'true');
        if (name === 'language' && languageTrigger) languageTrigger.setAttribute('aria-expanded', 'true');
        window.requestAnimationFrame(function () {
            if (!currentSheet) return;
            currentSheet.classList.add('is-open');
            const focusable = currentSheet.querySelector('a, button');
            if (focusable) focusable.focus({ preventScroll: true });
        });
    }

    moreTrigger.addEventListener('click', function () { openSheet('more', moreTrigger); });
    backdrop.addEventListener('click', function () { closeSheet(true, false); });
    root.addEventListener('click', function (event) {
        if (event.target.closest('[data-mobile-sheet-close]')) closeSheet(true, false);
        if (event.target.closest('.hvt-mobile-sheet a')) closeSheet(false, true);
        if (event.target.closest('.hvt-mobile-nav a')) closeSheet(false, true);
    });

    document.addEventListener('click', function (event) {
        const trigger = event.target.closest('.s-header__language-toggle, .hvt-mobile-language-button');
        if (!trigger || !mobile.matches) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openSheet('language', trigger);
    }, true);

    document.addEventListener('keydown', function (event) {
        if (!currentSheet) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeSheet(true, false);
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(currentSheet.querySelectorAll('a[href], button:not([disabled])')).filter(function (item) {
            return item.offsetParent !== null;
        });
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    document.addEventListener('hvt:mentor-opening', function () { closeSheet(false, true); });
    window.addEventListener('hashchange', updateActive);
    const handleViewportChange = function (event) {
        if (!event.matches) closeSheet(false, true);
    };
    if (mobile.addEventListener) mobile.addEventListener('change', handleViewportChange);
    else mobile.addListener(handleViewportChange);

    updateActive();
    window.HVTMobileNavigation = { close: function () { closeSheet(false, true); } };
})();
