import React, { useState, useEffect } from 'react';
import { AppSettings, UILanguage } from '../../types';
import packageJson from '../../../package.json';
import { getTranslations } from '../../utils/i18n';
import { PageTitle, Row, Toggle, Choice, TextButton } from './ui';

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
    version: packageJson.version
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

  const updateHint =
    updateState.status === 'checking' ? t.checkingUpdates
    : updateState.status === 'not-available' ? t.updateLatest
    : updateState.status === 'available' ? `${t.updateAvailable} v${updateState.latestVersion}`
    : updateState.status === 'downloading' ? `${t.downloadingUpdate} ${updateState.progressPercent || 0}%`
    : updateState.status === 'downloaded' ? `${t.updateAvailable} v${updateState.latestVersion}`
    : updateState.status === 'error' ? (updateState.error || t.updateError)
    : t.updatesTitle;

  return (
    <div>
      <PageTitle title={t.generalTitle} subtitle={t.generalSubtitle} />

      <div className="border-t border-rule">
        <Row label={t.uiLangTitle} hint={t.uiLangDesc}>
          <select
            value={settings.uiLanguage || 'auto'}
            onChange={(e) => onChange({ uiLanguage: e.target.value as UILanguage })}
            className="bg-transparent border-0 border-b border-rule py-1 pr-1 text-[14px] text-graphite focus:outline-none focus:border-ink cursor-pointer"
          >
            <option value="auto">{t.uiLangAuto}</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="zh">中文</option>
          </select>
        </Row>

        <Row
          label={t.speechLangTitle}
          hint={settings.language === 'en' ? t.speechLangDescEn : settings.language === 'auto' ? t.speechLangDescAuto : t.speechLangDescRu}
        >
          <Choice
            value={(settings.language || 'ru') as 'ru' | 'en' | 'auto'}
            onChange={(v) => onChange({ language: v })}
            options={[
              { value: 'ru', label: 'RU' },
              { value: 'en', label: 'EN' },
              { value: 'auto', label: t.uiLangAuto.split(' ')[0] },
            ]}
          />
        </Row>

        {/* The hotkey is fixed (Ctrl+~); show it as text rather than a fake editable field */}
        <Row label={t.hotkeyTitle} hint={t.hotkeyDesc}>
          <kbd className="font-sans text-[14px] text-graphite">Ctrl + ~</kbd>
        </Row>

        <Row label={t.aiCorrectionTitle} hint={t.aiCorrectionDesc}>
          <Toggle
            label={t.aiCorrectionTitle}
            checked={settings.aiCorrection !== false}
            onChange={(v) => onChange({ aiCorrection: v, removeFillerWords: v })}
          />
        </Row>

        <Row label={t.soundTitle} hint={t.soundDesc}>
          <Toggle label={t.soundTitle} checked={settings.soundFeedback} onChange={(v) => onChange({ soundFeedback: v })} />
        </Row>

        <Row label={t.autoStartTitle} hint={t.autoStartDesc}>
          <Toggle label={t.autoStartTitle} checked={settings.autoStart} onChange={(v) => onChange({ autoStart: v })} />
        </Row>

        <Row
          label={`${t.versionLabel} ${updateState.version}`}
          hint={<span className={updateState.status === 'error' ? 'text-redpen' : undefined}>{updateHint}</span>}
        >
          {updateState.status === 'available' ? (
            <TextButton onClick={handleDownload}>{t.downloadUpdate}</TextButton>
          ) : updateState.status === 'downloaded' ? (
            <TextButton onClick={handleInstall}>{t.installRestart}</TextButton>
          ) : (
            <TextButton
              onClick={handleCheckUpdates}
              disabled={updateState.status === 'checking' || updateState.status === 'downloading'}
            >
              {t.checkUpdates}
            </TextButton>
          )}
        </Row>
        {updateState.status === 'downloading' && (
          <div className="h-px bg-rule -mt-px">
            <div className="h-px bg-ink transition-all duration-300" style={{ width: `${updateState.progressPercent || 0}%` }} />
          </div>
        )}
      </div>

      <p className="mt-8 text-[13px] text-muted">
        <a href="https://github.com/anufriev163/speaking" target="_blank" rel="noreferrer" className="text-ink hover:underline">
          GitHub
        </a>
      </p>
    </div>
  );
};
