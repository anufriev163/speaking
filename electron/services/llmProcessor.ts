import { ActiveContext } from '../../src/types';
import { storage } from './storage';

export function cleanTextRules(text: string, context: ActiveContext): string {
  let cleaned = text;

  // 1. Hands-free voice commands
  cleaned = cleaned
    .replace(/(?:с\s+новой\s+строки|новая\s+строка)/gi, '\n')
    .replace(/(?:новый\s+абзац|с\s+нового\s+абзаца)/gi, '\n\n')
    .replace(/(?:(?<![а-яёa-z0-9])точка\s+с\s+запятой(?![а-яёa-z0-9]))/gi, ';')
    .replace(/(?:(?<![а-яёa-z0-9])двоеточие(?![а-яёa-z0-9]))/gi, ':')
    .replace(/(?:(?<![а-яёa-z0-9])знак\s+вопроса|вопросительный\s+знак(?![а-яёa-z0-9]))/gi, '?')
    .replace(/(?:(?<![а-яёa-z0-9])восклицательный\s+знак(?![а-яёa-z0-9]))/gi, '!')
    .replace(/(?:(?<![а-яёa-z0-9])тире(?![а-яёa-z0-9]))/gi, ' — ');

  // 2. Remove verbal filler words if enabled
  const settings = storage.getSettings();
  if (settings.removeFillerWords) {
    const fillerPatterns = [
      /(?<![а-яёa-z0-9])(?:ээ+|мм+|нуу+|аа+)(?![а-яёa-z0-9])/gi,
      /(?<![а-яёa-z0-9])(?:как\s+бы|типа|короче|в\s+общем-то|так\s+сказать)(?![а-яёa-z0-9])/gi
    ];

    for (const pattern of fillerPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Verbal self-correction e.g. "в пять, ой нет, в шесть" -> "в шесть"
    cleaned = cleaned.replace(/(?<![а-яёa-z0-9])([а-яёa-z0-9]+)[,\s]+(?:ой\s+нет|ой|не|вернее|точнее)[,\s]+([а-яёa-z0-9]+)(?![а-яёa-z0-9])/gi, '$2');
  }

  // 3. User Snippets replacement
  const snippets = storage.getSnippets();
  for (const snippet of snippets) {
    if (snippet.trigger && snippet.replacement) {
      const escapedTrigger = snippet.trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![а-яёa-z0-9])${escapedTrigger}(?![а-яёa-z0-9])`, 'gi');
      cleaned = cleaned.replace(regex, snippet.replacement);
    }
  }

  // 4. Custom Dictionary exact casing replacements
  const dictionary = storage.getDictionary();
  for (const item of dictionary) {
    if (item.word) {
      const escapedWord = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![а-яёa-z0-9])${escapedWord}(?![а-яёa-z0-9])`, 'gi');
      cleaned = cleaned.replace(regex, item.word);
    }
  }

  // 5. Clean duplicate whitespace and orphan punctuation
  cleaned = cleaned
    .replace(/[ ]+/g, ' ')
    .replace(/ \./g, '.')
    .replace(/ ,/g, ',')
    .replace(/ \?/g, '?')
    .replace(/ !/g, '!')
    .replace(/\n /g, '\n')
    .trim();

  // 6. Context-aware adaptations (works even offline without LLM)
  if (context.category === 'code' || context.category === 'terminal') {
    // In code/terminal, don't end with a trailing period
    cleaned = cleaned.replace(/\.$/, '');
    // Common spoken dev shorthand & symbols
    cleaned = cleaned
      .replace(/(?<![а-яёa-z0-9])гит\s+статус(?![а-яёa-z0-9])/gi, 'git status')
      .replace(/(?<![а-яёa-z0-9])гит\s+коммит(?![а-яёa-z0-9])/gi, 'git commit')
      .replace(/(?<![а-яёa-z0-9])гит\s+пуш(?![а-яёa-z0-9])/gi, 'git push')
      .replace(/(?<![а-яёa-z0-9])нпм\s+ран(?![а-яёa-z0-9])/gi, 'npm run')
      .replace(/(?<![а-яёa-z0-9])конст(?![а-яёa-z0-9])/gi, 'const ')
      .replace(/(?<![а-яёa-z0-9])ретурн(?![а-яёa-z0-9])/gi, 'return ')
      .replace(/(?<![а-яёa-z0-9])стрелочка(?![а-яёa-z0-9])/gi, '=>')
      .replace(/(?<![а-яёa-z0-9])равно(?![а-яёa-z0-9])/gi, '=');
  } else if (context.category === 'chat') {
    // In messengers, short single-line phrases feel awkward with a trailing period
    if (!cleaned.includes('\n') && cleaned.split(' ').length <= 15) {
      cleaned = cleaned.replace(/\.$/, '');
    }
    // Natural emoji vocalizations
    cleaned = cleaned
      .replace(/(?<![а-яёa-z0-9])(?:смайлик|улыбка)(?![а-яёa-z0-9])/gi, '😊')
      .replace(/(?<![а-яёa-z0-9])сердечко(?![а-яёa-z0-9])/gi, '❤️')
      .replace(/(?<![а-яёa-z0-9])огонь(?![а-яёa-z0-9])/gi, '🔥')
      .replace(/(?<![а-яёa-z0-9])палец\s+вверх(?![а-яёa-z0-9])/gi, '👍');
  } else if (context.category === 'document') {
    // Russian typographic quotes and dashes
    cleaned = cleaned
      .replace(/"([^"]+)"/g, '«$1»')
      .replace(/\s+-\s+/g, ' — ');
  }

  // Capitalize first letter if not code or already formatted
  if (context.category !== 'code' && context.category !== 'terminal' && cleaned.length > 0 && !cleaned.startsWith('\n')) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * AI Speech Text Corrector:
 * Ultra-fast LLM cleanup via Groq (Llama-3.3-70b-versatile, ~200ms)
 * with automatic fallback to OpenAI (gpt-4o-mini) and offline rules.
 */
