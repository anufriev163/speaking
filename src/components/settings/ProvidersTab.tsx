import React, { useState, useEffect } from 'react';
import { AppSettings, STTProvider } from '../../types';
import { Key, ExternalLink, Zap, Cloud, HardDrive, Check, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProvidersTabProps {
  settings: AppSettings;
  onChange: (updates: Partial<AppSettings>) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({ settings, onChange }) => {
  const [showKey, setShowKey] = useState(false);
  const [localStatus, setLocalStatus] = useState<{ available?: boolean; checking: boolean }>({ checking: true });

  useEffect(() => {
    (window as any).govoriAPI?.checkLocalWhisper?.().then((res: any) => {
      setLocalStatus({ available: res?.available, checking: false });
    }).catch(() => {
      setLocalStatus({ available: false, checking: false });
    });
  }, []);

  const providers: {
    id: STTProvider;
    name: string;
    model: string;
    tag: string;
    latency: string;
    desc: string;
    icon: React.ElementType;
    badgeColor: string;
  }[] = [
    {
      id: 'groq',
      name: 'Groq Cloud Whisper',
      model: 'Whisper Large-v3-turbo',
      tag: 'Рекомендуется • LPU',
      latency: '~200 мс',
      desc: 'Максимальная скорость на LPU-чипах. Бесплатно до 14 400 запросов в день.',
      icon: Zap,
      badgeColor: 'bg-black text-white',
    },
    {
      id: 'openai',
      name: 'OpenAI Whisper',
      model: 'Whisper-1',
      tag: 'Облачный API',
      latency: '~1.5 с',
      desc: 'Оригинальный облачный сервис от создателей модели Whisper.',
      icon: Cloud,
      badgeColor: 'bg-neutral-100 text-neutral-700',
    },
    {
      id: 'local',
      name: 'Локальный движок',
      model: 'Whisper On-Device',
      tag: '100% Офлайн',
      latency: '~600 мс',
      desc: 'Полная приватность. Работает автономно прямо на компьютере без интернета.',
      icon: HardDrive,
      badgeColor: 'bg-neutral-100 text-neutral-700',
    }
  ];

  const currentKey = settings.provider === 'groq' ? settings.groqApiKey : settings.openaiApiKey;
  const isKeyConfigured = Boolean(currentKey && currentKey.length > 5);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-xl font-semibold text-black tracking-tight mb-1">
          Нейросеть
        </h3>
        <p className="text-xs text-neutral-500">
          Выберите, какая нейросеть будет переводить вашу речь в текст
        </p>
      </div>

      {/* Provider selection cards */}
      <div className="space-y-2.5">
        {providers.map((p) => {
          const isSelected = settings.provider === p.id;
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              onClick={() => onChange({ provider: p.id })}
              className={`p-4 rounded-2xl cursor-pointer border transition-all duration-200 select-none ${
                isSelected
                  ? 'bg-white border-black ring-1 ring-black/80 shadow-xs'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                      isSelected ? 'bg-black text-white shadow-xs' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-black tracking-tight">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {p.model}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-3">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        isSelected
                          ? 'bg-black text-white border-black'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {p.tag}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-neutral-400">
                      {p.latency}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-black border-black text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* API Key configuration card */}
      {settings.provider !== 'local' ? (
        <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-black">
                    {settings.provider === 'groq' ? 'API-ключ Groq Cloud' : 'API-ключ OpenAI'}
                  </span>
                  {isKeyConfigured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Активен
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium">
                      Требуется ключ
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-neutral-500">
                  {settings.provider === 'groq'
                    ? 'Бесплатный ключ на console.groq.com (без банковской карты)'
                    : 'Ключ платформы platform.openai.com'}
                </span>
              </div>
            </div>

            {settings.provider === 'groq' && (
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-black font-semibold flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200/80 px-3 py-1.5 rounded-xl transition-colors shrink-0"
              >
                <span>Получить ключ</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              </a>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={currentKey}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (settings.provider === 'groq') {
                    onChange({ groqApiKey: val });
                  } else {
                    onChange({ openaiApiKey: val });
                  }
                }}
                placeholder={settings.provider === 'groq' ? 'gsk_...' : 'sk-...'}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono text-black placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-neutral-400 hover:text-black transition-colors"
                title={showKey ? 'Скрыть ключ' : 'Показать ключ'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>Ключ хранится локально на вашем ПК в зашифрованном файле конфигурации.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-black">
                    Локальный движок Faster-Whisper
                  </span>
                  {localStatus.checking ? (
                    <span className="text-[10px] text-neutral-400">Проверка...</span>
                  ) : localStatus.available ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Готов к работе офлайн
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Не найден
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-neutral-500">
                  Модель: Faster-Whisper Small (int8 CPU) • Полная приватность без интернета
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-600 space-y-1">
            <p className="text-[11px] leading-relaxed">
              {localStatus.available
                ? 'Движок готов. Запись распознается прямо на вашем процессоре без отправки аудиоданных в сеть.'
                : 'Для работы оффлайн-движка требуется установленный Python с библиотекой faster-whisper.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
