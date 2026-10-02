/**
 * Interactive Magnetic Buttons with Elastic Spring Return Physics
 * Uses GSAP elastic easing and multi-layer parallax deflection for inner elements.
 */

(function () {
  'use strict';

  // Only run on non-touch devices
  if (!window.matchMedia('(pointer: fine)').matches) {
    return;
  }

  function initMagneticButtons() {
    const magneticElements = document.querySelectorAll('[data-magnetic]');

    magneticElements.forEach((btn) => {
      let boundingRect = null;
      let isHovering = false;

      // Inner children for 3D parallax deflection
      const innerElements = btn.querySelectorAll('.magnetic-inner, .btn-icon, .btn-text, .btn-trailing-icon');

      function updateBounds() {
        boundingRect = btn.getBoundingClientRect();
      }

      btn.addEventListener('mouseenter', () => {
        updateBounds();
        isHovering = true;
      });

      window.addEventListener('scroll', () => {
        if (isHovering) updateBounds();
      }, { passive: true });

      btn.addEventListener('mousemove', (e) => {
        if (!boundingRect) updateBounds();

        // Calculate cursor offset from center of button
        const centerX = boundingRect.left + boundingRect.width / 2;
        const centerY = boundingRect.top + boundingRect.height / 2;
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        // Strength factor can be customized via data attribute
        const strength = parseFloat(btn.getAttribute('data-magnetic-strength')) || 0.35;
        const moveX = deltaX * strength;
        const moveY = deltaY * strength;

        if (window.gsap) {
          gsap.to(btn, {
            x: moveX,
            y: moveY,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: 'auto'
          });

          // Deflect inner elements with additional parallax
          innerElements.forEach((inner) => {
            gsap.to(inner, {
              x: moveX * 0.45,
              y: moveY * 0.45,
              duration: 0.3,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          });
        } else {
          btn.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
        }
      });

      btn.addEventListener('mouseleave', () => {
        isHovering = false;

        if (window.gsap) {
          // Snappy elastic spring release
          gsap.to(btn, {
            x: 0,
            y: 0,
            duration: 0.85,
            ease: 'elastic.out(1.1, 0.35)',
            overwrite: 'auto'
          });

          innerElements.forEach((inner) => {
            gsap.to(inner, {
              x: 0,
              y: 0,
              duration: 0.75,
              ease: 'elastic.out(1, 0.35)',
              overwrite: 'auto'
            });
          });
        } else {
          btn.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          btn.style.transform = 'translate3d(0, 0, 0)';
          setTimeout(() => {
            btn.style.transition = '';
          }, 500);
        }
      });
    });
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMagneticButtons);
  } else {
    initMagneticButtons();
  }

  // Expose reinit for dynamic content
  window.reinitMagneticButtons = initMagneticButtons;
})();
