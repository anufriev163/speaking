export interface ParsedMacro {
  trigger: string;
  replacement: string;
}

export type VoiceActionType = 'send' | 'undo' | 'select_all' | 'copy';

export interface VoiceActionCommand {
  action: VoiceActionType;
  cleanText?: string;
  description: string;
}

/**
 * Parses spoken voice actions like "отправь", "выдели всё", "скопируй", or "... и отправь".
 */
export function parseVoiceActionCommand(rawText: string): VoiceActionCommand | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase().replace(/[.!?:;]+$/, '').trim();

  // Standalone command: "Отправь" / "Отправить" / "Нажми Enter"
  if (/^(?:отправь|отправить|жми\s+энтер|нажми\s+энтер|send|press\s+enter)$/i.test(lower)) {
    return { action: 'send', description: 'Отправлено (Enter)' };
  }

  // Standalone command: "Выдели всё"
  if (/^(?:выдели\s+всё|выделить\s+всё|выдели\s+все|выделить\s+все|select\s+all)$/i.test(lower)) {
    return { action: 'select_all', description: 'Выделено всё (Ctrl+A)' };
  }

  // Standalone command: "Скопируй"
  if (/^(?:скопируй|скопировать|copy|copy\s+that)$/i.test(lower)) {
    return { action: 'copy', description: 'Скопировано (Ctrl+C)' };
  }

  // Standalone command: "Отмени" / "Стереть всё"
  if (/^(?:отмени|отмена|отменить|стереть|стереть\s+всё|удали\s+это|undo)$/i.test(lower)) {
    return { action: 'undo', description: 'Отменено (Ctrl+Z)' };
  }

  // Dictation ending with "... и отправь" / "... отправь"
  const sendSuffixRegex = /[,.]?\s*(?:и\s+)?(?:отправь|отправить|нажми\s+энтер|жми\s+энтер|send)$/i;
  if (sendSuffixRegex.test(trimmed)) {
    const cleanText = trimmed.replace(sendSuffixRegex, '').trim();
    if (cleanText.length > 0) {
      return {
        action: 'send',
        cleanText,
        description: 'Вставлено и отправлено (Enter)'
      };
    }
  }

  return null;
}

/**
 * Replaces verbal punctuation and formatting commands into real formatting.
 * Examples:
 *  "Привет с новой строки как дела" -> "Привет\nкак дела"
 *  "Первый пункт новый абзац второй" -> "Первый пункт\n\nвторой"
 *  "Привет смайлик" -> "Привет 😊"
 */
export function applyVoicePunctuationAndFormatting(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let out = text;

  // Newline commands: "с новой строки", "новая строка"
  out = out.replace(/(?:[,\s]+)?(?:с\s+новой\s+строки|новая\s+строка|new\s+line)[,\s]*/gi, '\n');

  // Paragraph commands: "новый абзац", "с нового абзаца", "абзац"
  out = out.replace(/(?:[,\s]+)?(?:с\s+нового\s+абзаца|новый\s+абзац|красная\s+строка|new\s+paragraph)[,\s]*/gi, '\n\n');

  // Explicit punctuation
  out = out.replace(/(?:^|\s)(?:восклицательный\s+знак|exclamation\s+mark)(?:\s|$|[.,!?:;])/gi, '! ');
  out = out.replace(/(?:^|\s)(?:вопросительный\s+знак|question\s+mark)(?:\s|$|[.,!?:;])/gi, '? ');
  out = out.replace(/(?:^|\s)(?:двоеточие|colon)(?:\s|$|[.,!?:;])/gi, ': ');
  out = out.replace(/(?:^|\s)(?:точка\s+с\s+запятой|semicolon)(?:\s|$|[.,!?:;])/gi, '; ');
  out = out.replace(/(?:^|\s)(?:тире|dash)(?:\s|$|[.,!?:;])/gi, ' — ');

  // Common spoken emojis
  out = out.replace(/(?:^|\s)(?:смайлик\s+улыбка|смайлик\s+радость|смайлик|смайл)(?:\s|$|[.,!?:;])/gi, ' 😊 ');
  out = out.replace(/(?:^|\s)(?:грустный\s+смайлик|смайлик\s+грусть)(?:\s|$|[.,!?:;])/gi, ' 😢 ');
  out = out.replace(/(?:^|\s)(?:смайлик\s+огонь|эмодзи\s+огонь|значок\s+огонь|огонь)(?:\s|$|[.,!?:;])/gi, ' 🔥 ');
  out = out.replace(/(?:^|\s)(?:палец\s+вверх|лайк)(?:\s|$|[.,!?:;])/gi, ' 👍 ');
  out = out.replace(/(?:^|\s)(?:красное\s+сердце|смайлик\s+сердце|сердечко)(?:\s|$|[.,!?:;])/gi, ' ❤️ ');

  // Clean trailing punctuation artifacts like " .\n" or double spaces
  out = out.replace(/[ \t]+/g, ' ');
  out = out.replace(/\s*\n\s*/g, '\n');
  out = out.trim();

  return out;
}

/**
 * Parses spoken voice commands for macro / snippet creation.
 * Examples:
 *  - "Запомни: мой телефон это +79990001122"
 *  - "Запомни мой телефон как +79990001122"
 *  - "Создай макрос: приветствие это Здравствуйте!"
 *  - "Запиши сниппет: почта как user@example.com"
 *  - "Remember: my phone as 555-1234"
 *  - "Create snippet: greeting is Hello everyone"
 */
export function parseVoiceMacroCommand(rawText: string): ParsedMacro | null {
  if (!rawText || rawText.trim().length < 5) {
    return null;
  }

  const clean = rawText
    .trim()
    .replace(/^["'«»]+|["'«»]+$/g, '')
    .trim();

  // Regex patterns:
  // Group 1: Prefix / command keyword (Запомни / Создай макрос / Запиши сниппет etc.)
  // Group 2: Trigger phrase
  // Group 3: Separator (это / как / is / as / — / :)
  // Group 4: Replacement text
  const patterns: RegExp[] = [
    // Russian: "Запомни [:] <триггер> (это|как|—|-) <замена>"
    /^(?:запомни|запиши|сохрани|создай\s+макрос|запиши\s+макрос|создай\s+сниппет|запиши\s+сниппет)[\s:]+["'«»]?(.+?)["'«»]?\s+(?:это|как|—|-|=|равно)\s+["'«»]?(.+?)["'«»]?$/i,
    // English: "Remember [:] <trigger> (is|as|to|=|:) <replacement>"
    /^(?:remember|save\s+macro|create\s+macro|create\s+snippet|save\s+snippet)[\s:]+["'«»]?(.+?)["'«»]?\s+(?:as|is|to|=|—|-)\s+["'«»]?(.+?)["'«»]?$/i
  ];

  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match) {
      let trigger = match[1].trim();
      let replacement = match[2].trim();

      // Clean leading/trailing punctuation and quotes from trigger
      trigger = trigger.replace(/^[:"'«»\-—\s]+|[:"'«»\-—\s]+$/g, '').trim();
      replacement = replacement.replace(/^[:"'«»\-—\s]+|[:"'«»\-—\s]+$/g, '').trim();

      if (trigger.length >= 2 && replacement.length >= 1) {
        return {
          trigger: trigger.toLowerCase(),
          replacement
        };
      }
    }
  }

  return null;
}

