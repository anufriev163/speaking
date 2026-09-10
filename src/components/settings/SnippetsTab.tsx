import React, { useState } from 'react';
import { TextSnippet, UILanguage } from '../../types';
import { Plus, Trash2 } from 'lucide-react';
import { getTranslations } from '../../utils/i18n';

interface SnippetsTabProps {
  snippets: TextSnippet[];
  onSave: (snippets: TextSnippet[]) => void;
  uiLanguage?: UILanguage;
}

export const SnippetsTab: React.FC<SnippetsTabProps> = ({ snippets, onSave, uiLanguage }) => {
  const t = getTranslations(uiLanguage);
  const [trigger, setTrigger] = useState('');
  const [replacement, setReplacement] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trigger.trim() || !replacement.trim()) return;

    const updated = [
      ...snippets,
      {
        id: Date.now().toString(),
        trigger: trigger.trim().toLowerCase(),
        replacement: replacement.trim(),
        description: description.trim() || undefined
      }
    ];
    onSave(updated);
    setTrigger('');
    setReplacement('');
    setDescription('');
  };

  const handleDelete = (id: string) => {
    const updated = snippets.filter((s) => s.id !== id);
    onSave(updated);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-xl font-semibold text-black tracking-tight mb-1">{t.snippetsTitle}</h3>
        <p className="text-xs text-neutral-500">
          {t.snippetsSubtitle}
        </p>
      </div>

      {/* Add snippet form */}
      <form onSubmit={handleAdd} className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">{t.triggerLabel}</label>
            <input
              type="text"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder={t.triggerPlaceholder}
              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">{t.descLabel}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descPlaceholder}
              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">{t.replacementLabel}</label>
          <textarea
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder={t.replacementPlaceholder}
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-colors font-mono"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> {t.addSnippet}
        </button>
      </form>

      {/* Snippets list */}
      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
        {snippets.length === 0 ? (
          <div className="p-8 rounded-2xl border border-neutral-200/80 bg-neutral-50 text-center text-xs text-neutral-500">
            {t.snippetsEmptyDesc}
          </div>
        ) : (
          snippets.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-2xl border border-neutral-200/80 bg-white shadow-xs flex items-start justify-between group hover:border-neutral-300 transition-all"
            >
              <div className="space-y-1.5 flex-1 mr-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 font-mono text-xs text-black font-semibold">
                    «{s.trigger}»
                  </span>
                  <span className="text-xs text-neutral-400">→</span>
                  {s.description && (
                    <span className="text-xs text-neutral-500">{s.description}</span>
                  )}
                </div>
                <div className="text-xs text-neutral-800 font-mono pl-3 border-l-2 border-black bg-neutral-50 p-2.5 rounded-r-xl">
                  {s.replacement}
                </div>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-all cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
