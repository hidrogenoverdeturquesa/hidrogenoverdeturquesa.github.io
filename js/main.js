/* ===================================================================
 * Kreative 2.0.0 - Main JS
 *
 * ------------------------------------------------------------------- */

(function($) {

    "use strict";
    
    const cfg = {
                scrollDuration : 800, // smoothscroll duration
                mailChimpURL   : ''   // mailchimp url
                };

    /* Keep public URLs clean when an old link or bookmark includes .html. */
    const ssNormalizePageURL = function() {
        const currentPath = window.location.pathname;
        let cleanPath = currentPath;

        if (/\/index\.html$/i.test(currentPath)) {
            cleanPath = currentPath.slice(0, -'index.html'.length);
        } else if (/\.html$/i.test(currentPath)) {
            cleanPath = currentPath.slice(0, -'.html'.length);
        } else {
            return;
        }

        window.history.replaceState(
            window.history.state,
            document.title,
            cleanPath + window.location.search + window.location.hash
        );
    };

    /* Language selector and a non-blocking first-visit suggestion. */
    const ssLanguageNavigation = function() {
        const supported = ['es', 'en', 'ru'];
        const path = window.location.pathname;
        const current = /^\/en(?:\/|$)/.test(path) ? 'en' : (/^\/ru(?:\/|$)/.test(path) ? 'ru' : 'es');
        const names = { es: 'Español', en: 'English', ru: 'Русский' };
        // The release query prevents a previously visited localized document from
        // being restored from the browser/CDN cache after a translation rebuild.
        const destinations = {
            es: '/?lang-release=20260816a',
            en: '/en/?lang-release=20260816a',
            ru: '/ru/?lang-release=20260816a'
        };
        const nav = document.querySelector('.s-header__nav ul');
        const browserLanguages = navigator.languages || [navigator.language || 'es'];
        const suggested = browserLanguages.map(function(language) {
            return language.toLowerCase().split('-')[0];
        }).find(function(language) { return supported.indexOf(language) !== -1; }) || 'es';
        let preferred;
        try { preferred = window.localStorage.getItem('hvt-language'); } catch (error) {}

        if (nav && !nav.querySelector('.language-switcher')) {
            const item = document.createElement('li');
            const toggle = document.createElement('button');
            const menu = document.createElement('div');
            const selectorLabel = current === 'es' ? 'Seleccionar idioma' : (current === 'ru' ? 'Выбрать язык' : 'Choose language');
            item.className = 'language-switcher';
            toggle.className = 'language-switcher__toggle';
            toggle.type = 'button';
            toggle.setAttribute('aria-label', selectorLabel);
            toggle.setAttribute('aria-haspopup', 'menu');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<span class="language-switcher__globe" aria-hidden="true">●</span><span class="language-switcher__chevron" aria-hidden="true"></span>';
            menu.className = 'language-switcher__menu';
            menu.setAttribute('role', 'menu');
            menu.hidden = true;

            const automatic = document.createElement('button');
            automatic.type = 'button';
            automatic.className = 'language-switcher__option' + (!preferred ? ' is-active' : '');
            automatic.setAttribute('role', 'menuitem');
            automatic.innerHTML = '<span class="language-switcher__check" aria-hidden="true">✓</span>' + (current === 'es' ? 'Automático' : (current === 'ru' ? 'Автоматически' : 'Automatic'));
            automatic.addEventListener('click', function() {
                try { window.localStorage.removeItem('hvt-language'); } catch (error) {}
                window.location.href = destinations[suggested];
            });
            menu.appendChild(automatic);

            supported.forEach(function(language) {
                const link = document.createElement('a');
                link.href = destinations[language];
                link.lang = language;
                link.hreflang = language;
                link.setAttribute('role', 'menuitem');
                link.className = 'language-switcher__option' + (preferred === language ? ' is-active' : '');
                link.innerHTML = '<span class="language-switcher__check" aria-hidden="true">✓</span>' + names[language];
                link.title = names[language];
                if (language === current) {
                    link.setAttribute('aria-current', 'page');
                }
                link.addEventListener('click', function() {
                    try { window.localStorage.setItem('hvt-language', language); } catch (error) {}
                });
                menu.appendChild(link);
            });
            toggle.addEventListener('click', function(event) {
                event.stopPropagation();
                const opening = menu.hidden;
                menu.hidden = !opening;
                item.classList.toggle('is-open', opening);
                toggle.setAttribute('aria-expanded', String(opening));
                if (opening) menu.querySelector('[role="menuitem"]').focus();
            });
            document.addEventListener('click', function(event) {
                if (!item.contains(event.target)) {
                    menu.hidden = true;
                    item.classList.remove('is-open');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
            item.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    menu.hidden = true;
                    item.classList.remove('is-open');
                    toggle.setAttribute('aria-expanded', 'false');
                    toggle.focus();
                }
            });
            item.appendChild(toggle);
            item.appendChild(menu);
            nav.appendChild(item);
        }

        if (preferred || window.sessionStorage.getItem('hvt-language-prompted')) return;

        if (suggested === current) return;
        window.sessionStorage.setItem('hvt-language-prompted', '1');

        const messages = {
            en: ['This website is available in English.', 'View in English', 'Not now'],
            ru: ['Сайт доступен на русском языке.', 'Открыть на русском', 'Не сейчас'],
            es: ['Este sitio está disponible en español.', 'Ver en español', 'Ahora no']
        };
        const copy = messages[suggested];
        const prompt = document.createElement('aside');
        prompt.className = 'language-suggestion';
        prompt.setAttribute('aria-live', 'polite');
        prompt.innerHTML = '<span>' + copy[0] + '</span><a href="' + destinations[suggested] + '">' + copy[1] + '</a><button type="button">' + copy[2] + '</button>';
        prompt.querySelector('a').addEventListener('click', function() {
            try { window.localStorage.setItem('hvt-language', suggested); } catch (error) {}
        });
        prompt.querySelector('button').addEventListener('click', function() { prompt.remove(); });
        document.body.appendChild(prompt);
    };

    // Add the User Agent to the <html>
    // will be used for IE10/IE11 detection (Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0; rv:11.0))
    // const doc = document.documentElement;
    // doc.setAttribute('data-useragent', navigator.userAgent);


   /* preloader
    * -------------------------------------------------- */
    const ssPreloader = function() {

        const preloader = document.querySelector('#preloader');

        if (!preloader) return;

        const doc = document.documentElement;
        const loader = preloader.querySelector('#loader');
        const pageSlug = (window.location.pathname.split('/').pop() || 'index')
            .toLowerCase()
            .replace(/\.html$/i, '');
        const minimumVisibleTime = 1800;
        const maximumVisibleTime = 3200;
        const loaderStartedAt = window.performance && performance.now ? performance.now() : Date.now();
        let minimumTimeElapsed = false;
        let resourcesReady = document.readyState === 'complete';
        let revealed = false;

        const generalFacts = [
            'El hidrógeno no es una fuente primaria de energía: es un vector capaz de almacenarla y transportarla.',
            'La energía que menos impacta suele ser la que primero evitamos desperdiciar mediante eficiencia.',
            'Agua, energía, alimentos y materiales forman sistemas conectados dentro de un territorio.',
            'Los residuos orgánicos pueden convertirse en insumos cuando se separan y aprovechan correctamente.',
            'Una solución sostenible también debe poder mantenerse, repararse y comprenderse localmente.',
            'La ventilación, la luz natural y la inercia térmica pueden reducir la demanda energética de una vivienda.'
        ];
        const pueblitoFacts = [
            'Una vivienda tradicional puede ganar eficiencia sin perder la forma, los materiales y la memoria que la hacen única.',
            'Antes de incorporar nuevos equipos, una casa puede aprovechar mejor el sol, la ventilación y la inercia térmica.',
            'Un material natural también debe demostrar seguridad estructural, durabilidad y comportamiento frente al fuego.'
        ];
        const localizedFacts = {
            en: [
                'Hydrogen is an energy carrier: it can store and transport energy produced from other sources.',
                'Energy efficiency often begins by preventing energy from being wasted.',
                'Water, energy, food and materials form connected systems within a territory.'
            ],
            ru: [
                'Водород — это энергоноситель, способный хранить и транспортировать энергию из других источников.',
                'Энергоэффективность часто начинается с предотвращения потерь энергии.',
                'Вода, энергия, продовольствие и материалы образуют взаимосвязанные территориальные системы.'
            ]
        };
        const pageLanguage = (doc.lang || 'es').toLowerCase().split('-')[0];
        const availableFacts = localizedFacts[pageLanguage] || (pageSlug === 'pueblito-boyacense' ? pueblitoFacts : generalFacts);

        if (loader && !loader.querySelector('.loader-fact')) {
            const fact = document.createElement('div');
            const factLabel = document.createElement('span');
            const factText = document.createElement('p');
            const selectedFact = availableFacts[Math.floor(Math.random() * availableFacts.length)];

            fact.className = 'loader-fact';
            fact.setAttribute('role', 'status');
            fact.setAttribute('aria-live', 'polite');
            factLabel.textContent = pageLanguage === 'en' ? 'Did you know?' : (pageLanguage === 'ru' ? 'Знаете ли вы?' : '¿Sabías que…?');
            factText.textContent = selectedFact;
            fact.appendChild(factLabel);
            fact.appendChild(factText);
            loader.appendChild(fact);
        }

        doc.classList.add('ss-preload');

        const revealPage = function(forceReveal) {
            if (revealed) return;
            if (!forceReveal && (!minimumTimeElapsed || !resourcesReady)) return;
            revealed = true;
            doc.classList.remove('ss-preload');
            doc.classList.add('ss-loaded');

            preloader.addEventListener('transitionend', function(e) {
                if (e.target.matches("#preloader")) {
                    this.style.display = 'none';
                }
            }, { once: true });

            window.setTimeout(function() {
                preloader.style.display = 'none';
            }, 800);
        };

        const elapsedTime = (window.performance && performance.now ? performance.now() : Date.now()) - loaderStartedAt;
        window.setTimeout(function() {
            minimumTimeElapsed = true;
            revealPage(false);
        }, Math.max(0, minimumVisibleTime - elapsedTime));

        if (resourcesReady) {
            revealPage(false);
        } else {
            window.addEventListener('load', function() {
                resourcesReady = true;
                revealPage(false);
            }, { once: true });
        }

        // Never leave the interface blocked if an external resource is slow.
        window.setTimeout(function() {
            revealPage(true);
        }, maximumVisibleTime);

        // force page scroll position to top at page refresh
        window.addEventListener('beforeunload' , function () {
            window.scrollTo(0, 0);
        });
    };



   /* move header
    * -------------------------------------------------- */
    const ssMoveHeader = function () {

        const hdr = document.querySelector('.s-header');
        const hero = document.querySelector('#home');
        let triggerHeight;

        if (!(hdr && hero)) return;

        setTimeout(function(){
            triggerHeight = hero.offsetHeight - 170;
        }, 300);

        window.addEventListener('scroll', function () {

            let loc = window.scrollY;

            if (loc > triggerHeight) {
                hdr.classList.add('sticky');
            } else {
                hdr.classList.remove('sticky');
            }

            if (loc > triggerHeight + 20) {
                hdr.classList.add('offset');
            } else {
                hdr.classList.remove('offset');
            }

            if (loc > triggerHeight + 150) {
                hdr.classList.add('scrolling');
            } else {
                hdr.classList.remove('scrolling');
            }

        });
    };



   /* Mobile Menu
    * ---------------------------------------------------- */ 
    const ssMobileMenu = function() {

        const $toggleButton = $('.s-header__menu-toggle');
        const $nav = $('.s-header__nav');


        $toggleButton.on('click', function(event){
            event.preventDefault();
            $toggleButton.toggleClass('is-clicked');
            $nav.slideToggle();
        });

        // add mobile class
        if ($toggleButton.is(':visible')) $nav.addClass('mobile');

        $(window).resize(function() {
            if ($toggleButton.is(':visible')) $nav.addClass('mobile');
            else $nav.removeClass('mobile');
        });

        $('.s-header__nav ul').find('a').on("click", function() {
            if ($nav.hasClass('mobile')) {
                $toggleButton.trigger('click');
            }
        });
    }; 


   /* search
    * ------------------------------------------------------ */
    const ssSearch = function() {

        const searchWrap = document.querySelector('.s-header__search');
        const searchTrigger = document.querySelector('.s-header__search-trigger');

        if (!(searchWrap && searchTrigger)) return;

        const searchField = searchWrap.querySelector('.search-field');
        const closeSearch = searchWrap.querySelector('.s-header__overlay-close');
        const siteBody = document.querySelector('body');

        searchTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            siteBody.classList.add('search-is-visible');
            setTimeout(function(){
                searchWrap.querySelector('.search-field').focus();
            }, 100);
        });

        closeSearch.addEventListener('click', function(e) {
            e.stopPropagation();

            if(siteBody.classList.contains('search-is-visible')) {
                siteBody.classList.remove('search-is-visible');
                setTimeout(function(){
                    searchWrap.querySelector('.search-field').blur();
                }, 100);
            }
        });

        searchWrap.addEventListener('click', function(e) {
            if( !(e.target.matches('.search-field')) ) {
                closeSearch.dispatchEvent(new Event('click'));
            }
        });

        searchField.addEventListener('click', function(e) {
            e.stopPropagation();
        })

        searchField.setAttribute('placeholder', 'Type Keywords');
        searchField.setAttribute('autocomplete', 'off');
    };



   /* Highlight the current section in the navigation bar
    * ------------------------------------------------------ */
    const ssWaypoints = function() {

        const $sections = $(".target-section");
        const $navigationLinks = $(".s-header__nav li a");

        $sections.waypoint( {

            handler: function(direction) {

                let $activeSection;

                $activeSection = $('section#' + this.element.id);

                if (direction === "up") $activeSection = $activeSection.prevAll(".target-section").first();

                let $activeLink = $('.s-header__nav li a[href="#' + $activeSection.attr("id") + '"]');

                $navigationLinks.parent().removeClass("current");
                $activeLink.parent().addClass("current");

            },

            offset: '25%'

        });
    };



   /* Slick Slider
    * ------------------------------------------------------ */
    const ssSlickSlider = function() {

        // Home Slider
        // ----------------------------
        function ssRunHomeSlider() {
            const $heroSlider = $('.s-home__slider');

            $heroSlider.slick({
                arrows: false,
                dots: true,
                speed: 1000,
                fade: true,
                cssEase: 'linear',
                autoplay: true,
                autoplaySpeed: 6500,
                pauseOnHover: true,
                pauseOnFocus: true
            });

            $('.s-home__arrow-prev').on('click', function() {
                $heroSlider.slick('slickPrev');
            });
    
            $('.s-home__arrow-next').on('click', function() {
                $heroSlider.slick('slickNext');
            });

        } // end ssRunHomeSlider

        function ssRunTestimonialSlider() {
            const $testimonialSlider = $('.testimonial-slider');
                            
            $testimonialSlider.slick({
                arrows: false,
                dots: true,
                infinite: true,
                slidesToShow: 3,
                slidesToScroll: 1,
                pauseOnFocus: false,
                autoplaySpeed: 1500,
                responsive: [
                    {
                        breakpoint: 1080,
                        settings: {
                            slidesToShow: 2,
                            slidesToScroll: 1
                        }
                    },
                    {
                        breakpoint: 800,
                        settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1
                        }
                    }
                ]
            });
        } // end ssRunTestimonialSlider

        ssRunHomeSlider();
        ssRunTestimonialSlider();
    };



   /* animate on scroll
    * ------------------------------------------------------ */
    const ssAOS = function() {
        
        AOS.init( {
            offset: 100,
            duration: 600,
            easing: 'ease-in-out',
            delay: 300,
            once: true,
            disable: 'mobile'
        });

    };



   /* alert boxes
    * ------------------------------------------------------ */
    const ssAlertBoxes = function() {

        const boxes = document.querySelectorAll('.alert-box');

        boxes.forEach(function(box) {

            box.addEventListener('click', function(e){
                if (e.target.matches(".alert-box__close")) {
                    e.stopPropagation();
                    e.target.parentElement.classList.add("hideit");

                    setTimeout(function() {
                        box.style.display = "none";
                    }, 500)
                }    
            });

        })
    };


   /* smooth scrolling
    * ------------------------------------------------------ */
    const ssSmoothScroll = function() {
        
        $('.smoothscroll').on('click', function (e) {
            const target = this.hash;
            const $target = $(target);
            
            e.preventDefault();
            e.stopPropagation();

            $('html, body').stop().animate({
                'scrollTop': $target.offset().top
            }, cfg.scrollDuration, 'swing').promise().done(function () {
                window.location.hash = target;
            });
        });
    };


   /* back to top
    * ------------------------------------------------------ */
   const ssBackToTop = function() {

        const pxShow = 800;
        const goTopButton = document.querySelector(".ss-go-top");

        if (!goTopButton) return;

        // Show or hide the button
        if (window.scrollY >= pxShow) goTopButton.classList.add("link-is-visible");

        window.addEventListener('scroll', function() {
            if (window.scrollY >= pxShow) {
                if(!goTopButton.classList.contains('link-is-visible')) goTopButton.classList.add("link-is-visible")
            } else {
                goTopButton.classList.remove("link-is-visible")
            }
        });
    };


   /* service card hover videos
    * ------------------------------------------------------ */
    const ssServiceVideos = function() {

        const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!canHover || reduceMotion) return;

        document.querySelectorAll('.services-item').forEach(function(card) {
            const video = card.querySelector('.services-item__video');
            if (!video) return;

            const playVideo = function() {
                if (video.readyState === 0) video.load();
                const playback = video.play();
                if (playback && typeof playback.catch === 'function') playback.catch(function() {});
            };

            const stopVideo = function() {
                video.pause();
                video.currentTime = 0;
            };

            card.addEventListener('pointerenter', playVideo);
            card.addEventListener('pointerleave', stopVideo);
            card.addEventListener('focusin', playVideo);
            card.addEventListener('focusout', function(event) {
                if (!card.contains(event.relatedTarget)) stopVideo();
            });
        });

    };


   /* portfolio card hover videos
    * ------------------------------------------------------ */
    const ssPortfolioVideos = function() {

        const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!canHover || reduceMotion) return;

        document.querySelectorAll('.folio-item__thumb').forEach(function(card) {
            const video = card.querySelector('.folio-item__video');
            if (!video) return;

            const playVideo = function() {
                if (video.readyState === 0) video.load();
                const playback = video.play();
                if (playback && typeof playback.catch === 'function') playback.catch(function() {});
            };

            const stopVideo = function() {
                video.pause();
                video.currentTime = 0;
            };

            card.addEventListener('pointerenter', playVideo);
            card.addEventListener('pointerleave', stopVideo);
            card.addEventListener('focusin', playVideo);
            card.addEventListener('focusout', function(event) {
                if (!card.contains(event.relatedTarget)) stopVideo();
            });
        });

    };


   /* work lines expandable details
    * ------------------------------------------------------ */
    const ssWorkLines = function() {

        const triggers = Array.from(document.querySelectorAll('.services-item__trigger'));
        const panels = Array.from(document.querySelectorAll('.line-detail'));
        const detailsHolder = document.querySelector('.line-details');
        const servicesList = document.querySelector('.services-list');

        if (!triggers.length || !panels.length || !detailsHolder || !servicesList) return;

        let activeTrigger = null;

        const closeAll = function(returnFocus) {
            triggers.forEach(function(trigger) {
                trigger.setAttribute('aria-expanded', 'false');
                trigger.closest('.services-item').classList.remove('is-active');
                const symbol = trigger.querySelector('.services-item__action span');
                if (symbol) symbol.textContent = '+';
            });

            panels.forEach(function(panel) {
                panel.hidden = true;
                panel.classList.remove('is-inline');
                detailsHolder.appendChild(panel);
            });

            if (returnFocus && activeTrigger) activeTrigger.focus({ preventScroll: true });
            activeTrigger = null;
        };

        triggers.forEach(function(trigger) {
            trigger.addEventListener('click', function() {
                const panel = document.getElementById(trigger.getAttribute('aria-controls'));
                const wasOpen = trigger.getAttribute('aria-expanded') === 'true';

                closeAll(false);
                if (wasOpen || !panel) return;

                trigger.setAttribute('aria-expanded', 'true');
                trigger.closest('.services-item').classList.add('is-active');
                const symbol = trigger.querySelector('.services-item__action span');
                if (symbol) symbol.textContent = '×';

                const selectedCard = trigger.closest('.services-item');
                const cards = Array.from(servicesList.querySelectorAll('.services-item'));
                const selectedTop = selectedCard.offsetTop;
                const cardsInRow = cards.filter(function(card) {
                    return Math.abs(card.offsetTop - selectedTop) < 3;
                });
                const rowEnd = cardsInRow[cardsInRow.length - 1] || selectedCard;
                rowEnd.insertAdjacentElement('afterend', panel);
                panel.classList.add('is-inline');
                panel.hidden = false;
                activeTrigger = trigger;
                panel.focus({ preventScroll: true });

                window.setTimeout(function() {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 80);
            });
        });

        panels.forEach(function(panel) {
            const closeButton = panel.querySelector('[data-close-line]');
            if (closeButton) closeButton.addEventListener('click', function() { closeAll(true); });
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && activeTrigger) closeAll(true);
        });

        document.querySelectorAll('.line-service').forEach(function(service) {
            service.addEventListener('toggle', function() {
                if (!service.open) return;
                service.closest('.line-detail').querySelectorAll('.line-service').forEach(function(other) {
                    if (other !== service) other.open = false;
                });
            });
        });

    };


   /* impact counters
    * ------------------------------------------------------ */
    const ssImpactCounters = function() {

        const section = document.querySelector('#impact');
        const counters = Array.from(document.querySelectorAll('.impact-counter'));

        if (!section || !counters.length) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const formatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

        const finalValue = function(counter) {
            const target = Number(counter.dataset.counterTarget || 0);
            const suffix = counter.dataset.counterSuffix || '';
            const display = counter.querySelector('span') || counter;
            display.textContent = formatter.format(target) + suffix;
        };

        if (reducedMotion || !('IntersectionObserver' in window)) {
            counters.forEach(finalValue);
            return;
        }

        counters.forEach(function(counter) {
            const suffix = counter.dataset.counterSuffix || '';
            const display = counter.querySelector('span') || counter;
            display.textContent = '0' + suffix;
        });

        const animateCounter = function(counter, delay) {
            const target = Number(counter.dataset.counterTarget || 0);
            const suffix = counter.dataset.counterSuffix || '';
            const display = counter.querySelector('span') || counter;
            const duration = 1600;

            window.setTimeout(function() {
                let startTime = null;

                const step = function(timestamp) {
                    if (startTime === null) startTime = timestamp;
                    const progress = Math.min((timestamp - startTime) / duration, 1);
                    const easedProgress = 1 - Math.pow(1 - progress, 3);
                    const currentValue = Math.round(target * easedProgress);

                    display.textContent = formatter.format(currentValue) + suffix;

                    if (progress < 1) {
                        window.requestAnimationFrame(step);
                    } else {
                        finalValue(counter);
                    }
                };

                window.requestAnimationFrame(step);
            }, delay);
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                counters.forEach(function(counter, index) {
                    animateCounter(counter, index * 90);
                });
                observer.unobserve(section);
            });
        }, {
            threshold: 0.28
        });

        observer.observe(section);
    };


   /* initialize
    * ------------------------------------------------------ */
    (function ssInit() {

        ssNormalizePageURL();
        ssLanguageNavigation();
        ssPreloader();
        ssMoveHeader();
        ssMobileMenu();
        ssSearch();
        ssWaypoints();
        ssSlickSlider();
        ssAOS();
        ssAlertBoxes();
        ssSmoothScroll();
        ssBackToTop();
        ssServiceVideos();
        ssPortfolioVideos();
        ssWorkLines();
        ssImpactCounters();

        /* El laboratorio es autónomo y puede retirarse sin afectar el sitio. */
        const LAB_ENABLED = true;
        if (LAB_ENABLED && !document.querySelector('script[data-hvt-lab]')) {
            const labStyle = document.createElement('link');
            labStyle.rel = 'stylesheet';
            labStyle.href = '/css/laboratorio.css?v=20260816e';
            document.head.appendChild(labStyle);

            const labScript = document.createElement('script');
            labScript.src = '/js/laboratorio.js?v=20260816d';
            labScript.dataset.hvtLab = 'true';
            document.body.appendChild(labScript);
        }

        /* Mentor conserva su función de orientación y navegación contextual. */
        const MENTOR_ENABLED = true;
        if (MENTOR_ENABLED && !document.querySelector('script[data-mentor]')) {
            const mentorStyle = document.createElement('link');
            mentorStyle.rel = 'stylesheet';
            mentorStyle.href = '/css/mentor.css?v=20260719b';
            document.head.appendChild(mentorStyle);

            const mentorScript = document.createElement('script');
            mentorScript.src = '/js/mentor.js?v=url-limpia-20260726';
            mentorScript.dataset.mentor = 'true';
            document.body.appendChild(mentorScript);
        }

    })();

})(jQuery);
