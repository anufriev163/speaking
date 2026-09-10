export type AppMode = 'toggle' | 'ptt';

export type STTProvider = 'groq' | 'openai' | 'deepgram' | 'local';

export type AppCategory = 'code' | 'chat' | 'document' | 'browser' | 'terminal' | 'general';

export interface ActiveContext {
  processName: string;
  windowTitle: string;
  category: AppCategory;
  categoryLabel: string;
  friendlyAppName?: string;
}

export type SpeechLanguage = 'ru' | 'en' | 'es' | 'de' | 'fr' | 'zh' | 'auto';
export type UILanguage = 'auto' | 'ru' | 'en' | 'es' | 'de' | 'fr' | 'zh';

export interface AppSettings {
  hotkey: string;
  mode: AppMode;
  provider: STTProvider;
  language?: SpeechLanguage;
  uiLanguage?: UILanguage;
  groqApiKey: string;
  openaiApiKey: string;
  deepgramApiKey: string;
  selectedMicId: string;
  autoPunctuation: boolean;
  removeFillerWords: boolean;
  contextAwareMode: boolean;
  soundFeedback: boolean;
  autoStart: boolean;
  handsFreeCommands: boolean;
  aiCorrection?: boolean;
  hudPosition?: { x: number; y: number };
}

export interface DictationHistoryItem {
  id: string;
  timestamp: number;
  rawText: string;
  processedText: string;
  durationMs: number;
  latencyMs: number;
  appContext: string;
  category: AppCategory;
}

export interface CustomWord {
  id: string;
  word: string;
  replacement?: string;
  caseSensitive?: boolean;
}

export interface TextSnippet {
  id: string;
  trigger: string;
  replacement: string;
  description?: string;
}

export type HudState = 'idle' | 'recording' | 'processing' | 'success' | 'error';
