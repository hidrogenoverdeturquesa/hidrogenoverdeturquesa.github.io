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

    // Add the User Agent to the <html>
    // will be used for IE10/IE11 detection (Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0; rv:11.0))
    // const doc = document.documentElement;
    // doc.setAttribute('data-useragent', navigator.userAgent);


   /* preloader
    * -------------------------------------------------- */
    const ssPreloader = function() {

        const preloader = document.querySelector('#preloader');

        if (!preloader) return;

        document.querySelector('html').classList.add('ss-preload');
        
        const revealPage = function() {
            document.querySelector('html').classList.remove('ss-preload');
            document.querySelector('html').classList.add('ss-loaded');

            preloader.addEventListener('transitionend', function(e) {
                if (e.target.matches("#preloader")) {
                    this.style.display = 'none';
                }
            });

            window.setTimeout(function() {
                preloader.style.display = 'none';
            }, 700);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', revealPage, { once: true });
        } else {
            revealPage();
        }

        // Never leave the interface blocked if a third-party resource is slow.
        window.setTimeout(revealPage, 1200);

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
                dots: false,
                speed: 1000,
                fade: true,
                cssEase: 'linear',
                autoplay: false,
                autoplaySpeed: 5000,
                pauseOnHover: false
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


   /* initialize
    * ------------------------------------------------------ */
    (function ssInit() {

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
        ssWorkLines();

        /* Mentor puede retirarse sin afectar el sitio: cambia true por false. */
        const MENTOR_ENABLED = true;
        if (MENTOR_ENABLED && !document.querySelector('script[data-mentor]')) {
            const mentorStyle = document.createElement('link');
            mentorStyle.rel = 'stylesheet';
            mentorStyle.href = 'css/mentor.css?v=20260719b';
            document.head.appendChild(mentorStyle);

            const mentorScript = document.createElement('script');
            mentorScript.src = 'js/mentor.js?v=20260719c';
            mentorScript.dataset.mentor = 'true';
            document.body.appendChild(mentorScript);
        }

    })();

})(jQuery);
