// ==========================================================================
// «ГОВОРИ» — ULTRA-MINIMALIST SHOWCASE & INTERACTION ENGINE
// ==========================================================================

(() => {
  'use strict';

  // ── SCENARIOS DATA ──
  const SCENARIOS = {
    telegram: {
      label: 'Чат с командой (Telegram):',
      rawText: '«<span class="filler-word">ну короче</span> привет <span class="filler-word">эээ</span> давай завтра <span class="filler-word">часиков</span> в шесть созвонимся»',
      cleanText: '«Привет! Давай завтра в 18:00 созвонимся 👍»'
    },
    vscode: {
      label: 'Редактор кода (main.ts):',
      rawText: '«<span class="filler-word">так давай напишем</span> функцию <span class="filler-word">эээ</span> для обработки хука <span class="filler-word">типа</span> асинк»',
      cleanText: '«async function handleWebhook(payload: WebhookPayload) {»'
    },
    notion: {
      label: 'Заметки проекта (Notion):',
      rawText: '«<span class="filler-word">ну в общем</span> ключевая задача на спринт <span class="filler-word">это</span> релиз версии один ноль шесть»',
      cleanText: '«Ключевая задача на спринт: релиз версии v1.0.6»'
    }
  };

  let currentApp = 'telegram';
  let loopTimer = null;
  let animFrameId = null;
  let waveCanvas, waveCtx;
  let wavePhase = 0;
  let isListening = true;

  // ── INIT ──
  document.addEventListener('DOMContentLoaded', () => {
    initWaveform();
    initShowcaseLoop();
    initTabSwitches();
    initKeyInteractions();
    initOSDetection();
  });

  // ── WAVEFORM CANVAS (60FPS) ──
  function initWaveform() {
    waveCanvas = document.getElementById('hud-wave-canvas');
    if (!waveCanvas) return;
    waveCtx = waveCanvas.getContext('2d');

    function drawWave() {
      wavePhase += 0.08;
      const w = waveCanvas.width;
      const h = waveCanvas.height;
      waveCtx.clearRect(0, 0, w, h);

      const barCount = 5;
      const barWidth = 3;
      const gap = 5;
      const totalWidth = barCount * barWidth + (barCount - 1) * gap;
      const startX = (w - totalWidth) / 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight;
        if (isListening) {
          const amp = Math.sin(wavePhase + i * 0.9) * 0.5 + 0.5;
          barHeight = 4 + amp * (h - 6);
        } else {
          barHeight = 4;
        }

        const x = startX + i * (barWidth + gap);
        const y = (h - barHeight) / 2;

        waveCtx.fillStyle = '#FF334B';
        waveCtx.beginPath();
        waveCtx.roundRect(x, y, barWidth, barHeight, 2);
        waveCtx.fill();
      }

      requestAnimationFrame(drawWave);
    }

    drawWave();
  }

  // ── SHOWCASE DEMO LOOP ──
  function initShowcaseLoop() {
    const stage = document.getElementById('stage-text');
    const hudStatus = document.getElementById('hud-status');
    const progressBar = document.getElementById('cycle-progress');
    const contextLabel = document.getElementById('editor-context');
    if (!stage || !hudStatus || !progressBar) return;

    let startTime = performance.now();
    const cycleDuration = 6500; // 6.5s per full cycle

    function runCycle() {
      if (loopTimer) clearTimeout(loopTimer);

      const scenario = SCENARIOS[currentApp];
      if (contextLabel) contextLabel.textContent = scenario.label;

      // PHASE 1: Listening & speaking (0s - 2.0s)
      isListening = true;
      hudStatus.textContent = 'Слушаю...';
      hudStatus.style.color = '#FFFFFF';
      stage.innerHTML = scenario.rawText;
      stage.classList.remove('clean-result');

      // PHASE 2: Strike-through filler words (2.0s)
      loopTimer = setTimeout(() => {
        isListening = false;
        hudStatus.textContent = 'Очистка речи...';
        hudStatus.style.color = '#FF5C6F';

        const fillers = stage.querySelectorAll('.filler-word');
        fillers.forEach(f => f.classList.add('struck'));

        // PHASE 3: Insert Clean Text (3.4s)
        loopTimer = setTimeout(() => {
          hudStatus.textContent = 'Напечатано ✓';
          hudStatus.style.color = '#48BB78';

          stage.innerHTML = `<span class="clean-result">${scenario.cleanText}</span> <span class="clean-badge">180ms</span>`;

          // PHASE 4: Loop restart (6.5s)
          loopTimer = setTimeout(() => {
            runCycle();
          }, 3100);
        }, 1400);
      }, 2000);
    }

    // Smooth progress bar update
    function updateProgress(now) {
      const elapsed = (now - startTime) % cycleDuration;
      const pct = (elapsed / cycleDuration) * 100;
      if (progressBar) progressBar.style.width = `${pct}%`;
      requestAnimationFrame(updateProgress);
    }

    runCycle();
    requestAnimationFrame(updateProgress);
  }

  // ── APP TABS INTERACTION ──
  function initTabSwitches() {
    const tabs = document.querySelectorAll('.w-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentApp = tab.dataset.app;
        restartCycle();
      });
    });
  }

  function restartCycle() {
    const stage = document.getElementById('stage-text');
    const hudStatus = document.getElementById('hud-status');
    const contextLabel = document.getElementById('editor-context');
    if (!stage || !hudStatus) return;

    if (loopTimer) clearTimeout(loopTimer);

    const scenario = SCENARIOS[currentApp];
    if (contextLabel) contextLabel.textContent = scenario.label;

    isListening = true;
    hudStatus.textContent = 'Слушаю...';
    hudStatus.style.color = '#FFFFFF';
    stage.innerHTML = scenario.rawText;

    loopTimer = setTimeout(() => {
      isListening = false;
      hudStatus.textContent = 'Очистка речи...';
      hudStatus.style.color = '#FF5C6F';

      const fillers = stage.querySelectorAll('.filler-word');
      fillers.forEach(f => f.classList.add('struck'));

      loopTimer = setTimeout(() => {
        hudStatus.textContent = 'Напечатано ✓';
        hudStatus.style.color = '#48BB78';
        stage.innerHTML = `<span class="clean-result">${scenario.cleanText}</span> <span class="clean-badge">180ms</span>`;

        loopTimer = setTimeout(() => {
          restartCycle();
        }, 3000);
      }, 1400);
    }, 2000);
  }

  // ── KEYBOARD / CLICK RESTART ──
  function initKeyInteractions() {
    const mockup = document.querySelector('.window-mockup');
    if (mockup) {
      mockup.addEventListener('click', () => {
        restartCycle();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        restartCycle();
      }
    });
  }

  // ── OS DETECTION ──
  function initOSDetection() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMac = ua.includes('macintosh') || ua.includes('mac os');

    const downloadBtn = document.getElementById('download-btn');
    const btnText = document.getElementById('btn-text');
    const altLink = document.getElementById('alt-os-link');

    if (isMac && downloadBtn && btnText && altLink) {
      downloadBtn.href = 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-1.0.6.dmg';
      btnText.textContent = 'Скачать для macOS';
      altLink.href = 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-setup-1.0.6.exe';
      altLink.textContent = 'Версия для Windows (.exe)';

      // Switch Windows icon to Apple icon
      const icon = downloadBtn.querySelector('.btn-icon');
      if (icon) {
        icon.innerHTML = `<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8.92-2.85-.9.04-2 .6-2.65 1.36-.56.65-1.06 1.71-.93 2.73 1.01.08 2.04-.49 2.66-1.24z"/>`;
      }
    }
  }

})();
