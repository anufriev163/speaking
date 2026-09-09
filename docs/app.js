// govory Landing Page Interactive Scripts
document.addEventListener('DOMContentLoaded', () => {
  // 1. Detect User OS & update CTA buttons
  detectUserOS();

  // 2. Initialize Interactive HUD Simulator
  initSimulator();

  // 3. Initialize FAQ Accordion
  initFaq();

  // 4. Fetch latest release version from GitHub
  fetchLatestRelease();
});

function detectUserOS() {
  const ua = window.navigator.userAgent.toLowerCase();
  const isMac = ua.includes('macintosh') || ua.includes('mac os');
  const winBtn = document.getElementById('btn-download-win');
  const macBtn = document.getElementById('btn-download-mac');
  const osIndicator = document.getElementById('detected-os');

  if (isMac) {
    if (macBtn) macBtn.classList.add('btn-primary');
    if (winBtn) {
      winBtn.classList.remove('btn-primary');
      winBtn.classList.add('btn-secondary');
    }
    if (osIndicator) osIndicator.textContent = 'Определена система: macOS (Apple Silicon / Intel)';
  } else {
    if (winBtn) winBtn.classList.add('btn-primary');
    if (macBtn) {
      macBtn.classList.remove('btn-primary');
      macBtn.classList.add('btn-secondary');
    }
    if (osIndicator) osIndicator.textContent = 'Определена система: Windows 10 / 11 (x64)';
  }
}

const DEMO_CASES = [
  {
    raw: 'эээ привет давай созвонимся завтра типа в 5 ой нет в 6 вечера и обсудим новый релиз',
    cleaned: 'Привет! Давай созвонимся завтра в 18:00 и обсудим новый релиз.',
    app: 'Telegram',
    latency: '184 мс'
  },
  {
    raw: 'напиши функцию на тайпскрипте которая делает запрос к апи с таймаутом в пять секунд',
    cleaned: 'export async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response>',
    app: 'VS Code',
    latency: '210 мс'
  },
  {
    raw: 'уважаемый иван петрович ну направляю вам акт сверки за первый квартал с уважением',
    cleaned: 'Уважаемый Иван Петрович!\n\nНаправляю вам акт сверки за I квартал.\n\nС уважением,',
    app: 'Word',
    latency: '195 мс'
  }
];

function initSimulator() {
  const micBtn = document.getElementById('hud-mic-trigger');
  const waveform = document.getElementById('hud-waveform');
  const hudStatus = document.getElementById('hud-status-text');
  const hudLatency = document.getElementById('hud-latency-text');
  const hudAppContext = document.getElementById('hud-app-context');
  const rawBox = document.getElementById('sim-raw-text');
  const cleanBox = document.getElementById('sim-clean-text');

  let currentIdx = 0;
  let isSimulating = false;

  async function runSimulation(index: number) {
    if (isSimulating) return;
    isSimulating = true;

    const data = DEMO_CASES[index];

    // State 1: Recording
    micBtn?.classList.add('active');
    waveform?.classList.add('animated');
    if (hudStatus) hudStatus.innerHTML = '<span style="color:#ef4444">● Запись речи...</span>';
    if (hudLatency) hudLatency.textContent = 'Удерживайте Ctrl+~';
    if (hudAppContext) hudAppContext.textContent = data.app;
    if (rawBox) rawBox.textContent = 'Слушаю речь...';
    if (cleanBox) cleanBox.textContent = 'Ожидание завершения фразы...';

    // Simulate speech typing in raw box
    await typeText(rawBox, `«${data.raw}»`, 30);

    // State 2: Processing AI
    await wait(300);
    if (hudStatus) hudStatus.innerHTML = '<span style="color:#818cf8">⚡ AI-обработка (Llama 3.3)...</span>';
    waveform?.classList.remove('animated');

    // State 3: Done
    await wait(220);
    micBtn?.classList.remove('active');
    if (hudStatus) hudStatus.innerHTML = '<span style="color:#34d399">✓ Вставлено в окно</span>';
    if (hudLatency) hudLatency.textContent = `Задержка: ${data.latency}`;
    if (cleanBox) cleanBox.textContent = data.cleaned;

    isSimulating = false;
  }

  // Bind click
  micBtn?.addEventListener('click', () => {
    currentIdx = (currentIdx + 1) % DEMO_CASES.length;
    runSimulation(currentIdx);
  });

  // Run automatically once after 1s for wow effect
  setTimeout(() => {
    runSimulation(0);
  }, 900);
}

function typeText(element, text, speed) {
  return new Promise((resolve) => {
    if (!element) return resolve();
    element.textContent = '';
    let i = 0;
    const timer = setInterval(() => {
      element.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const q = item.querySelector('.faq-question');
    q?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      items.forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
}

function fetchLatestRelease() {
  fetch('https://api.github.com/repos/anufriev163/speaking/releases/latest')
    .then(r => r.json())
    .then(data => {
      if (data && data.tag_name) {
        const badge = document.getElementById('release-version-badge');
        if (badge) badge.textContent = data.tag_name;
      }
    })
    .catch(() => {
      // Fallback stays as default v1.0.1
    });
}
