// ==========================================================================
// «ГОВОРИ» — INTERACTIVE SCRIPTS (Redesign v2)
// 1. SVG Marquee animation (CSS-driven, JS offset fallback)
// 2. Interactive Floating Pill HUD with haptic audio
// 3. Global Hotkey (Ctrl + ~)
// 4. Context Switcher with before/after highlighting
// 5. Velocity Calculator
// 6. OS Detection
// 7. Scroll Reveal (IntersectionObserver)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initSvgMarquee();
  initFloatingPill();
  initGlobalHotkey();
  initContextSwitcher();
  initVelocityCalculator();
  initOSDetection();
  initScrollReveal();
});

// --------------------------------------------------------------------------
// 1. SVG MARQUEE — animate textPath offset
// --------------------------------------------------------------------------

function initSvgMarquee() {
  const rawTP = document.getElementById('marquee-raw');
  const cleanTP = document.getElementById('marquee-clean');

  if (!rawTP && !cleanTP) return;

  let t = 0;

  function tick() {
    t += 0.15;

    if (rawTP) {
      rawTP.setAttribute('startOffset', (-t * 2) % 3000 + 'px');
    }
    if (cleanTP) {
      cleanTP.setAttribute('startOffset', (-t * 1.4) % 3000 + 'px');
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// --------------------------------------------------------------------------
// 2. HAPTIC AUDIO (Web Audio click)
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
// 3. FLOATING PILL HUD — Interactive demo cycle
// --------------------------------------------------------------------------

const STREAM_SAMPLES = [
  {
    rawHtml: '<span class="filler">ну короче</span> привет <span class="filler">эээ</span> давай завтра <span class="filler">часиков</span> в шесть обсудим <span class="filler">ааа</span> новый релиз',
    clean: 'Привет! Давай завтра в 18:00 обсудим новый релиз 👍',
    app: 'Telegram'
  },
  {
    rawHtml: '<span class="filler">ну</span> уважаемый александр михайлович направляю <span class="filler">вот</span> вам акт сверки <span class="filler">эээ</span> с уважением',
    clean: 'Уважаемый Александр Михайлович! Направляю вам акт сверки.\n\nС уважением,',
    app: 'Outlook'
  },
  {
    rawHtml: 'напиши функцию на тайпскрипте которая <span class="filler">ээ</span> делает запрос с <span class="filler">типа</span> таймаутом пять секунд',
    clean: 'export async function fetchWithTimeout(\n  url: string,\n  timeoutMs = 5000\n): Promise<Response>',
    app: 'VS Code'
  },
  {
    rawHtml: 'план на день <span class="filler">ну короче</span> созвон с дизайнером <span class="repetition">потом потом</span> проверка сборки публикация релиза',
    clean: '• Созвон с дизайнером\n• Проверка сборки v1.0.6\n• Публикация обновления',
    app: 'Notion'
  }
];

let currentSampleIdx = 0;
let isPillActive = false;

function initFloatingPill() {
  const pill = document.getElementById('floating-pill-hud');
  pill?.addEventListener('click', triggerPillCycle);
}

async function triggerPillCycle() {
  if (isPillActive) return;
  isPillActive = true;

  const eq = document.getElementById('hud-eq');
  const micIcon = document.getElementById('hud-mic-icon');
  const mainLabel = document.getElementById('hud-main-label');
  const metaLabel = document.getElementById('hud-meta-label');
  const rawText = document.getElementById('live-raw-text');
  const cleanText = document.getElementById('live-clean-text');
  const appTag = document.getElementById('live-stream-app');

  const data = STREAM_SAMPLES[currentSampleIdx];
  currentSampleIdx = (currentSampleIdx + 1) % STREAM_SAMPLES.length;

  // Start listening
  playHapticTone('start');
  eq?.classList.add('active');
  micIcon?.classList.add('active');
  if (mainLabel) mainLabel.textContent = 'Слушаю вас...';
  if (metaLabel) metaLabel.textContent = 'Ctrl + ~';

  // Show raw speech with error highlighting
  if (rawText) rawText.innerHTML = data.rawHtml;
  if (cleanText) {
    cleanText.style.opacity = '0.3';
    cleanText.textContent = '...';
  }
  if (appTag) appTag.textContent = data.app;

  await wait(900);

  // Processing
  if (mainLabel) mainLabel.textContent = 'Очистка нейросетью...';
  await wait(400);

  // Show clean result
  playHapticTone('stop');
  eq?.classList.remove('active');
  micIcon?.classList.remove('active');
  if (mainLabel) mainLabel.textContent = 'Вставлено в окно';
  if (metaLabel) metaLabel.textContent = '185 мс';

  if (cleanText) {
    cleanText.textContent = data.clean;
    cleanText.style.opacity = '1';
  }

  await wait(1800);
  if (mainLabel) mainLabel.textContent = 'Готов к записи';
  if (metaLabel) metaLabel.textContent = 'Нажмите или Ctrl + ~';
  isPillActive = false;
}

// --------------------------------------------------------------------------
// 4. GLOBAL HOTKEY (CTRL + ~)
// --------------------------------------------------------------------------

function initGlobalHotkey() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === '`' || e.key === '~' || e.code === 'Backquote' || e.key === 'ё' || e.key === 'Ё')) {
      e.preventDefault();
      triggerPillCycle();
    }
  });
}

