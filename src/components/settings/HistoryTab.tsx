import React, { useState } from 'react';
import { DictationHistoryItem, UILanguage } from '../../types';
import { Copy, Check } from 'lucide-react';
import { getTranslations } from '../../utils/i18n';
import { PageTitle, LineInput, TextButton } from './ui';

interface HistoryTabProps {
  history: DictationHistoryItem[];
  onClear: () => void;
  uiLanguage?: UILanguage;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ history, onClear, uiLanguage }) => {
  const t = getTranslations(uiLanguage);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<string | null>(null);

  const filtered = history.filter((item) => {
    const query = search.toLowerCase();
    return (
      (item.processedText || '').toLowerCase().includes(query) ||
      (item.appContext || '').toLowerCase().includes(query)
    );
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = async (format: 'md' | 'txt') => {
    try {
      const res = await (window as any).govoriAPI?.exportHistory?.(format);
      if (res?.success) {
        setExportState(t.exported);
        setTimeout(() => setExportState(null), 3000);
      }
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div>
      <PageTitle
        title={t.historyTitle}
        subtitle={t.historySubtitle}
        aside={
          history.length > 0 && (
            <div className="flex items-center gap-5">
              {exportState ? (
                <span className="text-[14px] text-muted" aria-live="polite">{exportState}</span>
              ) : (
                <>
                  <TextButton onClick={() => handleExport('md')}>{t.exportMd}</TextButton>
                  <TextButton onClick={() => handleExport('txt')}>{t.exportTxt}</TextButton>
                </>
              )}
              <TextButton tone="danger" onClick={onClear}>{t.clearHistory}</TextButton>
            </div>
          )
        }
      />

      {history.length > 0 && (
        <LineInput
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
        />
      )}

      <div className="mt-2">
        {filtered.length === 0 ? (
          <p className="py-6 text-[14px] text-muted">{search ? t.searchPlaceholder : t.historyEmptyDesc}</p>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="group py-4 border-b border-rule">
              <div className="flex items-center justify-between gap-4 text-[13px] text-muted">
                <span>
                  {formatDate(item.timestamp)}
                  {item.appContext && <span>, {item.appContext.replace(/.exe$/i, '')}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.processedText)}
                  aria-label="Copy"
                  className="p-1 text-muted hover:text-graphite opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {copiedId === item.id ? <Check className="w-4 h-4 text-ink" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-[14px] leading-6 text-graphite whitespace-pre-line select-text">{item.processedText}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
