// ==========================================================================
// «ГОВОРИ» — ИНТЕРАКТИВНЫЕ МЕХАНИКИ (WISPR FLOW STYLE DEMO)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initOSDetection();
  initInteractiveHud();
  initContextSwitcher();
  initWpmCalculator();
});

// --------------------------------------------------------------------------
// 1. ОПРЕДЕЛЕНИЕ ОПЕРАЦИОННОЙ СИСТЕМЫ И ПРИВЯЗКА КНОПОК
// --------------------------------------------------------------------------

const DOWNLOAD_LINKS = {
  win64: 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-setup-1.0.6.exe',
  winLegacy: 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-legacy-setup-1.0.6.exe',
  mac: 'https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-1.0.6.dmg'
};

function initOSDetection() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const isMac = ua.includes('macintosh') || ua.includes('mac os');

  const heroCtaBtn = document.getElementById('hero-main-cta');
  const heroMeta = document.getElementById('hero-detected-os');
  const cardWin = document.getElementById('dl-card-win');
  const cardMac = document.getElementById('dl-card-mac');

  if (isMac) {
    if (heroCtaBtn) {
      heroCtaBtn.href = DOWNLOAD_LINKS.mac;
      heroCtaBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.36-.56.65-1.06 1.71-.93 2.73 1.01.08 2.04-.49 2.66-1.24z"/></svg>
        Скачать для macOS (.dmg)
      `;
    }
    if (heroMeta) heroMeta.textContent = 'Определена macOS • Apple Silicon & Intel • v1.0.6';
    if (cardMac) cardMac.classList.add('featured');
    if (cardWin) cardWin.classList.remove('featured');
  } else {
    if (heroCtaBtn) {
      heroCtaBtn.href = DOWNLOAD_LINKS.win64;
      heroCtaBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
        Скачать для Windows (.exe)
      `;
    }
    if (heroMeta) heroMeta.textContent = 'Определена Windows 10 / 11 (64-bit) • v1.0.6';
    if (cardWin) cardWin.classList.add('featured');
    if (cardMac) cardMac.classList.remove('featured');
  }
}

// --------------------------------------------------------------------------
// 2. ИНТЕРАКТИВНАЯ КАПСУЛА И СИМУЛЯЦИЯ РЕЧИ (HERO TRANSFORMATION)
// --------------------------------------------------------------------------

const PRESET_CASES = [
  {
    name: 'Мессенджер',
    raw: 'ну короче привет эээ давай в четверг часиков в шесть созвонимся обсудим макеты',
    cleaned: 'Привет! Давай в четверг в 18:00 созвонимся и обсудим макеты.',
    app: 'Telegram'
  },
  {
    name: 'Деловой стиль',
    raw: 'уважаемый александр михайлович ну направляю вам акт сверки за первый квартал с уважением',
    cleaned: 'Уважаемый Александр Михайлович!\n\nНаправляю вам акт сверки за I квартал.\n\nС уважением,',
    app: 'Outlook / Word'
  },
  {
    name: 'Код / IDE',
    raw: 'напиши функцию на тайпскрипте которая делает запрос к апи с таймаутом пять секунд',
    cleaned: 'export async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response>',
    app: 'VS Code'
  },
  {
    name: 'Заметка',
    raw: 'план на сегодня созвониться с дизайнером проверить сборку отправить релиз',
    cleaned: '• Созвониться с дизайнером\n• Проверить сборку релиза\n• Опубликовать обновление v1.0.6',
    app: 'Notion'
  }
];

