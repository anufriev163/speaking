import { storage } from '../../services/storage';
import { ActiveContext, CustomWord, TextSnippet } from '../../../src/types';
import { ToolRegistry } from '../tooling/ToolRegistry';

export interface EnrichedContext {
  activeContext: ActiveContext;
  promptHint: string;
  dictionaryWords: string[];
  snippets: TextSnippet[];
  targetCategory: string;
}

export class ContextManager {
  constructor(private toolRegistry: ToolRegistry) {}

  public async getEnrichedContext(overrideContext?: ActiveContext): Promise<EnrichedContext> {
    const activeContext = overrideContext || await this.toolRegistry.executeTool<void, ActiveContext>('get_active_context', undefined);
    const dictionary = storage.getDictionary();
    const snippets = storage.getSnippets();

    const dictionaryWords = dictionary.map((d: CustomWord) => d.word.trim()).filter(Boolean);
    const promptHint = this.buildWhisperPromptHint(dictionaryWords, activeContext);

    return {
      activeContext,
      promptHint,
      dictionaryWords,
      snippets,
      targetCategory: activeContext.category
    };
  }

  public applySnippets(text: string, snippets: TextSnippet[]): string {
    if (!text || snippets.length === 0) return text;

    let result = text;
    for (const item of snippets) {
      if (!item.trigger || !item.replacement) continue;
      const escaped = item.trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s)${escaped}(\\s|$|[.,!?])`, 'gi');
      result = result.replace(regex, (_match, p1, p2) => `${p1}${item.replacement}${p2}`);
    }
    return result;
  }

  private buildWhisperPromptHint(dictionaryWords: string[], context: ActiveContext): string {
    const baseContext = context.category === 'code' 
      ? 'Разработка, код, функции, переменные, коммиты, стек.'
      : 'Русская речь, грамотная пунктуация, термины.';

    if (dictionaryWords.length === 0) {
      return baseContext;
    }

    // Natural context sentence for Whisper prompt
    return `${baseContext} Термины: ${dictionaryWords.slice(0, 40).join(', ')}.`;
  }
}
