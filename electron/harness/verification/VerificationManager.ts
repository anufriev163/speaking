import { VerificationResult } from '../types';

export class VerificationManager {
  // Isolated single-word hallucinations emitted by Whisper on silence/static noise
  private readonly ISOLATED_NOISE_TERMS = new Set([
    'fastapi',
    's.t.a.r.',
    'star',
    'amara.org',
    'you',
    'bye',
    'mbc',
    'продолжение следует'
  ]);

  // Subtitle credit hallucination patterns
  private readonly SUBTITLE_PATTERNS = [
    /субтитры\s*(делал|сделал|создал)/i,
    /редактор\s*субтитров/i,
    /перевод\s*и\s*озвучка/i,
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

    // 2. Check isolated noise terms (only triggers if the whole transcript is just this artifact)
    const normalizedWord = trimmed.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (this.ISOLATED_NOISE_TERMS.has(normalizedWord)) {
      return {
        isValid: false,
        sanitizedText: '',
        reason: `Isolated Whisper noise hallucination: "${trimmed}"`,
        hallucinationDetected: true
      };
    }

    // 3. Known subtitle credit hallucinations
    for (const pattern of this.SUBTITLE_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isValid: false,
          sanitizedText: '',
          reason: `Subtitle credit hallucination matched: ${pattern}`,
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