function initInteractiveHud() {
  const hudElement = document.getElementById('interactive-hud');
  const micBtn = document.getElementById('hud-mic-btn');
  const waveform = document.getElementById('hud-waveform');
  const statusLabel = document.getElementById('hud-status-label');
  const subLabel = document.getElementById('hud-sub-label');
  const rawBox = document.getElementById('demo-raw-text');
  const cleanBox = document.getElementById('demo-clean-text');
  const appBadge = document.getElementById('demo-app-badge');
  const chipsContainer = document.getElementById('preset-chips');

  let isListening = false;
  let activeCaseIdx = 0;
  let recognition = null;

  // Инициализация Web Speech API если доступно
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isListening = true;
      setRecordingUI(true, 'Слушаю вас...');
      if (rawBox) rawBox.textContent = 'Говорите фразу в микрофон...';
      if (cleanBox) cleanBox.textContent = 'Ожидание завершения фразы...';
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalTranscript = event.results[i][0].transcript;
          handleLiveSpeechResult(finalTranscript);
        } else {
          interim += event.results[i][0].transcript;
          if (rawBox) rawBox.textContent = `«${interim}»`;
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('[WebSpeech] Error:', event.error);
      setRecordingUI(false, 'Готов');
      // При ошибке разрешения микрофона плавно переключаем на пресет
      simulatePreset(activeCaseIdx);
    };

    recognition.onend = () => {
      isListening = false;
    };
  }

  function setRecordingUI(recording, text) {
    if (recording) {
      micBtn?.classList.add('hud-mic-active');
      waveform?.classList.add('recording');
      if (statusLabel) statusLabel.textContent = text;
      if (subLabel) subLabel.textContent = 'Говорите в микрофон';
    } else {
      micBtn?.classList.remove('hud-mic-active');
      waveform?.classList.remove('recording');
      if (statusLabel) statusLabel.textContent = text;
      if (subLabel) subLabel.textContent = 'Ctrl + ~';
    }
  }

  function handleLiveSpeechResult(transcript) {
    if (!transcript) return;
    if (rawBox) rawBox.textContent = `«${transcript}»`;
    
    // Имитация очистки и AI пунктуации
    if (statusLabel) statusLabel.textContent = 'Очистка нейросетью...';
    
    setTimeout(() => {
      let cleaned = transcript.trim();
      // Очистка слов-паразитов
      cleaned = cleaned.replace(/\b(ээ+|нуу+|типа|как бы|короче)\b/gi, '').trim();
      // Капитализация первой буквы
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      // Пунктуация в конце
      if (!/[.!?]$/.test(cleaned)) cleaned += '.';
      
      setRecordingUI(false, 'Вставлено');
      if (cleanBox) cleanBox.textContent = cleaned;
      if (subLabel) subLabel.textContent = 'Задержка: 185 мс';
    }, 280);
  }

  async function simulatePreset(index) {
    const data = PRESET_CASES[index];
    activeCaseIdx = index;

    // Обновляем активный чип
    document.querySelectorAll('.preset-chip').forEach((c, idx) => {
      c.classList.toggle('active', idx === index);
    });

    if (appBadge) appBadge.textContent = data.app;
    setRecordingUI(true, 'Запись речи...');
    if (rawBox) rawBox.textContent = '';
    if (cleanBox) cleanBox.textContent = 'Нейросеть обрабатывает поток...';

    // Печать сырого текста
    await typeText(rawBox, `«${data.raw}»`, 22);

    // Пауза на обработку
    if (statusLabel) statusLabel.textContent = 'Groq Whisper + Llama 3.3...';
    waveform?.classList.remove('recording');
    await wait(240);

    // Готово
    setRecordingUI(false, 'Вставлено в окно');
    if (cleanBox) cleanBox.textContent = data.cleaned;
    if (subLabel) subLabel.textContent = 'Задержка: 188 мс';
  }

  // Клик по микрофону в HUD
  hudElement?.addEventListener('click', () => {
    if (recognition) {
      if (isListening) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch {
          simulateNextPreset();
        }
      }
    } else {
      simulateNextPreset();
    }
  });

  function simulateNextPreset() {
    activeCaseIdx = (activeCaseIdx + 1) % PRESET_CASES.length;
    simulatePreset(activeCaseIdx);
  }

  // Рендер чипов пресетов
  if (chipsContainer) {
    PRESET_CASES.forEach((item, idx) => {
      const chip = document.createElement('button');
      chip.className = `preset-chip ${idx === 0 ? 'active' : ''}`;
      chip.textContent = item.name;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        simulatePreset(idx);
      });
      chipsContainer.appendChild(chip);
    });
  }

  // Запуск первой симуляции при загрузке для вау-эффекта
  setTimeout(() => {
    simulatePreset(0);
  }, 800);
}

