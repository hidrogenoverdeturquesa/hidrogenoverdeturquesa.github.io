/* Corporate dropdown behavior from js/main.js; mobile behavior stays shared. */
(function () {
    'use strict';
   const ssNavigationDropdown = function() {
        const dropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));
        if (!dropdowns.length) return;

        const close = function(dropdown, returnFocus) {
            const toggle = dropdown.querySelector('.nav-dropdown__toggle');
            const menu = dropdown.querySelector('.nav-dropdown__menu');
            dropdown.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            menu.hidden = true;
            if (returnFocus) toggle.focus();
        };

        const closeOthers = function(activeDropdown) {
            dropdowns.forEach(function(dropdown) {
                if (dropdown !== activeDropdown) close(dropdown, false);
            });
        };

        dropdowns.forEach(function(dropdown) {
            const toggle = dropdown.querySelector('.nav-dropdown__toggle');
            const menu = dropdown.querySelector('.nav-dropdown__menu');

            toggle.addEventListener('click', function(event) {
                event.stopPropagation();
                const willOpen = !dropdown.classList.contains('is-open');
                closeOthers(dropdown);
                dropdown.classList.toggle('is-open', willOpen);
                toggle.setAttribute('aria-expanded', String(willOpen));
                menu.hidden = !willOpen;
            });

            dropdown.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') close(dropdown, true);
            });
            menu.addEventListener('click', function() { close(dropdown, false); });
        });

        document.addEventListener('click', function(event) {
            dropdowns.forEach(function(dropdown) {
                if (!dropdown.contains(event.target)) close(dropdown, false);
            });
        });
    };


    const ssLanguageSelectorDropdown = function() {
        // Wait for elements to exist in DOM
        const toggle = document.querySelector('.s-header__language-toggle');
        const menu = document.querySelector('.s-header__language-menu');
        const current = document.querySelector('.s-header__language-current');

        if (!toggle || !menu) {
            console.warn('Language selector elements not found');
            return;
        }

        // Determine current language
        const path = window.location.pathname;
        const currentLang = /^\/en(?:\/|$)/.test(path) ? 'en' : (/^\/ru(?:\/|$)/.test(path) ? 'ru' : 'es');
         
        // Update the current language display
        const langMap = { es: 'ES', en: 'EN', ru: 'РУ' };
        if (current) current.textContent = langMap[currentLang] || 'ES';

        menu.querySelectorAll('a').forEach(function(link) {
            if (link.lang === currentLang) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });

        const closeMenu = function() {
            menu.hidden = true;
            toggle.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        };

        // Toggle menu on button click
        toggle.addEventListener('click', function(event) {
            event.stopPropagation();
            const isOpen = menu.hidden;
            if (isOpen) document.dispatchEvent(new CustomEvent('hvt:language-opening'));
            menu.hidden = !isOpen;
            toggle.classList.toggle('is-open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        });

        // Close menu on Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && !menu.hidden) {
                closeMenu();
                toggle.focus();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.s-header__language')) {
                if (!menu.hidden) {
                    closeMenu();
                }
            }
        });

        // Close menu when selecting a language
        menu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                closeMenu();
            });
        });

        // Handle touch events
        menu.addEventListener('click', function(event) {
            event.stopPropagation();
        });

        document.addEventListener('hvt:mobile-menu-opening', closeMenu);
         

    };



    ssNavigationDropdown();
    ssLanguageSelectorDropdown();
})();
