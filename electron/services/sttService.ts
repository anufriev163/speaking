import { storage } from './storage';
import { transcribeAudioLocal, checkLocalWhisperAvailable } from './localWhisper';

export interface TranscriptionResult {
  text: string;
  durationSeconds?: number;
  latencyMs: number;
  providerUsed?: string;
  isFallback?: boolean;
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType = 'audio/wav'): Promise<TranscriptionResult> {
  const settings = storage.getSettings();
  const startTime = Date.now();

  const provider = settings.provider || 'groq';
  const speechLang = settings.language || 'ru';

  // 1. Direct Local Provider
  if (provider === 'local') {
    try {
      console.log(`[STT] Using local Whisper engine (${speechLang})...`);
      const localRes = await transcribeAudioLocal(audioBuffer, mimeType, speechLang);
      return {
        ...localRes,
        providerUsed: 'local'
      };
    } catch (err: any) {
      console.error('[STT] Local Whisper error:', err);
      throw new Error(`Локальный Whisper: ${err.message || 'ошибка выполнения'}`);
    }
  }

  // 2. Cloud Provider (Groq / OpenAI)
  const apiKey = provider === 'groq' ? settings.groqApiKey : settings.openaiApiKey;

  if (!apiKey) {
    // If no API key, try local whisper if available before complaining
    const localCheck = await checkLocalWhisperAvailable();
    if (localCheck.available) {
      console.log('[STT] No API key, seamlessly falling back to local Whisper...');
      const localRes = await transcribeAudioLocal(audioBuffer, mimeType, speechLang);
      return {
        ...localRes,
        providerUsed: 'local-fallback',
        isFallback: true
      };
    }

    return {
      text: 'Говори работает! Пожалуйста, укажите API-ключ Groq или OpenAI в настройках приложения.',
      durationSeconds: 1,
      latencyMs: Date.now() - startTime
    };
  }

  const endpoint = provider === 'groq'
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';

  const model = provider === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1';

  const isWebm = mimeType.includes('webm');
  const filename = isWebm ? 'audio.webm' : 'audio.wav';
  const blob = new Blob([audioBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('model', model);
  formData.append('response_format', 'json');
  if (speechLang !== 'auto') {
    formData.append('language', speechLang);
  }
  formData.append('temperature', '0.0');

  // Context prompt prevents hallucination
  const dictionary = storage.getDictionary();
  if (dictionary.length > 0) {
    const terms = dictionary.slice(0, 10).map(d => d.word).join(', ');
    const promptPrefix = speechLang === 'en' ? 'English speech:' : speechLang === 'auto' ? 'Speech terms:' : 'Русская речь:';
    formData.append('prompt', `${promptPrefix} ${terms}`);
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const errorText = await res.text();
      const sanitizedError = errorText.replace(/(gsk_[a-zA-Z0-9]{6,}|sk-[a-zA-Z0-9]{6,})/g, '[KEY-REDACTED]');
      console.error(`[STT] ${provider} HTTP error ${res.status}:`, sanitizedError);
      // If server error or rate limit, attempt local fallback
      if (res.status >= 429) {
        return await attemptLocalFallback(audioBuffer, mimeType, startTime, speechLang);
      }
      throw new Error(`Ошибка распознавания (${provider}): ${res.status}`);
    }

    const data: any = await res.json();
    const latencyMs = Date.now() - startTime;
    let text = (data.text || '').trim();

    // Filter out Whisper silence hallucinations
    if (/^[.,!?:;'"\-_D]+$/.test(text) || text === 'S.T.A.R.' || text === 'Продолжение следует...') {
      text = '';
    }

    return {
      text,
      durationSeconds: data.duration,
      latencyMs,
      providerUsed: provider
    };
  } catch (err: any) {
    console.warn(`[STT] Cloud request failed (${err.message}). Checking offline fallback...`);
    try {
      return await attemptLocalFallback(audioBuffer, mimeType, startTime, speechLang);
    } catch (fallbackErr) {
      console.error('[STT] Offline fallback also unavailable:', fallbackErr);
      throw new Error('Нет подключения к сети и локальный движок недоступен');
    }
  }
}

async function attemptLocalFallback(
  audioBuffer: Buffer,
  mimeType: string,
  startTime: number,
  language = 'ru'
): Promise<TranscriptionResult> {
  const localCheck = await checkLocalWhisperAvailable();
  if (!localCheck.available) {
    throw new Error('Локальный движок не установлен');
  }

  console.log('[STT] Executing local Whisper offline fallback...');
  const localRes = await transcribeAudioLocal(audioBuffer, mimeType, language);
  return {
    ...localRes,
    providerUsed: 'local-fallback',
    isFallback: true
  };
}
