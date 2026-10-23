import React, { useState, useEffect } from 'react';
import { AppSettings, STTProvider } from '../../types';
import { Eye, EyeOff } from 'lucide-react';
import { getTranslations } from '../../utils/i18n';
import { PageTitle, LineInput } from './ui';

interface ProvidersTabProps {
  settings: AppSettings;
  onChange: (updates: Partial<AppSettings>) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({ settings, onChange }) => {
  const t = getTranslations(settings.uiLanguage);
  const [showKey, setShowKey] = useState(false);
  const [localStatus, setLocalStatus] = useState<{ available?: boolean; checking: boolean }>({ checking: true });

  useEffect(() => {
    window.govoriAPI?.checkLocalWhisper?.().then((res) => {
      setLocalStatus({ available: res?.available, checking: false });
    }).catch(() => {
      setLocalStatus({ available: false, checking: false });
    });
  }, []);

  const providers: { id: STTProvider; name: string; desc: string }[] = [
    { id: 'groq', name: 'Groq', desc: t.groqDesc },
    { id: 'openai', name: 'OpenAI', desc: t.openaiDesc },
    { id: 'local', name: 'Local Whisper', desc: t.localDesc },
  ];

  const isCloud = settings.provider !== 'local';
  const currentKey = settings.provider === 'groq' ? settings.groqApiKey : settings.openaiApiKey;
  const isKeyConfigured = Boolean(currentKey && currentKey.length > 5);

  return (
    <div>
      <PageTitle title={t.providersTitle} subtitle={t.providersSubtitle} />

      <div role="radiogroup" aria-label={t.providersTitle} className="border-t border-rule">
        {providers.map((p) => {
          const isSelected = settings.provider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange({ provider: p.id })}
              className="w-full flex items-start gap-4 py-4 border-b border-rule text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span
                className={`mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-ink' : 'border-muted/60 group-hover:border-graphite'
                }`}
              >
                {isSelected && <span className="w-2 h-2 rounded-full bg-ink" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-[14px] leading-5 ${isSelected ? 'text-ink' : 'text-graphite'}`}>{p.name}</span>
                <span className="block mt-0.5 text-[13px] leading-5 text-muted">{p.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {isCloud ? (
        <div className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="api-key" className="text-[14px] text-graphite">
              {t.apiKeyTitle} {settings.provider === 'groq' ? 'Groq' : 'OpenAI'}
            </label>
            <span className={`text-[13px] ${isKeyConfigured ? 'text-muted' : 'text-redpen'}`}>
              {isKeyConfigured ? t.keyValid : t.keyRequired}
            </span>
          </div>

          <div className="relative mt-1">
            <LineInput
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={currentKey}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                const val = e.target.value.trim();
                onChange(settings.provider === 'groq' ? { groqApiKey: val } : { openaiApiKey: val });
              }}
              placeholder={settings.provider === 'groq' ? 'gsk_…' : 'sk-…'}
              className="pr-8"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? 'Hide' : 'Show'}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-graphite rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <p className="mt-3 text-[13px] leading-5 text-muted">
            {t.apiKeyDesc}
            {settings.provider === 'groq' && (
              <>
                {' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-ink hover:underline">
                  {t.getKeyGroq}
                </a>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="mt-10 text-[14px] text-graphite">
          Faster-Whisper:{' '}
          <span className={localStatus.checking ? 'text-muted' : localStatus.available ? 'text-ink' : 'text-redpen'}>
            {localStatus.checking ? t.checkingUpdates : localStatus.available ? t.localInstalled : t.localNotInstalled}
          </span>
        </p>
      )}
    </div>
  );
};