// --------------------------------------------------------------------------
// 3. ИНТЕРАКТИВНЫЙ ПЕРЕКЛЮЧАТЕЛЬ КОНТЕКСТОВ
// --------------------------------------------------------------------------

const CONTEXT_EXAMPLES = {
  telegram: {
    title: 'Telegram Desktop',
    speech: '«слушай привет а скинь пожалуйста правки по сайту до обеда»',
    injected: 'Привет! Скинь, пожалуйста, правки по сайту до обеда 👍'
  },
  gmail: {
    title: 'Gmail / Деловой документ',
    speech: '«добрый день направляю коммерческое предложение по разработке с уважением иван»',
    injected: 'Добрый день!\n\nНаправляю коммерческое предложение по разработке платформы.\n\nС уважением,\nИван'
  },
  vscode: {
    title: 'VS Code — main.ts',
    speech: '«создай асинхронную функцию получить настройки которая возвращает промис»',
    injected: 'async function getSettings(): Promise<AppSettings> {\n  return storage.getSettings();\n}'
  },
  notion: {
    title: 'Notion — Daily Tasks',
    speech: '«задачи на спринт провести созвон с командой утвердить релиз запустить тестирование»',
    injected: '• Провести синхронизацию с командой\n• Утвердить релиз версии 1.0.6\n• Запустить автоматизированное тестирование'
  }
};

function initContextSwitcher() {
  const tabBtns = document.querySelectorAll('.tab-btn[data-context]');
  const mockTitle = document.getElementById('mock-window-title');
  const mockSpeech = document.getElementById('mock-speech-text');
  const mockOutput = document.getElementById('mock-injected-text');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const ctxKey = btn.getAttribute('data-context');
      const data = CONTEXT_EXAMPLES[ctxKey];
      if (!data) return;

      if (mockTitle) mockTitle.textContent = data.title;
      if (mockSpeech) mockSpeech.textContent = data.speech;
      if (mockOutput) mockOutput.textContent = data.injected;
    });
  });
}

// --------------------------------------------------------------------------
// 4. КАЛЬКУЛЯТОР ПРОДУКТИВНОСТИ И СКОРОСТИ (WPM SLIDER)
// --------------------------------------------------------------------------

function initWpmCalculator() {
  const rangeInput = document.getElementById('wpm-slider');
  const hoursVal = document.getElementById('wpm-hours-val');
  const savedMinBox = document.getElementById('wpm-saved-mins');
  const savedDaysBox = document.getElementById('wpm-saved-days');

  function calculate(hours) {
    // 40 слов/мин печать vs 160 слов/мин диктовка (экономия ~45 минут на каждый час ввода)
    const minutesTypingPerDay = hours * 45;
    const timeSavedDaily = Math.round(minutesTypingPerDay * 0.75);
    // Рабочих дней в году: 240
    const workingDaysYearly = Math.round((timeSavedDaily * 240) / (8 * 60));

    if (hoursVal) hoursVal.textContent = `${hours} ч/день`;
    if (savedMinBox) savedMinBox.textContent = `~${timeSavedDaily}`;
    if (savedDaysBox) savedDaysBox.textContent = `${workingDaysYearly}`;
  }

  rangeInput?.addEventListener('input', (e) => {
    const val = Number(e.target.value) || 2;
    calculate(val);
  });

  // Начальный расчет на 3 часа в день
  calculate(3);
}

// --------------------------------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// --------------------------------------------------------------------------

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function typeText(element, text, speed) {
  return new Promise((resolve) => {
    if (!element) return resolve();
    element.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}
