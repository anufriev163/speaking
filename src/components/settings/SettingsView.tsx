import React, { useState, useEffect } from 'react';
import { Sliders, Cpu, BookmarkCheck, History } from 'lucide-react';
import { GovoriLogo } from '../common/GovoriLogo';
import { GeneralTab } from './GeneralTab';
import { ProvidersTab } from './ProvidersTab';
import { SnippetsTab } from './SnippetsTab';
import { HistoryTab } from './HistoryTab';
import { AppSettings, TextSnippet, DictationHistoryItem } from '../../types';

import { getTranslations } from '../../utils/i18n';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'providers' | 'snippets' | 'history'>('providers');
  const [settings, setSettings] = useState<AppSettings>({
    hotkey: 'Ctrl+~',
    mode: 'toggle',
    provider: 'groq',
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
  });
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [history, setHistory] = useState<DictationHistoryItem[]>([]);
  const [savedBadge, setSavedBadge] = useState(false);

  const t = getTranslations(settings.uiLanguage);

  useEffect(() => {
    if (!window.govoriAPI) return;

    window.govoriAPI.getSettings().then((s: AppSettings) => s && setSettings(s));
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

  const handleSaveSnippets = async (sn: TextSnippet[]) => {
    setSnippets(sn);
    if (window.govoriAPI) {
      await window.govoriAPI.saveSnippets(sn);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 1500);
    }
  };

  const handleClearHistory = async () => {
    setHistory([]);
    if (window.govoriAPI) {
      await window.govoriAPI.clearHistory();
    }
  };

  const tabs = [
    { id: 'providers', label: t.tabProviders, icon: Cpu },
    { id: 'general', label: t.tabGeneral, icon: Sliders },
    { id: 'snippets', label: t.tabSnippets, icon: BookmarkCheck },
    { id: 'history', label: t.tabHistory, icon: History },
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
              {t.saved}
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-52 bg-neutral-50 border-r border-neutral-200/80 p-3 space-y-1 shrink-0">
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
          {activeTab === 'snippets' && (
            <SnippetsTab snippets={snippets} onSave={handleSaveSnippets} uiLanguage={settings.uiLanguage} />
          )}
          {activeTab === 'history' && (
            <HistoryTab history={history} onClear={handleClearHistory} uiLanguage={settings.uiLanguage} />
          )}
        </div>
      </div>
    </div>
  );
};
