import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';
import { AppSettings, CustomWord, TextSnippet, DictationHistoryItem } from '../../src/types';

function encryptSecret(secret: string): string {
  if (!secret) return '';
  if (secret.startsWith('enc:') || secret.startsWith('b64:')) return secret;
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(secret);
      return 'enc:' + encryptedBuffer.toString('base64');
    }
  } catch (err) {
    console.warn('[Storage] Encryption unavailable, fallback to base64 obfuscation:', err);
  }
  // Safe fallback if safeStorage is not available on this platform/session
  return 'b64:' + Buffer.from(secret, 'utf-8').toString('base64');
}

function decryptSecret(val: string): string {
  if (!val) return '';
  if (val.startsWith('b64:')) {
    try {
      return Buffer.from(val.slice(4), 'base64').toString('utf-8');
    } catch {
      return val.slice(4);
    }
  }
  if (!val.startsWith('enc:')) return val;
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(val.slice(4), 'base64');
      return safeStorage.decryptString(buffer);
    }
  } catch (err) {
    console.warn('[Storage] Decryption failed or not ready:', err);
  }
  // CRITICAL: If safeStorage is not yet initialized or failed, NEVER return empty string!
  // Return the original encrypted value so it is NOT overwritten or destroyed.
  return val;
}

interface AppData {
  settings: AppSettings;
  dictionary: CustomWord[];
  snippets: TextSnippet[];
  history: DictationHistoryItem[];
}

const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'Ctrl+~',
  mode: 'toggle',
  provider: 'groq',
  language: 'ru',
  uiLanguage: 'auto',
  groqApiKey: '',
  openaiApiKey: '',
  deepgramApiKey: '',
  selectedMicId: 'default',
  autoPunctuation: true,
  removeFillerWords: true,
  contextAwareMode: true,
  soundFeedback: true,
  autoStart: false,
  handsFreeCommands: true,
  aiCorrection: true,
};

const DEFAULT_DICTIONARY: CustomWord[] = [
  { id: '1', word: 'PostgreSQL' },
  { id: '2', word: 'TypeScript' },
  { id: '3', word: 'Next.js' },
  { id: '4', word: 'Tailwind CSS' },
  { id: '5', word: 'Kubernetes' },
  { id: '6', word: 'Docker' },
  { id: '7', word: 'FastAPI' },
  { id: '8', word: 'GraphQL' },
];

const DEFAULT_SNIPPETS: TextSnippet[] = [
  { id: '1', trigger: 'мой имейл', replacement: 'my.email@example.com', description: 'Вставка личного email' },
  { id: '2', trigger: 'мой телефон', replacement: '+7 (999) 000-00-00', description: 'Вставка номера телефона' },
  { id: '3', trigger: 'шапка письма', replacement: 'Здравствуйте!\n\nСпасибо за обращение.', description: 'Шаблон приветствия' },
  { id: '4', trigger: 'хорошего дня', replacement: 'С уважением,\nХорошего вам дня!', description: 'Вежливая подпись' }
];

class StorageService {
  private filePath: string;
  private data: AppData;

  constructor() {
    this.filePath = this.resolveFilePath();
    this.data = this.loadData();
  }

  private resolveFilePath(): string {
    let dir = '';
    try {
      if (app && typeof app.getPath === 'function') {
        dir = app.getPath('userData');
      }
    } catch {}

    if (!dir) {
      if (process.platform === 'win32' && process.env.APPDATA) {
        dir = path.join(process.env.APPDATA, 'govori');
      } else if (process.platform === 'darwin') {
        const home = process.env.HOME || '';
        dir = path.join(home, 'Library', 'Application Support', 'govori');
      } else {
        const home = process.env.HOME || '';
        dir = path.join(home, '.config', 'govori');
      }
    }

    // Check if legacy file exists in APPDATA/govori
    if (process.platform === 'win32' && process.env.APPDATA) {
      const legacyPath = path.join(process.env.APPDATA, 'govori', 'govori-data.json');
      if (fs.existsSync(legacyPath) && !fs.existsSync(path.join(dir, 'govori-data.json'))) {
        return legacyPath;
      }
    }

    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {}

    return path.join(dir, 'govori-data.json');
  }

