import { VerificationResult } from '../types';

export class VerificationManager {
  private readonly KNOWN_HALLUCINATIONS = [
    /субтитры\s*(делал|сделал|создал)/i,
    /редактор\s*субтитров/i,
    /продолжение\s*следует/i,
    /ставьте\s*лайк/i,
    /подписывайтесь\s*на\s*канал/i,
    /спасибо\s*за\s*(просмотр|внимание)/i,
    /s\.t\.a\.r\./i,
    /fastapi/i // common hallucination on empty mic noise
  ];

  public verifyTranscription(rawText: string): VerificationResult {
    if (!rawText || !rawText.trim()) {
      return {
        isValid: false,
        sanitizedText: '',
        reason: 'Empty or whitespace transcription'
      };
    }

    const trimmed = rawText.trim();

    // 1. Single character or solely punctuation
    if (/^[.,!?:;\-_()'"\s]+$/.test(trimmed) || trimmed.length <= 1) {
      return {
        isValid: false,
        sanitizedText: '',
        reason: 'Punctuation or noise artifact',
        hallucinationDetected: true
      };
    }

    // 2. Known Whisper silence/noise hallucinations
    for (const pattern of this.KNOWN_HALLUCINATIONS) {
      if (pattern.test(trimmed)) {
        return {
          isValid: false,
          sanitizedText: '',
          reason: `Known Whisper hallucination matched: ${pattern}`,
          hallucinationDetected: true
        };
      }
    }

    // 3. Stutter loops (e.g. "да, да, да, да, да, да")
    if (/^([\p{L}\p{N}]+[.,\s]+)\1{3,}/iu.test(trimmed)) {
      return {
        isValid: false,
        sanitizedText: '',
        reason: 'Repetitive loop hallucination',
        hallucinationDetected: true
      };
    }

    // 4. Clean formatting
    let clean = trimmed.replace(/\s+/g, ' ');

    return {
      isValid: true,
      sanitizedText: clean
    };
  }

  public verifyPreInjection(text: string): boolean {
    // Ensure text has non-zero length and contains printable characters
    return typeof text === 'string' && text.trim().length > 0;
  }
}
