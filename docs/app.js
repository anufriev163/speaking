// ==========================================================================
// «ГОВОРИ» — ART DIRECTOR INTERACTIVE SCRIPTS
// 1. Reactive 60fps Audio Silk Wave Canvas (Responds to mouse & speech)
// 2. Interactive Floating Pill with Web Audio haptic click
// 3. Global Hotkey listener (Ctrl + ~) on the web page
// 4. Kinetic Context switcher & WPM velocity calculator
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initAudioSilkCanvas();
  initFloatingPill();
  initGlobalHotkey();
  initContextSwitcher();
  initVelocityCalculator();
  initOSDetection();
});

// --------------------------------------------------------------------------
// 1. REACTIVE AUDIO SILK WAVE CANVAS (THE HERO KILLER EFFECT)
// --------------------------------------------------------------------------

let canvasSpeechEnergy = 0.25; // 0.2 idle, 1.0 peak speech

function initAudioSilkCanvas() {
  const canvas = document.getElementById('audio-wave-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = canvas.offsetWidth || 1200);
  let height = (canvas.height = canvas.offsetHeight || 440);

  let mouseX = width / 2;
  let mouseY = height / 2;
  let mouseTargetX = mouseX;
  let isMouseOver = false;

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.offsetWidth || 1200;
    height = canvas.height = canvas.offsetHeight || 440;
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
      isMouseOver = true;
      mouseTargetX = e.clientX - rect.left;
    } else {
      isMouseOver = false;
      mouseTargetX = width / 2;
    }
  });

  let step = 0;

  // Wave definitions: layers with subtle phase differences and cherry hues
  const waves = [
    { color: 'rgba(154, 0, 2, 0.40)', speed: 0.024, wavelength: 0.007, baseAmp: 36, offset: 0 },
    { color: 'rgba(196, 22, 25, 0.32)', speed: 0.018, wavelength: 0.005, baseAmp: 28, offset: 1.8 },
    { color: 'rgba(160, 205, 235, 0.50)', speed: 0.014, wavelength: 0.006, baseAmp: 22, offset: 3.2 },
    { color: 'rgba(154, 0, 2, 0.18)', speed: 0.030, wavelength: 0.009, baseAmp: 45, offset: 4.5 }
  ];

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Smooth mouse position interpolation
    mouseX += (mouseTargetX - mouseX) * 0.06;

    step += 0.02;

    // Decay speech energy back to resting state
    if (canvasSpeechEnergy > 0.25) {
      canvasSpeechEnergy *= 0.96;
    }

    waves.forEach((w) => {
      ctx.beginPath();
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 2.2;

      const midY = height / 2;

      for (let x = 0; x < width; x += 3) {
        // Distance attenuation from mouse / center
        const distFromMouse = Math.abs(x - mouseX);
        const mouseInfluence = Math.max(0, 1 - distFromMouse / 380) * 0.7;

        // Dynamic amplitude influenced by speech energy + mouse proximity
        const currentAmp = (w.baseAmp * canvasSpeechEnergy) + (mouseInfluence * 35);

        // Sinusoidal superposition for organic silk wave feel
        const y = midY +
          Math.sin(x * w.wavelength + step * w.speed * 80 + w.offset) * currentAmp +
          Math.cos(x * 0.003 + step * 0.8) * (currentAmp * 0.35);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    });

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

// --------------------------------------------------------------------------
// 2. SYNTHETIC HAPTIC AUDIO (WEB AUDIO CLICK)
// --------------------------------------------------------------------------

function playHapticTone(type = 'start') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (type === 'start') {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    } else {
      osc.frequency.setValueAtTime(740, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {}
}

// --------------------------------------------------------------------------
// 3. FLOATING PILL HUD INTERACTION
// --------------------------------------------------------------------------

const STREAM_SAMPLES = [
  {
    raw: 'ну короче привет эээ давай завтра часиков в шесть обсудим новый релиз',
    clean: 'Привет! Давай завтра в 18:00 обсудим новый релиз 👍',
    app: 'Telegram'
  },
  {
    raw: 'уважаемый александр михайлович направляю вам акт сверки с уважением',
    clean: 'Уважаемый Александр Михайлович! Направляю вам акт сверки. С уважением,',
    app: 'Outlook'
  },
  {
    raw: 'напиши функцию на тайпскрипте которая делает запрос с таймаутом пять секунд',
    clean: 'export async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response>',
    app: 'VS Code'
  },
  {
    raw: 'план на день созвон с дизайнером проверка сборки публикация релиза',
    clean: '• Созвон с дизайнером\n• Проверка сборки v1.0.6\n• Публикация обновления',
    app: 'Notion'
  }
];

let currentSampleIdx = 0;
let isPillActive = false;

function initFloatingPill() {
  const pill = document.getElementById('floating-pill-hud');
  const eq = document.getElementById('hud-eq');
  const micIcon = document.getElementById('hud-mic-icon');
  const mainLabel = document.getElementById('hud-main-label');
  const metaLabel = document.getElementById('hud-meta-label');
  const streamText = document.getElementById('live-stream-text');
  const streamAppTag = document.getElementById('live-stream-app');

  pill?.addEventListener('click', triggerPillCycle);
}

async function triggerPillCycle() {
  if (isPillActive) return;
  isPillActive = true;

  const eq = document.getElementById('hud-eq');
  const micIcon = document.getElementById('hud-mic-icon');
  const mainLabel = document.getElementById('hud-main-label');
  const metaLabel = document.getElementById('hud-meta-label');
  const streamText = document.getElementById('live-stream-text');
  const streamAppTag = document.getElementById('live-stream-app');

  const data = STREAM_SAMPLES[currentSampleIdx];
  currentSampleIdx = (currentSampleIdx + 1) % STREAM_SAMPLES.length;

  // Sound & flare
  playHapticTone('start');
  canvasSpeechEnergy = 1.35; // surge canvas waves
  eq?.classList.add('active');
  micIcon?.classList.add('active');
  if (mainLabel) mainLabel.textContent = 'Слушаю вас...';
  if (metaLabel) metaLabel.textContent = 'Ctrl + ~';
  if (streamText) streamText.innerHTML = `<em>«${data.raw}»</em>`;
  if (streamAppTag) streamAppTag.textContent = data.app;

  // Simulate dictation & AI cleanup in 800ms
  await wait(750);

  // Processing stage
  if (mainLabel) mainLabel.textContent = 'Очистка нейросетью...';
  canvasSpeechEnergy = 0.8;
  await wait(320);

  // Success stage
  playHapticTone('stop');
  canvasSpeechEnergy = 0.3;
  eq?.classList.remove('active');
  micIcon?.classList.remove('active');
  if (mainLabel) mainLabel.textContent = 'Вставлено в окно';
  if (metaLabel) metaLabel.textContent = '185 мс';
  if (streamText) streamText.innerHTML = `<strong>${data.clean}</strong>`;

  await wait(1400);
  if (mainLabel) mainLabel.textContent = 'Готов к записи';
  if (metaLabel) metaLabel.textContent = 'Нажмите или Ctrl + ~';
  isPillActive = false;
}

// --------------------------------------------------------------------------
// 4. GLOBAL HOTKEY (CTRL + ~) TRIGGER ON THE PAGE
// --------------------------------------------------------------------------

function initGlobalHotkey() {
  window.addEventListener('keydown', (e) => {
    // Check Ctrl + ~ (key === '`' or code === 'Backquote')
    if (e.ctrlKey && (e.key === '`' || e.key === '~' || e.code === 'Backquote' || e.key === 'ё' || e.key === 'Ё')) {
      e.preventDefault();
      triggerPillCycle();
    }
  });
}

// --------------------------------------------------------------------------
// 5. TACTILE CONTEXT SWITCHER
// --------------------------------------------------------------------------

const CONTEXT_MAP = {
  telegram: {
    title: 'Telegram Desktop',
    spoken: '«слушай привет а скинь пожалуйста правки по сайту до обеда»',
    output: 'Привет! Скинь, пожалуйста, правки по сайту до обеда 👍'
  },
  gmail: {
    title: 'Gmail / Деловой документ',
    spoken: '«добрый день направляю коммерческое предложение по разработке с уважением иван»',
    output: 'Добрый день!\n\nНаправляю вам коммерческое предложение по разработке платформы.\n\nС уважением,\nИван'
  },
  vscode: {
    title: 'VS Code — httpClient.ts',
    spoken: '«создай асинхронную функцию получить настройки которая возвращает промис с типом апп сеттингс»',
    output: 'async function getSettings(): Promise<AppSettings> {\n  return storage.getSettings();\n}'
  },
  notion: {
    title: 'Notion — Спринт 12',
    spoken: '«задачи на сегодня провести созвон с командой утвердить релиз запустить тестирование»',
    output: '• Провести синхронизацию с командой\n• Утвердить релиз версии 1.0.6\n• Запустить автоматизированное тестирование'
  }
};

function initContextSwitcher() {
  const tabs = document.querySelectorAll('.tab-pill[data-tab]');
  const winTitle = document.getElementById('win-title');
  const winSpoken = document.getElementById('win-spoken');
  const winOutput = document.getElementById('win-output');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const key = tab.getAttribute('data-tab');
      const item = CONTEXT_MAP[key];
      if (!item) return;

      playHapticTone('start');
      if (winTitle) winTitle.textContent = item.title;
      if (winSpoken) winSpoken.textContent = item.spoken;
      if (winOutput) winOutput.textContent = item.output;
    });
  });
}

