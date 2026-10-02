/**
 * Dennis Snellenberg inspired 3-Layer Differential Lerp-Cursor
 * Features:
 * - Layer 1: Sharp pinpoint cursor dot (lerp: 0.9)
 * - Layer 2: Magnetic follower ring with velocity stretch and dynamic label (lerp: 0.15)
 * - Layer 3: Ambient atmospheric glow aura with heavy mass lag (lerp: 0.05)
 * - Morphing interactive states (button snap, card view, drag indicator)
 */

(function () {
  'use strict';

  // Only run on non-touch devices with fine pointers
  if (!window.matchMedia('(pointer: fine)').matches) {
    return;
  }

  // Create cursor DOM elements if not already present
  let cursorContainer = document.getElementById('custom-cursor');
  if (!cursorContainer) {
    cursorContainer = document.createElement('div');
    cursorContainer.id = 'custom-cursor';
    cursorContainer.className = 'custom-cursor-wrapper';
    cursorContainer.innerHTML = `
      <div class="cursor-aura" aria-hidden="true"></div>
      <div class="cursor-ring" aria-hidden="true">
        <span class="cursor-label"></span>
      </div>
      <div class="cursor-dot" aria-hidden="true"></div>
    `;
    document.body.appendChild(cursorContainer);
  }

  const dot = cursorContainer.querySelector('.cursor-dot');
  const ring = cursorContainer.querySelector('.cursor-ring');
  const aura = cursorContainer.querySelector('.cursor-aura');
  const label = cursorContainer.querySelector('.cursor-label');

  // Mouse real coordinates
  const mouse = { x: -100, y: -100, targetX: -100, targetY: -100 };
  
  // Interpolated coordinates
  const posDot = { x: -100, y: -100 };
  const posRing = { x: -100, y: -100 };
  const posAura = { x: -100, y: -100 };

  // Velocity tracking for organic stretch
  let prevRingX = -100;
  let prevRingY = -100;
  let ringAngle = 0;
  let ringScaleX = 1;
  let ringScaleY = 1;

  let isHovered = false;
  let isCardHover = false;
  let isDragging = false;
  let isClicking = false;
  let isHidden = true;

  // Track mouse movement
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;

    if (isHidden) {
      isHidden = false;
      cursorContainer.classList.add('cursor-visible');
      posDot.x = mouse.targetX;
      posDot.y = mouse.targetY;
      posRing.x = mouse.targetX;
      posRing.y = mouse.targetY;
      posAura.x = mouse.targetX;
      posAura.y = mouse.targetY;
      prevRingX = mouse.targetX;
      prevRingY = mouse.targetY;
      ringScaleX = 1;
      ringScaleY = 1;
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    isHidden = true;
    cursorContainer.classList.remove('cursor-visible');
  });

  document.addEventListener('mouseenter', (e) => {
    isHidden = false;
    cursorContainer.classList.add('cursor-visible');
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    posDot.x = mouse.targetX;
    posDot.y = mouse.targetY;
    posRing.x = mouse.targetX;
    posRing.y = mouse.targetY;
    posAura.x = mouse.targetX;
    posAura.y = mouse.targetY;
    prevRingX = mouse.targetX;
    prevRingY = mouse.targetY;
    ringScaleX = 1;
    ringScaleY = 1;
  });

  window.addEventListener('mousedown', () => {
    isClicking = true;
    cursorContainer.classList.add('cursor-clicking');
  });

  window.addEventListener('mouseup', () => {
    isClicking = false;
    cursorContainer.classList.remove('cursor-clicking');
  });

  // Setup interactive listeners via delegation for dynamic elements
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    
    // Check specific interactive child targets FIRST
    const linkEl = target.closest('a, button, [data-magnetic], .interactive-target, input, textarea, [role="button"]');
    const slideEl = target.closest('[data-open-slide], [data-cursor-drag]');
    const cardEl = target.closest('[data-cursor-view]');
    
    if (slideEl) {
      label.textContent = slideEl.getAttribute('data-cursor-drag') || 'СЛАЙД';
      cursorContainer.classList.add('cursor-mode-drag');
      cursorContainer.classList.remove('cursor-mode-link', 'cursor-mode-card');
      isCardHover = false;
      isHovered = false;
    } else if (linkEl) {
      label.textContent = '';
      cursorContainer.classList.add('cursor-mode-link');
      cursorContainer.classList.remove('cursor-mode-card', 'cursor-mode-drag');
      isHovered = true;
      isCardHover = false;
    } else if (cardEl) {
      const customText = cardEl.getAttribute('data-cursor-view') || 'КЕЙС';
      label.textContent = customText;
      cursorContainer.classList.add('cursor-mode-card');
      cursorContainer.classList.remove('cursor-mode-link', 'cursor-mode-drag');
      isCardHover = true;
      isHovered = false;
    } else {
      label.textContent = '';
      cursorContainer.classList.remove('cursor-mode-link', 'cursor-mode-card', 'cursor-mode-drag');
      isHovered = false;
      isCardHover = false;
    }
  });

  // Linear interpolation helper
  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  // Animation Loop with 3 differential physics layers
  function animate() {
    if (!isHidden) {
      // 1. Dot layer - fast and accurate
      posDot.x = lerp(posDot.x, mouse.targetX, 0.9);
      posDot.y = lerp(posDot.y, mouse.targetY, 0.9);
      dot.style.transform = `translate3d(${posDot.x}px, ${posDot.y}px, 0)`;

      // 2. Ring layer - medium mass with velocity stretch
      posRing.x = lerp(posRing.x, mouse.targetX, 0.16);
      posRing.y = lerp(posRing.y, mouse.targetY, 0.16);

      const vx = posRing.x - prevRingX;
      const vy = posRing.y - prevRingY;
      prevRingX = posRing.x;
      prevRingY = posRing.y;

      const speed = Math.hypot(vx, vy);
      
      // Calculate squash & stretch when moving fast
      if (speed > 0.5 && !isCardHover) {
        ringAngle = Math.atan2(vy, vx) * (180 / Math.PI);
        const stretch = Math.min(speed * 0.03, 0.45);
        ringScaleX = 1 + stretch;
        ringScaleY = 1 - stretch * 0.5;
      } else {
        ringScaleX = lerp(ringScaleX, 1, 0.2);
        ringScaleY = lerp(ringScaleY, 1, 0.2);
      }

      if (isCardHover) {
        ring.style.transform = `translate3d(${posRing.x}px, ${posRing.y}px, 0) scale(1)`;
      } else {
        ring.style.transform = `translate3d(${posRing.x}px, ${posRing.y}px, 0) rotate(${ringAngle}deg) scale(${ringScaleX}, ${ringScaleY})`;
      }

      // 3. Atmospheric aura layer - slow, soft lagging light
      posAura.x = lerp(posAura.x, mouse.targetX, 0.05);
      posAura.y = lerp(posAura.y, mouse.targetY, 0.05);
      aura.style.transform = `translate3d(${posAura.x}px, ${posAura.y}px, 0)`;
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