// --------------------------------------------------------------------------
// 5. CONTEXT SWITCHER with before/after highlighting
// --------------------------------------------------------------------------

const CONTEXT_MAP = {
  telegram: {
    appName: 'Telegram Desktop',
    spokenHtml: '<span class="filler">слушай</span> привет <span class="filler">а</span> скинь <span class="filler">пожалуйста</span> правки по сайту до обеда',
    output: 'Привет! Скинь, пожалуйста, правки по сайту до обеда 👍'
  },
  gmail: {
    appName: 'Gmail / Деловой документ',
    spokenHtml: '<span class="filler">ну</span> добрый день направляю <span class="filler">вот это</span> коммерческое предложение по разработке <span class="filler">эээ</span> с уважением иван',
    output: 'Добрый день!\n\nНаправляю вам коммерческое предложение по разработке платформы.\n\nС уважением,\nИван'
  },
  vscode: {
    appName: 'VS Code — httpClient.ts',
    spokenHtml: 'создай <span class="filler">типа</span> асинхронную функцию получить настройки которая <span class="filler">ну</span> возвращает промис с типом апп сеттингс',
    output: 'async function getSettings(): Promise<AppSettings> {\n  return storage.getSettings();\n}'
  },
  notion: {
    appName: 'Notion — Спринт 12',
    spokenHtml: 'задачи на сегодня <span class="filler">ну короче</span> провести созвон с командой <span class="repetition">утвердить утвердить</span> релиз запустить тестирование',
    output: '• Провести синхронизацию с командой\n• Утвердить релиз версии 1.0.6\n• Запустить автоматизированное тестирование'
  }
};

function initContextSwitcher() {
  const tabs = document.querySelectorAll('.tab-pill[data-tab]');
  const ctxSpoken = document.getElementById('ctx-spoken');
  const ctxOutput = document.getElementById('ctx-output');
  const ctxAppName = document.getElementById('ctx-app-name');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const key = tab.getAttribute('data-tab');
      const item = CONTEXT_MAP[key];
      if (!item) return;

      playHapticTone('start');

      // Use innerHTML for spoken to show filler highlighting
      if (ctxSpoken) ctxSpoken.innerHTML = item.spokenHtml;
      // Use textContent for output (plain clean text, preserves newlines via white-space: pre-wrap)
      if (ctxOutput) ctxOutput.textContent = item.output;
      if (ctxAppName) ctxAppName.textContent = item.appName;
    });
  });
}

// --------------------------------------------------------------------------
// 6. VELOCITY CALCULATOR
// --------------------------------------------------------------------------

function initVelocityCalculator() {
  const slider = document.getElementById('velocity-slider');
  const hoursVal = document.getElementById('slider-hours-val');
  const savedMinBox = document.getElementById('metric-saved-mins');
  const savedDaysBox = document.getElementById('metric-saved-days');

  function update(hours) {
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
// 7. OS DETECTION
// --------------------------------------------------------------------------

const GITHUB_DOWNLOADS = {
  win64: 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-setup-1.0.6.exe',
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
        Скачать для macOS
      `;
    }
    if (dockMac) dockMac.classList.add('featured');
    if (dockWin) dockWin.classList.remove('featured');
  } else {
    if (dockWin) dockWin.classList.add('featured');
    if (dockMac) dockMac.classList.remove('featured');
  }
}

// --------------------------------------------------------------------------
// 8. SCROLL REVEAL (IntersectionObserver)
// --------------------------------------------------------------------------

function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');

  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  reveals.forEach((el, i) => {
    // Stagger animation delay
    el.style.transitionDelay = `${i * 0.06}s`;
    observer.observe(el);
  });
}

// --------------------------------------------------------------------------
// UTIL
// --------------------------------------------------------------------------

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
