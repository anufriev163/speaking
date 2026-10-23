import React, { useState, useEffect } from 'react';
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

    const unsubHistory = window.govoriAPI.onHistoryChanged?.((h: DictationHistoryItem[]) => {
      if (h) setHistory(h);
    });

    return () => {
      unsubSnippets?.();
      unsubHistory?.();
    };
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
    { id: 'providers', label: t.tabProviders },
    { id: 'general', label: t.tabGeneral },
    { id: 'snippets', label: t.tabSnippets },
    { id: 'history', label: t.tabHistory },
  ] as const;

  return (
    <div className="w-screen h-screen flex flex-col bg-paper text-graphite overflow-hidden select-none">
      <header className="shrink-0 px-10 pt-6 border-b border-rule">
        <div className="max-w-[640px] flex items-end justify-between">
          <nav className="flex items-end gap-7" aria-label="говори">
            <GovoriLogo className="w-5 h-5 mb-3 shrink-0" />
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`pb-3 -mb-px text-[14px] leading-5 border-b-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    isActive ? 'border-graphite text-graphite' : 'border-transparent text-muted hover:text-graphite'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <span
            aria-live="polite"
            className={`pb-3 text-[13px] text-muted transition-opacity duration-300 ${savedBadge ? 'opacity-100' : 'opacity-0'}`}
          >
            {t.saved}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-[640px]">
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
      </main>
    </div>
  );
};
