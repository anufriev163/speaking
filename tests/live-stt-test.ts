import { transcribeAudio } from '../electron/services/sttService';
import { storage } from '../electron/services/storage';

function createSineWaveWav(durationSeconds = 1, sampleRate = 16000): Buffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM = 1)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate 440Hz beep
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.2;
    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

async function runLiveTest() {
  console.log('\n--- Проверка живого подключения к STT (Groq Cloud) ---');
  const settings = storage.getSettings();
  console.log(`Провайдер: ${settings.provider}`);
  console.log(`API Key: ${settings.groqApiKey ? settings.groqApiKey.substring(0, 8) + '...' : 'НЕТ'}`);

  if (!settings.groqApiKey) {
    console.log('[SKIP] Ключ Groq отсутствует, сетевой тест пропущен');
    return;
  }

  const audio = createSineWaveWav(1);
  const start = performance.now();
  try {
    const result = await transcribeAudio(audio, 'audio/wav');
    const latency = Math.round(performance.now() - start);
    console.log(`[PASS] Ответ получен успешно!`);
    console.log(`Задержка сети + API: ${latency} мс (API latency: ${result.latencyMs} мс)`);
    console.log(`Распознанный текст: "${result.text}"`);
  } catch (err: any) {
    console.error(`[FAIL] Ошибка подключения к Groq:`, err?.message || err);
  }
}

runLiveTest();