  private loadData(): AppData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const settings = { ...DEFAULT_SETTINGS, ...parsed.settings };

        // Do not eagerly destroy keys if decryption isn't ready.
        // We will decrypt lazily in getSettings().
        if (settings.groqApiKey) settings.groqApiKey = decryptSecret(settings.groqApiKey);
        if (settings.openaiApiKey) settings.openaiApiKey = decryptSecret(settings.openaiApiKey);
        if (settings.deepgramApiKey) settings.deepgramApiKey = decryptSecret(settings.deepgramApiKey);

        return {
          settings,
          dictionary: parsed.dictionary || DEFAULT_DICTIONARY,
          snippets: parsed.snippets || DEFAULT_SNIPPETS,
          history: parsed.history || []
        };
      }
    } catch (err) {
      console.error('[Storage] Error loading data, using defaults:', err);
    }

    return {
      settings: DEFAULT_SETTINGS,
      dictionary: DEFAULT_DICTIONARY,
      snippets: DEFAULT_SNIPPETS,
      history: []
    };
  }

  private save(): void {
    try {
      // Clone settings and encrypt sensitive keys before disk write
      const clonedSettings = { ...this.data.settings };
      if (clonedSettings.groqApiKey) clonedSettings.groqApiKey = encryptSecret(clonedSettings.groqApiKey);
      if (clonedSettings.openaiApiKey) clonedSettings.openaiApiKey = encryptSecret(clonedSettings.openaiApiKey);
      if (clonedSettings.deepgramApiKey) clonedSettings.deepgramApiKey = encryptSecret(clonedSettings.deepgramApiKey);

      const toSave = {
        ...this.data,
        settings: clonedSettings
      };

      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(toSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[Storage] Error saving data:', err);
    }
  }

  getSettings(): AppSettings {
    // Lazily decrypt any secrets if they were loaded before safeStorage became ready
    const s = this.data.settings;
    if (s.groqApiKey && (s.groqApiKey.startsWith('enc:') || s.groqApiKey.startsWith('b64:'))) {
      const dec = decryptSecret(s.groqApiKey);
      if (dec && !dec.startsWith('enc:') && !dec.startsWith('b64:')) {
        s.groqApiKey = dec;
      }
    }
    if (s.openaiApiKey && (s.openaiApiKey.startsWith('enc:') || s.openaiApiKey.startsWith('b64:'))) {
      const dec = decryptSecret(s.openaiApiKey);
      if (dec && !dec.startsWith('enc:') && !dec.startsWith('b64:')) {
        s.openaiApiKey = dec;
      }
    }
    if (s.deepgramApiKey && (s.deepgramApiKey.startsWith('enc:') || s.deepgramApiKey.startsWith('b64:'))) {
      const dec = decryptSecret(s.deepgramApiKey);
      if (dec && !dec.startsWith('enc:') && !dec.startsWith('b64:')) {
        s.deepgramApiKey = dec;
      }
    }
    return { ...this.data.settings };
  }

  updateSettings(settings: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.getSettings();
  }

  getDictionary(): CustomWord[] {
    return this.data.dictionary;
  }

  saveDictionary(dictionary: CustomWord[]): void {
    this.data.dictionary = dictionary;
    this.save();
  }

  getSnippets(): TextSnippet[] {
    return this.data.snippets;
  }

  saveSnippets(snippets: TextSnippet[]): void {
    this.data.snippets = snippets;
    this.save();
  }

  getHistory(): DictationHistoryItem[] {
    return this.data.history;
  }

  addHistoryItem(item: DictationHistoryItem): void {
    this.data.history.unshift(item);
    if (this.data.history.length > 200) {
      this.data.history = this.data.history.slice(0, 200);
    }
    this.save();
  }

  clearHistory(): void {
    this.data.history = [];
    this.save();
  }
}

export const storage = new StorageService();
