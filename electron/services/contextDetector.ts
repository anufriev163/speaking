import { AppCategory, ActiveContext } from '../../src/types';
import { getActiveWindowInfo } from './win32';

const IDE_PROCESSES = new Set([
  'code', 'cursor', 'idea64', 'idea', 'pycharm64', 'pycharm',
  'webstorm64', 'webstorm', 'clion64', 'clion', 'rider64', 'rider',
  'goland64', 'goland', 'rustrover64', 'rustrover', 'devenv',
  'sublime_text', 'sublime text', 'zed', 'notepad++', 'xcode'
]);

const TERMINAL_PROCESSES = new Set([
  'windowsterminal', 'cmd', 'powershell', 'pwsh',
  'alacritty', 'wezterm-gui', 'wezterm', 'mintty', 'conhost',
  'terminal', 'iterm2', 'warp', 'kitty'
]);

const CHAT_PROCESSES = new Set([
  'telegram', 'discord', 'slack', 'whatsapp', 'viber', 'teams', 'messages'
]);

const DOC_PROCESSES = new Set([
  'winword', 'excel', 'powerpnt', 'notion', 'obsidian', 'notepad', 'acrobat',
  'pages', 'numbers', 'keynote', 'textedit'
]);

const BROWSER_PROCESSES = new Set([
  'chrome', 'google chrome', 'firefox', 'msedge', 'brave', 'opera', 'yandex', 'arc', 'safari'
]);

const APP_NAMES: Record<string, string> = {
  'code': 'VS Code',
  'cursor': 'Cursor',
  'idea64': 'IntelliJ',
  'idea': 'IntelliJ',
  'pycharm64': 'PyCharm',
  'pycharm': 'PyCharm',
  'webstorm64': 'WebStorm',
  'webstorm': 'WebStorm',
  'telegram': 'Telegram',
  'discord': 'Discord',
  'slack': 'Slack',
  'whatsapp': 'WhatsApp',
  'winword': 'Word',
  'excel': 'Excel',
  'notion': 'Notion',
  'obsidian': 'Obsidian',
  'chrome': 'Chrome',
  'google chrome': 'Chrome',
  'msedge': 'Edge',
  'firefox': 'Firefox',
  'safari': 'Safari',
  'windowsterminal': 'Терминал',
  'terminal': 'Терминал',
  'iterm2': 'iTerm2',
  'cmd': 'Консоль',
  'powershell': 'PowerShell',
  'pwsh': 'PowerShell',
};

export function detectActiveContext(): ActiveContext {
  const info = getActiveWindowInfo();
  const rawProcess = (info.processName || '').toLowerCase().trim();
  const process = rawProcess.replace(/\.exe$/i, '');

  let category: AppCategory = 'general';
  let categoryLabel = 'Общий режим';

  if (IDE_PROCESSES.has(process) || IDE_PROCESSES.has(rawProcess)) {
    category = 'code';
    categoryLabel = 'Код / IDE';
  } else if (TERMINAL_PROCESSES.has(process) || TERMINAL_PROCESSES.has(rawProcess)) {
    category = 'terminal';
    categoryLabel = 'Терминал';
  } else if (CHAT_PROCESSES.has(process) || CHAT_PROCESSES.has(rawProcess)) {
    category = 'chat';
    categoryLabel = 'Мессенджер';
  } else if (DOC_PROCESSES.has(process) || DOC_PROCESSES.has(rawProcess)) {
    category = 'document';
    categoryLabel = 'Документ';
  } else if (BROWSER_PROCESSES.has(process) || BROWSER_PROCESSES.has(rawProcess)) {
    category = 'browser';
    categoryLabel = 'Браузер';
  }

  const friendlyAppName = APP_NAMES[process] || APP_NAMES[rawProcess] || (info.processName ? info.processName.replace(/\.exe$/i, '') : '');

  return {
    processName: info.processName,
    windowTitle: info.windowTitle,
    category,
    categoryLabel,
    friendlyAppName
  };
}
