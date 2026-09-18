// ==========================================================================
// «ГОВОРИ» — IMMERSIVE PARTICLE ENGINE
//
// 1. Particle field (2000 particles, mouse repulsion, sound wave formation)
// 2. Scroll-driven particle behavior changes per section
// 3. 3D tilt on feature cards
// 4. Section visibility triggers
// 5. OS detection for download buttons
// ==========================================================================

(() => {
  'use strict';

  // ── CONFIG ──
  const PARTICLE_COUNT = 1500;
  const MOUSE_RADIUS = 120;
  const MOUSE_FORCE = 8;
  const CHERRY = { r: 154, g: 0, b: 2 };
  const WHITE = { r: 255, g: 255, b: 255 };

  // ── STATE ──
  let canvas, ctx;
  let W = 0, H = 0;
  let mouseX = -9999, mouseY = -9999;
  let particles = [];
  let currentSection = 0; // 0=hero, 1=transform, 2=features, 3=download
  let scrollProgress = 0; // 0..1 within current section
  let raf;

  // ── INIT ──
  document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    createParticles();
    bindEvents();
    initSectionObservers();
    init3DTilt();
    initOSDetection();
    tick();
  });

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── PARTICLE CREATION ──
  function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        baseX: 0, // will be set per-frame based on formation
        baseY: 0,
        vx: 0,
        vy: 0,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        // Wave params
        waveOffset: Math.random() * Math.PI * 2,
        waveSpeed: 0.3 + Math.random() * 0.7,
        waveAmp: 20 + Math.random() * 60,
        // Color mix (0 = white, 1 = cherry)
        colorMix: Math.random() < 0.3 ? 1 : 0,
      });
    }
  }

  // ── EVENTS ──
  function bindEvents() {
    window.addEventListener('resize', () => {
      resize();
      // Redistribute particles on resize
      particles.forEach(p => {
        p.x = Math.random() * W;
        p.y = Math.random() * H;
      });
    });

    // Track mouse globally (canvas is pointer-events:none, so track on body)
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
      mouseX = -9999;
      mouseY = -9999;
    });

    // Mobile touch support
    document.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      mouseX = -9999;
      mouseY = -9999;
    });

    // Click pulse / shockwave
    document.addEventListener('click', (e) => {
      const clickX = e.clientX;
      const clickY = e.clientY;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - clickX;
        const dy = p.y - clickY;
        const dist = Math.hypot(dx, dy);
        if (dist < 260 && dist > 0) {
          const force = ((260 - dist) / 260) * 16;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }
    });

    // Track scroll for section detection
    const sc = document.getElementById('scroll-container');
    if (sc) {
      sc.addEventListener('scroll', () => {
        const scrollTop = sc.scrollTop;
        const sectionH = window.innerHeight || H || 1;
        currentSection = Math.min(3, Math.max(0, Math.round(scrollTop / sectionH)));
        scrollProgress = (scrollTop % sectionH) / sectionH;
      });
    }
  }

  // ── PARTICLE FORMATIONS ──

  function getFormation(p, i, time) {
    switch (currentSection) {
      case 0: return formationWave(p, i, time);
      case 1: return formationSplit(p, i, time);
      case 2: return formationGrid(p, i, time);
      case 3: return formationConverge(p, i, time);
      default: return formationWave(p, i, time);
    }
  }

  // Hero: Sound wave formation
  function formationWave(p, i, time) {
    const xSpread = W * 0.8;
    const xStart = W * 0.1;
    const xPos = xStart + (i / PARTICLE_COUNT) * xSpread;
    const wave = Math.sin(xPos * 0.008 + time * p.waveSpeed + p.waveOffset) * p.waveAmp;
    const wave2 = Math.cos(xPos * 0.003 + time * 0.5) * (p.waveAmp * 0.4);
    return { x: xPos, y: H / 2 + wave + wave2 };
  }

  // Transform: Split into two groups (left chaotic, right ordered)
  function formationSplit(p, i, time) {
    const half = PARTICLE_COUNT / 2;
    if (i < half) {
      // Left side — chaotic scatter
      const spread = 0.35;
      const cx = W * 0.25;
      const cy = H * 0.5;
      const angle = (i / half) * Math.PI * 2 + time * 0.3;
      const radius = 80 + Math.sin(i * 0.7 + time) * 60 + (i % 7) * 15;
      return {
        x: cx + Math.cos(angle + p.waveOffset) * radius * spread * 3,
        y: cy + Math.sin(angle + p.waveOffset) * radius * spread * 2
      };
    } else {
      // Right side — ordered lines
      const idx = i - half;
      const lineCount = 6;
      const line = idx % lineCount;
      const posInLine = Math.floor(idx / lineCount);
      const totalInLine = Math.ceil(half / lineCount);
      return {
        x: W * 0.55 + (posInLine / totalInLine) * (W * 0.35),
        y: H * 0.3 + line * (H * 0.07)
      };
    }
  }

  // Features: Grid / constellation
  function formationGrid(p, i, time) {
    const cols = 50;
    const rows = Math.ceil(PARTICLE_COUNT / cols);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = W / cols;
    const cellH = H / rows;
    const wobble = Math.sin(time * 0.8 + i * 0.1) * 3;
    return {
      x: col * cellW + cellW / 2 + wobble,
      y: row * cellH + cellH / 2 + wobble
    };
  }

  // Download: Converge to center logo
  function formationConverge(p, i, time) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 8 + time * 0.2;
    const radius = 60 + (i / PARTICLE_COUNT) * 200 + Math.sin(time + i * 0.05) * 20;
    return {
      x: W / 2 + Math.cos(angle) * radius,
      y: H / 2 + Math.sin(angle) * radius * 0.5
    };
  }

  // ── MAIN LOOP ──
  let time = 0;

  function tick() {
    time += 0.016;
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Get target position from current formation
      const target = getFormation(p, i, time);
      p.baseX = target.x;
      p.baseY = target.y;

      // Ease toward target
      const easing = 0.03;
      p.vx += (p.baseX - p.x) * easing;
      p.vy += (p.baseY - p.y) * easing;

      // Mouse repulsion
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_FORCE;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Apply velocity with friction
      p.vx *= 0.88;
      p.vy *= 0.88;
      p.x += p.vx;
      p.y += p.vy;

      // Color
      let r, g, b;
      if (p.colorMix > 0.5) {
        r = CHERRY.r;
        g = CHERRY.g;
        b = CHERRY.b;
      } else {
        r = WHITE.r;
        g = WHITE.g;
        b = WHITE.b;
      }

      // Alpha based on section
      let alpha = p.alpha;
      if (currentSection === 3) {
        alpha *= 0.4; // dimmer on download
      }

      // Draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fill();

      // Connection lines (only hero section, nearby particles)
      if (currentSection === 0 && i % 3 === 0) {
        for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
          const p2 = particles[j];
          const d = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d < 50) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(154, 0, 2, ${0.08 * (1 - d / 50)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    raf = requestAnimationFrame(tick);
  }

  // ── SECTION VISIBILITY OBSERVERS ──
  function initSectionObservers() {
    const sc = document.getElementById('scroll-container');

    // Transform section
    observeElement('#s-transform .transform-grid', 'visible');

    // Feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          card.classList.add('visible');
          obs.unobserve(card);
        }
      }, { threshold: 0.25, root: sc });
      obs.observe(card);
    });

    // Download elements
    observeElement('#s-download .download-logo', 'visible');
    observeElement('#s-download .download-sub', 'visible');
    observeElement('#s-download .download-buttons', 'visible');
  }

  function observeElement(selector, className) {
    const el = document.querySelector(selector);
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add(className);
        obs.unobserve(el);
      }
    }, { threshold: 0.3, root: document.getElementById('scroll-container') });
    obs.observe(el);
  }

  // ── 3D TILT ON FEATURE CARDS ──
  function init3DTilt() {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ── OS DETECTION ──
  function initOSDetection() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMac = ua.includes('macintosh') || ua.includes('mac os');

    const heroCta = document.getElementById('hero-cta');
    const dlPrimary = document.getElementById('dl-primary');

    if (isMac) {
      const macUrl = 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-1.0.6.dmg';
      if (heroCta) {
        heroCta.href = macUrl;
        const textEl = heroCta.querySelector('.btn-glow-text');
        if (textEl) textEl.textContent = 'Скачать для macOS';
      }
      if (dlPrimary) {
        dlPrimary.href = macUrl;
        dlPrimary.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8.92-2.85-.9.04-2 .6-2.65 1.36-.56.65-1.06 1.71-.93 2.73 1.01.08 2.04-.49 2.66-1.24z"/></svg>
          macOS
        `;
      }
    }
  }

})();