export async function refineTextWithLLM(text: string, context: ActiveContext): Promise<string> {
  const settings = storage.getSettings();

  // If AI correction disabled or no keys provided, use instant rule-based cleaner
  if (settings.aiCorrection === false || (!settings.groqApiKey && !settings.openaiApiKey)) {
    return cleanTextRules(text, context);
  }

  let styleInstruction = 'Естественная грамотная речь.';
  if (context.category === 'code' || context.category === 'terminal') {
    styleInstruction = 'Редактор кода/терминал. Технические термины, переменные и команды пиши на правильном английском (camelCase, snake_case, git команды). В конце строки не ставь точку.';
  } else if (context.category === 'chat') {
    styleInstruction = 'Мессенджер/чат. Живой и лаконичный разговорный тон, без лишней бюрократии. Не ставь точку в конце коротких фраз.';
  } else if (context.category === 'document') {
    styleInstruction = 'Деловой документ. Строгий стиль, кавычки-ёлочки («»), длинные тире (—), суммы и числа цифрами.';
  }

  const systemPrompt = `Ты — сверхбыстрый AI-корректор надиктованной речи для Windows.
Твоя задача:
1. Исправить орфографию, грамматику и расставить естественную пунктуацию.
2. Удалить слова-паразиты, запинки и оговорки («эээ», «нуу», «типа», «как бы», «в общем-то»).
3. Стиль контекста: ${styleInstruction}
4. СТРОГО: верни ТОЛЬКО готовый очищенный текст! Запрещены любые комментарии, пояснения или кавычки вокруг ответа.`;

  // 1. Try Groq Llama-3.3-70b-versatile (~200ms)
  if (settings.groqApiKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 1024
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        const output = data.choices?.[0]?.message?.content?.trim();
        if (output) {
          return cleanTextRules(output, context);
        }
      }
    } catch (err) {
      console.warn('[LLM] Groq refinement failed, checking OpenAI fallback:', err);
    }
  }

  // 2. Fallback to OpenAI gpt-4o-mini (~250ms)
  if (settings.openaiApiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 1024
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        const output = data.choices?.[0]?.message?.content?.trim();
        if (output) {
          return cleanTextRules(output, context);
        }
      }
    } catch (err) {
      console.warn('[LLM] OpenAI refinement failed:', err);
    }
  }

  // 3. Fallback to rule-based cleaner
  return cleanTextRules(text, context);
}

/**
 * AI Voice Rewrite / Instructions:
 * Takes the selected text from the user's active window and rewrites it
 * according to the voice command (e.g. "переведи на английский", "сделай деловым", "исправь ошибки").
 */
export async function rewriteTextWithLLM(
  originalText: string,
  userInstruction: string,
  context: ActiveContext
): Promise<string> {
  const settings = storage.getSettings();
  if (!settings.groqApiKey) {
    return originalText;
  }

  const systemPrompt = `Ты — экспертный ИИ-редактор текста для Windows.
Твоя задача — изменить или переписать исходный текст строго по голосовой команде пользователя.
Команда может быть любой: перевод на любой язык, исправление ошибок/пунктуации, смена тона (вежливый, деловой, разговорный), сжатие, разворачивание, форматирование списком и т.д.
КРИТИЧЕСКИЕ ПРАВИЛА:
1. Верни ТОЛЬКО готовый результат!
2. Запрещены любые вступления ("Вот ваш перевод:", "Исправленный текст:"), пояснения, примечания и кавычки вокруг всего текста.
3. Сохраняй исходный смысл, если команда прямо не просит изменить его.`;

  const userPrompt = `ИСХОДНЫЙ ТЕКСТ:
"""
${originalText}
"""

КОМАНДА:
${userInstruction}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2048
      })
    });

    if (res.ok) {
      const data: any = await res.json();
      const output = data.choices?.[0]?.message?.content?.trim();
      if (output) {
        return output;
      }
    }
  } catch (err) {
    console.error('[LLM] Error in rewriteTextWithLLM:', err);
  }

  return originalText;
}
