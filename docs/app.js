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
  const currentBasePos = new THREE.Vector3(0, 0.5, 17.5);
  const currentBaseLook = new THREE.Vector3(0, -0.4, 0);
  const currentParallaxPosScale = { x: 1.0, y: 1.0 };
  const currentParallaxLookScale = { x: 0.0, y: 0.0 };
  const flightStartParallaxPos = { x: 1.0, y: 1.0 };
  const flightStartParallaxLook = { x: 0.0, y: 0.0 };
  const timelineTargetPos = new THREE.Vector3();
  const timelineTargetLook = new THREE.Vector3();
  const targetCamUp = new THREE.Vector3(0, 1, 0);
  const currentCamUp = new THREE.Vector3(0, 1, 0);

  let currentWaveP = 0.0;
  let flightStartWaveP = 0.0;
  let flightEndWaveP = 0.0;

  let currentMorphAbout = 0.0;
  let currentMorphPrivacy = 0.0;
  let currentMorphAudience = 0.0;
  let currentMorphDownload = 0.0;
  const flightStartMorphs = {
    about: 0.0,
    privacy: 0.0,
    audience: 0.0,
    download: 0.0
  };

  const ISLANDS = {
    about: {
      targetP: 0.6,
      islandPos: new THREE.Vector3(0.0, 0.4, 4.0),
      camPos: new THREE.Vector3(-3.8, 1.2, 14.8),
      camLook: new THREE.Vector3(0.6, -0.2, 0.0),
      tiltYaw: 3.5,
      tiltPitch: -2.0
    },
    privacy: {
      targetP: 1.35,
      islandPos: new THREE.Vector3(0.0, 0.6, 3.8),
      camPos: new THREE.Vector3(0.0, 2.8, 14.6),
      camLook: new THREE.Vector3(0.0, -0.4, 0.0),
      tiltYaw: 0.0,
      tiltPitch: 4.0
    },
    audience: {
      targetP: 2.1,
      islandPos: new THREE.Vector3(0.0, 0.4, 4.0),
      camPos: new THREE.Vector3(3.8, 1.4, 14.8),
      camLook: new THREE.Vector3(-0.6, -0.2, 0.0),
      tiltYaw: -3.5,
      tiltPitch: -2.0
    },
    download: {
      targetP: 2.85,
      islandPos: new THREE.Vector3(0.0, 0.3, 4.2),
      camPos: new THREE.Vector3(0.0, -0.6, 15.2),
      camLook: new THREE.Vector3(0.0, 0.4, 0.0),
      tiltYaw: 0.0,
      tiltPitch: -3.0
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

    const posAbout = new Float32Array(N * 3);
    const posPrivacy = new Float32Array(N * 3);
    const posAudience = new Float32Array(N * 3);
    const posDownload = new Float32Array(N * 3);

    const cols = 150;
    const rows = 120;
    const goldenAngle = 2.399963229728653;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;

      // ====================================================================
      // TIMELINE STAGE 0: ЖИВАЯ РЕЧЕВАЯ ВОЛНА
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
      // TIMELINE STAGE 1: СФЕРА ГОЛОСА / ИИ-МОЗГ
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
      // TIMELINE STAGE 2: ГАРМОНИЧЕСКАЯ СПИРАЛЬ
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
      // TIMELINE STAGE 3: КОНЦЕНТРИЧЕСКИЙ РЕЗОНАНС
      // ====================================================================
      const ringIdx = i % 8;
      const ringPos = Math.floor(i / 8) / (N / 8);
      const ringAngle = ringPos * Math.PI * 2.0;
      const baseRadius = 2.4 + ringIdx * 2.0;
      const waveHeight = Math.sin(ringAngle * 4.0 + ringIdx * 1.2) * (0.4 + ringIdx * 0.2);

      pos3[i3]     = Math.cos(ringAngle) * baseRadius;
      pos3[i3 + 1] = waveHeight;
      pos3[i3 + 2] = Math.sin(ringAngle) * baseRadius * 0.65;

      // ====================================================================
      // SECTION OBJECT 1: 3D СТУДИЙНЫЙ МИКРОФОН («О ПРОЕКТЕ»)
      // ====================================================================
      let mx = 0, my = 0, mz = 0;
      if (i < 7000) {
        // Microphone Grille Capsule (Mesh head dome & cylinder)
        const t = i / 7000;
        const phi = Math.acos(1.0 - 2.0 * t);
        const theta = i * goldenAngle;
        const R = 1.65;
        if (phi < Math.PI * 0.45) {
          mx = Math.sin(phi) * Math.cos(theta) * R;
          my = 1.8 + Math.cos(phi) * R * 1.1;
          mz = Math.sin(phi) * Math.sin(theta) * R;
        } else {
          const cyH = (phi - Math.PI * 0.45) / (Math.PI * 0.55);
          mx = Math.cos(theta) * R;
          my = 1.8 - cyH * 1.5;
          mz = Math.sin(theta) * R;
        }
        const meshPattern = Math.sin(mx * 16.0) * Math.cos(my * 16.0) * 0.04;
        mx += meshPattern;
        mz += meshPattern;
      } else if (i < 10500) {
        // Cylindrical microphone body / handle
        const t = (i - 7000) / 3500;
        const theta = i * goldenAngle;
        const cyY = 0.3 - t * 1.9;
        const taperR = 1.45 - t * 0.25;
        mx = Math.cos(theta) * taperR;
        my = cyY;
        mz = Math.sin(theta) * taperR;
      } else if (i < 14000) {
        // Shockmount ring & cross-bars
        const t = (i - 10500) / 3500;
        if (t < 0.75) {
          const ringR = (i % 2 === 0) ? 2.7 : 2.1;
          const theta = (t / 0.75) * Math.PI * 2.0;
          mx = Math.cos(theta) * ringR;
          my = 0.0 + Math.sin(theta * 6.0) * 0.1;
          mz = Math.sin(theta) * ringR;
        } else {
          const cordIdx = i % 4;
          const cordAngle = cordIdx * (Math.PI * 0.5) + Math.PI * 0.25;
          const prog = (t - 0.75) / 0.25;
          const rCord = 1.35 + prog * 1.05;
          mx = Math.cos(cordAngle) * rCord;
          my = -0.3 + prog * 0.6;
          mz = Math.sin(cordAngle) * rCord;
        }
      } else {
        // Stem & Circular Weighted Desk Stand
        const t = (i - 14000) / 4000;
        if (t < 0.35) {
          const theta = i * goldenAngle;
          const rodY = -1.6 - (t / 0.35) * 1.6;
          const rodR = 0.28;
          mx = Math.cos(theta) * rodR;
          my = rodY;
          mz = Math.sin(theta) * rodR;
        } else {
          const baseT = (t - 0.35) / 0.65;
          const rBase = Math.sqrt(baseT) * 2.5;
          const theta = i * goldenAngle;
          mx = Math.cos(theta) * rBase;
          my = -3.2 - (1.0 - baseT) * 0.2;
          mz = Math.sin(theta) * rBase;
        }
      }
      posAbout[i3]     = mx;
      posAbout[i3 + 1] = my;
      posAbout[i3 + 2] = mz;

      // ====================================================================
      // SECTION OBJECT 2: 3D ЩИТ И НАВЕСНОЙ ЗАМОК («ПРИВАТНОСТЬ»)
      // ====================================================================
      let sx = 0, sy = 0, sz = 0;
      if (i < 11500) {
        // The 3D Curved Security Shield
        const t = i / 11500;
        const v = Math.pow(t, 0.75);
        const yNorm = -3.5 + v * 6.6;
        const uVal = (Math.sin(i * 3.71) * 0.5 + 0.5) * 2.0 - 1.0;

        let maxW;
        if (v < 0.6) {
          maxW = 3.0 * Math.sin(v / 0.6 * (Math.PI * 0.5));
        } else {
          const topT = (v - 0.6) / 0.4;
          maxW = 3.0 * (1.0 - topT * topT * 0.18);
        }

        const crest = (v > 0.88) ? Math.cos(uVal * Math.PI) * 0.3 : 0.0;
        sy = yNorm + crest;
        sx = uVal * maxW;

        const curveFactor = Math.max(0.0, 1.0 - (sx * sx) / 9.5 - (sy * sy) / 16.0);
        sz = curveFactor * 0.8;
        if (Math.abs(uVal) > 0.8) {
          sz += 0.25;
        }
      } else if (i < 15000) {
        // Padlock Body
        const pX = ((i % 50) / 49 - 0.5) * 2.0 * 1.0;
        const pY = -0.7 + ((Math.floor(i / 50) % 40) / 39) * 1.1;
        const pZ = 1.0 + ((i % 7) / 6 - 0.5) * 0.6;

        const isKeyhole = (Math.abs(pX) < 0.18 && pY < 0.0 && pY > -0.5) ||
                          (pX * pX + (pY + 0.05) * (pY + 0.05) < 0.06);
        if (isKeyhole) {
          sx = pX * 1.6;
          sy = pY;
          sz = 0.7;
        } else {
          sx = pX;
          sy = pY;
          sz = pZ;
        }
      } else {
        // Padlock Shackle
        const t = (i - 15000) / 3000;
        const theta = t * Math.PI;
        const archR = 0.72;
        const tubeR = 0.18;
        const tubeTheta = i * goldenAngle;

        const arcX = Math.cos(theta) * archR;
        const arcY = 0.4 + Math.sin(theta) * archR * 1.15;
        sx = arcX + Math.cos(tubeTheta) * tubeR;
        sy = arcY;
        sz = 1.0 + Math.sin(tubeTheta) * tubeR;
      }
      posPrivacy[i3]     = sx;
      posPrivacy[i3 + 1] = sy;
      posPrivacy[i3 + 2] = sz;

      // ====================================================================
      // SECTION OBJECT 3: 3D НЕЙРОННЫЙ МОЗГ И РАЗУМ («ДЛЯ КОГО»)
      // ====================================================================
      let bx = 0, by = 0, bz = 0;
      if (i < 13500) {
        const side = (i % 2 === 0) ? 1.0 : -1.0;
        const t = i / 13500;
        const phi = Math.acos(1.0 - 2.0 * t);
        const theta = i * goldenAngle;

        const rx = 1.65;
        const ry = 1.95;
        const rz = 2.45;

        const gyri = 0.14 * Math.sin(theta * 9.0) * Math.cos(phi * 8.0) +
                     0.08 * Math.sin(theta * 18.0) +
                     0.06 * Math.cos(phi * 14.0);

        const rMod = 1.0 + gyri;
        bx = side * (0.45 + Math.sin(phi) * Math.abs(Math.cos(theta)) * rx * rMod);
        by = 0.4 + Math.cos(phi) * ry * rMod;
        bz = Math.sin(phi) * Math.sin(theta) * rz * rMod;

        if (by < 0.0 && bz > 0.0) {
          bx *= 0.9;
        }
      } else if (i < 16000) {
        const t = (i - 13500) / 2500;
        if (t < 0.6) {
          const side = (i % 2 === 0) ? 1.0 : -1.0;
          const theta = i * goldenAngle;
          const crR = 0.85;
          bx = side * (0.6 + Math.cos(theta) * crR * 0.6);
          by = -1.2 + Math.sin(theta) * crR * 0.5;
          bz = -1.2 + Math.sin(theta * 2.0) * crR * 0.5;
        } else {
          const stemT = (t - 0.6) / 0.4;
          const theta = i * goldenAngle;
          bx = Math.cos(theta) * 0.35;
          by = -1.2 - stemT * 1.8;
          bz = -0.4 + Math.sin(theta) * 0.35;
        }
      } else {
        const t = (i - 16000) / 2000;
        const angle = t * Math.PI * 8.0;
        const rOrbit = 2.8 + Math.sin(i * 3.1) * 0.6;
        bx = Math.cos(angle) * rOrbit;
        by = 0.4 + Math.sin(i * 1.7) * 2.2;
        bz = Math.sin(angle) * rOrbit;
      }
      posAudience[i3]     = bx;
      posAudience[i3 + 1] = by;
      posAudience[i3 + 2] = bz;

      // ====================================================================
      // SECTION OBJECT 4: 3D СТРЕЛКА СКАЧИВАНИЯ И ДОК-СТАНЦИЯ («СКАЧАТЬ»)
      // ====================================================================
      let dx = 0, dy = 0, dz = 0;
      if (i < 11000) {
        const t = i / 11000;
        const depth = ((i % 16) / 15 - 0.5) * 1.4;

        if (t < 0.45) {
          const stemT = t / 0.45;
          const stemX = ((i % 30) / 29 - 0.5) * 2.0 * 0.85;
          dx = stemX;
          dy = 0.6 + stemT * 2.6;
          dz = depth;
        } else {
          const headT = (t - 0.45) / 0.55;
          const yHead = 0.6 - headT * 1.8;
          const wingW = 2.5 * (1.0 - headT);
          const uVal = ((i % 40) / 39 - 0.5) * 2.0;
          dx = uVal * wingW;
          dy = yHead;
          dz = depth * (1.0 - headT * 0.3);
        }
      } else {
        const t = (i - 11000) / 7000;
        if (t < 0.65) {
          const ringIdx = i % 4;
          const rRing = 0.8 + ringIdx * 0.85;
          const theta = (t / 0.65) * Math.PI * 2.0 + (i % 5);
          dx = Math.cos(theta) * rRing;
          dy = -2.6 + Math.sin(theta * 4.0) * 0.08;
          dz = Math.sin(theta) * rRing * 0.75;
        } else {
          const bracketIdx = i % 2;
          const sign = (bracketIdx === 0) ? -1.0 : 1.0;
          const prog = (t - 0.65) / 0.35;
          const bTheta = (prog - 0.5) * (Math.PI * 0.6);
          dx = sign * (3.3 + Math.cos(bTheta) * 0.4);
          dy = -2.6 + prog * 1.4;
          dz = Math.sin(bTheta) * 2.2;
        }
      }
      posDownload[i3]     = dx;
      posDownload[i3 + 1] = dy;
      posDownload[i3 + 2] = dz;
    }

    waveGeometry = new THREE.BufferGeometry();
    waveGeometry.setAttribute('position', new THREE.BufferAttribute(pos0, 3));
    waveGeometry.setAttribute('pos0', new THREE.BufferAttribute(pos0, 3));
    waveGeometry.setAttribute('pos1', new THREE.BufferAttribute(pos1, 3));
    waveGeometry.setAttribute('pos2', new THREE.BufferAttribute(pos2, 3));
    waveGeometry.setAttribute('pos3', new THREE.BufferAttribute(pos3, 3));

    // Thematic 3D Section Object Attributes
    waveGeometry.setAttribute('posAbout', new THREE.BufferAttribute(posAbout, 3));
    waveGeometry.setAttribute('posPrivacy', new THREE.BufferAttribute(posPrivacy, 3));
    waveGeometry.setAttribute('posAudience', new THREE.BufferAttribute(posAudience, 3));
    waveGeometry.setAttribute('posDownload', new THREE.BufferAttribute(posDownload, 3));

    // ── GLSL SHADER: CELESTIAL SKY BLUE & ICE MIST ──
    const vertexShader = `
      attribute vec3 pos0;
      attribute vec3 pos1;
      attribute vec3 pos2;
      attribute vec3 pos3;

      attribute vec3 posAbout;
      attribute vec3 posPrivacy;
      attribute vec3 posAudience;
      attribute vec3 posDownload;

      uniform float uProgress;
      uniform float uMorphAbout;
      uniform float uMorphPrivacy;
      uniform float uMorphAudience;
      uniform float uMorphDownload;

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
        vec3 pTimeline;

        if (pVal < 1.0) {
          float t = ease(0.0, 1.0, pVal);
          pTimeline = mix(pos0, pos1, t);
        } else if (pVal < 2.0) {
          float t = ease(1.0, 2.0, pVal);
          pTimeline = mix(pos1, pos2, t);
        } else {
          float t = ease(2.0, 3.0, pVal);
          pTimeline = mix(pos2, pos3, t);
        }

        // 3D Thematic Section Object Morphing
        float totalMorph = uMorphAbout + uMorphPrivacy + uMorphAudience + uMorphDownload;
        vec3 pObject = posAbout * uMorphAbout +
                       posPrivacy * uMorphPrivacy +
                       posAudience * uMorphAudience +
                       posDownload * uMorphDownload;

        if (totalMorph > 0.001) {
          pObject /= totalMorph;
        }

        float morphFactor = clamp(totalMorph, 0.0, 1.0);
        vec3 p = mix(pTimeline, pObject, morphFactor);

        // Wave motion dampens when morphed into solid 3D objects, but preserves organic breathing
        float waveFactor = max(0.0, 1.0 - pVal * 0.7) * (1.0 - morphFactor * 0.85);
        float wave = sin(p.x * 0.28 + uTime * 1.4 + p.z * 0.18) * 0.45 * waveFactor;
        float pulse = sin(uTime * 1.8 + length(p) * 0.5) * (0.08 + 0.06 * morphFactor);

        // Voice reactivity: reacts in silence vs active speech
        float voicePulse = (wave + sin(uTime * 3.5 + p.y * 1.8) * 0.18) * (uMicEnergy * 1.1);
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

        float size = (38.0 / -mvPosition.z) * uPixelRatio * (1.0 + uMicEnergy * 0.25 + uWarpSpeed * 0.8 + morphFactor * 0.15);
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

        if (morphFactor > 0.01) {
          vColor = mix(vColor, cSky, morphFactor * 0.25);
        }

        float distFog = clamp((-mvPosition.z - 10.0) / 38.0, 0.0, 1.0);
        vAlpha = (1.0 - distFog * 0.65) * (0.85 + morphFactor * 0.15);
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
        uMorphAbout:     { value: 0.0 },
        uMorphPrivacy:   { value: 0.0 },
        uMorphAudience:  { value: 0.0 },
        uMorphDownload:  { value: 0.0 },
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
    if (flightState === 'warping_out') {
      const elapsed = performance.now() - flightStartTime;
      const rawT = Math.min(1.0, elapsed / flightDuration);
      // Smoothly fade out callouts in the first 35% of the flight (approx 480ms)
      timelineAlpha = Math.max(0.0, 1.0 - rawT / 0.35);
    } else if (flightState === 'in_section') {
      timelineAlpha = 0.0;
    } else if (flightState === 'warping_in') {
      const elapsed = performance.now() - flightStartTime;
      const rawT = Math.min(1.0, elapsed / flightDuration);
      timelineAlpha = Math.max(0.0, Math.min(1.0, (rawT - 0.45) / 0.55));
    }

    callouts.forEach((el, idx) => {
      let baseOpacity = 0;
      let baseExit = 0;

      if (idx === 0) {
        // Hero stage: 100% visible right from p = 0.0!
        if (p <= 0.35) {
          baseOpacity = 1.0;
          baseExit = 0.0;
        } else if (p <= 0.65) {
          const t = (p - 0.35) / 0.30;
          baseExit = t;
          baseOpacity = Math.max(0.0, 1.0 - t * 1.5);
        } else {
          baseOpacity = 0;
          baseExit = 1.0;
        }
      } else if (idx === 1) {
        // Stage 1 (Sphere): enters 0.65..0.95, stays 0.95..1.35, exits 1.35..1.65
        if (p >= 0.65 && p <= 1.65) {
          if (p < 0.95) {
            const t = (p - 0.65) / 0.30;
            baseOpacity = t;
            baseExit = 1.0 - t;
          } else if (p <= 1.35) {
            baseOpacity = 1.0;
            baseExit = 0.0;
          } else {
            const t = (p - 1.35) / 0.30;
            baseExit = t;
            baseOpacity = Math.max(0.0, 1.0 - t * 1.5);
          }
        } else {
          baseOpacity = 0;
          baseExit = 1.0;
        }
      } else if (idx === 2) {
        // Stage 2 (Helix): enters 1.65..1.95, stays 1.95..2.25, exits 2.25..2.55
        if (p >= 1.65 && p <= 2.55) {
          if (p < 1.95) {
            const t = (p - 1.65) / 0.30;
            baseOpacity = t;
            baseExit = 1.0 - t;
          } else if (p <= 2.25) {
            baseOpacity = 1.0;
            baseExit = 0.0;
          } else {
            const t = (p - 2.25) / 0.30;
            baseExit = t;
            baseOpacity = Math.max(0.0, 1.0 - t * 1.5);
          }
        } else {
          baseOpacity = 0;
          baseExit = 1.0;
        }
      } else {
        // Stage 3 (Finale at end of scroll): enters from 2.30, fully solid at 2.65, stays 100% to end
        if (p >= 2.30) {
          const t = Math.min(1.0, (p - 2.30) / 0.35);
          baseOpacity = t;
          baseExit = 1.0 - t;
        } else {
          baseOpacity = 0;
          baseExit = 1.0;
        }
      }

      const opacity = baseOpacity * timelineAlpha;
      const exitFraction = Math.max(baseExit, 1.0 - timelineAlpha);

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

      // Clean GPU-composited exit: smooth sink + subtle scale dampening (zero layout reflows!)
      const waveSinkY = exitFraction * 30.0;
      const scale = (1.0 - exitFraction * 0.04).toFixed(3);

      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate3d(${smooth.x.toFixed(1)}px, ${(smooth.y + waveSinkY).toFixed(1)}px, 0) scale(${scale})`;

      if (opacity > 0.05) {
        el.style.pointerEvents = idx === 3 ? 'auto' : 'none';
      } else {
        el.style.pointerEvents = 'none';
      }
    });

    // ── 3D ANCHORED MIC HINT NOTE (ACTIVE ONLY IN STAGE 0) ──
    if (micHintEl) {
      let baseMicOpacity = 0;
      let baseMicExit = 0;

      if (p <= 0.35) {
        baseMicOpacity = 1.0;
        baseMicExit = 0.0;
      } else if (p <= 0.65) {
        const t = (p - 0.35) / 0.30;
        baseMicExit = t;
        baseMicOpacity = Math.max(0.0, 1.0 - t * 1.5);
      } else {
        baseMicOpacity = 0;
        baseMicExit = 1.0;
      }

      const micOpacity = baseMicOpacity * timelineAlpha;
      const micExitFraction = Math.max(baseMicExit, 1.0 - timelineAlpha);

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

      const waveSinkY = micExitFraction * 26.0;

      micHintEl.style.opacity = micOpacity.toFixed(3);
      micHintEl.style.transform = `translate3d(${smoothMicHint.x.toFixed(1)}px, ${(smoothMicHint.y + waveSinkY).toFixed(1)}px, 0) rotate(-3deg)`;
      micHintEl.style.pointerEvents = micOpacity > 0.08 ? 'auto' : 'none';
    }
  }

  // ── 3D SPATIAL SWOOP & BANK FLIGHT CONTROLS ──
  function smootherstep(t) {
    const c = Math.max(0.0, Math.min(1.0, t));
    return c * c * c * (c * (c * 6.0 - 15.0) + 10.0);
  }

  function startFlightTo(targetCamPos, targetCamLook, targetState, onArriveSection, targetWaveP) {
    camFlightStartPos.copy(currentBasePos);
    camFlightStartLook.copy(currentBaseLook);

    camFlightEndPos.copy(targetCamPos);
    camFlightEndLook.copy(targetCamLook);

    flightStartParallaxPos.x = currentParallaxPosScale.x;
    flightStartParallaxPos.y = currentParallaxPosScale.y;
    flightStartParallaxLook.x = currentParallaxLookScale.x;
    flightStartParallaxLook.y = currentParallaxLookScale.y;

    flightStartWaveP = currentWaveP;
    flightEndWaveP = (targetWaveP !== undefined) ? targetWaveP : smoothProgress;

    flightStartMorphs.about = currentMorphAbout;
    flightStartMorphs.privacy = currentMorphPrivacy;
    flightStartMorphs.audience = currentMorphAudience;
    flightStartMorphs.download = currentMorphDownload;

    // Smooth drone apex arc
    camFlightMidPos.addVectors(camFlightStartPos, camFlightEndPos).multiplyScalar(0.5);
    camFlightMidPos.y += 1.2;

    // Fixed 1.4s luxurious flight duration for silky smoothness
    flightDuration = 1400;

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

    startFlightTo(island.camPos, island.camLook, 'warping_out', sectionKey, island.targetP);
  }

  function closeSection() {
    if (flightState === 'timeline' || flightState === 'warping_in') return;

    document.querySelectorAll('.nav-pill').forEach(pill => pill.classList.remove('is-active'));
    getTimelineCamera(smoothProgress, timelineTargetPos, timelineTargetLook);

    startFlightTo(timelineTargetPos, timelineTargetLook, 'warping_in', null, smoothProgress);
  }

  let prevIsSectionActive = false;
  let prevActiveSection = null;

  function update3DSpatialIslands() {
    const isSectionActive = flightState === 'in_section' || (flightState === 'warping_out' && (performance.now() - flightStartTime) > flightDuration * 0.45);

    if (isSectionActive === prevIsSectionActive && activeSection === prevActiveSection) {
      return;
    }
    prevIsSectionActive = isSectionActive;
    prevActiveSection = activeSection;

    const hud = document.getElementById('spatial-hud');
    if (hud) {
      hud.classList.toggle('is-active', isSectionActive);
    }

    Object.keys(ISLANDS).forEach(key => {
      const el = document.getElementById(`island-${key}`);
      if (!el) return;
      el.classList.toggle('is-active', isSectionActive && activeSection === key);
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

    // Level horizon: zero roll wobble
    camera.up.set(0, 1, 0);

    if (flightState === 'timeline') {
      getTimelineCamera(p, timelineTargetPos, timelineTargetLook);
      currentBasePos.copy(timelineTargetPos);
      currentBaseLook.copy(timelineTargetLook);

      currentParallaxPosScale.x = 1.0;
      currentParallaxPosScale.y = 1.0;
      currentParallaxLookScale.x = 0.0;
      currentParallaxLookScale.y = 0.0;

      currentMorphAbout = 0.0;
      currentMorphPrivacy = 0.0;
      currentMorphAudience = 0.0;
      currentMorphDownload = 0.0;

      warpSpeed = 0.0;
      currentWaveP = p;
    } else if (flightState === 'warping_out') {
      const elapsed = performance.now() - flightStartTime;
      const rawT = Math.min(1.0, elapsed / flightDuration);
      const easeT = smootherstep(rawT);
      warpSpeed = Math.sin(rawT * Math.PI) * 0.35;

      // Morph 3D wave smoothly during flight
      currentWaveP = flightStartWaveP + (flightEndWaveP - flightStartWaveP) * easeT;

      // Pure smooth quadratic Bezier arc on base coordinates
      const oneMinusT = 1.0 - easeT;
      currentBasePos.x = oneMinusT * oneMinusT * camFlightStartPos.x + 2.0 * oneMinusT * easeT * camFlightMidPos.x + easeT * easeT * camFlightEndPos.x;
      currentBasePos.y = oneMinusT * oneMinusT * camFlightStartPos.y + 2.0 * oneMinusT * easeT * camFlightMidPos.y + easeT * easeT * camFlightEndPos.y;
      currentBasePos.z = oneMinusT * oneMinusT * camFlightStartPos.z + 2.0 * oneMinusT * easeT * camFlightMidPos.z + easeT * easeT * camFlightEndPos.z;

      currentBaseLook.lerpVectors(camFlightStartLook, camFlightEndLook, easeT);

      // Continuously blend parallax scales (100% continuous across state transition!)
      currentParallaxPosScale.x = (1.0 - easeT) * flightStartParallaxPos.x + easeT * 0.25;
      currentParallaxPosScale.y = (1.0 - easeT) * flightStartParallaxPos.y + easeT * 0.20;
      currentParallaxLookScale.x = (1.0 - easeT) * flightStartParallaxLook.x + easeT * 0.06;
      currentParallaxLookScale.y = (1.0 - easeT) * flightStartParallaxLook.y + easeT * 0.06;

      // Smoothly morph into the target 3D object
      const targetAbout = (activeSection === 'about') ? 1.0 : 0.0;
      const targetPrivacy = (activeSection === 'privacy') ? 1.0 : 0.0;
      const targetAudience = (activeSection === 'audience') ? 1.0 : 0.0;
      const targetDownload = (activeSection === 'download') ? 1.0 : 0.0;

      currentMorphAbout = flightStartMorphs.about + (targetAbout - flightStartMorphs.about) * easeT;
      currentMorphPrivacy = flightStartMorphs.privacy + (targetPrivacy - flightStartMorphs.privacy) * easeT;
      currentMorphAudience = flightStartMorphs.audience + (targetAudience - flightStartMorphs.audience) * easeT;
      currentMorphDownload = flightStartMorphs.download + (targetDownload - flightStartMorphs.download) * easeT;

      if (rawT >= 1.0) {
        flightState = 'in_section';
        sectionEnterTime = performance.now();
        warpSpeed = 0.0;
        currentWaveP = flightEndWaveP;
      }
    } else if (flightState === 'in_section') {
      warpSpeed = 0.0;
      currentWaveP = flightEndWaveP;
      currentMorphAbout = (activeSection === 'about') ? 1.0 : 0.0;
      currentMorphPrivacy = (activeSection === 'privacy') ? 1.0 : 0.0;
      currentMorphAudience = (activeSection === 'audience') ? 1.0 : 0.0;
      currentMorphDownload = (activeSection === 'download') ? 1.0 : 0.0;

      const island = ISLANDS[activeSection];
      if (island) {
        currentBasePos.copy(island.camPos);
        currentBaseLook.copy(island.camLook);
        currentParallaxPosScale.x = 0.25;
        currentParallaxPosScale.y = 0.20;
        currentParallaxLookScale.x = 0.06;
        currentParallaxLookScale.y = 0.06;
      }
    } else if (flightState === 'warping_in') {
      const elapsed = performance.now() - flightStartTime;
      const rawT = Math.min(1.0, elapsed / flightDuration);
      const easeT = smootherstep(rawT);
      warpSpeed = Math.sin(rawT * Math.PI) * 0.35;

      // Morph 3D wave back to current timeline progress
      currentWaveP = flightStartWaveP + (p - flightStartWaveP) * easeT;

      // Re-evaluate latest smooth timeline target position
      getTimelineCamera(p, camFlightEndPos, camFlightEndLook);

      // Pure smooth Bezier return arc on base coordinates
      const oneMinusT = 1.0 - easeT;
      currentBasePos.x = oneMinusT * oneMinusT * camFlightStartPos.x + 2.0 * oneMinusT * easeT * camFlightMidPos.x + easeT * easeT * camFlightEndPos.x;
      currentBasePos.y = oneMinusT * oneMinusT * camFlightStartPos.y + 2.0 * oneMinusT * easeT * camFlightMidPos.y + easeT * easeT * camFlightEndPos.y;
      currentBasePos.z = oneMinusT * oneMinusT * camFlightStartPos.z + 2.0 * oneMinusT * easeT * camFlightMidPos.z + easeT * easeT * camFlightEndPos.z;

      currentBaseLook.lerpVectors(camFlightStartLook, camFlightEndLook, easeT);

      // Continuously blend parallax scales back to timeline
      currentParallaxPosScale.x = (1.0 - easeT) * flightStartParallaxPos.x + easeT * 1.0;
      currentParallaxPosScale.y = (1.0 - easeT) * flightStartParallaxPos.y + easeT * 1.0;
      currentParallaxLookScale.x = (1.0 - easeT) * flightStartParallaxLook.x + easeT * 0.0;
      currentParallaxLookScale.y = (1.0 - easeT) * flightStartParallaxLook.y + easeT * 0.0;

      // Smoothly dissolve 3D objects back into wave
      currentMorphAbout = flightStartMorphs.about * (1.0 - easeT);
      currentMorphPrivacy = flightStartMorphs.privacy * (1.0 - easeT);
      currentMorphAudience = flightStartMorphs.audience * (1.0 - easeT);
      currentMorphDownload = flightStartMorphs.download * (1.0 - easeT);

      if (rawT >= 1.0) {
        flightState = 'timeline';
        activeSection = null;
        warpSpeed = 0.0;
        currentWaveP = p;
        currentMorphAbout = 0.0;
        currentMorphPrivacy = 0.0;
        currentMorphAudience = 0.0;
        currentMorphDownload = 0.0;
      }
    }

    // Unified, seamlessly continuous camera position & lookAt (zero delta jump at transitions)
    camera.position.set(
      currentBasePos.x + currentCamX * currentParallaxPosScale.x,
      currentBasePos.y + currentCamY * currentParallaxPosScale.y,
      currentBasePos.z
    );
    currentLookAt.set(
      currentBaseLook.x + currentCamX * currentParallaxLookScale.x,
      currentBaseLook.y + currentCamY * currentParallaxLookScale.y,
      currentBaseLook.z
    );
    camera.lookAt(currentLookAt);

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
      waveMaterial.uniforms.uProgress.value = currentWaveP;
      waveMaterial.uniforms.uMorphAbout.value = currentMorphAbout;
      waveMaterial.uniforms.uMorphPrivacy.value = currentMorphPrivacy;
      waveMaterial.uniforms.uMorphAudience.value = currentMorphAudience;
      waveMaterial.uniforms.uMorphDownload.value = currentMorphDownload;
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
