import React, { useState } from 'react';
import { CustomWord } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface DictionaryTabProps {
  dictionary: CustomWord[];
  onSave: (dictionary: CustomWord[]) => void;
}

export const DictionaryTab: React.FC<DictionaryTabProps> = ({ dictionary, onSave }) => {
  const [newWord, setNewWord] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    const updated = [...dictionary, { id: Date.now().toString(), word: newWord.trim() }];
    onSave(updated);
    setNewWord('');
  };

  const handleDelete = (id: string) => {
    const updated = dictionary.filter((w) => w.id !== id);
    onSave(updated);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-xl font-semibold text-black tracking-tight mb-1">Словарь терминов</h3>
        <p className="text-xs text-neutral-500">
          Специфические слова, аббревиатуры и бренды для безошибочной транскрибации
        </p>
      </div>

      {/* Add word form */}
      <form onSubmit={handleAdd} className="flex gap-2.5">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Например: Kubernetes, Next.js, Supabase..."
          className="flex-1 px-4 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </form>

      {/* Words grid */}
      <div className="grid grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
        {dictionary.length === 0 ? (
          <div className="col-span-2 p-8 rounded-2xl border border-neutral-200/80 bg-neutral-50 text-center text-xs text-neutral-500">
            Словарь пуст. Добавьте профессиональные термины или имена.
          </div>
        ) : (
          dictionary.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-neutral-200/80 bg-white shadow-xs flex items-center justify-between group hover:border-neutral-300 transition-all"
            >
              <span className="text-xs font-mono text-black truncate">{item.word}</span>
              <button
                onClick={() => handleDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-all cursor-pointer"
                title="Удалить"
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
