// ==========================================================================
// «ГОВОРИ» — 3D SPATIAL AUDIO RIBBON & SCROLL CAMERA ENGINE (THREE.JS)
// ==========================================================================

(() => {
  'use strict';

  // ── CONSTANTS & PALETTE ──
  const CHERRY = new THREE.Color('#9A0002');
  const CHERRY_BRIGHT = new THREE.Color('#FF2244');
  const ICE_MIST = new THREE.Color('#F5F8FA');

  // ── THREE.JS STATE ──
  let scene, camera, renderer;
  let wavePoints, waveGeometry, waveMaterial;
  let positions, colors, originalPositions;
  const GRID_X = 80;
  const GRID_Z = 45;
  const TOTAL_POINTS = GRID_X * GRID_Z;

  let W = window.innerWidth;
  let H = window.innerHeight;
  let mouseX = 0, mouseY = 0;
  let targetCamX = 0, targetCamY = 0;
  let scrollNorm = 0; // 0.0 to 1.0

  let isRecording = false;
  let speechEnergy = 0;

  // ── INIT ──
  window.addEventListener('DOMContentLoaded', () => {
    initThreeScene();
    bindEvents();
    initScrollSync();
    initVoiceSimulation();
    initOSDetection();
    animate();
  });

  // ── THREE.JS SCENE SETUP ──
  function initThreeScene() {
    const container = document.getElementById('canvas-3d-wrapper');
    if (!container) return;

    // 1. Scene & Fog
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070B, 0.022);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    camera.position.set(0, 4, 22);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x06070B, 0);
    container.appendChild(renderer.domElement);

    // 4. Circular Soft Glow Sprite
    const sprite = createGlowTexture();

    // 5. Geometry Grid of Sound Waves
    waveGeometry = new THREE.BufferGeometry();
    positions = new Float32Array(TOTAL_POINTS * 3);
    colors = new Float32Array(TOTAL_POINTS * 3);
    originalPositions = new Float32Array(TOTAL_POINTS * 3);

    const sizeX = 36;
    const sizeZ = 22;

    let idx = 0;
    for (let iz = 0; iz < GRID_Z; iz++) {
      for (let ix = 0; ix < GRID_X; ix++) {
        const x = (ix / (GRID_X - 1) - 0.5) * sizeX;
        const z = (iz / (GRID_Z - 1) - 0.5) * sizeZ;
        const y = 0;

        const i3 = idx * 3;
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        originalPositions[i3] = x;
        originalPositions[i3 + 1] = y;
        originalPositions[i3 + 2] = z;

        // Color gradient along wave depth
        const depthRatio = iz / GRID_Z;
        const col = depthRatio < 0.35 ? ICE_MIST : (depthRatio < 0.75 ? CHERRY_BRIGHT : CHERRY);

        colors[i3] = col.r;
        colors[i3 + 1] = col.g;
        colors[i3 + 2] = col.b;

        idx++;
      }
    }

    waveGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    waveGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 6. Points Material
    waveMaterial = new THREE.PointsMaterial({
      size: 0.55,
      map: sprite,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    wavePoints = new THREE.Points(waveGeometry, waveMaterial);
    wavePoints.position.set(0, -2.5, 0);
    scene.add(wavePoints);
  }

  function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(255, 34, 68, 0.85)');
    grad.addColorStop(0.6, 'rgba(154, 0, 2, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // ── SCROLL CAMERA FLIGHT & TIMELINE SYNC ──
  function initScrollSync() {
    const sc = document.getElementById('scroll-container');
    const indicator = document.getElementById('timeline-indicator');
    const labels = document.querySelectorAll('.t-label');
    if (!sc) return;

    sc.addEventListener('scroll', () => {
      const max = sc.scrollHeight - sc.clientHeight;
      scrollNorm = max > 0 ? sc.scrollTop / max : 0;

      // Active section index 0..3
      const activeIdx = Math.min(3, Math.floor(scrollNorm * 4 + 0.1));
      labels.forEach((lbl, i) => {
        lbl.classList.toggle('active', i === activeIdx);
      });

      if (indicator) {
        indicator.style.top = `${activeIdx * 25}%`;
      }
    });

    labels.forEach(lbl => {
      lbl.addEventListener('click', () => {
        const secIdx = parseInt(lbl.dataset.sec, 10);
        const sections = document.querySelectorAll('.screen-section');
        if (sections[secIdx]) {
          sections[secIdx].scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // ── VOICE DEMO SIMULATION ──
  function initVoiceSimulation() {
    const micBtn = document.getElementById('hero-mic-btn');
    const micLabel = document.getElementById('mic-btn-label');
    const bubble = document.getElementById('voice-bubble');
    const bubbleText = document.getElementById('bubble-text');

    function startListening() {
      if (isRecording) return;
      isRecording = true;
      if (micBtn) micBtn.classList.add('is-recording');
      if (micLabel) micLabel.textContent = 'Говорите...';
      if (bubble) {
        bubble.classList.add('visible');
        bubbleText.textContent = 'Распознаю поток речи...';
      }
    }

    function stopListening() {
      if (!isRecording) return;
      isRecording = false;
      if (micBtn) micBtn.classList.remove('is-recording');
      if (micLabel) micLabel.textContent = 'Удерживай для записи';

      if (bubbleText) {
        const phrase = '«Привет! Давай завтра в 18:00 обсудим релиз.»';
        let charI = 0;
        bubbleText.textContent = '';
        const t = setInterval(() => {
          if (charI < phrase.length) {
            bubbleText.textContent += phrase[charI];
            charI++;
          } else {
            clearInterval(t);
            setTimeout(() => {
              if (!isRecording && bubble) bubble.classList.remove('visible');
            }, 3200);
          }
        }, 28);
      }
    }

    if (micBtn) {
      micBtn.addEventListener('mousedown', startListening);
      window.addEventListener('mouseup', stopListening);
      micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startListening(); });
      window.addEventListener('touchend', stopListening);
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        startListening();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stopListening();
      }
    });
  }

  // ── GLOBAL EVENTS ──
  function bindEvents() {
    window.addEventListener('resize', () => {
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / W) * 2 - 1;
      mouseY = -(e.clientY / H) * 2 + 1;
      targetCamX = mouseX * 2.5;
      targetCamY = mouseY * 1.5;
    });
  }

  // ── OS DETECTION ──
  function initOSDetection() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMac = ua.includes('macintosh') || ua.includes('mac os');

    const heroDl = document.getElementById('hero-download-btn');
    const heroTitle = document.getElementById('btn-hero-label');
    const mainDl = document.getElementById('main-dl-btn');
    const dlTitle = document.getElementById('dl-btn-title');
    const altLink = document.getElementById('alt-platform-link');

    if (isMac && heroDl && heroTitle && mainDl) {
      const macUrl = 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-1.0.6.dmg';
      const winUrl = 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-setup-1.0.6.exe';

      heroDl.href = macUrl;
      heroTitle.textContent = 'Скачать для macOS';
      mainDl.href = macUrl;
      if (dlTitle) dlTitle.textContent = 'Скачать для macOS';

      if (altLink) {
        altLink.href = winUrl;
        altLink.textContent = 'Версия для Windows (.exe)';
      }
    }
  }

  // ── MAIN 60FPS ANIMATION LOOP ──
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. Voice Energy Lerp
    if (isRecording) {
      speechEnergy += (1.0 - speechEnergy) * 0.12;
    } else {
      speechEnergy += (0.0 - speechEnergy) * 0.08;
    }

    // 2. Camera Flight Driven by Scroll
    // Section 0 (Hero): cam.pos (0, 3, 22), cam.rot (0, 0, 0)
    // Section 1 (Speed): cam.pos (0, 1, 17), cam.rot (-0.15, 0, 0)
    // Section 2 (Privacy): cam.pos (3, 6, 18), cam.rot (-0.25, 0.15, 0)
    // Section 3 (Download): cam.pos (0, -0.5, 12), cam.rot (0, 0, 0)
    const p = Math.max(0, Math.min(1, scrollNorm));

    let camBaseY = 3.5 - p * 4.0;
    let camBaseZ = 22.0 - p * 10.0;
    let camBaseX = Math.sin(p * Math.PI) * 2.5;

    camera.position.x += (camBaseX + targetCamX - camera.position.x) * 0.05;
    camera.position.y += (camBaseY + targetCamY - camera.position.y) * 0.05;
    camera.position.z += (camBaseZ - camera.position.z) * 0.05;
    camera.lookAt(0, -0.5, 0);

    // 3. Update Audio Ribbon Wave Points
    const pos = waveGeometry.attributes.position.array;
    const col = waveGeometry.attributes.color.array;

    const baseAmp = 1.6 + speechEnergy * 3.5;
    const waveSpeed = 1.8 + speechEnergy * 2.0;

    let idx = 0;
    for (let iz = 0; iz < GRID_Z; iz++) {
      for (let ix = 0; ix < GRID_X; ix++) {
        const i3 = idx * 3;
        const ox = originalPositions[i3];
        const oz = originalPositions[i3 + 2];

        // Harmonic fluid wave
        const wave1 = Math.sin(ox * 0.22 + time * waveSpeed + oz * 0.15);
        const wave2 = Math.cos(ox * 0.45 - time * 1.2) * 0.45;
        const voiceRipple = speechEnergy > 0.01 ? Math.sin(ox * 1.5 + time * 6.0) * speechEnergy * 0.8 : 0;

        // On scroll section 1 (Speed), split into chaos vs smooth beam
        let chaos = 0;
        if (p > 0.2 && p < 0.6) {
          const splitFactor = (p - 0.2) / 0.4;
          if (ox < 0) {
            chaos = (Math.sin(ox * 4.0 + time * 5.0) * Math.cos(oz * 3.0)) * splitFactor * 1.2;
          }
        }

        // On scroll section 3 (Download), curve into an intake vortex
        let vortex = 0;
        if (p > 0.7) {
          const vortexFactor = (p - 0.7) / 0.3;
          vortex = Math.sin(time * 2.0 + (ox * ox + oz * oz) * 0.02) * vortexFactor * 1.8;
        }

        pos[i3 + 1] = (wave1 + wave2 + voiceRipple + chaos + vortex) * baseAmp;

        // Dynamic Color Shift when speaking
        if (speechEnergy > 0.01) {
          col[i3] = col[i3] + (CHERRY_BRIGHT.r - col[i3]) * speechEnergy * 0.7;
          col[i3 + 1] = col[i3 + 1] + (CHERRY_BRIGHT.g - col[i3 + 1]) * speechEnergy * 0.7;
          col[i3 + 2] = col[i3 + 2] + (CHERRY_BRIGHT.b - col[i3 + 2]) * speechEnergy * 0.7;
        }

        idx++;
      }
    }

    waveGeometry.attributes.position.needsUpdate = true;
    if (speechEnergy > 0.01) {
      waveGeometry.attributes.color.needsUpdate = true;
    }

    // 4. Render
    renderer.render(scene, camera);
  }

})();
