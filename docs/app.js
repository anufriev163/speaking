// ==========================================================================
// «ГОВОРИ» — 3D SPATIAL ENGINE & WAVE-DISSOLVING TEXT (THREE.JS)
// Features:
//   - Hero stage 100% visible from p = 0.0 (high contrast WIX Bold 800)
//   - All text lowercase, razor-sharp contrast
//   - Lowered wave baseline in hero for generous negative space and clear reading
//   - Unique wave-dissolving exit animation
//   - Ultra-clean minimal finale with single action pill
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

  // Microphone & Live Audio Reactivity
  let micStream = null;
  let audioCtx = null;
  let analyser = null;
  let micTimeData = null;
  let isMicActive = false;
  let micClosing = false;
  let micWarmupFrames = 0;
  let ambientNoiseFloor = 0.015;
  let micEnergy = 0.0;

  // Spatial Callout DOM elements & smoothed screen coords
  const callouts = [];
  const smoothedCallouts = [
    { x: W * 0.5 - 290, y: 70 },
    { x: W * 0.65, y: 120 },
    { x: 100, y: 140 },
    { x: W * 0.5 - 270, y: H * 0.5 - 130 }
  ];
  let micHintEl = null;
  const smoothMicHint = { x: W * 0.75, y: H * 0.55 };
  const projVec = new THREE.Vector3();

  window.addEventListener('DOMContentLoaded', () => {
    initScene();
    setupGeometry();
    initCallouts();
    bindEvents();
    animate();
  });

  function initScene() {
    const container = document.getElementById('canvas-3d-wrapper');
    if (!container) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 1000);
    camera.position.set(0, 0.5, 17.5);

    renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
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
      // STAGE 0: ЖИВАЯ РЕЧЕВАЯ ВОЛНА (СМЕЩЕНА ВНИЗ ДЛЯ ЧИТАЕМОСТИ ТЕКСТА)
      // ====================================================================
      const col = i % cols;
      const row = Math.floor(i / cols);
      const u = (col / (cols - 1)) * 2.0 - 1.0;
      const v = (row / (rows - 1)) * 2.0 - 1.0;

      const x0 = u * 25.0;
      const z0 = v * 12.0;
      const env = Math.exp(-u * u * 2.0 - v * v * 2.4);
      const y0 = -1.5 + Math.sin(u * 6.5) * Math.cos(v * 4.0) * 3.2 * env;

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
      uniform float uMicEnergy;

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

        float waveFactor = max(0.0, 1.0 - pVal * 0.7);
        float wave = sin(p.x * 0.28 + uTime * 1.4 + p.z * 0.18) * 0.45 * waveFactor;
        float pulse = sin(uTime * 1.5 + length(p) * 0.5) * 0.1;

        // Silky, organic voice deformation:
        // Amplifies the existing smooth wave hills with zero high-frequency noise or spikes
        float voiceWaveAmp = 1.0 + uMicEnergy * 1.85;
        float voiceSwell = sin(p.x * 0.24 + uTime * 1.8 + p.z * 0.16) * (uMicEnergy * 1.05);
        p.y += wave * voiceWaveAmp + pulse + voiceSwell;

        if (uRippleStrength > 0.001) {
          float dist = length(p.xz - uRipplePos);
          float rip = sin(dist * 1.1 - uRippleTime * 4.0) * exp(-dist * 0.3) * uRippleStrength * 0.25;
          p.y += rip;
        }

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float size = (38.0 / -mvPosition.z) * uPixelRatio;
        gl_PointSize = clamp(size, 2.5, 52.0);

        vec3 cDeep  = vec3(0.008, 0.518, 0.780); // #0284C7
        vec3 cSky   = vec3(0.220, 0.741, 0.973); // #38BDF8
        vec3 cMist  = vec3(0.961, 0.973, 0.980); // #F5F8FA

        float h = clamp((p.y + 4.0) / 8.0, 0.0, 1.0);
        if (h < 0.5) {
          vColor = mix(cDeep, cSky, h * 2.0);
        } else {
          vColor = mix(cSky, cMist, (h - 0.5) * 2.0);
        }

        if (uMicEnergy > 0.01) {
          vColor = mix(vColor, vec3(0.06, 0.78, 0.98), clamp(uMicEnergy * 0.25, 0.0, 0.35));
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
        uPixelRatio:     { value: Math.min(window.devicePixelRatio || 1, 2) },
        uMicEnergy:      { value: 0.0 }
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
    micHintEl = document.getElementById('mic-hint');
  }

  function toScreenPosition(worldPos) {
    projVec.copy(worldPos);
    projVec.project(camera);
    return {
      x: (projVec.x * 0.5 + 0.5) * W,
      y: (-(projVec.y * 0.5) + 0.5) * H,
      visible: projVec.z < 1.0
    };
  }

  // ── PRECISE MULTI-STAGE WAVE-DISSOLVING TEXT ENGINE ──
  function updateSpatialCallouts(p) {
    callouts.forEach((el, idx) => {
      let opacity = 0;
      let exitFraction = 0;

      if (idx === 0) {
        // Hero stage: 100% visible right from p = 0.0!
        if (p <= 0.35) {
          opacity = 1.0;
          exitFraction = 0.0;
        } else if (p <= 0.65) {
          const t = (p - 0.35) / 0.30;
          exitFraction = t;
          opacity = Math.max(0.0, 1.0 - t * 1.5);
        } else {
          opacity = 0;
          exitFraction = 1.0;
        }
      } else if (idx === 1) {
        // Stage 1 (Sphere): enters 0.65..0.95, stays 0.95..1.35, exits 1.35..1.65
        if (p >= 0.65 && p <= 1.65) {
          if (p < 0.95) {
            const t = (p - 0.65) / 0.30;
            opacity = t;
            exitFraction = 1.0 - t;
          } else if (p <= 1.35) {
            opacity = 1.0;
            exitFraction = 0.0;
          } else {
            const t = (p - 1.35) / 0.30;
            exitFraction = t;
            opacity = Math.max(0.0, 1.0 - t * 1.5);
          }
        } else {
          opacity = 0;
          exitFraction = 1.0;
        }
      } else if (idx === 2) {
        // Stage 2 (Helix): enters 1.65..1.95, stays 1.95..2.25, exits 2.25..2.55
        if (p >= 1.65 && p <= 2.55) {
          if (p < 1.95) {
            const t = (p - 1.65) / 0.30;
            opacity = t;
            exitFraction = 1.0 - t;
          } else if (p <= 2.25) {
            opacity = 1.0;
            exitFraction = 0.0;
          } else {
            const t = (p - 2.25) / 0.30;
            exitFraction = t;
            opacity = Math.max(0.0, 1.0 - t * 1.5);
          }
        } else {
          opacity = 0;
          exitFraction = 1.0;
        }
      } else {
        // Stage 3 (Finale): enters from 2.30, fully solid at 2.65, stays 100% to end
        if (p >= 2.30) {
          const t = Math.min(1.0, (p - 2.30) / 0.35);
          opacity = t;
          exitFraction = 1.0 - t;
        } else {
          opacity = 0;
          exitFraction = 1.0;
        }
      }

      // Base 3D target coordinates
      let targetX, targetY;
      if (idx === 0) {
        // Centered hero text above lowered wave
        targetX = (W * 0.5) - 290;
        targetY = Math.max(45, Math.min(110, H * 0.12));
      } else if (idx === 1) {
        const pos = toScreenPosition(new THREE.Vector3(3.2, 1.6, 0));
        targetX = Math.min(W - 520, pos.x + 20);
        targetY = Math.max(60, pos.y - 100);
      } else if (idx === 2) {
        const pos = toScreenPosition(new THREE.Vector3(-3.0, 1.0, 0));
        targetX = Math.max(50, pos.x - 480);
        targetY = Math.max(60, pos.y - 90);
      } else {
        // Centered finale
        targetX = (W * 0.5) - 220;
        targetY = Math.max(30, (H * 0.5) - 170);
      }

      // Smooth coordinate damping
      const smooth = smoothedCallouts[idx];
      smooth.x += (targetX - smooth.x) * 0.12;
      smooth.y += (targetY - smooth.y) * 0.12;

      // Wave-dissolution: text sinks down into the audio wave + frequency blur & letter dispersion
      const waveSinkY = exitFraction * 35.0;
      const blurPx = (exitFraction * 12.0).toFixed(1);
      const letterSpacePx = (exitFraction * 6.0).toFixed(1);

      el.style.opacity = opacity.toFixed(3);
      el.style.filter = blurPx > 0.2 ? `blur(${blurPx}px)` : 'none';
      el.style.letterSpacing = letterSpacePx > 0.2 ? `${letterSpacePx}px` : '-0.035em';
      el.style.transform = `translate3d(${Math.round(smooth.x)}px, ${Math.round(smooth.y + waveSinkY)}px, 0)`;

      if (opacity > 0.05) {
        el.style.pointerEvents = idx === 3 ? 'auto' : 'none';
      } else {
        el.style.pointerEvents = 'none';
      }
    });

    // ── 3D ANCHORED MIC HINT NOTE (ACTIVE ONLY IN STAGE 0) ──
    if (micHintEl) {
      let micOpacity = 0;
      let micExitFraction = 0;

      if (p <= 0.35) {
        micOpacity = 1.0;
        micExitFraction = 0.0;
      } else if (p <= 0.65) {
        const t = (p - 0.35) / 0.30;
        micExitFraction = t;
        micOpacity = Math.max(0.0, 1.0 - t * 1.5);
      } else {
        micOpacity = 0;
        micExitFraction = 1.0;
      }

      // 3D Anchor projected cleanly above the right slope of the Stage 0 voice wave
      const pos = toScreenPosition(new THREE.Vector3(7.0, -0.35, 0.5));
      const targetX = Math.min(W - 220, Math.max(W * 0.60, pos.x));
      const targetY = Math.max(80, Math.min(H - 140, pos.y - 45));

      smoothMicHint.x += (targetX - smoothMicHint.x) * 0.12;
      smoothMicHint.y += (targetY - smoothMicHint.y) * 0.12;

      const waveSinkY = micExitFraction * 35.0;
      const blurPx = (micExitFraction * 12.0).toFixed(1);
      const letterSpacePx = (micExitFraction * 6.0).toFixed(1);

      micHintEl.style.opacity = micOpacity.toFixed(3);
      micHintEl.style.filter = blurPx > 0.2 ? `blur(${blurPx}px)` : 'none';
      micHintEl.style.letterSpacing = letterSpacePx > 0.2 ? `${letterSpacePx}px` : '0.02em';
      micHintEl.style.transform = `translate3d(${Math.round(smoothMicHint.x)}px, ${Math.round(smoothMicHint.y + waveSinkY)}px, 0) rotate(-3deg)`;
      micHintEl.style.pointerEvents = micOpacity > 0.08 ? 'auto' : 'none';
    }
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
      // Ctrl + ~ / Ctrl + ` / Ctrl + ё / Ctrl + Ё
      if (e.ctrlKey && (e.code === 'Backquote' || e.key === '`' || e.key === '~' || e.key === 'ё' || e.key === 'Ё' || e.keyCode === 192)) {
        e.preventDefault();
        toggleMicrophone();
        return;
      }

      if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        triggerCalmRipple(W * 0.5, H * 0.5);
      }
    });

    const micHint = document.getElementById('mic-hint');
    if (micHint) {
      micHint.addEventListener('click', () => {
        toggleMicrophone();
      });
    }

    const dlModern = document.getElementById('dl-modern');
    if (dlModern) {
      dlModern.addEventListener('click', (e) => {
        e.preventDefault();
        alert('загрузка «говори» для новых пк (avx2) начнется через секунду.');
      });
    }

    const dlLegacy = document.getElementById('dl-legacy');
    if (dlLegacy) {
      dlLegacy.addEventListener('click', (e) => {
        e.preventDefault();
        alert('загрузка «говори» для старых пк (базовая совместимая версия) начнется через секунду.');
      });
    }

    const btnWin = document.getElementById('btn-os-windows');
    const winPanel = document.getElementById('windows-panel');
    if (btnWin && winPanel) {
      btnWin.addEventListener('click', (e) => {
        e.preventDefault();
        btnWin.classList.add('active');
        winPanel.style.display = 'flex';
      });
    }

    const btnMac = document.getElementById('btn-os-mac');
    if (btnMac) {
      btnMac.addEventListener('click', (e) => {
        e.preventDefault();
        alert('версия для macos находится в разработке.');
      });
    }

    const btnLinux = document.getElementById('btn-os-linux');
    if (btnLinux) {
      btnLinux.addEventListener('click', (e) => {
        e.preventDefault();
        alert('версия для linux находится в разработке.');
      });
    }
  }

  // ── LIVE MICROPHONE AUDIO ANALYSIS ──
  async function toggleMicrophone() {
    const hintEl = document.getElementById('mic-hint');

    if (isMicActive) {
      // Smooth shutdown: turn off listening flag and let energy glide gracefully back to 0
      isMicActive = false;
      micClosing = true;
      if (hintEl) {
        hintEl.classList.remove('is-listening');
      }
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('микрофон не поддерживается в этом браузере.');
        return;
      }
      micClosing = false;
      micWarmupFrames = 25; // Warmup frames: prevent connection pop from moving wave
      ambientNoiseFloor = 0.015;

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });

      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      micTimeData = new Uint8Array(analyser.fftSize);
      isMicActive = true;

      if (hintEl) {
        hintEl.classList.add('is-listening');
      }
    } catch (err) {
      console.warn('mic access error:', err);
      if (hintEl) {
        hintEl.classList.add('mic-error');
        setTimeout(() => hintEl.classList.remove('mic-error'), 1800);
      }
    }
  }

  function cleanupMic() {
    if (micStream) {
      try { micStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      micStream = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      try { audioCtx.close(); } catch (e) {}
      audioCtx = null;
    }
    analyser = null;
    micTimeData = null;
    micClosing = false;
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

    // Dynamic Camera Zoom-in / Zoom-out
    let targetZ = 17.5;
    let targetY = 0.5;
    let targetX = 0.0;
    let lookY = -0.4;

    if (p < 1.0) {
      const t = p;
      const zoomArch = Math.sin(t * Math.PI) * 9.0;
      targetZ = 17.5 + zoomArch;
      targetY = 0.5 + Math.sin(t * Math.PI * 0.5) * 2.0;
      targetX = Math.sin(t * Math.PI * 0.5) * 2.5;
      lookY = -0.4 + t * 0.9;
    } else if (p < 2.0) {
      const t = p - 1.0;
      const zoomArch = Math.sin(t * Math.PI) * 9.0;
      targetZ = 17.5 + zoomArch - t * 4.0;
      targetY = 2.5 - t * 1.5;
      targetX = 2.5 * (1.0 - t) - t * 2.0;
      lookY = 0.5 - t * 0.5;
    } else {
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

    if (wavePoints) {
      wavePoints.rotation.y = elapsedTime * 0.12 + currentCamX * 0.04;
      wavePoints.rotation.x = currentCamY * 0.025;
    }

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

    // Smooth, zero-latency voice volume tracking via time-domain RMS
    if (isMicActive && analyser && micTimeData) {
      analyser.getByteTimeDomainData(micTimeData);

      // DC-free RMS computation
      let sum = 0;
      const len = micTimeData.length;
      for (let i = 0; i < len; i++) {
        sum += micTimeData[i];
      }
      const mean = sum / len;

      let sumSq = 0;
      for (let i = 0; i < len; i++) {
        const diff = (micTimeData[i] - mean) / 128;
        sumSq += diff * diff;
      }
      const rms = Math.sqrt(sumSq / len);

      if (micWarmupFrames > 0) {
        micWarmupFrames--;
        ambientNoiseFloor = Math.max(ambientNoiseFloor, rms * 1.2);
        micEnergy += (0.0 - micEnergy) * 0.08;
      } else {
        // Precise noise gate: stays 100% still in room silence
        const gate = Math.max(0.012, ambientNoiseFloor * 1.15);
        let target = 0.0;
        if (rms > gate) {
          // Smoothstep S-curve for silky voice dynamics (zero bottom kick, smooth upper saturation)
          const raw = Math.min(1.0, (rms - gate) / 0.065);
          target = raw * raw * (3.0 - 2.0 * raw);
        }

        // Soft, elastic fluid smoothing: 0.16 attack, 0.065 decay (pure liquid motion, zero sudden kicks)
        const speed = target > micEnergy ? 0.16 : 0.065;
        micEnergy += (target - micEnergy) * speed;
      }
    } else {
      // Smooth graceful glide back to 0.0 on toggle off (zero abrupt snaps)
      micEnergy += (0.0 - micEnergy) * 0.055;
      if (micEnergy < 0.001) {
        micEnergy = 0.0;
        if (micClosing) {
          cleanupMic();
        }
      }
    }

    if (waveMaterial && waveMaterial.uniforms) {
      waveMaterial.uniforms.uProgress.value = p;
      waveMaterial.uniforms.uTime.value = elapsedTime;
      waveMaterial.uniforms.uRippleTime.value = rippleTimeSec;
      waveMaterial.uniforms.uRipplePos.value.set(rippleOriginX, rippleOriginZ);
      waveMaterial.uniforms.uRippleStrength.value = rippleStrength;
      waveMaterial.uniforms.uMicEnergy.value = micEnergy;
    }

    // Update Wave-Dissolving Callouts
    updateSpatialCallouts(p);

    renderer.render(scene, camera);
  }

})();
