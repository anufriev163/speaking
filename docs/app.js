// ==========================================================================
// «ГОВОРИ» — 3D SPATIAL ENGINE & CAMERA FLIGHT (THREE.JS)
// Features:
//   - Transparent WebGL over light ice-blue/white gradient
//   - Rock-solid 3D spatial anchoring for WIX Bold text & clean solid arrows (ZERO jitter)
//   - Dynamic camera choreography: macro zoom-in / sweep pull-backs / flythrough
//   - Live simulated audio HUD typing
// ==========================================================================

(() => {
  'use strict';

  const N = 18000;

  let scene, camera, renderer;
  let wavePoints, waveGeometry, waveMaterial;
  let W = window.innerWidth;
  let H = window.innerHeight;

  let targetProgress = 0;
  let smoothProgress = 0;
  let mouseX = 0, mouseY = 0;
  let targetCamX = 0, targetCamY = 0;
  let currentCamX = 0, currentCamY = 0;

  // Gentle Ripple
  let rippleActive = false;
  let rippleStartTime = 0;
  let rippleOriginX = 0;
  let rippleOriginZ = 0;

  // Spatial Callout DOM elements & smoothed screen coords
  const callouts = [];
  const smoothedCallouts = [
    { x: W * 0.5 - 240, y: 80 },
    { x: W * 0.65, y: 120 },
    { x: 100, y: 140 },
    { x: W * 0.5 - 290, y: H * 0.5 - 230 }
  ];
  const projVec = new THREE.Vector3();

  window.addEventListener('DOMContentLoaded', () => {
    initScene();
    setupGeometry();
    initCallouts();
    initTypingSimulation();
    bindEvents();
    animate();
  });

  function initScene() {
    const container = document.getElementById('canvas-3d-wrapper');
    if (!container) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 1000);
    camera.position.set(0, 1.2, 16);

    renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true // Transparent so CSS light blue-white background shows through
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0); // Pure transparent clear
    container.appendChild(renderer.domElement);
  }

  function setupGeometry() {
    const pos0 = new Float32Array(N * 3);
    const pos1 = new Float32Array(N * 3);
    const pos2 = new Float32Array(N * 3);
    const pos3 = new Float32Array(N * 3);

    const cols = 150;
    const rows = 120;
    const goldenAngle = 2.399963229728653;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;

      // ====================================================================
      // STAGE 0: ЖИВАЯ РЕЧЕВАЯ ВОЛНА (SPEECH FREQUENCIES)
      // ====================================================================
      const col = i % cols;
      const row = Math.floor(i / cols);
      const u = (col / (cols - 1)) * 2.0 - 1.0;
      const v = (row / (rows - 1)) * 2.0 - 1.0;

      const x0 = u * 25.0;
      const z0 = v * 12.0;
      const env = Math.exp(-u * u * 2.0 - v * v * 2.4);
      const y0 = Math.sin(u * 6.5) * Math.cos(v * 4.0) * 3.8 * env;

      pos0[i3]     = x0;
      pos0[i3 + 1] = y0;
      pos0[i3 + 2] = z0;

      // ====================================================================
      // STAGE 1: СФЕРА ГОЛОСА / ИИ-МОЗГ (AI VOICE SPHERE)
      // ====================================================================
      if (i < 13000) {
        const t = i / 13000;
        const phi = Math.acos(1.0 - 2.0 * t);
        const theta = i * goldenAngle;
        const r = 5.2 + Math.sin(phi * 6.0 + theta * 3.0) * 0.45;
        pos1[i3]     = Math.sin(phi) * Math.cos(theta) * r;
        pos1[i3 + 1] = Math.cos(phi) * r;
        pos1[i3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      } else {
        const t = (i - 13000) / 5000;
        const theta = t * Math.PI * 2.0;
        const ringR = 7.5 + (Math.sin(i * 1.7) * 0.5) * 0.6;
        pos1[i3]     = Math.cos(theta) * ringR;
        pos1[i3 + 1] = Math.sin(theta * 3.0) * 0.6;
        pos1[i3 + 2] = Math.sin(theta) * ringR;
      }

      // ====================================================================
      // STAGE 2: ГАРМОНИЧЕСКАЯ СПИРАЛЬ (HARMONIC SOUND HELIX)
      // ====================================================================
      const tHelix = (i / N) * Math.PI * 8.0 - Math.PI * 4.0;
      const strand = (i % 2 === 0) ? 1.0 : -1.0;
      const helixRadius = 3.6;
      const x2 = tHelix * 1.8;
      const y2 = Math.sin(tHelix + (strand > 0 ? 0 : Math.PI)) * helixRadius + ((i % 16) / 16 - 0.5) * 1.2;
      const z2 = Math.cos(tHelix + (strand > 0 ? 0 : Math.PI)) * helixRadius + ((i % 16) / 16 - 0.5) * 1.2;

      pos2[i3]     = x2;
      pos2[i3 + 1] = y2;
      pos2[i3 + 2] = z2;

      // ====================================================================
      // STAGE 3: КОНЦЕНТРИЧЕСКИЙ РЕЗОНАНС (ACOUSTIC RIPPLE CORE)
      // ====================================================================
      const ringIdx = i % 8;
      const ringPos = Math.floor(i / 8) / (N / 8);
      const ringAngle = ringPos * Math.PI * 2.0;
      const baseRadius = 2.4 + ringIdx * 2.0;
      const waveHeight = Math.sin(ringAngle * 4.0 + ringIdx * 1.2) * (0.4 + ringIdx * 0.2);

      pos3[i3]     = Math.cos(ringAngle) * baseRadius;
      pos3[i3 + 1] = waveHeight;
      pos3[i3 + 2] = Math.sin(ringAngle) * baseRadius * 0.65;
    }

    waveGeometry = new THREE.BufferGeometry();
    waveGeometry.setAttribute('position', new THREE.BufferAttribute(pos0, 3));
    waveGeometry.setAttribute('pos0', new THREE.BufferAttribute(pos0, 3));
    waveGeometry.setAttribute('pos1', new THREE.BufferAttribute(pos1, 3));
    waveGeometry.setAttribute('pos2', new THREE.BufferAttribute(pos2, 3));
    waveGeometry.setAttribute('pos3', new THREE.BufferAttribute(pos3, 3));

    // ── GLSL SHADER: CELESTIAL SKY BLUE & ICE MIST ──
    const vertexShader = `
      attribute vec3 pos0;
      attribute vec3 pos1;
      attribute vec3 pos2;
      attribute vec3 pos3;

      uniform float uProgress;
      uniform float uTime;
      uniform float uRippleTime;
      uniform vec2 uRipplePos;
      uniform float uRippleStrength;
      uniform float uPixelRatio;

      varying vec3 vColor;
      varying float vAlpha;

      float ease(float a, float b, float x) {
        float t = clamp((x - a) / (b - a), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
      }

      void main() {
        float pVal = clamp(uProgress, 0.0, 3.0);
        vec3 p;

        if (pVal < 1.0) {
          float t = ease(0.0, 1.0, pVal);
          p = mix(pos0, pos1, t);
        } else if (pVal < 2.0) {
          float t = ease(1.0, 2.0, pVal);
          p = mix(pos1, pos2, t);
        } else {
          float t = ease(2.0, 3.0, pVal);
          p = mix(pos2, pos3, t);
        }

        // Ambient fluid wave dynamics
        float waveFactor = max(0.0, 1.0 - pVal * 0.7);
        float wave = sin(p.x * 0.28 + uTime * 1.4 + p.z * 0.18) * 0.5 * waveFactor;
        float pulse = sin(uTime * 1.5 + length(p) * 0.5) * 0.1;
        p.y += wave + pulse;

        // Calm water-ripple on click
        if (uRippleStrength > 0.001) {
          float dist = length(p.xz - uRipplePos);
          float rip = sin(dist * 1.1 - uRippleTime * 4.0) * exp(-dist * 0.3) * uRippleStrength * 0.25;
          p.y += rip;
        }

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Dynamic Point size with attenuation
        float size = (38.0 / -mvPosition.z) * uPixelRatio;
        gl_PointSize = clamp(size, 2.5, 52.0);

        // Color Palette:
        // Deep Azure (#0284C7) -> Sky Cyan (#38BDF8) -> Ice Mist (#F5F8FA)
        vec3 cDeep = vec3(0.008, 0.518, 0.780); // #0284C7
        vec3 cSky  = vec3(0.220, 0.741, 0.973); // #38BDF8
        vec3 cMist = vec3(0.961, 0.973, 0.980); // #F5F8FA

        float h = clamp((p.y + 4.0) / 8.0, 0.0, 1.0);
        if (h < 0.5) {
          vColor = mix(cDeep, cSky, h * 2.0);
        } else {
          vColor = mix(cSky, cMist, (h - 0.5) * 2.0);
        }

        float distFog = clamp((-mvPosition.z - 10.0) / 38.0, 0.0, 1.0);
        vAlpha = 1.0 - distFog * 0.65;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        float alphaEdge = smoothstep(0.5, 0.06, dist);
        gl_FragColor = vec4(vColor, alphaEdge * vAlpha * 0.95);
      }
    `;

    waveMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uProgress:       { value: 0.0 },
        uTime:           { value: 0.0 },
        uRippleTime:     { value: 0.0 },
        uRipplePos:      { value: new THREE.Vector2(0, 0) },
        uRippleStrength: { value: 0.0 },
        uPixelRatio:     { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    wavePoints = new THREE.Points(waveGeometry, waveMaterial);
    scene.add(wavePoints);
  }

  function initCallouts() {
    for (let i = 0; i <= 3; i++) {
      const el = document.getElementById(`callout-${i}`);
      if (el) callouts.push(el);
    }
  }

  // ── ROCK-SOLID 3D SPATIAL ANCHORING (ZERO JITTER) ──
  function toScreenPosition(worldPos) {
    projVec.copy(worldPos);
    projVec.project(camera);
    return {
      x: (projVec.x * 0.5 + 0.5) * W,
      y: (-(projVec.y * 0.5) + 0.5) * H,
      visible: projVec.z < 1.0
    };
  }

  function updateSpatialCallouts(p) {
    const activeIdx = p < 0.65 ? 0 :
                      p < 1.65 ? 1 :
                      p < 2.45 ? 2 : 3;

    callouts.forEach((el, idx) => {
      if (idx === activeIdx) {
        if (!el.classList.contains('active')) el.classList.add('active');

        let targetX, targetY;

        if (idx === 0) {
          // Stage 0: Anchored stably to center wave crest
          const pos = toScreenPosition(new THREE.Vector3(0, 1.2, 0));
          targetX = pos.x - 240;
          targetY = Math.max(40, pos.y - 180);
        } else if (idx === 1) {
          // Stage 1: Anchored stably to Voice Sphere
          const pos = toScreenPosition(new THREE.Vector3(3.2, 1.6, 0));
          targetX = Math.min(W - 480, pos.x + 20);
          targetY = Math.max(50, pos.y - 100);
        } else if (idx === 2) {
          // Stage 2: Anchored stably to Helix
          const pos = toScreenPosition(new THREE.Vector3(-3.0, 1.0, 0));
          targetX = Math.max(40, pos.x - 440);
          targetY = Math.max(50, pos.y - 90);
        } else {
          // Stage 3: Centered product reveal card
          targetX = (W * 0.5) - 290;
          targetY = Math.max(30, (H * 0.5) - 240);
        }

        // Smooth position lerping to eliminate all subpixel vibration
        const smooth = smoothedCallouts[idx];
        smooth.x += (targetX - smooth.x) * 0.12;
        smooth.y += (targetY - smooth.y) * 0.12;

        el.style.transform = `translate3d(${Math.round(smooth.x)}px, ${Math.round(smooth.y)}px, 0)`;
      } else {
        if (el.classList.contains('active')) el.classList.remove('active');
      }
    });
  }

  // ── LIVE REAL-TIME TYPING SIMULATION FOR STAGE 3 ──
  function initTypingSimulation() {
    const textEl = document.getElementById('typing-text');
    if (!textEl) return;

    const phrases = [
      'Отправь отчет по спринту в Telegram и назначь созвон на 15:00.',
      'Напиши функцию на TypeScript для мгновенного захвата аудио с микрофона.',
      'Согласовано. Запускаем релиз говори в продакшн без задержек.',
      'Заполни таблицу аналитики и пришли ссылку в командный чат.'
    ];

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function typeLoop() {
      const current = phrases[phraseIdx];

      if (isDeleting) {
        textEl.textContent = current.substring(0, charIdx - 1);
        charIdx--;
      } else {
        textEl.textContent = current.substring(0, charIdx + 1);
        charIdx++;
      }

      let speed = isDeleting ? 22 : 50 + Math.random() * 25;

      if (!isDeleting && charIdx === current.length) {
        speed = 2200;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        speed = 500;
      }

      setTimeout(typeLoop, speed);
    }

    typeLoop();
  }

  function bindEvents() {
    window.addEventListener('resize', () => {
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      if (waveMaterial && waveMaterial.uniforms) {
        waveMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
      }
    }, { passive: true });

    window.addEventListener('scroll', () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const p = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      targetProgress = p * 3.0;
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / W) * 2.0 - 1.0;
      mouseY = -(e.clientY / H) * 2.0 + 1.0;
      targetCamX = mouseX * 2.2;
      targetCamY = mouseY * 1.5;
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      triggerCalmRipple(e.clientX, e.clientY);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        triggerCalmRipple(W * 0.5, H * 0.5);
      }
    });

    const dlBtn = document.getElementById('download-btn');
    if (dlBtn) {
      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        alert('Загрузка «говори» для Windows начнется через секунду.');
      });
    }
  }

  function triggerCalmRipple(screenX, screenY) {
    const vector = new THREE.Vector3(
      (screenX / W) * 2.0 - 1.0,
      -(screenY / H) * 2.0 + 1.0,
      0.5
    );
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const dist = -camera.position.y / (dir.y || 0.001);
    const hitPoint = camera.position.clone().add(dir.multiplyScalar(dist));

    rippleOriginX = isFinite(hitPoint.x) ? hitPoint.x : 0;
    rippleOriginZ = isFinite(hitPoint.z) ? hitPoint.z : 0;
    rippleStartTime = performance.now();
    rippleActive = true;
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    smoothProgress += (targetProgress - smoothProgress) * 0.065;
    currentCamX += (targetCamX - currentCamX) * 0.05;
    currentCamY += (targetCamY - currentCamY) * 0.05;

    const p = Math.max(0.0, Math.min(3.0, smoothProgress));

    // ── DYNAMIC CAMERA CHOREOGRAPHY: ZOOM IN / ZOOM OUT / 3D BANKING ──
    let targetZ = 16.0;
    let targetY = 1.0;
    let targetX = 0.0;
    let lookY = 0.0;

    if (p < 1.0) {
      // Stage 0 -> Stage 1:
      // Macro close wave (Z=16) -> Zoom out pull-back (Z=26) -> Zoom in to Sphere (Z=16)
      const t = p;
      const zoomArch = Math.sin(t * Math.PI) * 9.5;
      targetZ = 16.0 + zoomArch;
      targetY = 1.0 + Math.sin(t * Math.PI * 0.5) * 1.5;
      targetX = Math.sin(t * Math.PI * 0.5) * 2.5;
      lookY = t * 0.5;
    } else if (p < 2.0) {
      // Stage 1 -> Stage 2:
      // Orbiting Sphere (Z=16) -> Pull-back sweep (Z=25) -> Dive into Helix (Z=13.5)
      const t = p - 1.0;
      const zoomArch = Math.sin(t * Math.PI) * 9.0;
      targetZ = 16.0 + zoomArch - t * 2.5;
      targetY = 2.5 - t * 1.5;
      targetX = 2.5 * (1.0 - t) - t * 2.0;
      lookY = 0.5 - t * 0.5;
    } else {
      // Stage 2 -> Stage 3 (App Reveal):
      // Fly out of helix (Z=13.5) -> Grand zoom-out reveal of full portal & App HUD (Z=26.0)
      const t = p - 2.0;
      targetZ = 13.5 + t * 12.5;
      targetY = 1.0 - t * 0.8;
      targetX = -2.0 * (1.0 - t);
      lookY = 0.0;
    }

    camera.position.x = targetX + currentCamX;
    camera.position.y = targetY + currentCamY;
    camera.position.z = targetZ;
    camera.lookAt(0, lookY, 0);

    // Subtle 3D rotation of points
    if (wavePoints) {
      wavePoints.rotation.y = elapsedTime * 0.12 + currentCamX * 0.04;
      wavePoints.rotation.x = currentCamY * 0.025;
    }

    // Ripple
    let rippleStrength = 0.0;
    let rippleTimeSec = 0.0;
    if (rippleActive) {
      const elapsedRipple = (performance.now() - rippleStartTime) / 1000.0;
      if (elapsedRipple < 1.6) {
        rippleTimeSec = elapsedRipple;
        rippleStrength = Math.exp(-elapsedRipple * 2.5);
      } else {
        rippleActive = false;
      }
    }

    // Update Uniforms
    if (waveMaterial && waveMaterial.uniforms) {
      waveMaterial.uniforms.uProgress.value = p;
      waveMaterial.uniforms.uTime.value = elapsedTime;
      waveMaterial.uniforms.uRippleTime.value = rippleTimeSec;
      waveMaterial.uniforms.uRipplePos.value.set(rippleOriginX, rippleOriginZ);
      waveMaterial.uniforms.uRippleStrength.value = rippleStrength;
    }

    // Update 3D-projected UI Callouts
    updateSpatialCallouts(p);

    renderer.render(scene, camera);
  }

})();
