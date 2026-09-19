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
  let micDataArray = null;
  let isMicActive = false;
  let micClosing = false;
  let micEnergy = 0.0;
  let ambientRms = 0.003;

  // Spatial Callout DOM elements, cached dimensions & smoothed coords
  const callouts = [];
  const calloutSizes = [
    { width: 580, height: 120 },
    { width: 520, height: 120 },
    { width: 520, height: 120 },
    { width: 280, height: 160 }
  ];
  const smoothedCallouts = [
    { x: W * 0.5 - 290, y: 70 },
    { x: W * 0.65, y: 120 },
    { x: 100, y: 140 },
    { x: W * 0.5 - 140, y: H * 0.5 - 80 }
  ];
  let micHintEl = null;
  const smoothMicHint = { x: W * 0.75, y: H * 0.55 };
  const projVec = new THREE.Vector3();
  const tempV1 = new THREE.Vector3(3.2, 1.6, 0);
  const tempV2 = new THREE.Vector3(-3.0, 1.0, 0);
  const tempV3 = new THREE.Vector3(7.0, -0.35, 0.5);
  const screenPosOut = { x: 0, y: 0, visible: true };
  let isTouchDevice = false;

  // ── 3D SPATIAL WORLD ISLANDS & SWOOP FLIGHT ENGINE ──
  let flightState = 'timeline'; // 'timeline' | 'warping_out' | 'in_section' | 'warping_in'
  let activeSection = null;
  let flightStartTime = 0;
  let flightDuration = 1050; // ms
  let sectionEnterTime = 0;
  let warpSpeed = 0.0;
  let flightTurnSign = 1.0;
  const camFlightStartPos = new THREE.Vector3();
  const camFlightStartLook = new THREE.Vector3();
  const camFlightMidPos = new THREE.Vector3();
  const camFlightEndPos = new THREE.Vector3();
  const camFlightEndLook = new THREE.Vector3();
  const currentLookAt = new THREE.Vector3(0, -0.4, 0);
  const timelineTargetPos = new THREE.Vector3();
  const timelineTargetLook = new THREE.Vector3();
  const targetCamUp = new THREE.Vector3(0, 1, 0);
  const currentCamUp = new THREE.Vector3(0, 1, 0);

  const ISLANDS = {
    about: {
      islandPos: new THREE.Vector3(-46.0, 14.0, -26.0),
      camPos: new THREE.Vector3(-42.0, 14.0, -8.0),
      camLook: new THREE.Vector3(-46.0, 14.0, -26.0),
      tiltYaw: 14.0,
      tiltPitch: -4.0
    },
    privacy: {
      islandPos: new THREE.Vector3(0.0, 48.0, -32.0),
      camPos: new THREE.Vector3(0.0, 42.0, -14.0),
      camLook: new THREE.Vector3(0.0, 48.0, -32.0),
      tiltYaw: 0.0,
      tiltPitch: 14.0
    },
    audience: {
      islandPos: new THREE.Vector3(48.0, 11.0, -26.0),
      camPos: new THREE.Vector3(44.0, 11.0, -8.0),
      camLook: new THREE.Vector3(48.0, 11.0, -26.0),
      tiltYaw: -14.0,
      tiltPitch: -4.0
    },
    download: {
      islandPos: new THREE.Vector3(0.0, -34.0, -12.0),
      camPos: new THREE.Vector3(0.0, -26.0, 6.0),
      camLook: new THREE.Vector3(0.0, -34.0, -12.0),
      tiltYaw: 0.0,
      tiltPitch: -14.0
    }
  };

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function getTimelineCamera(p, outPos, outLook) {
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

    outPos.set(targetX, targetY, targetZ);
    outLook.set(0, lookY, 0);
  }

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
      uniform float uWarpSpeed;

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

        // In silence, wave stays 100% still in original form.
        // During speech, wave gently pulses in place along its natural shape.
        float voicePulse = wave * (uMicEnergy * 0.9);
        p.y += wave + pulse + voicePulse;

        // Hyperspace warp effect during 3D section transition
        if (uWarpSpeed > 0.001) {
          p.z += sin(p.x * 2.5 + p.y * 1.5 + uTime * 10.0) * (uWarpSpeed * 4.0);
          p.x += (p.x * 0.12) * uWarpSpeed;
        }

        if (uRippleStrength > 0.001) {
          float dist = length(p.xz - uRipplePos);
          float rip = sin(dist * 1.1 - uRippleTime * 4.0) * exp(-dist * 0.3) * uRippleStrength * 0.25;
          p.y += rip;
        }

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float size = (38.0 / -mvPosition.z) * uPixelRatio * (1.0 + uMicEnergy * 0.25 + uWarpSpeed * 0.8);
        gl_PointSize = clamp(size, 2.5, 68.0);

        vec3 cDeep  = vec3(0.008, 0.518, 0.780); // #0284C7
        vec3 cSky   = vec3(0.220, 0.741, 0.973); // #38BDF8
        vec3 cMist  = vec3(0.961, 0.973, 0.980); // #F5F8FA
        vec3 cVoice = vec3(0.000, 0.900, 1.000); // Vibrant voice cyan

        float h = clamp((p.y + 4.0) / 8.0, 0.0, 1.0);
        if (h < 0.5) {
          vColor = mix(cDeep, cSky, h * 2.0);
        } else {
          vColor = mix(cSky, cMist, (h - 0.5) * 2.0);
        }

        if (uMicEnergy > 0.01) {
          vColor = mix(vColor, cVoice, clamp(uMicEnergy * 0.65, 0.0, 0.75));
        }

        if (uWarpSpeed > 0.01) {
          vColor = mix(vColor, vec3(0.08, 0.85, 1.0), clamp(uWarpSpeed * 0.65, 0.0, 0.75));
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
        uMicEnergy:      { value: 0.0 },
        uWarpSpeed:      { value: 0.0 }
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    wavePoints = new THREE.Points(waveGeometry, waveMaterial);
    scene.add(wavePoints);
  }

  function measureCallouts() {
    callouts.forEach((el, idx) => {
      if (el) {
        calloutSizes[idx].width = el.offsetWidth || calloutSizes[idx].width;
        calloutSizes[idx].height = el.offsetHeight || calloutSizes[idx].height;
      }
    });
  }

  function initCallouts() {
    for (let i = 0; i <= 3; i++) {
      const el = document.getElementById(`callout-${i}`);
      if (el) callouts.push(el);
    }
    micHintEl = document.getElementById('mic-hint');

    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (W < 768);
    if (isTouchDevice && micHintEl) {
      micHintEl.textContent = '(нажми сюда)';
      micHintEl.title = 'нажмите для голосовой анимации';
    }

    measureCallouts();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureCallouts).catch(() => {});
    }
  }

  function toScreenPosition(worldPos) {
    projVec.copy(worldPos);
    projVec.project(camera);
    screenPosOut.x = (projVec.x * 0.5 + 0.5) * W;
    screenPosOut.y = (-(projVec.y * 0.5) + 0.5) * H;
    screenPosOut.visible = projVec.z < 1.0;
    return screenPosOut;
  }

  // ── PRECISE MULTI-STAGE WAVE-DISSOLVING TEXT ENGINE ──
  function updateSpatialCallouts(p) {
    let timelineAlpha = 1.0;
    if (flightState === 'warping_out' || flightState === 'in_section') {
      timelineAlpha = 0.0;
    } else if (flightState === 'warping_in') {
      const elapsed = performance.now() - flightStartTime;
      const rawT = Math.min(1.0, elapsed / flightDuration);
      timelineAlpha = Math.max(0.0, Math.min(1.0, (rawT - 0.45) / 0.55));
    }

    callouts.forEach((el, idx) => {
      let opacity = 0;
      let exitFraction = 0;

      if (timelineAlpha > 0.0) {
        if (idx === 0) {
          // Hero stage: 100% visible right from p = 0.0!
          if (p <= 0.35) {
            opacity = timelineAlpha;
            exitFraction = 1.0 - timelineAlpha;
          } else if (p <= 0.65) {
            const t = (p - 0.35) / 0.30;
            exitFraction = Math.max(t, 1.0 - timelineAlpha);
            opacity = Math.max(0.0, (1.0 - t * 1.5) * timelineAlpha);
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
      } else {
        opacity = 0;
        exitFraction = 1.0;
      }

      // Base 3D target coordinates (fully adaptive, zero layout thrashing)
      let targetX, targetY;
      const isMobile = W < 768;

      if (idx === 0) {
        // Stage 0 (Hero): Centered horizontally
        const cWidth = Math.min(calloutSizes[0].width, W - 32);
        targetX = Math.max(16, (W - cWidth) * 0.5);
        targetY = isMobile ? Math.max(20, H * 0.08) : Math.max(45, Math.min(110, H * 0.12));
      } else if (idx === 1) {
        // Stage 1 (Sphere): Clean right placement on desktop, centered on mobile
        if (isMobile) {
          const cWidth = Math.min(calloutSizes[1].width, W - 32);
          targetX = Math.max(16, (W - cWidth) * 0.5);
          targetY = Math.max(24, H * 0.09);
        } else {
          const pos = toScreenPosition(tempV1);
          targetX = Math.min(W - calloutSizes[1].width - 24, Math.max(24, pos.x + 20));
          targetY = Math.max(60, pos.y - 100);
        }
      } else if (idx === 2) {
        // Stage 2 (Helix): Clean left placement on desktop, centered on mobile
        if (isMobile) {
          const cWidth = Math.min(calloutSizes[2].width, W - 32);
          targetX = Math.max(16, (W - cWidth) * 0.5);
          targetY = Math.max(24, H * 0.09);
        } else {
          const pos = toScreenPosition(tempV2);
          targetX = Math.max(24, Math.min(W - calloutSizes[2].width - 24, pos.x - 480));
          targetY = Math.max(60, pos.y - 90);
        }
      } else {
        // Stage 3 (Finale): Perfectly centered horizontally and vertically
        const cw = calloutSizes[3].width;
        const ch = calloutSizes[3].height;
        targetX = Math.max(16, (W - cw) * 0.5);
        targetY = Math.max(24, (H - ch) * 0.5);
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

      if (timelineAlpha > 0.0) {
        if (p <= 0.35) {
          micOpacity = timelineAlpha;
          micExitFraction = 1.0 - timelineAlpha;
        } else if (p <= 0.65) {
          const t = (p - 0.35) / 0.30;
          micExitFraction = Math.max(t, 1.0 - timelineAlpha);
          micOpacity = Math.max(0.0, (1.0 - t * 1.5) * timelineAlpha);
        } else {
          micOpacity = 0;
          micExitFraction = 1.0;
        }
      } else {
        micOpacity = 0;
        micExitFraction = 1.0;
      }

      // Responsive 3D Anchor for mic note
      let targetX, targetY;
      if (W < 768) {
        targetX = Math.max(16, (W - 170) * 0.5);
        targetY = H - 75;
      } else {
        const pos = toScreenPosition(tempV3);
        targetX = Math.min(W - 200, Math.max(W * 0.55, pos.x));
        targetY = Math.max(80, Math.min(H - 120, pos.y - 45));
      }

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

  // ── 3D SPATIAL SWOOP & BANK FLIGHT CONTROLS ──
  function smootherstep(t) {
    const c = Math.max(0.0, Math.min(1.0, t));
    return c * c * c * (c * (c * 6.0 - 15.0) + 10.0);
  }

  function startFlightTo(targetCamPos, targetCamLook, targetState, onArriveSection) {
    camFlightStartPos.copy(camera.position);
    camFlightStartLook.copy(currentLookAt);

    camFlightEndPos.copy(targetCamPos);
    camFlightEndLook.copy(targetCamLook);

    // Calculate mid-flight apex arc for high-speed swoop
    const dist = camFlightStartPos.distanceTo(camFlightEndPos);
    camFlightMidPos.addVectors(camFlightStartPos, camFlightEndPos).multiplyScalar(0.5);
    const arcHeight = Math.min(11.0, Math.max(3.5, dist * 0.20));
    camFlightMidPos.y += arcHeight;
    camFlightMidPos.z += arcHeight * 0.3;

    // Banking direction based on lateral translation
    const dx = camFlightEndPos.x - camFlightStartPos.x;
    flightTurnSign = Math.abs(dx) > 1.5 ? Math.sign(dx) : (Math.sign(camFlightEndPos.y - camFlightStartPos.y) || 1.0);
    flightDuration = Math.min(1350, Math.max(900, dist * 22));

    flightStartTime = performance.now();
    flightState = targetState;
    if (onArriveSection !== undefined) {
      activeSection = onArriveSection;
    }
  }

  function openSection(sectionKey) {
    if (!ISLANDS[sectionKey]) return;

    if (flightState === 'in_section' && activeSection === sectionKey) {
      closeSection();
      return;
    }

    const island = ISLANDS[sectionKey];

    // Update active nav pill
    document.querySelectorAll('.nav-pill').forEach(pill => {
      if (pill.getAttribute('data-section') === sectionKey) {
        pill.classList.add('is-active');
      } else {
        pill.classList.remove('is-active');
      }
    });

    startFlightTo(island.camPos, island.camLook, 'warping_out', sectionKey);
  }

  function closeSection() {
    if (flightState === 'timeline' || flightState === 'warping_in') return;

    document.querySelectorAll('.nav-pill').forEach(pill => pill.classList.remove('is-active'));
    getTimelineCamera(smoothProgress, timelineTargetPos, timelineTargetLook);

    startFlightTo(timelineTargetPos, timelineTargetLook, 'warping_in', null);
  }

  function update3DSpatialIslands() {
    const isSectionActive = flightState === 'in_section' || flightState === 'warping_out';
    const hud = document.getElementById('spatial-hud');
    if (hud) {
      if (isSectionActive) {
        hud.classList.add('is-active');
      } else {
        hud.classList.remove('is-active');
      }
    }

    Object.keys(ISLANDS).forEach(key => {
      const island = ISLANDS[key];
      const el = document.getElementById(`island-${key}`);
      if (!el) return;

      projVec.copy(island.islandPos);
      projVec.project(camera);

      const inFront = projVec.z < 1.0;
      const screenX = (projVec.x * 0.5 + 0.5) * W;
      const screenY = (-projVec.y * 0.5 + 0.5) * H;

      const dist = camera.position.distanceTo(island.islandPos);
      // Perspective depth scaling
      const baseScale = Math.max(0.12, Math.min(1.25, 20.0 / Math.max(dist, 0.1)));

      const relCamX = camera.position.x - island.islandPos.x;
      const relCamY = camera.position.y - island.islandPos.y;
      const dynamicYaw = island.tiltYaw + relCamX * 0.16;
      const dynamicPitch = island.tiltPitch - relCamY * 0.16;

      el.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${baseScale.toFixed(3)}) rotateY(${dynamicYaw.toFixed(1)}deg) rotateX(${dynamicPitch.toFixed(1)}deg)`;

      if (inFront && activeSection === key && (flightState === 'in_section' || (flightState === 'warping_out' && dist < 32.0))) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    });
  }

  let toastTimer = null;
  function showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function bindEvents() {
    window.addEventListener('resize', () => {
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      measureCallouts();
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
      // Don't trigger ripple if clicking nav, HUD or spatial stage
      if (e.target.closest('.site-header') || e.target.closest('.spatial-3d-stage') || e.target.closest('.spatial-island-hud')) return;
      triggerCalmRipple(e.clientX, e.clientY);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && flightState !== 'timeline') {
        e.preventDefault();
        closeSection();
        return;
      }

      // Ctrl + ~ / Cmd + ~ on macOS / Ctrl + ё
      const isModKey = e.ctrlKey || e.metaKey;
      if (isModKey && (e.code === 'Backquote' || e.key === '`' || e.key === '~' || e.key === 'ё' || e.key === 'Ё' || e.keyCode === 192)) {
        e.preventDefault();
        toggleMicrophone();
        return;
      }

      if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        triggerCalmRipple(W * 0.5, H * 0.5);
      }
    });

    // Nav pills click handlers
    document.querySelectorAll('.nav-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const secKey = pill.getAttribute('data-section');
        openSection(secKey);
      });
    });

    // Section Back button handler
    const backBtn = document.getElementById('section-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeSection();
      });
    }

    // Backdrop click on spatial stage (outside card and HUD)
    const stage = document.getElementById('spatial-stage');
    if (stage) {
      stage.addEventListener('click', (e) => {
        if (!e.target.closest('.island-card') && !e.target.closest('.spatial-island-hud')) {
          closeSection();
        }
      });
    }

    // Section Download Cards Buttons
    const sWin = document.getElementById('sec-dl-win');
    if (sWin) sWin.addEventListener('click', (e) => { e.preventDefault(); showToast('загрузка «говори» для windows начнется через секунду'); });
    const sMac = document.getElementById('sec-dl-mac');
    if (sMac) sMac.addEventListener('click', (e) => { e.preventDefault(); showToast('загрузка «говори» для macos начнется через секунду'); });
    const sLinux = document.getElementById('sec-dl-linux');
    if (sLinux) sLinux.addEventListener('click', (e) => { e.preventDefault(); showToast('загрузка «говори» для linux начнется через секунду'); });

    const micHint = document.getElementById('mic-hint');
    if (micHint) {
      micHint.addEventListener('click', () => {
        toggleMicrophone();
      });
      micHint.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          toggleMicrophone();
        }
      });
    }

    const dlWin = document.getElementById('dl-win');
    if (dlWin) {
      dlWin.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('загрузка «говори» для windows начнется через секунду');
      });
    }

    const dlMac = document.getElementById('dl-mac');
    if (dlMac) {
      dlMac.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('загрузка «говори» для macos начнется через секунду');
      });
    }

    const dlLinux = document.getElementById('dl-linux');
    if (dlLinux) {
      dlLinux.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('загрузка «говори» для linux начнется через секунду');
      });
    }
  }

  // ── LIVE MICROPHONE AUDIO ANALYSIS ──
  async function toggleMicrophone() {
    const hintEl = document.getElementById('mic-hint');

    if (isMicActive) {
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

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      ambientRms = 0.003;

      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      micDataArray = new Float32Array(analyser.fftSize);
      isMicActive = true;

      if (hintEl) {
        hintEl.classList.add('is-listening');
      }
    } catch (err) {
      console.warn('mic access error:', err);
      if (location.protocol === 'file:') {
        alert('для работы микрофона откройте сайт через http://localhost:5173 (браузеры блокируют микрофон на file://)');
      }
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
    micDataArray = null;
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

    // ── CAMERA POSITIONING & 3D SPATIAL SWOOP STATE MACHINE ──
    currentCamUp.lerp(targetCamUp, 0.08);
    camera.up.copy(currentCamUp);

    if (flightState === 'timeline') {
      getTimelineCamera(p, timelineTargetPos, timelineTargetLook);

      camera.position.x = timelineTargetPos.x + currentCamX;
      camera.position.y = timelineTargetPos.y + currentCamY;
      camera.position.z = timelineTargetPos.z;
      targetCamUp.set(0, 1, 0);
      currentLookAt.copy(timelineTargetLook);
      camera.lookAt(currentLookAt);
      warpSpeed = 0.0;
    } else if (flightState === 'warping_out') {
      const elapsed = performance.now() - flightStartTime;
      const rawT = Math.min(1.0, elapsed / flightDuration);
      const easeT = smootherstep(rawT);
      warpSpeed = Math.sin(rawT * Math.PI);

      // Quadratic Bezier arc in 3D world space
      const oneMinusT = 1.0 - easeT;
      const mouseBlend = (1.0 - Math.sin(rawT * Math.PI)) * 0.15;
      camera.position.x = oneMinusT * oneMinusT * camFlightStartPos.x + 2.0 * oneMinusT * easeT * camFlightMidPos.x + easeT * easeT * camFlightEndPos.x + currentCamX * mouseBlend;
      camera.position.y = oneMinusT * oneMinusT * camFlightStartPos.y + 2.0 * oneMinusT * easeT * camFlightMidPos.y + easeT * easeT * camFlightEndPos.y + currentCamY * mouseBlend;
      camera.position.z = oneMinusT * oneMinusT * camFlightStartPos.z + 2.0 * oneMinusT * easeT * camFlightMidPos.z + easeT * easeT * camFlightEndPos.z;

      // Dynamic banking roll into the turn
      const bankRoll = Math.sin(rawT * Math.PI) * flightTurnSign * 0.08;
      targetCamUp.set(Math.sin(bankRoll), Math.cos(bankRoll), 0);

      currentLookAt.lerpVectors(camFlightStartLook, camFlightEndLook, easeT);
      camera.lookAt(currentLookAt);

      if (rawT >= 1.0) {
        flightState = 'in_section';
        sectionEnterTime = performance.now();
        warpSpeed = 0.0;
        targetCamUp.set(0, 1, 0);
      }
    } else if (flightState === 'in_section') {
      warpSpeed = 0.0;
      targetCamUp.set(0, 1, 0);
      const island = ISLANDS[activeSection];
      if (island) {
        const inSecTime = (performance.now() - sectionEnterTime) * 0.001;
        const floatBlend = Math.min(1.0, inSecTime * 1.5);
        const floatX = Math.sin(inSecTime * 0.6) * 0.25 * floatBlend;
        const floatY = Math.sin(inSecTime * 0.8) * 0.30 * floatBlend;

        camera.position.set(
          island.camPos.x + floatX + currentCamX * 0.3,
          island.camPos.y + floatY + currentCamY * 0.3,
          island.camPos.z
        );

        currentLookAt.set(
          island.camLook.x + currentCamX * 0.08,
          island.camLook.y + currentCamY * 0.08,
          island.camLook.z
        );
        camera.lookAt(currentLookAt);
      }
    } else if (flightState === 'warping_in') {
      const elapsed = performance.now() - flightStartTime;
      const rawT = Math.min(1.0, elapsed / flightDuration);
      const easeT = smootherstep(rawT);
      warpSpeed = Math.sin(rawT * Math.PI);

      // Re-evaluate latest smooth timeline target position
      getTimelineCamera(p, camFlightEndPos, camFlightEndLook);

      // Smooth Bezier return arc to timeline
      const oneMinusT = 1.0 - easeT;
      const mouseBlend = (1.0 - Math.sin(rawT * Math.PI)) * 0.15;
      camera.position.x = oneMinusT * oneMinusT * camFlightStartPos.x + 2.0 * oneMinusT * easeT * camFlightMidPos.x + easeT * easeT * camFlightEndPos.x + currentCamX * mouseBlend;
      camera.position.y = oneMinusT * oneMinusT * camFlightStartPos.y + 2.0 * oneMinusT * easeT * camFlightMidPos.y + easeT * easeT * camFlightEndPos.y + currentCamY * mouseBlend;
      camera.position.z = oneMinusT * oneMinusT * camFlightStartPos.z + 2.0 * oneMinusT * easeT * camFlightMidPos.z + easeT * easeT * camFlightEndPos.z;

      // Inverse banking roll back to level horizon
      const bankRoll = -Math.sin(rawT * Math.PI) * flightTurnSign * 0.07;
      targetCamUp.set(Math.sin(bankRoll), Math.cos(bankRoll), 0);

      currentLookAt.lerpVectors(camFlightStartLook, camFlightEndLook, easeT);
      camera.lookAt(currentLookAt);

      if (rawT >= 1.0) {
        flightState = 'timeline';
        activeSection = null;
        warpSpeed = 0.0;
        targetCamUp.set(0, 1, 0);
      }
    }

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

    // Speech detection via float time-domain RMS with ambient thresholding
    if (isMicActive && analyser && micDataArray) {
      analyser.getFloatTimeDomainData(micDataArray);

      let sumSq = 0;
      for (let i = 0; i < micDataArray.length; i++) {
        const val = micDataArray[i];
        sumSq += val * val;
      }
      const rms = Math.sqrt(sumSq / micDataArray.length);

      // Track ambient background noise in quiet periods
      if (rms < 0.015) {
        ambientRms = ambientRms * 0.95 + rms * 0.05;
      }

      // Voice threshold: speech must distinctly exceed ambient noise floor
      const threshold = Math.max(0.022, ambientRms * 3.5);

      let target = 0.0;
      if (rms > threshold) {
        const delta = rms - threshold;
        const raw = Math.min(1.0, delta / 0.08);
        target = Math.pow(raw, 0.85);
      }

      if (target > 0.0) {
        micEnergy += (target - micEnergy) * 0.25;
      } else {
        micEnergy *= 0.78;
        if (micEnergy < 0.001) {
          micEnergy = 0.0;
        }
      }
    } else {
      micEnergy *= 0.78;
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
      waveMaterial.uniforms.uWarpSpeed.value = warpSpeed;
    }

    // Update Wave-Dissolving Callouts
    updateSpatialCallouts(p);

    // Update 3D Spatial Islands Perspective Projection
    update3DSpatialIslands();

    renderer.render(scene, camera);
  }

})();
