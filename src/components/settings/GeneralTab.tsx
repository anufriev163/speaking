import React, { useState, useEffect } from 'react';
import { AppSettings } from '../../types';
import { Keyboard, Mic, Sparkles, Volume2, Layers, Power, RefreshCw, CheckCircle2, ArrowDownToLine, AlertCircle, Languages } from 'lucide-react';

interface GeneralTabProps {
  settings: AppSettings;
  onChange: (updates: Partial<AppSettings>) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ settings, onChange }) => {
  const [updateState, setUpdateState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
    version: string;
    latestVersion?: string;
    progressPercent?: number;
    error?: string;
  }>({
    status: 'idle',
    version: '1.0.0'
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
        <h3 className="text-xl font-semibold text-black tracking-tight mb-1">Основные настройки</h3>
        <p className="text-xs text-neutral-500">Параметры горячих клавиш и интеллектуальной обработки речи</p>
      </div>

      <div className="space-y-3">
        {/* Language Selection (RU / EN / Auto) */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">Язык распознавания речи</div>
              <div className="text-[11px] text-neutral-500">
                {settings.language === 'en'
                  ? 'Английский язык (English Whisper)'
                  : settings.language === 'auto'
                  ? 'Автоопределение языка (русский / английский)'
                  : 'Русский язык (максимальная точность)'}
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
              Авто
            </button>
          </div>
        </div>
        {/* Recording Mode (Toggle vs Push-to-Talk) */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">Режим работы записи</div>
              <div className="text-[11px] text-neutral-500">
                {settings.mode === 'ptt'
                  ? 'Push-to-Talk: удерживайте клавишу во время речи'
                  : 'Обычный: нажмите для старта, нажмите повторно для стопа'}
              </div>
            </div>
          </div>
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 shrink-0">
            <button
              onClick={() => onChange({ mode: 'toggle' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                settings.mode === 'toggle'
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              Нажатие
            </button>
            <button
              onClick={() => onChange({ mode: 'ptt' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                settings.mode === 'ptt'
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              Удержание (PTT)
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
              <div className="text-xs font-semibold text-black">Горячая клавиша записи</div>
              <div className="text-[11px] text-neutral-500">
                {settings.mode === 'ptt'
                  ? 'Удерживайте эту комбинацию для записи'
                  : 'Нажмите комбинацию для включения / выключения записи'}
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

        {/* Filler words filter */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">Удалять слова-паразиты</div>
              <div className="text-[11px] text-neutral-500">Автоматически вырезать «эээ», «нуу», «типа», оговорки</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.removeFillerWords}
              onChange={(e) => onChange({ removeFillerWords: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        {/* AI-powered speech refiner & corrector */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-black">AI-корректор речи на лету</span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-[10px] font-mono font-medium text-neutral-600">
                  Llama 3.3 70B
                </span>
              </div>
              <div className="text-[11px] text-neutral-500">
                Мгновенная чистка запинок, исправление грамматики и пунктуации через Groq (&lt;200 мс)
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aiCorrection !== false}
              onChange={(e) => onChange({ aiCorrection: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        {/* Context-aware adaptation */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">Контекстный режим приложений</div>
              <div className="text-[11px] text-neutral-500">Автоформатирование под IDE, мессенджеры или текстовые редакторы</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.contextAwareMode}
              onChange={(e) => onChange({ contextAwareMode: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        {/* Hands-free voice commands */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">Голосовые команды пунктуации</div>
              <div className="text-[11px] text-neutral-500">«Новая строка», «новый абзац», «точка с запятой», «тире»</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.handsFreeCommands}
              onChange={(e) => onChange({ handsFreeCommands: e.target.checked })}
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
              <div className="text-xs font-semibold text-black">Звуковой отклик</div>
              <div className="text-[11px] text-neutral-500">Мягкий сигнал Apple-style при старте и завершении записи</div>
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
              <div className="text-xs font-semibold text-black">Автозапуск при старте Windows</div>
              <div className="text-[11px] text-neutral-500">Автоматически запускать виджет диктовки в фоне при включении компьютера</div>
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
                  <span className="text-xs font-semibold text-black">Версия программы</span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 font-mono text-[10px] font-semibold text-neutral-600">
                    v{updateState.version}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {updateState.status === 'checking' && 'Проверка доступных обновлений...'}
                  {updateState.status === 'not-available' && 'У вас установлена актуальная версия'}
                  {updateState.status === 'available' && `Доступна новая версия v${updateState.latestVersion}`}
                  {updateState.status === 'downloading' && `Загрузка обновления: ${updateState.progressPercent || 0}%`}
                  {updateState.status === 'error' && (
                    <span className="text-amber-600 font-medium">{updateState.error || 'Сервер обновлений пока не подключен'}</span>
                  )}
                  {updateState.status === 'idle' && 'Автоматическая проверка через GitHub Releases'}
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
                  <span>Загрузить</span>
                </button>
              ) : updateState.status === 'downloaded' ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Перезапустить</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={updateState.status === 'checking' || updateState.status === 'downloading'}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-black text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {updateState.status === 'checking' ? 'Проверка...' : 'Проверить'}
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