// --------------------------------------------------------------------------
// 6. VELOCITY & WPM SLIDER
// --------------------------------------------------------------------------

function initVelocityCalculator() {
  const slider = document.getElementById('velocity-slider');
  const hoursVal = document.getElementById('slider-hours-val');
  const savedMinBox = document.getElementById('metric-saved-mins');
  const savedDaysBox = document.getElementById('metric-saved-days');

  function update(hours) {
    // 40 WPM fingers vs 160 WPM voice -> saves 45 minutes for each hour of keyboard entry
    const dailyMins = Math.round(hours * 35);
    const yearlyDays = Math.round((dailyMins * 240) / (8 * 60));

    if (hoursVal) hoursVal.textContent = `${hours} ч / день`;
    if (savedMinBox) savedMinBox.textContent = `~${dailyMins}`;
    if (savedDaysBox) savedDaysBox.textContent = `${yearlyDays}`;
  }

  slider?.addEventListener('input', (e) => {
    update(Number(e.target.value) || 3);
  });

  update(3);
}

// --------------------------------------------------------------------------
// 7. OS DETECTION & DIRECT DOWNLOADS
// --------------------------------------------------------------------------

const GITHUB_DOWNLOADS = {
  win64: 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-setup-1.0.6.exe',
  winLegacy: 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-legacy-setup-1.0.6.exe',
  mac: 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-1.0.6.dmg'
};

function initOSDetection() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const isMac = ua.includes('macintosh') || ua.includes('mac os');

  const mainCta = document.getElementById('hero-primary-cta');
  const dockWin = document.getElementById('dock-item-win');
  const dockMac = document.getElementById('dock-item-mac');

  if (isMac) {
    if (mainCta) {
      mainCta.href = GITHUB_DOWNLOADS.mac;
      mainCta.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.36-.56.65-1.06 1.71-.93 2.73 1.01.08 2.04-.49 2.66-1.24z"/></svg>
        Скачать для macOS (.dmg)
      `;
    }
    if (dockMac) dockMac.classList.add('featured');
    if (dockWin) dockWin.classList.remove('featured');
  } else {
    if (mainCta) {
      mainCta.href = GITHUB_DOWNLOADS.win64;
      mainCta.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
        Скачать для Windows (.exe)
      `;
    }
    if (dockWin) dockWin.classList.add('featured');
    if (dockMac) dockMac.classList.remove('featured');
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
