export interface ParsedMacro {
  trigger: string;
  replacement: string;
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
