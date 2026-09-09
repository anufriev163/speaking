import React, { useState } from 'react';
import { DictationHistoryItem } from '../../types';
import { Search, Copy, Check, Trash2, Download } from 'lucide-react';

interface HistoryTabProps {
  history: DictationHistoryItem[];
  onClear: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ history, onClear }) => {
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
        setExportState('Экспортировано');
        setTimeout(() => setExportState(null), 3000);
      }
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString();
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-black tracking-tight mb-1">История записей</h3>
          <p className="text-xs text-neutral-500">Локальный журнал надиктованных текстов</p>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            {exportState && (
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {exportState}
              </span>
            )}
            <div className="flex bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/70">
              <button
                onClick={() => handleExport('md')}
                className="px-2.5 py-1 rounded-lg text-neutral-600 hover:text-black hover:bg-white text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                title="Экспорт всей истории в Markdown (.md)"
              >
                <Download className="w-3 h-3" /> .MD
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="px-2.5 py-1 rounded-lg text-neutral-600 hover:text-black hover:bg-white text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                title="Экспорт всей истории в текстовый файл (.txt)"
              >
                <Download className="w-3 h-3" /> .TXT
              </button>
            </div>
            <button
              onClick={onClear}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-500 hover:text-black hover:bg-neutral-100 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Очистить
            </button>
          </div>
        )}
      </div>

      {/* Search filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по надиктованному тексту..."
          className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      {/* History Items */}
      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-2xl border border-neutral-200/80 bg-neutral-50 text-center text-xs text-neutral-500">
            {search ? 'Ничего не найдено' : 'История пуста'}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-2.5 hover:border-neutral-300 transition-all"
            >
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span>{formatDate(item.timestamp)}</span>
                  {item.appContext && (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-sans text-[10px] font-medium">
                      {item.appContext}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-black font-semibold text-[11px]">
                    {item.latencyMs}мс
                  </span>
                  <button
                    onClick={() => handleCopy(item.id, item.processedText)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
                    title="Копировать"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-black font-bold" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-xs text-neutral-800 select-text leading-relaxed font-sans bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                {item.processedText}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
