import React, { useState } from 'react';
import { TextSnippet, UILanguage } from '../../types';
import { Trash2 } from 'lucide-react';
import { getTranslations } from '../../utils/i18n';
import { PageTitle, LineInput, LineTextarea, TextButton } from './ui';

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
    <div>
      <PageTitle title={t.snippetsTitle} subtitle={t.snippetsSubtitle} />

      <form onSubmit={handleAdd} className="grid grid-cols-2 gap-x-8 gap-y-5">
        <label className="block">
          <span className="text-[13px] text-muted">{t.triggerLabel}</span>
          <LineInput value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder={t.triggerPlaceholder} />
        </label>
        <label className="block">
          <span className="text-[13px] text-muted">{t.descLabel}</span>
          <LineInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descPlaceholder} />
        </label>
        <label className="block col-span-2">
          <span className="text-[13px] text-muted">{t.replacementLabel}</span>
          <LineTextarea
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder={t.replacementPlaceholder}
            rows={2}
          />
        </label>
        <div className="col-span-2">
          <TextButton type="submit" disabled={!trigger.trim() || !replacement.trim()}>
            {t.addSnippet}
          </TextButton>
        </div>
      </form>

      <div className="mt-10 border-t border-rule">
        {snippets.length === 0 ? (
          <p className="py-6 text-[14px] text-muted">{t.snippetsEmptyDesc}</p>
        ) : (
          snippets.map((s) => (
            <div key={s.id} className="group flex items-start justify-between gap-6 py-4 border-b border-rule">
              <div className="min-w-0">
                <div className="text-[14px] leading-5 text-graphite">
                  «{s.trigger}»
                  {s.description && <span className="text-muted"> — {s.description}</span>}
                </div>
                <div className="mt-1 text-[13px] leading-5 text-muted whitespace-pre-line select-text">{s.replacement}</div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                aria-label="Delete"
                className="shrink-0 p-1 text-muted hover:text-redpen opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
