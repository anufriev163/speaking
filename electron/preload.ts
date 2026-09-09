import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings, CustomWord, TextSnippet, DictationHistoryItem, ActiveContext, HudState } from '../src/types';

const api = {
  // Settings & Storage
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('storage:get-settings'),
  updateSettings: (settings: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('storage:update-settings', settings),
  getDictionary: (): Promise<CustomWord[]> => ipcRenderer.invoke('storage:get-dictionary'),
  saveDictionary: (dictionary: CustomWord[]): Promise<void> => ipcRenderer.invoke('storage:save-dictionary', dictionary),
  getSnippets: (): Promise<TextSnippet[]> => ipcRenderer.invoke('storage:get-snippets'),
  saveSnippets: (snippets: TextSnippet[]): Promise<void> => ipcRenderer.invoke('storage:save-snippets', snippets),
  getHistory: (): Promise<DictationHistoryItem[]> => ipcRenderer.invoke('storage:get-history'),
  clearHistory: (): Promise<void> => ipcRenderer.invoke('storage:clear-history'),
  exportHistory: (format: 'md' | 'txt' = 'md'): Promise<{ success: boolean; filePath?: string; reason?: string }> =>
    ipcRenderer.invoke('history:export', format),
  onSnippetsChanged: (callback: (snippets: TextSnippet[]) => void) => {
    const handler = (_event: any, s: TextSnippet[]) => callback(s);
    ipcRenderer.on('storage:snippets-changed', handler);
    return () => ipcRenderer.removeListener('storage:snippets-changed', handler);
  },

  // Window Controls
  openSettings: (): void => ipcRenderer.send('window:open-settings'),
  closeSettings: (): void => ipcRenderer.send('window:close-settings'),
  minimizeSettings: (): void => ipcRenderer.send('window:minimize-settings'),
  moveHud: (deltaX: number, deltaY: number): void => ipcRenderer.send('window:move-hud', { deltaX, deltaY }),
  hideHud: (): void => ipcRenderer.send('window:hide-hud'),
  saveHudPosition: (pos: { x: number; y: number }): void => ipcRenderer.send('window:save-hud-position', pos),
  notifyRecordingStopped: (): void => ipcRenderer.send('hud:recording-stopped'),

  // Context & Win32
  getActiveContext: (): Promise<ActiveContext> => ipcRenderer.invoke('win32:get-context'),
  injectText: (text: string): Promise<boolean> => ipcRenderer.invoke('win32:inject-text', text),

  // Audio & Transcription
  transcribeAudio: (audioData: ArrayBuffer, mimeType?: string) => 
    ipcRenderer.invoke('stt:transcribe', audioData, mimeType),
  checkLocalWhisper: (): Promise<{ available: boolean; error?: string }> =>
    ipcRenderer.invoke('stt:check-local'),

  // Events from Main Process
  onTriggerRecording: (callback: (action: 'toggle' | 'start' | 'stop') => void) => {
    const handler = (_event: any, action: 'toggle' | 'start' | 'stop') => callback(action);
    ipcRenderer.on('hotkey:trigger', handler);
    return () => ipcRenderer.removeListener('hotkey:trigger', handler);
  },

  onContextChanged: (callback: (context: ActiveContext) => void) => {
    const handler = (_event: any, context: ActiveContext) => callback(context);
    ipcRenderer.on('context:changed', handler);
    return () => ipcRenderer.removeListener('context:changed', handler);
  },

  onSelectionChanged: (callback: (data: { hasSelection: boolean; snippet: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('context:selection', handler);
    return () => ipcRenderer.removeListener('context:selection', handler);
  },

  // Notify Main Process from HUD
  updateHudState: (state: HudState, message?: string, latencyMs?: number): void => {
    ipcRenderer.send('hud:state-change', { state, message, latencyMs });
  },

  // Settings Event
  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const handler = (_event: any, s: AppSettings) => callback(s);
    ipcRenderer.on('settings:changed', handler);
    return () => ipcRenderer.removeListener('settings:changed', handler);
  },

  // Auto Updater
  getUpdateStatus: () => ipcRenderer.invoke('updater:get-status'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateStatusChanged: (callback: (status: any) => void) => {
    const handler = (_event: any, status: any) => callback(status);
    ipcRenderer.on('updater:status-changed', handler);
    return () => ipcRenderer.removeListener('updater:status-changed', handler);
  },

  // Harness Observability & Metrics
  getHarnessMetrics: () => ipcRenderer.invoke('harness:get-metrics')
};

contextBridge.exposeInMainWorld('govoriAPI', api);

export type GovoriAPI = typeof api;
