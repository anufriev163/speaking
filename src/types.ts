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

export interface GovoriAPI {
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getDictionary: () => Promise<CustomWord[]>;
  saveDictionary: (dictionary: CustomWord[]) => Promise<void>;
  getSnippets: () => Promise<TextSnippet[]>;
  saveSnippets: (snippets: TextSnippet[]) => Promise<void>;
  getHistory: () => Promise<DictationHistoryItem[]>;
  clearHistory: () => Promise<void>;
  exportHistory: (format?: 'md' | 'txt') => Promise<{ success: boolean; filePath?: string; reason?: string }>;
  onSnippetsChanged: (callback: (snippets: TextSnippet[]) => void) => () => void;
  openSettings: () => void;
  closeSettings: () => void;
  minimizeSettings: () => void;
  moveHud: (deltaX: number, deltaY: number) => void;
  hideHud: () => void;
  saveHudPosition: (pos: { x: number; y: number }) => void;
  notifyRecordingStopped: () => void;
  getActiveContext: () => Promise<ActiveContext>;
  injectText: (text: string) => Promise<boolean>;
  transcribeAudio: (audioData: ArrayBuffer, mimeType?: string) => Promise<any>;
  checkLocalWhisper: () => Promise<{ available: boolean; error?: string }>;
  onTriggerRecording: (callback: (action: 'toggle' | 'start' | 'stop' | 'show') => void) => () => void;
  onContextChanged: (callback: (context: ActiveContext) => void) => () => void;
  onSelectionChanged: (callback: (data: { hasSelection: boolean; snippet: string }) => void) => () => void;
  updateHudState: (state: HudState, message?: string, latencyMs?: number) => void;
  onSettingsChanged: (callback: (settings: AppSettings) => void) => () => void;
  getUpdateStatus: () => Promise<any>;
  checkForUpdates: () => Promise<any>;
  downloadUpdate: () => Promise<any>;
  installUpdate: () => Promise<any>;
  onUpdateStatusChanged: (callback: (status: any) => void) => () => void;
  getHarnessMetrics: () => Promise<any>;
}

declare global {
  interface Window {
    govoriAPI?: GovoriAPI;
  }
}
