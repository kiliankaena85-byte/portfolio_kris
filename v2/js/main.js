/**
 * Main Controller: Lenis v1.1.18 + GSAP ScrollTrigger + Interactive UI Orchestration
 * Features:
 * - Lenis Smooth Scroll (lerp: 0.165, GSAP lagSmoothing: 500, 33)
 * - Seamless GSAP Ticker Synchronization & Velocity Broadcast
 * - Project Case Filters & Smooth GSAP Transitions
 * - Immersive Fullscreen Slide Inspector Modal (with Lenis stop/start sync)
 * - Responsive Mobile Island Navigation with Morphing Hamburger
 * - Clipboard Toast Notifications
 */

(function () {
  'use strict';

  // 1. LENIS & GSAP INITIALIZATION
  let lenisInstance = null;

  function initSmoothScroll() {
    if (typeof Lenis === 'undefined') {
      console.warn('Lenis script not loaded. Falling back to native scrolling.');
      return;
    }

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    lenisInstance = new Lenis({
      lerp: 0.165,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.4,
      infinite: false
    });

    // Scroll Progress bar
    const progressBar = document.getElementById('scroll-progress');

    lenisInstance.on('scroll', (e) => {
      if (window.ScrollTrigger) {
        ScrollTrigger.update();
      }

      // Notify WebGL background of velocity
      window.dispatchEvent(new CustomEvent('lenis-scroll', {
        detail: { velocity: e.velocity, scroll: e.scroll }
      }));

      // Top progress bar update
      if (progressBar) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = docHeight > 0 ? Math.min(Math.max(e.scroll / docHeight, 0), 1) : 0;
        progressBar.style.transform = `scaleX(${ratio})`;
      }
    });

    if (window.gsap) {
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(500, 33);
    } else {
      function raf(time) {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // Expose globally for modals
    window.lenis = lenisInstance;

    // Smooth anchor jumps
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href) return;
        e.preventDefault();
        closeMobileMenu();

        if (href === '#' || href === '#hero') {
          lenisInstance.scrollTo(0, {
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          });
          return;
        }

        const target = document.querySelector(href);
        if (target) {
          lenisInstance.scrollTo(target, {
            offset: -85,
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          });
        }
      });
    });
  }

  // 2. GSAP SCROLL ENTRANCE ANIMATIONS
  function initScrollAnimations() {
    if (!window.gsap || !window.ScrollTrigger) return;

    // Staggered reveal for hero elements
    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    heroTl
      .from('.hero-badge', { y: 24, opacity: 0, duration: 0.8, delay: 0.1 })
      .from('.hero-heading', { y: 35, opacity: 0, duration: 0.9 }, '-=0.6')
      .from('.hero-pitch', { y: 25, opacity: 0, duration: 0.8 }, '-=0.6')
      .from('.hero-cta-group', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
      .from('.hero-portrait-card', { scale: 0.94, opacity: 0, duration: 1 }, '-=0.7');

    // Section reveal on scroll
    gsap.utils.toArray('.reveal-on-scroll').forEach((elem) => {
      gsap.from(elem, {
        scrollTrigger: {
          trigger: elem,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out'
      });
    });

    // Bento cards stagger reveal
    gsap.from('.bento-stagger-item', {
      scrollTrigger: {
        trigger: '#metrics-bento',
        start: 'top 85%'
      },
      y: 35,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power3.out'
    });
  }

  // 3. CASE FILTER TABS
  function initCaseFilters() {
    const filterButtons = document.querySelectorAll('.case-filter-btn');
    const caseCards = document.querySelectorAll('.case-study-card');

    if (!filterButtons.length || !caseCards.length) return;

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');

        // Update active class
        filterButtons.forEach((b) => b.classList.remove('active-filter'));
        btn.classList.add('active-filter');

        caseCards.forEach((card) => {
          const category = card.getAttribute('data-category') || '';
          const match = (filter === 'all' || category.includes(filter));

          if (match) {
            card.style.display = '';
            if (window.gsap) {
              gsap.fromTo(card, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
            } else {
              card.style.opacity = '1';
            }
          } else {
            card.style.display = 'none';
          }
        });

        if (window.ScrollTrigger) {
          ScrollTrigger.refresh();
        }
      });
    });
  }

  // 4. CASE SLIDE INSPECTOR / MODAL
  function initSlideModal() {
    const modal = document.getElementById('slide-modal');
    if (!modal) return;

    const modalImg = modal.querySelector('.modal-image');
    const modalClose = modal.querySelector('.modal-close');
    const modalBackdrop = modal.querySelector('.modal-backdrop');
    const prevBtn = modal.querySelector('.modal-prev');
    const nextBtn = modal.querySelector('.modal-next');
    const counterDisplay = modal.querySelector('.modal-counter');

    let currentSlideList = [];
    let currentSlideIdx = 0;

    function openModal(slideList = [], initialIdx = 0) {
      currentSlideList = slideList.length > 0 ? slideList : [{ src: '', caption: '' }];
      currentSlideIdx = Math.max(0, Math.min(initialIdx, currentSlideList.length - 1));

      updateModalView();

      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');

      if (lenisInstance) {
        lenisInstance.stop();
      }
      document.body.style.overflow = 'hidden';
    }

    function updateModalView() {
      const slide = currentSlideList[currentSlideIdx];
      if (!slide) return;

      modalImg.src = slide.src;
      if (counterDisplay) {
        counterDisplay.textContent = `${currentSlideIdx + 1} / ${currentSlideList.length}`;
      }
      const captionText = slide.caption || `Слайд ${currentSlideIdx + 1} из ${currentSlideList.length}`;
      modal.querySelectorAll('.modal-caption').forEach((el) => {
        el.textContent = captionText;
      });
    }

    function closeModal() {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      if (lenisInstance) {
        lenisInstance.start();
      }
      document.body.style.overflow = '';
      setTimeout(() => {
        modalImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
      }, 300);
    }

    function nextSlide() {
      if (currentSlideList.length <= 1) return;
      currentSlideIdx = (currentSlideIdx + 1) % currentSlideList.length;
      updateModalView();
    }

    function prevSlide() {
      if (currentSlideList.length <= 1) return;
      currentSlideIdx = (currentSlideIdx - 1 + currentSlideList.length) % currentSlideList.length;
      updateModalView();
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    window.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });

    // Attach click listeners to all slide preview triggers
    document.querySelectorAll('[data-open-slide]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const src = trigger.getAttribute('data-slide-src') || trigger.querySelector('img')?.src;
        const caption = trigger.getAttribute('data-slide-caption') || '';
        const gallery = trigger.getAttribute('data-gallery');
        
        let slideList = [];
        let initialIdx = 0;

        if (gallery) {
          const galleryItems = Array.from(document.querySelectorAll(`[data-gallery="${gallery}"]`));
          slideList = galleryItems.map((item) => ({
            src: item.getAttribute('data-slide-src') || item.querySelector('img')?.src,
            caption: item.getAttribute('data-slide-caption') || ''
          }));
          initialIdx = galleryItems.indexOf(trigger);
          if (initialIdx === -1) initialIdx = 0;
        } else if (src) {
          slideList = [{ src, caption }];
        }

        if (slideList.length > 0) {
          openModal(slideList, initialIdx);
        }
      });
    });
  }

  // 5. MOBILE NAV & FLUID HAMBURGER
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');

  function openMobileMenu() {
    if (!mobileNav || !mobileMenuToggle) return;
    mobileNav.classList.add('nav-open');
    mobileMenuToggle.classList.add('toggle-active');
    mobileMenuToggle.setAttribute('aria-expanded', 'true');
    if (lenisInstance) lenisInstance.stop();
  }

  function closeMobileMenu() {
    if (!mobileNav || !mobileMenuToggle) return;
    mobileNav.classList.remove('nav-open');
    mobileMenuToggle.classList.remove('toggle-active');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    if (lenisInstance) lenisInstance.start();
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.contains('nav-open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  // Close mobile nav when clicking on background backdrop
  const mobileNavBackdrop = document.getElementById('mobile-nav-backdrop');
  if (mobileNavBackdrop) {
    mobileNavBackdrop.addEventListener('click', closeMobileMenu);
  }

  // 6. CLIPBOARD COPY TOAST
  function initClipboardButtons() {
    document.querySelectorAll('[data-copy-text]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const textToCopy = btn.getAttribute('data-copy-text');
        if (!textToCopy) return;

        try {
          await navigator.clipboard.writeText(textToCopy);
          showToast(`Скопировано: ${textToCopy}`);
        } catch (err) {
          showToast('Не удалось скопировать', true);
        }
      });
    });
  }

  function showToast(message, isError = false) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast-pill';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `app-toast-pill ${isError ? 'toast-error' : 'toast-success'} toast-visible`;

    setTimeout(() => {
      toast.classList.remove('toast-visible');
    }, 2400);
  }

  // 7. INITIALIZE ON DOM READY
  document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();
    initScrollAnimations();
    initCaseFilters();
    initSlideModal();
    initClipboardButtons();
  });
})();
