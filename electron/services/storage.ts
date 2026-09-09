import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';
import { AppSettings, CustomWord, TextSnippet, DictationHistoryItem } from '../../src/types';

function encryptSecret(secret: string): string {
  if (!secret) return '';
  if (secret.startsWith('enc:')) return secret;
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(secret);
      return 'enc:' + encryptedBuffer.toString('base64');
    }
  } catch (err) {
    console.warn('[Storage] Encryption unavailable, fallback to plain:', err);
  }
  return secret;
}

function decryptSecret(val: string): string {
  if (!val) return '';
  if (!val.startsWith('enc:')) return val;
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(val.slice(4), 'base64');
      return safeStorage.decryptString(buffer);
    }
  } catch (err) {
    console.warn('[Storage] Decryption failed:', err);
  }
  return '';
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
    let userDataPath = process.env.APPDATA ? path.join(process.env.APPDATA, 'govori') : process.cwd();
    if (app?.getPath) {
      try {
        const appPath = app.getPath('userData');
        if (fs.existsSync(path.join(appPath, 'govori-data.json'))) {
          userDataPath = appPath;
        }
      } catch {
        // Fallback to process.env.APPDATA
      }
    }
    this.filePath = path.join(userDataPath, 'govori-data.json');
    this.data = this.loadData();
  }

  private loadData(): AppData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const settings = { ...DEFAULT_SETTINGS, ...parsed.settings };

        // Decrypt secrets if encrypted with safeStorage
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

      fs.writeFileSync(this.filePath, JSON.stringify(toSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Storage] Error saving data:', err);
    }
  }

  getSettings(): AppSettings {
    return this.data.settings;
  }

  updateSettings(settings: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
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
