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
      islandPos: new THREE.Vector3(3.6, 0.2, 0.0),
      camPos: new THREE.Vector3(0.0, 0.0, 16.0),
      camLook: new THREE.Vector3(0.0, 0.0, 0.0),
      tiltYaw: 0.0,
      tiltPitch: 0.0
    },
    privacy: {
      targetP: 1.35,
      islandPos: new THREE.Vector3(3.6, 0.2, 0.0),
      camPos: new THREE.Vector3(0.0, 0.0, 16.0),
      camLook: new THREE.Vector3(0.0, 0.0, 0.0),
      tiltYaw: 0.0,
      tiltPitch: 0.0
    },
    audience: {
      targetP: 2.1,
      islandPos: new THREE.Vector3(3.6, 0.2, 0.0),
      camPos: new THREE.Vector3(0.0, 0.0, 16.0),
      camLook: new THREE.Vector3(0.0, 0.0, 0.0),
      tiltYaw: 0.0,
      tiltPitch: 0.0
    },
    download: {
      targetP: 2.85,
      islandPos: new THREE.Vector3(3.6, 0.2, 0.0),
      camPos: new THREE.Vector3(0.0, 0.0, 16.0),
      camLook: new THREE.Vector3(0.0, 0.0, 0.0),
      tiltYaw: 0.0,
      tiltPitch: 0.0
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

    const initHash = window.location.hash.replace('#', '');
    if (ISLANDS[initHash]) {
      setTimeout(() => openSection(initHash), 180);
    }
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
      // TIMELINE STAGE 3: МНОГОСЛОЙНАЯ ГАРМОНИЧЕСКАЯ РЕЧЕВАЯ ВОЛНА
      // ====================================================================
      const ribbonIdx = i % 7; // 7 harmonic voice ribbon layers
      const strandFrac = ribbonIdx / 6.0; // 0..1
      const tWave = (Math.floor(i / 7) / (N / 7)) * 2.0 - 1.0; // -1..1
      const x3 = tWave * 13.5;
      const gauss = Math.exp(-tWave * tWave * 2.8);

      // Natural speech resonance frequencies
      const f1 = Math.sin(tWave * 7.5 + ribbonIdx * 0.9) * 0.95;
      const f2 = Math.sin(tWave * 16.0 + ribbonIdx * 1.6) * 0.45;
      const f3 = Math.cos(tWave * 28.0 + ribbonIdx * 2.2) * 0.22;
      const voiceMod = (f1 + f2 + f3) * gauss;

      // Center wave vertically in upper half (Y = 1.8 ± 0.6), floating safely above lowered text
      const yBaseline = 1.8 + (strandFrac - 0.5) * 1.1;
      const y3 = yBaseline + voiceMod * (0.8 + strandFrac * 0.5);

      // Volumetric depth in Z
      const z3 = (strandFrac - 0.5) * 3.6 + Math.cos(tWave * 5.0 + ribbonIdx) * 0.7 * gauss;

      pos3[i3]     = x3;
      pos3[i3 + 1] = y3;
      pos3[i3 + 2] = z3;

      // ====================================================================
      // SECTION OBJECT 1: ЧИСТАЯ 3D РАБОЧАЯ ПАПКА («О ПРОЕКТЕ»)
      // ====================================================================
      let fx = 0, fy = 0, fz = 0;
      if (i < 6500) {
        // 1. Solid Folder Back Plate with Clean Rounded Tab (6500 particles)
        // Clean silhouette: NO strange protruding documents on the right!
        if (i < 1800) {
          // Perimeter wireframe border (1800 particles)
          const t = i / 1800;
          let px = 0, py = 0;
          if (t < 0.28) {
            // Bottom edge: X in [0.0, 7.2], Y = -3.2
            const segT = t / 0.28;
            px = segT * 7.2;
            py = -3.2;
          } else if (t < 0.50) {
            // Right edge: X = 7.2, Y in [-3.2, 2.0]
            const segT = (t - 0.28) / 0.22;
            px = 7.2;
            py = -3.2 + segT * 5.2;
          } else if (t < 0.68) {
            // Top right rim: X in [7.2, 3.4], Y = 2.0
            const segT = (t - 0.50) / 0.18;
            px = 7.2 - segT * 3.8;
            py = 2.0;
          } else if (t < 0.76) {
            // Smooth tab transition: X in [3.4, 2.6], Y slopes up from 2.0 to 2.5
            const segT = (t - 0.68) / 0.08;
            px = 3.4 - segT * 0.8;
            py = 2.0 + segT * 0.5;
          } else if (t < 0.88) {
            // Top tab rim: X in [2.6, 0.0], Y = 2.5
            const segT = (t - 0.76) / 0.12;
            px = 2.6 - segT * 2.6;
            py = 2.5;
          } else {
            // Left edge: X = 0.0, Y in [2.5, -3.2]
            const segT = (t - 0.88) / 0.12;
            px = 0.0;
            py = 2.5 - segT * 5.7;
          }
          fx = px;
          fy = py;
          fz = -0.55 + ((i % 5) / 4 - 0.5) * 0.15;
        } else {
          // Solid back cover surface fill (4700 particles)
          const idx = i - 1800;
          const u = ((idx % 70) / 69);
          const v = Math.floor(idx / 70) / 67;
          const px = u * 7.2;
          let topY = 2.0;
          if (px <= 2.6) {
            topY = 2.5;
          } else if (px <= 3.4) {
            const slopeT = (px - 2.6) / 0.8;
            topY = 2.5 - slopeT * 0.5;
          }
          const py = -3.2 + v * (topY - (-3.2));
          fx = px;
          fy = py;
          fz = -0.55;
        }
      } else if (i < 11500) {
        // 2. Project Documents Neatly Tucked INSIDE Folder (5000 particles)
        // STRICTLY contained below back cover (Y <= 1.45), NEVER jutting above!
        const idx = i - 6500;
        const isSheet2 = (idx >= 2500);
        const sIdx = isSheet2 ? (idx - 2500) : idx;
        const totalCols = 50;
        const totalRows = 50;
        const u = ((sIdx % totalCols) / (totalCols - 1)) * 2.0 - 1.0;
        const v = Math.floor(sIdx / totalCols) / (totalRows - 1);

        if (!isSheet2) {
          // Document Sheet 1: Main Blueprint (Y in [-2.5, 1.45])
          const px = 3.6 + u * 2.8; // X in [0.8, 6.4]
          const py = -2.5 + v * 3.95; // Top Y = 1.45 (comfortably below back cover Y = 2.0!)
          const rowMod = Math.sin(py * 8.5);
          const isText = (rowMod > 0.25) && (u > -0.80 && u < 0.80);
          fx = px;
          fy = py;
          fz = -0.18 + (isText ? 0.06 : 0.0);
        } else {
          // Document Sheet 2: Secondary Spec (tilted subtle +2.5 deg, Y <= 1.40)
          const localX = u * 2.6;
          const localY = -2.4 + v * 3.75;
          const ang = 0.04;
          fx = 3.7 + localX * Math.cos(ang) - localY * Math.sin(ang);
          fy = localX * Math.sin(ang) + localY * Math.cos(ang);
          fz = 0.02;
        }
      } else if (i < 16500) {
        // 3. Open 3D Front Cover Leaning Forward into Camera Space (5000 particles)
        const idx = i - 11500;
        const u = ((idx % 75) / 74) * 2.0 - 1.0;
        const v = Math.floor(idx / 75) / 66;

        const xFront = 3.6 + u * 3.6; // X in [0.0, 7.2]
        const scoop = Math.exp(-u * u * 4.5) * 0.45;
        const yTopFront = 0.5 - scoop;
        const yFront = -3.2 + v * (yTopFront - (-3.2));
        const zFront = -0.2 + v * 1.6; // Leaning open forward in 3D

        const isBorder = Math.abs(u) > 0.94 || v < 0.04 || v > 0.94;
        fx = xFront;
        fy = yFront;
        fz = zFront + (isBorder ? 0.08 : 0.0);
      } else {
        // 4. Cylindrical Bottom Spine Hinge & Depth Anchors (1500 particles)
        const idx = i - 16500;
        const t = idx / 1500;
        const spineAngle = idx * goldenAngle;
        const spineR = 0.24;
        fx = 0.0 + t * 7.2;
        fy = -3.2 + Math.sin(spineAngle) * spineR;
        fz = -0.22 + Math.cos(spineAngle) * spineR;
      }
      posAbout[i3]     = fx;
      posAbout[i3 + 1] = fy;
      posAbout[i3 + 2] = fz;

      // ====================================================================
      // SECTION OBJECT 2: АККУРАТНЫЙ 3D КОДОВЫЙ ЗАМОК («ПРИВАТНОСТЬ»)
      // ====================================================================
      let kx = 0, ky = 0, kz = 0;
      if (i < 5000) {
        // 1. Точная U-образная дужка замка и цилиндрические муфты (5000 particles)
        if (i < 800) {
          // Две симметричные муфты крепления дужки на корпусе
          const sIdx = i;
          const isRight = (sIdx >= 400);
          const cX = isRight ? 4.9 : 2.3;
          const p = (sIdx % 400) / 400;
          const theta = p * Math.PI * 2.0 * 8.0;
          const hFrac = Math.floor(p * 8.0) / 7.0;
          const sockR = 0.42;
          kx = cX + Math.cos(theta) * sockR;
          ky = 0.60 + hFrac * 0.35;
          kz = Math.sin(theta) * sockR;
        } else {
          // Идеально гладкая 3D торическая дужка без искажений
          const idx = i - 800;
          const t = idx / 4200; // t in [0, 1]
          const ringAngle = (idx * goldenAngle);
          const rTube = 0.34;
          const cosR = Math.cos(ringAngle) * rTube;
          const sinR = Math.sin(ringAngle) * rTube;

          if (t < 0.26) {
            // Левая вертикальная стойка дужки
            const legT = t / 0.26;
            kx = 2.3 + cosR;
            ky = 0.85 + legT * 1.45; // up to Y = 2.30
            kz = sinR;
          } else if (t < 0.74) {
            // Полукруглая верхняя арка дужки
            const archT = (t - 0.26) / 0.48; // archT in [0, 1]
            const alpha = archT * Math.PI; // from 0 to PI
            const rArch = 1.30;
            // Центр арки (3.6, 2.30, 0)
            const pX = 3.6 - Math.cos(alpha) * rArch;
            const pY = 2.30 + Math.sin(alpha) * rArch;
            // Нормаль в плоскости XY перпендикулярно дуге
            const normX = -Math.cos(alpha);
            const normY = Math.sin(alpha);
            kx = pX + normX * cosR;
            ky = pY + normY * cosR;
            kz = sinR;
          } else {
            // Правая вертикальная стойка дужки
            const legT = (t - 0.74) / 0.26;
            kx = 4.9 + cosR;
            ky = 2.30 - legT * 1.45; // down to Y = 0.85
            kz = sinR;
          }
        }
      } else if (i < 12000) {
        // 2. Четкий монолитный корпус замка со скругленными гранями (7000 particles)
        const idx = i - 5000;
        const W = 2.35; // полуширина (ширина 4.7, X in [1.25, 5.95])
        const H = 1.85; // полувысота (высота 3.7, Y in [-3.15, 0.55])
        const cY = -1.30; // центр по Y
        const cX = 3.60; // центр по X
        const rC = 0.48; // радиус скругления углов

        if (idx < 2600) {
          // Внешний контур и фаска корпуса (четкие грани без размытия)
          const pT = idx / 2600;
          const zDepth = ((idx % 13) / 12 - 0.5) * 1.36; // Z in [-0.68, +0.68]
          const perimAngle = pT * Math.PI * 2.0;

          // Прямоугольник со скругленными углами
          const cosP = Math.cos(perimAngle);
          const sinP = Math.sin(perimAngle);
          const cornerX = Math.sign(cosP) * (W - rC);
          const cornerY = Math.sign(sinP) * (H - rC);
          const localCos = Math.min(1.0, Math.max(-1.0, cosP * 1.4));
          const localSin = Math.min(1.0, Math.max(-1.0, sinP * 1.4));

          kx = cX + cornerX + localCos * rC;
          ky = cY + cornerY + localSin * rC;
          kz = zDepth;
        } else {
          // Лицевая и тыльная пластины корпуса с аккуратным окном под ролики
          const fIdx = idx - 2600;
          const isFront = (fIdx % 2 === 0);
          const plateZ = isFront ? 0.68 : -0.68;

          // Равномерная аккуратная сетка точек
          const u = ((fIdx % 60) / 59) * 2.0 - 1.0;
          const v = Math.floor(fIdx / 60) / 36;

          const px = cX + u * W;
          const py = (cY - H) + v * (H * 2.0);

          // Проверяем, не попадает ли в окно кодовых роликов на лицевой панели
          const inWindow = isFront && (Math.abs(px - cX) < 1.95) && (py > -1.85 && py < -0.45);

          if (inWindow) {
            // Утопленная задняя стенка окна под ролики
            kx = px;
            ky = py;
            kz = 0.35;
          } else {
            // Скругляем углы корпуса
            const dx = Math.max(0.0, Math.abs(px - cX) - (W - rC));
            const dy = Math.max(0.0, Math.abs(py - cY) - (H - rC));
            const isCorner = (dx * dx + dy * dy) > (rC * rC);

            if (isCorner) {
              kx = cX + Math.sign(px - cX) * (W - rC + (dx / (dx + dy + 0.001)) * rC * 0.9);
              ky = cY + Math.sign(py - cY) * (H - rC + (dy / (dx + dy + 0.001)) * rC * 0.9);
            } else {
              kx = px;
              ky = py;
            }
            kz = plateZ;
          }
        }
      } else if (i < 16500) {
        // 3. Четыре аккуратных цилиндрических кодовых барабана с делениями (4500 particles)
        const idx = i - 12000;
        const wheelIdx = idx % 4; // 0, 1, 2, 3
        const wheelCenters = [2.20, 3.13, 4.07, 5.00];
        const wX = wheelCenters[wheelIdx];

        const wP = Math.floor(idx / 4); // 0 to 1124
        // Барабан вращается вокруг оси X, цилиндр выступает вперед
        const angle = ((wP % 28) / 27 - 0.5) * Math.PI * 0.82; // угол обзора барабана
        const widthT = Math.floor(wP / 28) / 39; // вдоль оси ролика
        const localX = (widthT - 0.5) * 0.62;

        const rDrum = 0.56;
        const cDrumY = -1.15;
        const cDrumZ = 0.50;

        // Риски делений шкалы цифр (5 четких делений)
        const notchStep = Math.abs(Math.sin(angle * 4.0));
        const isNotch = notchStep < 0.16;
        const bump = isNotch ? 0.05 : 0.0;

        kx = wX + localX;
        ky = cDrumY + Math.sin(angle) * (rDrum + bump);
        kz = cDrumZ + Math.cos(angle) * (rDrum + bump);
      } else {
        // 4. Аккуратная рамка окна и круглые PIN-индикаторы (1500 particles)
        const idx = i - 16500;
        if (idx < 700) {
          // Четкая прямоугольная фаска-рамка вокруг кодовых барабанов
          const p = idx / 700;
          const u = ((idx % 35) / 34) * 2.0 - 1.0;
          const isTopBottom = (idx % 2 === 0);
          if (isTopBottom) {
            kx = 3.6 + u * 2.02;
            ky = (u > 0 ? -0.42 : -1.88);
            kz = 0.72;
          } else {
            const side = (idx % 4 < 2) ? 1.0 : -1.0;
            kx = 3.6 + side * 2.02;
            ky = -1.15 + u * 0.73;
            kz = 0.72;
          }
        } else if (idx < 1250) {
          // 4 круглых PIN-индикатора под барабанами [ • ] [ • ] [ • ] [ • ]
          const dIdx = idx - 700;
          const wheelCenters = [2.20, 3.13, 4.07, 5.00];
          const dotIdx = dIdx % 4;
          const dX = wheelCenters[dotIdx];
          const p = Math.floor(dIdx / 4) / 137;
          const theta = p * Math.PI * 2.0 * 4.0;
          const rDot = ((Math.floor(p * 4.0) + 1) / 4.0) * 0.17;

          kx = dX + Math.cos(theta) * rDot;
          ky = -2.35 + Math.sin(theta) * rDot;
          kz = 0.73;
        } else {
          // Тонкая горизонтальная линия состояния безопасности
          const bIdx = idx - 1250;
          const u = (bIdx / 250) * 2.0 - 1.0;
          kx = 3.6 + u * 1.85;
          ky = -2.68;
          kz = 0.71;
        }
      }
      posPrivacy[i3]     = kx;
      posPrivacy[i3 + 1] = ky;
      posPrivacy[i3 + 2] = kz;

      // ====================================================================
      // SECTION OBJECT 3: 3D ЧИСТАЯ ФИГУРА ЧЕЛОВЕКА («ДЛЯ КОГО»)
      // ====================================================================
      let hx = 0, hy = 0, hz = 0;
      if (i < 5500) {
        // Sculpted Human Head: Pure Anatomical Silhouette (5500 particles)
        // Zero halos, zero orbital rings - clean aesthetic skull, temples, face, jaw
        const t = i / 5500;
        const phi = Math.acos(1.0 - 2.0 * t);
        const theta = i * goldenAngle;

        // Smooth head proportions
        const rx = 1.15;
        const ry = 1.45;
        const rz = 1.25;

        // Realistic jawline and chin contour taper
        const yHead = 2.30 + Math.cos(phi) * ry; // top reaches Y = 3.75
        let xRadius = rx;
        let zPush = 0.0;
        if (yHead < 2.0) {
          const jawT = (2.0 - yHead) / 1.15;
          xRadius = rx * (1.0 - jawT * 0.28); // taper to jaw
          zPush = Math.max(0.0, Math.sin(phi)) * jawT * 0.35; // chin projection
        }

        const volScale = 0.72 + 0.28 * ((i % 5) / 4);
        hx = 3.6 + Math.sin(phi) * Math.cos(theta) * xRadius * volScale;
        hy = yHead;
        hz = Math.sin(phi) * Math.sin(theta) * rz * volScale + zPush;
      } else if (i < 8000) {
        // Anatomical Neck Connecting Head to Shoulders (2500 particles)
        // Clean solid cylinder column, zero stray lines
        const t = (i - 5500) / 2500;
        const theta = i * goldenAngle;
        const yNeck = 0.55 + t * 0.75; // Y in [0.55, 1.30]

        // Natural neck flare at the base of the traps
        const neckR = 0.50 + (1.0 - t) * 0.14;
        const volScale = 0.75 + 0.25 * ((i % 4) / 3);

        hx = 3.6 + Math.cos(theta) * neckR * volScale;
        hy = yNeck;
        hz = Math.sin(theta) * neckR * 0.90 * volScale;
      } else {
        // Broad Sculpted Shoulders & Upper Torso (10000 particles)
        // Natural clavicle slope, chest volume, and upper arms silhouette
        // Zero neural ribbons, zero extraneous fibers - pure human body
        const idx = i - 8000;
        const t = idx / 10000;
        const v = Math.pow(t, 0.78);
        const yTorso = 0.55 - v * 3.75; // down to Y = -3.2

        let halfW;
        if (v < 0.22) {
          // Trapezius and clavicle sloping down from neck (0.64) to deltoid tips (2.65)
          const sT = v / 0.22;
          halfW = 0.64 + Math.sin(sT * Math.PI * 0.5) * 2.05; // half-width up to 2.69 (span 5.38)
        } else {
          // Torso below shoulders tapering gracefully toward waist
          const bT = (v - 0.22) / 0.78;
          halfW = 2.69 - bT * 0.75; // tapers to 1.94 at waist
        }

        const u = ((idx % 100) / 99) * 2.0 - 1.0;
        const depthArc = Math.cos(u * (Math.PI * 0.48));
        const zChest = depthArc * 0.85;
        const zThickness = ((idx % 11) / 10 - 0.45) * 1.15;

        hx = 3.6 + u * halfW;
        hy = yTorso;
        hz = zChest + zThickness;
      }
      posAudience[i3]     = hx;
      posAudience[i3 + 1] = hy;
      posAudience[i3 + 2] = hz;

      // ====================================================================
      // SECTION OBJECT 4: 3D СТРЕЛКА СКАЧИВАНИЯ И ДОК-СТАНЦИЯ («СКАЧАТЬ»)
      // ====================================================================
      let dx = 0, dy = 0, dz = 0;
      if (i < 4500) {
        // Vertical Arrow Shaft (4500 particles)
        // X in [2.8, 4.4], Y in [0.8, 3.8]
        const u = ((i % 50) / 49) * 2.0 - 1.0;
        const v = Math.floor(i / 50) / 89;
        const w = ((i % 10) / 9 - 0.5) * 1.3;

        dx = 3.6 + u * 0.8;
        dy = 0.8 + v * 3.0; // up to Y = 3.8
        dz = w;
      } else if (i < 11500) {
        // Aerodynamic 3D Chevron Arrowhead (7000 particles)
        // Tip at (3.6, -0.9), Shoulders at Y = 0.8, Wings expand to X in [0.8, 6.4]!
        const idx = i - 4500;
        const t = idx / 7000;
        const v = Math.pow(t, 0.85);
        const yHead = 0.8 - v * 1.7; // down to Y = -0.9
        const wingW = 2.8 * (1.0 - v);
        const u = ((idx % 70) / 69) * 2.0 - 1.0;
        const w = ((idx % 12) / 11 - 0.5) * 1.4 * (1.0 - v * 0.3);

        dx = 3.6 + u * wingW;
        dy = yHead;
        dz = w;
      } else if (i < 16500) {
        // Receiving Dock Cradle (5000 particles)
        // Base X in [0.0, 7.2], Y in [-3.2, -2.4]
        const idx = i - 11500;
        const t = idx / 5000;
        if (t < 0.65) {
          const segT = t / 0.65;
          const u = segT * 2.0 - 1.0;
          const curveSag = Math.cos(u * Math.PI * 0.5) * 0.3;
          const barY = -2.9 - curveSag + ((idx % 16) / 15) * 0.7;
          const barZ = ((idx % 10) / 9 - 0.5) * 1.8;

          dx = 3.6 + u * 3.6; // X in [0.0, 7.2]
          dy = barY;
          dz = barZ;
        } else {
          // Vertical cradle bracket lips rising to Y = -0.8
          const armT = (t - 0.65) / 0.35;
          const isLeft = (idx % 2 === 0);
          const sign = isLeft ? -1.0 : 1.0;
          const armY = -2.4 + armT * 1.8; // up to Y = -0.6
          const armX = 3.6 + sign * (3.3 + ((idx % 6) / 5) * 0.3);
          const armZ = ((idx % 8) / 7 - 0.5) * 1.6;

          dx = armX;
          dy = armY;
          dz = armZ;
        }
      } else {
        // Concentric Holographic Dock Radar Rings (1500 particles)
        const idx = i - 16500;
        const ringIdx = idx % 3;
        const rRing = 1.3 + ringIdx * 1.1; // 1.3, 2.4, 3.5
        const theta = (idx * goldenAngle);
        dx = 3.6 + Math.cos(theta) * rRing;
        dy = -2.7 + Math.sin(theta * 3.0) * 0.10;
        dz = Math.sin(theta) * rRing * 0.6;
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

        float baseScale = (morphFactor > 0.01) ? 58.0 : 42.0;
        float size = (baseScale / -mvPosition.z) * uPixelRatio * (1.0 + uMicEnergy * 0.25 + uWarpSpeed * 0.8);
        gl_PointSize = clamp(size, 3.2, 72.0);

        // Rich high-contrast celestial blue palette - never fading to white!
        vec3 cDeepNavy  = vec3(0.012, 0.380, 0.700); // #0361B3
        vec3 cCerulean  = vec3(0.020, 0.550, 0.880); // #058CE0
        vec3 cBrightSky = vec3(0.050, 0.720, 0.980); // #0DB8FA
        vec3 cNeonCyan  = vec3(0.000, 0.900, 1.000); // #00E5FF
        vec3 cVoice     = vec3(0.000, 0.950, 1.000); // Vibrant voice cyan

        float h = clamp((p.y + 4.0) / 8.0, 0.0, 1.0);
        if (h < 0.5) {
          vColor = mix(cDeepNavy, cCerulean, h * 2.0);
        } else {
          vColor = mix(cCerulean, cBrightSky, (h - 0.5) * 2.0);
        }

        if (morphFactor > 0.01) {
          // Boost 3D object saturation and contrast
          float zHighlight = clamp((p.z + 1.5) / 3.0, 0.0, 1.0);
          vec3 objColor = mix(cCerulean, cNeonCyan, zHighlight * 0.7 + 0.3);
          vColor = mix(vColor, objColor, morphFactor * 0.85);
        }

        if (uMicEnergy > 0.01) {
          vColor = mix(vColor, cVoice, clamp(uMicEnergy * 0.75, 0.0, 0.85));
        }

        if (uWarpSpeed > 0.01) {
          vColor = mix(vColor, vec3(0.02, 0.92, 1.0), clamp(uWarpSpeed * 0.65, 0.0, 0.75));
        }

        float distFog = clamp((-mvPosition.z - 12.0) / 45.0, 0.0, 1.0);
        vAlpha = (1.0 - distFog * 0.55) * (0.92 + morphFactor * 0.08);
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        float alphaEdge = smoothstep(0.5, 0.10, dist);
        float core = smoothstep(0.25, 0.0, dist) * 0.28;
        vec3 col = vColor + vec3(core);
        gl_FragColor = vec4(col, alphaEdge * vAlpha);
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
    // If not on timeline (opening section, in section, or switching sections), hide ALL narrative callouts immediately
    if (flightState !== 'timeline') {
      callouts.forEach(el => {
        if (el) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      });
      if (micHintEl) {
        micHintEl.style.opacity = '0';
        micHintEl.style.pointerEvents = 'none';
      }
      return;
    }

    const timelineAlpha = 1.0;

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
        // Stage 3 (Finale): Positioned cleanly in lower portion of viewport (below 3D harmonic soundwave)
        const cw = calloutSizes[3].width;
        const ch = calloutSizes[3].height;
        targetX = Math.max(16, (W - cw) * 0.5);
        targetY = isMobile ? Math.max(24, H * 0.54) : Math.min(H - ch - 36, Math.max(H * 0.58, H * 0.63));
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

  let isSwitchingSections = false;

  function startFlightTo(targetCamPos, targetCamLook, targetState, onArriveSection, targetWaveP, durationOverride, switchingSections = false) {
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

    isSwitchingSections = switchingSections;

    if (switchingSections) {
      camFlightMidPos.copy(targetCamPos);
      camFlightMidPos.z += 0.35; // gentle optical breath on section switch
      flightDuration = durationOverride || 800;
    } else {
      // Smooth drone apex arc
      camFlightMidPos.addVectors(camFlightStartPos, camFlightEndPos).multiplyScalar(0.5);
      camFlightMidPos.y += 1.2;
      flightDuration = durationOverride || 1100;
    }

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

    const wasInSection = (flightState === 'in_section' || (flightState === 'warping_out' && isSwitchingSections));
    const island = ISLANDS[sectionKey];

    // Update active nav pill
    document.querySelectorAll('.nav-pill').forEach(pill => {
      if (pill.getAttribute('data-section') === sectionKey) {
        pill.classList.add('is-active');
      } else {
        pill.classList.remove('is-active');
      }
    });

    startFlightTo(island.camPos, island.camLook, 'warping_out', sectionKey, island.targetP, wasInSection ? 800 : 1100, wasInSection);
  }

  function closeSection() {
    if (flightState === 'timeline' || flightState === 'warping_in') return;

    isSwitchingSections = false;
    document.querySelectorAll('.nav-pill').forEach(pill => pill.classList.remove('is-active'));
    getTimelineCamera(smoothProgress, timelineTargetPos, timelineTargetLook);

    startFlightTo(timelineTargetPos, timelineTargetLook, 'warping_in', null, smoothProgress, 1100, false);
  }

  let prevIsSectionActive = false;
  let prevActiveSection = null;

  function update3DSpatialIslands() {
    document.body.classList.toggle('in-spatial-mode', flightState !== 'timeline');

    let isSectionActive;
    if (isSwitchingSections) {
      isSectionActive = true;
    } else {
      isSectionActive = flightState === 'in_section' || (flightState === 'warping_out' && (performance.now() - flightStartTime) > flightDuration * 0.32);
    }

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
  let meshSpinY = 0.0;
  let lastClockTime = 0.0;

  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    const dt = Math.min(0.05, Math.max(0.001, elapsedTime - lastClockTime));
    lastClockTime = elapsedTime;

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
        isSwitchingSections = false;
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
        document.body.classList.remove('in-spatial-mode');
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
      const totalMorph = currentMorphAbout + currentMorphPrivacy + currentMorphAudience + currentMorphDownload;
      const morphFactor = Math.min(1.0, totalMorph);

      if (morphFactor < 0.001) {
        meshSpinY += dt * 0.10;
        wavePoints.rotation.y = meshSpinY + currentCamX * 0.04;
        wavePoints.rotation.x = currentCamY * 0.025;
      } else {
        const nearestFront = Math.round(meshSpinY / (Math.PI * 2.0)) * (Math.PI * 2.0);
        meshSpinY += (nearestFront - meshSpinY) * Math.min(1.0, dt * 3.5);

        // Gentle organic 3D rocking / swaying when in 3D object form
        const objRockY = Math.sin(elapsedTime * 0.85) * 0.11;
        const objRockX = Math.cos(elapsedTime * 0.65) * 0.05;

        const blendY = (meshSpinY + currentCamX * 0.04) * (1.0 - morphFactor) +
                       (nearestFront + objRockY + currentCamX * 0.05) * morphFactor;
        const blendX = (currentCamY * 0.025) * (1.0 - morphFactor) +
                       (objRockX + currentCamY * 0.03) * morphFactor;

        wavePoints.rotation.y = blendY;
        wavePoints.rotation.x = blendX;
      }
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
