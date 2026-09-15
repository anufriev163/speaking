import { net } from 'electron';
import { storage } from './storage';
import { transcribeAudioLocal, checkLocalWhisperAvailable } from './localWhisper';

// Polyfill global Blob for any secondary libraries if missing in Node
if (typeof (globalThis as any).Blob === 'undefined') {
  try {
    const { Blob } = require('buffer');
    if (Blob) (globalThis as any).Blob = Blob;
  } catch {}
}

function buildMultipart(
  fields: Record<string, string | undefined>,
  fileField: { name: string; filename: string; contentType: string; buffer: Buffer }
) {
  const boundary = '----GovoriBoundary' + Math.random().toString(36).substring(2);
  const chunks: Buffer[] = [];

  for (const [name, val] of Object.entries(fields)) {
    if (val === undefined || val === null) continue;
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`,
        'utf-8'
      )
    );
  }

  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.contentType}\r\n\r\n`,
      'utf-8'
    )
  );
  chunks.push(fileField.buffer);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8'));

  const body = Buffer.concat(chunks);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body
  };
}

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

  const fields: Record<string, string | undefined> = {
    model,
    response_format: 'json',
    temperature: '0.0'
  };
  if (speechLang !== 'auto') {
    fields.language = speechLang;
  }

  // Context prompt prevents hallucination
  const dictionary = storage.getDictionary();
  if (dictionary.length > 0) {
    const terms = dictionary.slice(0, 10).map(d => d.word).join(', ');
    const promptPrefix = speechLang === 'en' ? 'English speech:' : speechLang === 'auto' ? 'Speech terms:' : 'Русская речь:';
    fields.prompt = `${promptPrefix} ${terms}`;
  }

  const { contentType, body } = buildMultipart(fields, {
    name: 'file',
    filename,
    contentType: mimeType,
    buffer: audioBuffer
  });

  const fetchFn = typeof fetch !== 'undefined' ? fetch : net.fetch;

  try {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': contentType,
        'Content-Length': String(body.length)
      },
      body
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
