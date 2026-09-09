import { ToolRegistry } from '../electron/harness/tooling/ToolRegistry';
import { ContextManager } from '../electron/harness/context/ContextManager';
import { LifecycleManager } from '../electron/harness/lifecycle/LifecycleManager';
import { ObservabilityManager } from '../electron/harness/observability/ObservabilityManager';
import { VerificationManager } from '../electron/harness/verification/VerificationManager';
import { GovernanceManager } from '../electron/harness/governance/GovernanceManager';
import { ExecutionManager } from '../electron/harness/execution/ExecutionManager';
import { GovoriHarness } from '../electron/harness/index';
import { storage } from '../electron/services/storage';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function test(suite: string, name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, name, passed: false, error: err?.message || String(err), durationMs });
    console.error(`  [FAIL] ${name} (${durationMs}ms):`, err?.message || err);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function assertEquals(actual: any, expected: any, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ': ' : ''}Expected [${expected}] but got [${actual}]`);
  }
}

async function runTestSuite() {
  console.log('\n========================================');
  console.log('   ТЕСТИРОВАНИЕ HARNESS СЛОЯ «ГОВОРИ AI»');
  console.log('========================================\n');

  // ----------------------------------------------------
  // 1. ТЕСТ СЛОЯ: VERIFICATION
  // ----------------------------------------------------
  console.log('[1/7] Тестирование Verification Layer (Анти-галлюцинации & Валидация)...');
  const verification = new VerificationManager();

  await test('Verification', 'Отклонение пустой строки или пробелов', () => {
    const res = verification.verifyTranscription('   ');
    assert(!res.isValid, 'Пустая строка должна быть отклонена');
    assertEquals(res.sanitizedText, '');
  });

  await test('Verification', 'Отклонение шумовых знаков препинания (. / , / !?)', () => {
    const res1 = verification.verifyTranscription('...');
    assert(!res1.isValid && res1.hallucinationDetected === true, 'Многоточие должно быть отклонено');

    const res2 = verification.verifyTranscription(' - ');
    assert(!res2.isValid, 'Одиночное тире должно быть отклонено');
  });

  await test('Verification', 'Детекция типичных галлюцинаций Whisper при тишине', () => {
    const hallucinations = [
      'Субтитры делал Diktuy',
      'Редактор субтитров: А. Семкин',
      'Продолжение следует...',
      'Ставьте лайки и подписывайтесь на канал',
      'Спасибо за просмотр!'
    ];

    for (const h of hallucinations) {
      const res = verification.verifyTranscription(h);
      assert(!res.isValid, `Галлюцинация "${h}" должна быть отклонена`);
      assert(res.hallucinationDetected === true, 'Флаг hallucinationDetected должен быть true');
    }
  });

  await test('Verification', 'Детекция зацикленных повторов (stutter loops)', () => {
    const res = verification.verifyTranscription('да, да, да, да, да, да');
    assert(!res.isValid, 'Зацикленная фраза должна быть отклонена');
  });

  await test('Verification', 'Успешная валидация нормальной речи', () => {
    const text = 'Привет! Создай новый компонент для авторизации.';
    const res = verification.verifyTranscription(text);
    assert(res.isValid, 'Корректный текст должен быть одобрен');
    assertEquals(res.sanitizedText, text);
  });

  // ----------------------------------------------------
  // 2. ТЕСТ СЛОЯ: GOVERNANCE
  // ----------------------------------------------------
  console.log('\n[2/7] Тестирование Governance Layer (PII маскирование & Квоты)...');
  const governance = new GovernanceManager();

  await test('Governance', 'Маскирование номеров банковских карт', () => {
    const input = 'Мой номер карты 4276 1234 5678 9012 оплати счет';
    const res = governance.filterPII(input);
    assert(res.allowed, 'Запрос должен быть разрешен');
    assert(res.redactedText.includes('[CARD-REDACTED]'), 'Номер карты должен быть замаскирован');
    assert(!res.redactedText.includes('4276 1234 5678 9012'), 'Оригинальный номер не должен присутствовать');
    assert(res.violations.includes('Credit Card'), 'Должно быть зафиксировано нарушение Credit Card');
  });

  await test('Governance', 'Маскирование API ключей в речи', () => {
    const input = 'Ключ равен gsk_1234567890abcdef1234567890abcdef сохраняй';
    const res = governance.filterPII(input);
    assert(res.redactedText.includes('[API-KEY-REDACTED]'), 'API ключ должен быть замаскирован');
    assert(res.violations.includes('API Key'), 'Должно быть зафиксировано нарушение API Key');
  });

  await test('Governance', 'Подсчет квоты запросов Groq (14 400)', () => {
    const quotaBefore = governance.getDailyQuotaStatus();
    governance.trackRequest();
    const quotaAfter = governance.getDailyQuotaStatus();
    assertEquals(quotaAfter.used, quotaBefore.used + 1, 'Счетчик запросов должен инкрементироваться');
    assertEquals(quotaAfter.remaining, quotaBefore.remaining - 1, 'Остаток квоты должен уменьшиться');
  });

  // ----------------------------------------------------
  // 3. ТЕСТ СЛОЯ: CONTEXT
  // ----------------------------------------------------
  console.log('\n[3/7] Тестирование Context Layer (Автозамена сниппетов & Контекст)...');
  const toolReg = new ToolRegistry();
  const contextMgr = new ContextManager(toolReg);

  await test('Context', 'Автозамена сниппетов (текстовые шаблоны)', () => {
    const snippets = [
      { id: '1', trigger: 'мой имейл', replacement: 'dev@company.com' },
      { id: '2', trigger: 'мой телефон', replacement: '+7 (999) 000-11-22' }
    ];

    const input = 'Отправь отчет на мой имейл прямо сейчас';
    const output = contextMgr.applySnippets(input, snippets);
    assertEquals(output, 'Отправь отчет на dev@company.com прямо сейчас', 'Сниппет "мой имейл" должен замениться');
  });

  await test('Context', 'Обогащение контекста активного окна', async () => {
    const enriched = await contextMgr.getEnrichedContext({
      processName: 'Code.exe',
      windowTitle: 'main.ts — говори',
      category: 'code',
      categoryLabel: 'IDE'
    });

    assert(enriched.activeContext.category === 'code', 'Категория должна быть code');
    assert(typeof enriched.promptHint === 'string' && enriched.promptHint.length > 0, 'Prompt hint должен быть сформирован');
  });

  // ----------------------------------------------------
  // 4. ТЕСТ СЛОЯ: LIFECYCLE
  // ----------------------------------------------------
  console.log('\n[4/7] Тестирование Lifecycle Layer (Стейт-машина & События)...');
  const lifecycle = new LifecycleManager();

  await test('Lifecycle', 'Корректность переходов стейт-машины', () => {
    assertEquals(lifecycle.getState(), 'IDLE', 'Начальное состояние должно быть IDLE');
    assert(lifecycle.canStartRecording(), 'В состоянии IDLE можно начинать запись');

    let eventFired = false;
    lifecycle.once('state:change', (e) => {
      eventFired = true;
      assertEquals(e.previous, 'IDLE');
      assertEquals(e.current, 'TRANSCRIBING');
      assertEquals(e.sessionId, 'sess_123');
    });

    lifecycle.transitionTo('TRANSCRIBING', 'sess_123');
    assertEquals(lifecycle.getState(), 'TRANSCRIBING');
    assert(lifecycle.isBusy(), 'В состоянии TRANSCRIBING система должна быть занята');
    assert(eventFired, 'Событие state:change должно сработать');

    lifecycle.transitionTo('COMPLETED');
    assert(!lifecycle.isBusy(), 'В состоянии COMPLETED система не занята');
  });

  // ----------------------------------------------------
  // 5. ТЕСТ СЛОЯ: OBSERVABILITY
  // ----------------------------------------------------
  console.log('\n[5/7] Тестирование Observability Layer (Трассировка & Метрики)...');
  const observability = new ObservabilityManager();

  await test('Observability', 'Создание трейса и замер времени спанов', async () => {
    const traceId = 'trace_test_001';
    observability.startTrace(traceId, 'groq', 'Code.exe');

    // Эмуляция спана
    await observability.recordSpan(traceId, 'stt_span', async () => {
      await new Promise((r) => setTimeout(r, 20));
      return 'ok';
    });

    const finished = observability.finishTrace(traceId, {
      rawText: 'тестовый голос',
      processedText: 'тестовый голос',
      injected: true
    });

    assert(finished !== undefined, 'Трейс должен быть завершен');
    assert(finished!.spans.length === 1, 'В трейсе должен быть 1 спан');
    assert(finished!.spans[0].name === 'stt_span', 'Название спана должно совпадать');
    assert(finished!.spans[0].durationMs >= 15, 'Длительность спана должна быть замерена');
    assert(finished!.totalLatencyMs >= 15, 'Общая задержка должна быть замерена');

    const metrics = observability.getMetricsSummary();
    assert(metrics.totalRequests >= 1, 'Число запросов в метриках >= 1');
    assert(metrics.successRate === 100, 'Success rate должен быть 100%');
  });

  // ----------------------------------------------------
  // 6. ТЕСТ СЛОЯ: TOOLING
  // ----------------------------------------------------
  console.log('\n[6/7] Тестирование Tooling Layer (Реестр инструментов & Win32)...');

  await test('Tooling', 'Регистрация и выполнение системных инструментов', async () => {
    assert(toolReg.getTool('win32_inject_text') !== undefined, 'win32_inject_text должен быть зарегистрирован');
    assert(toolReg.getTool('get_active_context') !== undefined, 'get_active_context должен быть зарегистрирован');
    assert(toolReg.getTool('clipboard_copy') !== undefined, 'clipboard_copy должен быть зарегистрирован');

    // Проверка вызова детекции активного окна через реестр
    const ctx = await toolReg.executeTool<void, any>('get_active_context', undefined);
    assert(ctx !== undefined, 'get_active_context должен вернуть объект контекста');
    assert(typeof ctx.processName === 'string', 'processName должен быть строкой');
    assert(typeof ctx.category === 'string', 'category должен быть строкой');
  });

  // ----------------------------------------------------
  // 7. ТЕСТ СЛОЯ: EXECUTION & ГОТОВЫЙ ХАРНЕСС
  // ----------------------------------------------------
  console.log('\n[7/7] Тестирование Execution Layer (Интеграция всех 7 слоев)...');
  const harness = new GovoriHarness();

  await test('Execution', 'Проверка сборки и инициализации фасада GovoriHarness', () => {
    assert(harness.tooling !== undefined, 'tooling слой инициализирован');
    assert(harness.context !== undefined, 'context слой инициализирован');
    assert(harness.lifecycle !== undefined, 'lifecycle слой инициализирован');
    assert(harness.observability !== undefined, 'observability слой инициализирован');
    assert(harness.verification !== undefined, 'verification слой инициализирован');
    assert(harness.governance !== undefined, 'governance слой инициализирован');
    assert(harness.execution !== undefined, 'execution слой инициализирован');
  });

  await test('Execution', 'Проверка блокировки выполнения при отсутствии API ключа (Governance)', async () => {
    const dummyAudio = Buffer.from([0, 1, 2, 3]);
    
    // Временно проверяем Governance напрямую через policy
    const policy = harness.governance.checkRequestPolicy({
      hotkey: 'Alt+V',
      mode: 'toggle',
      provider: 'groq',
      groqApiKey: '', // пустой ключ
      openaiApiKey: '',
      deepgramApiKey: '',
      selectedMicId: 'default',
      autoPunctuation: true,
      removeFillerWords: true,
      contextAwareMode: true,
      soundFeedback: true,
      autoStart: false,
      handsFreeCommands: true
    });

    assert(!policy.allowed, 'Политика должна заблокировать запрос с пустым ключом');
    assert(policy.reason?.includes('missing'), 'Причина блокировки должна указывать на отсутствие ключа');
  });

  // ----------------------------------------------------
  // ИТОГОВЫЙ ОТЧЕТ
  // ----------------------------------------------------
  console.log('\n========================================');
  console.log('           ИТОГИ ТЕСТИРОВАНИЯ');
  console.log('========================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Всего тестов : ${results.length}`);
  console.log(`Успешно      : ${passedCount}`);
  console.log(`Ошибок       : ${failedCount}`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
