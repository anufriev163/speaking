import React, { useState, useEffect } from 'react';
import { Sliders, Cpu, BookA, Scissors, History } from 'lucide-react';
import { GovoriLogo } from '../common/GovoriLogo';
import { GeneralTab } from './GeneralTab';
import { ProvidersTab } from './ProvidersTab';
import { DictionaryTab } from './DictionaryTab';
import { SnippetsTab } from './SnippetsTab';
import { HistoryTab } from './HistoryTab';
import { AppSettings, CustomWord, TextSnippet, DictationHistoryItem } from '../../types';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'providers' | 'general' | 'dictionary' | 'snippets' | 'history'>('providers');
  const [settings, setSettings] = useState<AppSettings>({
    hotkey: 'Ctrl+~',
    mode: 'toggle',
    provider: 'groq',
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
  });
  const [dictionary, setDictionary] = useState<CustomWord[]>([]);
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [history, setHistory] = useState<DictationHistoryItem[]>([]);
  const [savedBadge, setSavedBadge] = useState(false);

  useEffect(() => {
    if (!window.govoriAPI) return;

    window.govoriAPI.getSettings().then((s: AppSettings) => s && setSettings(s));
    window.govoriAPI.getDictionary().then((d: CustomWord[]) => d && setDictionary(d));
    window.govoriAPI.getSnippets().then((sn: TextSnippet[]) => sn && setSnippets(sn));
    window.govoriAPI.getHistory().then((h: DictationHistoryItem[]) => h && setHistory(h));

    const unsubSnippets = (window.govoriAPI as any)?.onSnippetsChanged?.((sn: TextSnippet[]) => {
      if (sn) setSnippets(sn);
    });

    return () => unsubSnippets?.();
  }, []);

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    if (window.govoriAPI) {
      await window.govoriAPI.updateSettings(updates);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 1500);
    }
  };

  const handleSaveDictionary = async (dict: CustomWord[]) => {
    setDictionary(dict);
    if (window.govoriAPI) {
      await window.govoriAPI.saveDictionary(dict);
    }
  };

  const handleSaveSnippets = async (sn: TextSnippet[]) => {
    setSnippets(sn);
    if (window.govoriAPI) {
      await window.govoriAPI.saveSnippets(sn);
    }
  };

  const handleClearHistory = async () => {
    setHistory([]);
    if (window.govoriAPI) {
      await window.govoriAPI.clearHistory();
    }
  };

  const tabs = [
    { id: 'providers', label: 'ИИ Провайдеры', icon: Cpu },
    { id: 'general', label: 'Основные', icon: Sliders },
    { id: 'dictionary', label: 'Словарь', icon: BookA },
    { id: 'snippets', label: 'Автозамена', icon: Scissors },
    { id: 'history', label: 'История', icon: History },
  ];

  return (
    <div className="w-screen h-screen flex flex-col bg-white text-neutral-900 overflow-hidden font-sans select-none">
      {/* Titlebar Header */}
      <div className="h-12 bg-white border-b border-neutral-200/80 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <GovoriLogo className="w-5 h-5" />
          <span className="text-xs font-semibold tracking-tight text-black">
            говори
          </span>
          {savedBadge && (
            <span className="text-[10px] text-neutral-700 font-medium bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full">
              Сохранено
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-56 bg-neutral-50 border-r border-neutral-200/80 p-3 space-y-1 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-white">
          {activeTab === 'general' && (
            <GeneralTab settings={settings} onChange={handleUpdateSettings} />
          )}
          {activeTab === 'providers' && (
            <ProvidersTab settings={settings} onChange={handleUpdateSettings} />
          )}
          {activeTab === 'dictionary' && (
            <DictionaryTab dictionary={dictionary} onSave={handleSaveDictionary} />
          )}
          {activeTab === 'snippets' && (
            <SnippetsTab snippets={snippets} onSave={handleSaveSnippets} />
          )}
          {activeTab === 'history' && (
            <HistoryTab history={history} onClear={handleClearHistory} />
          )}
        </div>
      </div>
    </div>
  );
};
