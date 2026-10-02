/**
 * Bento Grid Metrics & Interactive Cards
 * Features:
 * - Smooth metric counters powered by Quartic Ease-Out (1 - (1-t)^4)
 * - IntersectionObserver viewport activation with fail-safe triggers
 * - Dynamic spotlight mouse tracking for Bento cards (--mouse-x, --mouse-y)
 * - Formatted decimal & integer interpolation with prefix/suffix preservation
 */

(function () {
  'use strict';

  // Quartic Ease-Out: starts briskly, decelerates with extreme silkiness
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function formatCounterHtml(prefix, valStr, suffix) {
    const p = prefix ? `<span class="metric-prefix">${prefix}</span>` : '';
    const s = suffix ? `<span class="metric-suffix">${suffix}</span>` : '';
    return `${p}${valStr}${s}`;
  }

  function animateCounter(element) {
    if (element.dataset.counterStarted === 'true') return;
    element.dataset.counterStarted = 'true';

    const target = parseFloat(element.getAttribute('data-counter')) || 0;
    const prefix = element.getAttribute('data-prefix') || '';
    const suffix = element.getAttribute('data-suffix') || '';
    const decimals = parseInt(element.getAttribute('data-decimals'), 10) || 0;
    const duration = parseInt(element.getAttribute('data-duration'), 10) || 2200;

    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const currentValue = easedProgress * target;

      if (decimals > 0) {
        element.innerHTML = formatCounterHtml(prefix, currentValue.toFixed(decimals), suffix);
      } else {
        element.innerHTML = formatCounterHtml(prefix, Math.round(currentValue).toLocaleString('ru-RU'), suffix);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Ensure exact target is written at completion
        if (decimals > 0) {
          element.innerHTML = formatCounterHtml(prefix, target.toFixed(decimals), suffix);
        } else {
          element.innerHTML = formatCounterHtml(prefix, target.toLocaleString('ru-RU'), suffix);
        }
      }
    }

    requestAnimationFrame(step);
  }

  function initCounters() {
    const counterElements = document.querySelectorAll('[data-counter]');

    // Initialize display values cleanly to zero so there is no flash of final value
    counterElements.forEach((el) => {
      const prefix = el.getAttribute('data-prefix') || '';
      const suffix = el.getAttribute('data-suffix') || '';
      const decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
      const zeroVal = decimals > 0 ? (0).toFixed(decimals) : '0';
      el.innerHTML = formatCounterHtml(prefix, zeroVal, suffix);
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
      });

      counterElements.forEach((el) => observer.observe(el));
    } else {
      // Fallback: animate immediately
      counterElements.forEach(animateCounter);
    }
  }

  // Bento Spotlight Mouse Tracking
  function initSpotlightCards() {
    const cards = document.querySelectorAll('.spotlight-card');

    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCounters();
      initSpotlightCards();
    });
  } else {
    initCounters();
    initSpotlightCards();
  }

  window.initBentoCounters = initCounters;
})();
