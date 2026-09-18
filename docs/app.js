// ==========================================================================
// «ГОВОРИ» — 3D SPATIAL NEURAL PARTICLE ENGINE (THREE.JS WEBGL)
// ==========================================================================

(() => {
  'use strict';

  // ── CONSTANTS & PALETTE ──
  const PARTICLE_COUNT = 4800;
  const CHERRY_COLA = new THREE.Color('#9A0002');
  const CHERRY_BRIGHT = new THREE.Color('#FF2A45');
  const ICE_MIST = new THREE.Color('#F5F8FA');
  const DARK_ACCENT = new THREE.Color('#3A050B');

  // ── STATE ──
  let scene, camera, renderer;
  let particlesGeometry, particlesMaterial, particleSystem;
  let posCurrent, posTarget, velocities, baseColors, colorsCurrent;
  let f0, f1, f2, f3; // Formations

  let W = window.innerWidth;
  let H = window.innerHeight;
  let mouseX = 0, mouseY = 0;
  let targetCamX = 0, targetCamY = 0;
  let scrollProgress = 0; // 0.0 to 3.0 (continuous across 4 sections)
  let isVoiceActive = false;
  let voicePulse = 0;
  let shockwaveRadius = 0;
  let shockwaveCenter = new THREE.Vector3();
  let shockwaveActive = false;

  // Audio Context (Synthesized Native FX)
  let audioCtx = null;
  let soundEnabled = true;

  // ── INIT ──
  window.addEventListener('DOMContentLoaded', () => {
    initWebGL();
    generateFormations();
    bindEvents();
    initScrollTracking();
    init3DTilt();
    initVoiceInteraction();
    initOSDetection();
    document.body.classList.remove('is-loading');
    animate();
  });

  // ── WEBGL INITIALIZATION ──
  function initWebGL() {
    const container = document.getElementById('webgl-container');
    if (!container) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.018);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    camera.position.set(0, 0, 26);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x050508, 0);
    container.appendChild(renderer.domElement);

    // 4. Particle Texture (Circular Soft Radial Glow)
    const particleTexture = createGlowTexture();

    // 5. Geometry & Attributes
    particlesGeometry = new THREE.BufferGeometry();
    posCurrent = new Float32Array(PARTICLE_COUNT * 3);
    posTarget = new Float32Array(PARTICLE_COUNT * 3);
    velocities = new Float32Array(PARTICLE_COUNT * 3);
    baseColors = new Float32Array(PARTICLE_COUNT * 3);
    colorsCurrent = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      posCurrent[i3] = (Math.random() - 0.5) * 50;
      posCurrent[i3 + 1] = (Math.random() - 0.5) * 50;
      posCurrent[i3 + 2] = (Math.random() - 0.5) * 50;

      // Color distribution: 65% Ice Mist, 25% Cherry Bright, 10% Cherry Cola
      const rand = Math.random();
      let color;
      if (rand < 0.60) {
        color = ICE_MIST;
      } else if (rand < 0.88) {
        color = CHERRY_BRIGHT;
      } else {
        color = CHERRY_COLA;
      }

      baseColors[i3] = color.r;
      baseColors[i3 + 1] = color.g;
      baseColors[i3 + 2] = color.b;

      colorsCurrent[i3] = color.r;
      colorsCurrent[i3 + 1] = color.g;
      colorsCurrent[i3 + 2] = color.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posCurrent, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsCurrent, 3));

    // 6. Material
    particlesMaterial = new THREE.PointsMaterial({
      size: 0.65,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    // 7. Points Mesh
    particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);
  }

  // Create smooth radial glow sprite in-memory
  function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 60, 80, 0.85)');
    gradient.addColorStop(0.5, 'rgba(154, 0, 2, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // ── GENERATE 4 DISTINCT 3D FORMATIONS ──
  function generateFormations() {
    f0 = new Float32Array(PARTICLE_COUNT * 3); // Hero: Neural Voice Sphere
    f1 = new Float32Array(PARTICLE_COUNT * 3); // Transform: Chaos -> Conduit -> Stream
    f2 = new Float32Array(PARTICLE_COUNT * 3); // Specs: Orbiting Galaxy & Constellations
    f3 = new Float32Array(PARTICLE_COUNT * 3); // Download: Event Horizon Wormhole

    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 1. Formation 0: Neural Voice Sphere (Fibonacci sphere distribution)
      const theta0 = 2 * Math.PI * i / goldenRatio;
      const phi0 = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
      const radius0 = 7.5 + (i % 7 === 0 ? 1.5 : 0);
      f0[i3] = radius0 * Math.sin(phi0) * Math.cos(theta0);
      f0[i3 + 1] = radius0 * Math.sin(phi0) * Math.sin(theta0);
      f0[i3 + 2] = radius0 * Math.cos(phi0);

      // 2. Formation 1: Split Chaos (left) into Parallel Structured Streams (right)
      if (i < PARTICLE_COUNT * 0.42) {
        // Left side chaotic nebula
        const u = Math.random();
        const v = Math.random();
        const rad = 5.5 * Math.sqrt(u);
        const ang = 2 * Math.PI * v;
        f1[i3] = -9.0 + rad * Math.cos(ang);
        f1[i3 + 1] = rad * Math.sin(ang) * 0.8;
        f1[i3 + 2] = (Math.random() - 0.5) * 6;
      } else if (i < PARTICLE_COUNT * 0.54) {
        // Center laser bridge / conduit
        const progress = (i - PARTICLE_COUNT * 0.42) / (PARTICLE_COUNT * 0.12);
        f1[i3] = -4.0 + progress * 8.0;
        f1[i3 + 1] = (Math.random() - 0.5) * 0.4;
        f1[i3 + 2] = (Math.random() - 0.5) * 1.5;
      } else {
        // Right side: 6 parallel neat text streams
        const lineIdx = (i % 6);
        const linePos = Math.floor((i - PARTICLE_COUNT * 0.54) / 6) / ((PARTICLE_COUNT * 0.46) / 6);
        f1[i3] = 4.5 + linePos * 9.5;
        f1[i3 + 1] = 2.5 - lineIdx * 1.0 + (Math.random() - 0.5) * 0.08;
        f1[i3 + 2] = (Math.random() - 0.5) * 1.0;
      }

      // 3. Formation 2: Spatial Galaxy & Constellation Rings
      const angle2 = i * 0.04;
      const ringRadius = 4.0 + (i / PARTICLE_COUNT) * 15.0;
      f2[i3] = Math.cos(angle2) * ringRadius;
      f2[i3 + 1] = Math.sin(angle2 * 2.0) * 2.5 + (Math.random() - 0.5) * 1.5;
      f2[i3 + 2] = Math.sin(angle2) * ringRadius * 0.6;

      // 4. Formation 3: Event Horizon Wormhole Vortex
      const zPos = -18.0 + (i / PARTICLE_COUNT) * 36.0;
      const vortexRadius = 2.0 + Math.pow((zPos + 18) / 36, 1.6) * 12.0;
      const spin = zPos * 0.6 + i * 0.08;
      f3[i3] = Math.cos(spin) * vortexRadius;
      f3[i3 + 1] = Math.sin(spin) * vortexRadius;
      f3[i3 + 2] = zPos;
    }
  }

  // ── SCROLL & TIMELINE SYNCHRONIZATION ──
  function initScrollTracking() {
    const scrollWrapper = document.getElementById('scroll-wrapper');
    const timelineProgress = document.getElementById('timeline-progress');
    const timelineSteps = document.querySelectorAll('.t-step');

    if (!scrollWrapper) return;

    scrollWrapper.addEventListener('scroll', () => {
      const maxScroll = scrollWrapper.scrollHeight - scrollWrapper.clientHeight;
      const progressNorm = maxScroll > 0 ? scrollWrapper.scrollTop / maxScroll : 0;
      scrollProgress = progressNorm * 3.0; // 0 to 3

      // Update vertical timeline UI
      const activeIdx = Math.min(3, Math.floor(progressNorm * 4 + 0.1));
      timelineSteps.forEach((step, idx) => {
        if (idx === activeIdx) {
          step.classList.add('active');
        } else {
          step.classList.remove('active');
        }
      });

      if (timelineProgress) {
        timelineProgress.style.top = `${activeIdx * 25}%`;
      }
    });

    // Timeline Click navigation
    timelineSteps.forEach(step => {
      step.addEventListener('click', () => {
        const idx = parseInt(step.dataset.index, 10);
        const sections = document.querySelectorAll('.section');
        if (sections[idx]) {
          sections[idx].scrollIntoView({ behavior: 'smooth' });
          playChime(320 + idx * 80);
        }
      });
    });
  }

  // ── 3D CARD PERSPECTIVE TILT ──
  function init3DTilt() {
    const cards = document.querySelectorAll('[data-tilt]');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const rotX = ((y - cy) / cy) * -12;
        const rotY = ((x - cx) / cx) * 12;

        card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(8px) scale(1.02)`;

        // Dynamic specular sheen reflection
        const glow = card.querySelector('.card-glass-glow, .spec-glow');
        if (glow) {
          glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255, 60, 80, 0.18), transparent 60%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        const glow = card.querySelector('.card-glass-glow, .spec-glow');
        if (glow) {
          glow.style.background = '';
        }
      });
    });
  }

  // ── VOICE DEMO & INTERACTION ──
  function initVoiceInteraction() {
    const micTrigger = document.getElementById('mic-test-trigger');
    const micLabel = document.getElementById('mic-label');
    const pill = document.getElementById('live-transcription');
    const pillText = document.getElementById('pill-text');

    function startVoice() {
      if (isVoiceActive) return;
      isVoiceActive = true;
      if (micTrigger) micTrigger.classList.add('is-active');
      if (micLabel) micLabel.textContent = 'Говорите...';
      if (pill) {
        pill.classList.add('visible');
        pillText.textContent = 'Распознавание речи...';
      }
      playHum();
    }

    function stopVoice() {
      if (!isVoiceActive) return;
      isVoiceActive = false;
      if (micTrigger) micTrigger.classList.remove('is-active');
      if (micLabel) micLabel.textContent = 'Удерживай для записи';

      // Typewriter simulation of crisp result
      if (pillText) {
        const finalPhrase = '«Привет! Давай завтра в 18:00 всё обсудим.»';
        let charIdx = 0;
        pillText.textContent = '';
        const typeInterval = setInterval(() => {
          if (charIdx < finalPhrase.length) {
            pillText.textContent += finalPhrase[charIdx];
            charIdx++;
          } else {
            clearInterval(typeInterval);
            setTimeout(() => {
              if (!isVoiceActive && pill) pill.classList.remove('visible');
            }, 3000);
          }
        }, 32);
      }
      playSuccessChime();
    }

    if (micTrigger) {
      micTrigger.addEventListener('mousedown', startVoice);
      window.addEventListener('mouseup', stopVoice);
      micTrigger.addEventListener('touchstart', (e) => { e.preventDefault(); startVoice(); });
      window.addEventListener('touchend', stopVoice);
    }

    // Spacebar to trigger voice test
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        startVoice();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stopVoice();
      }
    });
  }

  // ── GLOBAL EVENTS ──
  function bindEvents() {
    window.addEventListener('resize', onResize);

    // Mouse / Parallax
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / W) * 2 - 1;
      mouseY = -(e.clientY / H) * 2 + 1;
      targetCamX = mouseX * 2.8;
      targetCamY = mouseY * 2.0;
    });

    // Click Shockwave
    window.addEventListener('click', (e) => {
      // Don't trigger if clicked on an anchor or button
      if (e.target.closest('a, button')) return;

      const vector = new THREE.Vector3(
        (e.clientX / W) * 2 - 1,
        -(e.clientY / H) * 2 + 1,
        0.5
      );
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      shockwaveCenter.copy(camera.position).add(dir.multiplyScalar(distance));
      shockwaveRadius = 0.1;
      shockwaveActive = true;
      playClickPlink();
    });

    // Sound Mute Toggle
    const soundToggle = document.getElementById('sound-toggle');
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        if (iconOn && iconOff) {
          iconOn.classList.toggle('hidden', !soundEnabled);
          iconOff.classList.toggle('hidden', soundEnabled);
        }
      });
    }
  }

  function onResize() {
    W = window.innerWidth;
    H = window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  // ── OS DETECTION ──
  function initOSDetection() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMac = ua.includes('macintosh') || ua.includes('mac os');

    const winBtn = document.getElementById('btn-dl-win');
    const macBtn = document.getElementById('btn-dl-mac');

    if (isMac && winBtn && macBtn) {
      winBtn.href = 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-1.0.6.dmg';
      const textStrong = winBtn.querySelector('strong');
      const textSmall = winBtn.querySelector('small');
      if (textStrong) textStrong.textContent = 'Скачать для macOS';
      if (textSmall) textSmall.textContent = 'v1.0.6 • Apple Silicon & Intel DMG';
    }
  }

  // ── NATIVE SYNTHESIZED SOUND EFFECTS ──
  function getAudioCtx() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playHum() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  function playSuccessChime() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  function playChime(freq) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }

  function playClickPlink() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }

  // ── ANIMATION LOOP ──
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. Smooth Camera Parallax
    camera.position.x += (targetCamX - camera.position.x) * 0.05;
    camera.position.y += (targetCamY - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    // 2. Continuous Scroll Interpolation between Formations
    // Section 0 = f0, Section 1 = f1, Section 2 = f2, Section 3 = f3
    const p = Math.max(0, Math.min(3, scrollProgress));
    let startF, endF, alpha;

    if (p < 1.0) {
      startF = f0; endF = f1; alpha = p;
    } else if (p < 2.0) {
      startF = f1; endF = f2; alpha = p - 1.0;
    } else {
      startF = f2; endF = f3; alpha = p - 2.0;
    }

    // Smooth ease on alpha
    const easeAlpha = alpha * alpha * (3 - 2 * alpha);

    // Voice reaction energy
    if (isVoiceActive) {
      voicePulse += (1.0 - voicePulse) * 0.1;
    } else {
      voicePulse += (0.0 - voicePulse) * 0.08;
    }

    // Shockwave expansion
    if (shockwaveActive) {
      shockwaveRadius += delta * 35.0;
      if (shockwaveRadius > 45.0) shockwaveActive = false;
    }

    // 3. Update Particle Positions
    const pos = particlesGeometry.attributes.position.array;
    const col = particlesGeometry.attributes.color.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Base blended coordinates
      const tx = startF[i3] + (endF[i3] - startF[i3]) * easeAlpha;
      const ty = startF[i3 + 1] + (endF[i3 + 1] - startF[i3 + 1]) * easeAlpha;
      const tz = startF[i3 + 2] + (endF[i3 + 2] - startF[i3 + 2]) * easeAlpha;

      // Dynamic harmonic waviness
      const noise = Math.sin(time * 2.0 + i * 0.2) * (0.15 + voicePulse * 1.8);
      const waveY = Math.cos(time * 1.5 + tx * 0.4) * (0.2 + voicePulse * 1.2);

      let targetX = tx;
      let targetY = ty + waveY;
      let targetZ = tz + noise;

      // Rotation around Y axis for hero sphere & download vortex
      if (p < 0.6) {
        const rotAngle = time * 0.18;
        const cosR = Math.cos(rotAngle);
        const sinR = Math.sin(rotAngle);
        const nx = targetX * cosR - targetZ * sinR;
        const nz = targetX * sinR + targetZ * cosR;
        targetX = nx;
        targetZ = nz;
      } else if (p > 2.2) {
        // Fast swirl in download section
        const rotAngle = time * 0.8;
        const cosR = Math.cos(rotAngle);
        const sinR = Math.sin(rotAngle);
        const nx = targetX * cosR - targetY * sinR;
        const ny = targetX * sinR + targetY * cosR;
        targetX = nx;
        targetY = ny;
      }

      // Smooth Euler integration
      pos[i3] += (targetX - pos[i3]) * 0.08;
      pos[i3 + 1] += (targetY - pos[i3 + 1]) * 0.08;
      pos[i3 + 2] += (targetZ - pos[i3 + 2]) * 0.08;

      // Interactive Shockwave displacement
      if (shockwaveActive) {
        const dx = pos[i3] - shockwaveCenter.x;
        const dy = pos[i3 + 1] - shockwaveCenter.y;
        const dz = pos[i3 + 2] - shockwaveCenter.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const diff = Math.abs(dist - shockwaveRadius);
        if (diff < 3.0 && dist > 0.01) {
          const force = (3.0 - diff) * 0.6;
          pos[i3] += (dx / dist) * force;
          pos[i3 + 1] += (dy / dist) * force;
          pos[i3 + 2] += (dz / dist) * force;
        }
      }

      // Dynamic Color Pulse when Voice active
      if (voicePulse > 0.01) {
        col[i3] = baseColors[i3] + (CHERRY_BRIGHT.r - baseColors[i3]) * voicePulse * 0.8;
        col[i3 + 1] = baseColors[i3 + 1] + (CHERRY_BRIGHT.g - baseColors[i3 + 1]) * voicePulse * 0.8;
        col[i3 + 2] = baseColors[i3 + 2] + (CHERRY_BRIGHT.b - baseColors[i3 + 2]) * voicePulse * 0.8;
      } else {
        col[i3] = baseColors[i3];
        col[i3 + 1] = baseColors[i3 + 1];
        col[i3 + 2] = baseColors[i3 + 2];
      }
    }

    particlesGeometry.attributes.position.needsUpdate = true;
    particlesGeometry.attributes.color.needsUpdate = true;

    // 4. Render
    renderer.render(scene, camera);
  }

})();
