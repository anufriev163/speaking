import React, { useState, useEffect } from 'react';
import { AppSettings } from '../../types';
import { Keyboard, Mic, Sparkles, Volume2, Power, RefreshCw, CheckCircle2, ArrowDownToLine, AlertCircle, Languages, Globe } from 'lucide-react';
import packageJson from '../../../package.json';
import { getTranslations } from '../../utils/i18n';

interface GeneralTabProps {
  settings: AppSettings;
  onChange: (updates: Partial<AppSettings>) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ settings, onChange }) => {
  const t = getTranslations(settings.uiLanguage);

  const [updateState, setUpdateState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
    version: string;
    latestVersion?: string;
    progressPercent?: number;
    error?: string;
  }>({
    status: 'idle',
    version: packageJson.version || '1.0.3'
  });

  useEffect(() => {
    (window as any).govoriAPI?.getUpdateStatus?.().then((res: any) => {
      if (res) setUpdateState(res);
    });

    const unsub = (window as any).govoriAPI?.onUpdateStatusChanged?.((status: any) => {
      if (status) setUpdateState(status);
    });

    return () => unsub?.();
  }, []);

  const handleCheckUpdates = async () => {
    try {
      const res = await (window as any).govoriAPI?.checkForUpdates?.();
      if (res) setUpdateState(res);
    } catch {}
  };

  const handleDownload = async () => {
    try {
      await (window as any).govoriAPI?.downloadUpdate?.();
    } catch {}
  };

  const handleInstall = () => {
    (window as any).govoriAPI?.installUpdate?.();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-xl font-semibold text-black tracking-tight mb-1">{t.generalTitle}</h3>
        <p className="text-xs text-neutral-500">{t.generalSubtitle}</p>
      </div>

      <div className="space-y-3">
        {/* Interface Language (Auto / RU / EN / ES / DE / FR / ZH) */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">{t.uiLangTitle}</div>
              <div className="text-[11px] text-neutral-500">{t.uiLangDesc}</div>
            </div>
          </div>
          <select
            value={settings.uiLanguage || 'auto'}
            onChange={(e) => onChange({ uiLanguage: e.target.value as any })}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200/80 text-xs font-semibold text-black focus:outline-none focus:border-black transition-all cursor-pointer shadow-2xs"
          >
            <option value="auto">🌐 {t.uiLangAuto}</option>
            <option value="ru">🇷🇺 Русский</option>
            <option value="en">🇬🇧 English</option>
            <option value="es">🇪🇸 Español</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="zh">🇨🇳 中文</option>
          </select>
        </div>

        {/* Speech Recognition Language (RU / EN / Auto) */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">{t.speechLangTitle}</div>
              <div className="text-[11px] text-neutral-500">
                {settings.language === 'en'
                  ? t.speechLangDescEn
                  : settings.language === 'auto'
                  ? t.speechLangDescAuto
                  : t.speechLangDescRu}
              </div>
            </div>
          </div>
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 shrink-0">
            <button
              onClick={() => onChange({ language: 'ru' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                (settings.language || 'ru') === 'ru'
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              RU
            </button>
            <button
              onClick={() => onChange({ language: 'en' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                settings.language === 'en'
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onChange({ language: 'auto' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                settings.language === 'auto'
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              {t.uiLangAuto.split(' ')[0]}
            </button>
          </div>
        </div>
        {/* Hotkey configuration */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">{t.hotkeyTitle}</div>
              <div className="text-[11px] text-neutral-500">
                {t.hotkeyDesc}
              </div>
            </div>
          </div>
          <input
            type="text"
            value={settings.hotkey}
            onChange={(e) => onChange({ hotkey: e.target.value })}
            className="w-32 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-center font-mono text-xs font-bold text-black focus:outline-none focus:border-black transition-colors"
            placeholder="Ctrl+~"
          />
        </div>

        {/* Unified AI Speech Cleaner */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-black">{t.aiCorrectionTitle}</span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-[10px] font-mono font-medium text-neutral-600">
                  Llama 3.3 70B
                </span>
              </div>
              <div className="text-[11px] text-neutral-500">
                {t.aiCorrectionDesc}
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aiCorrection !== false}
              onChange={(e) => onChange({ aiCorrection: e.target.checked, removeFillerWords: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        {/* Sound Feedback */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">{t.soundTitle}</div>
              <div className="text-[11px] text-neutral-500">{t.soundDesc}</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.soundFeedback}
              onChange={(e) => onChange({ soundFeedback: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        {/* Auto start with Windows */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">{t.autoStartTitle}</div>
              <div className="text-[11px] text-neutral-500">{t.autoStartDesc}</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoStart}
              onChange={(e) => onChange({ autoStart: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        {/* App Version & Auto-Update Card */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-3 hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
                <RefreshCw className={`w-4 h-4 ${updateState.status === 'checking' ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-black">{t.versionLabel}</span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 font-mono text-[10px] font-semibold text-neutral-600">
                    v{updateState.version}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {updateState.status === 'checking' && t.checkingUpdates}
                  {updateState.status === 'not-available' && t.updateLatest}
                  {updateState.status === 'available' && `${t.updateAvailable} v${updateState.latestVersion}`}
                  {updateState.status === 'downloading' && `${t.downloadingUpdate} ${updateState.progressPercent || 0}%`}
                  {updateState.status === 'error' && (
                    <span className="text-amber-600 font-medium">{updateState.error || t.updateError}</span>
                  )}
                  {updateState.status === 'idle' && `${t.updatesTitle} • GitHub Releases`}
                </div>
              </div>
            </div>

            <div>
              {updateState.status === 'available' ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>{t.downloadUpdate}</span>
                </button>
              ) : updateState.status === 'downloaded' ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.installRestart}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={updateState.status === 'checking' || updateState.status === 'downloading'}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-black text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {updateState.status === 'checking' ? t.checkingUpdates : t.checkUpdates}
                </button>
              )}
            </div>
          </div>

          {updateState.status === 'downloading' && (
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-black h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${updateState.progressPercent || 0}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
