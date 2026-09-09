import { AppCategory, ActiveContext } from '../../src/types';
import { getActiveWindowInfo } from './win32';

const IDE_PROCESSES = new Set([
  'code.exe',
  'cursor.exe',
  'idea64.exe',
  'pycharm64.exe',
  'webstorm64.exe',
  'clion64.exe',
  'rider64.exe',
  'goland64.exe',
  'rustrover64.exe',
  'devenv.exe',
  'sublime_text.exe',
  'zed.exe',
  'notepad++.exe'
]);

const TERMINAL_PROCESSES = new Set([
  'windowsterminal.exe',
  'cmd.exe',
  'powershell.exe',
  'pwsh.exe',
  'alacritty.exe',
  'wezterm-gui.exe',
  'mintty.exe',
  'conhost.exe'
]);

const CHAT_PROCESSES = new Set([
  'telegram.exe',
  'discord.exe',
  'slack.exe',
  'whatsapp.exe',
  'viber.exe',
  'teams.exe'
]);

const DOC_PROCESSES = new Set([
  'winword.exe',
  'excel.exe',
  'powerpnt.exe',
  'notion.exe',
  'obsidian.exe',
  'notepad.exe',
  'acrobat.exe'
]);

const BROWSER_PROCESSES = new Set([
  'chrome.exe',
  'firefox.exe',
  'msedge.exe',
  'brave.exe',
  'opera.exe',
  'yandex.exe',
  'arc.exe'
]);

const APP_NAMES: Record<string, string> = {
  'code.exe': 'VS Code',
  'cursor.exe': 'Cursor',
  'idea64.exe': 'IntelliJ',
  'pycharm64.exe': 'PyCharm',
  'webstorm64.exe': 'WebStorm',
  'telegram.exe': 'Telegram',
  'discord.exe': 'Discord',
  'slack.exe': 'Slack',
  'whatsapp.exe': 'WhatsApp',
  'winword.exe': 'Word',
  'excel.exe': 'Excel',
  'notion.exe': 'Notion',
  'obsidian.exe': 'Obsidian',
  'chrome.exe': 'Chrome',
  'msedge.exe': 'Edge',
  'firefox.exe': 'Firefox',
  'windowsterminal.exe': 'Терминал',
  'cmd.exe': 'Консоль',
  'powershell.exe': 'PowerShell',
  'pwsh.exe': 'PowerShell',
};

export function detectActiveContext(): ActiveContext {
  const info = getActiveWindowInfo();
  const process = info.processName.toLowerCase();

  let category: AppCategory = 'general';
  let categoryLabel = 'Общий режим';

  if (IDE_PROCESSES.has(process)) {
    category = 'code';
    categoryLabel = 'Код / IDE';
  } else if (TERMINAL_PROCESSES.has(process)) {
    category = 'terminal';
    categoryLabel = 'Терминал';
  } else if (CHAT_PROCESSES.has(process)) {
    category = 'chat';
    categoryLabel = 'Мессенджер';
  } else if (DOC_PROCESSES.has(process)) {
    category = 'document';
    categoryLabel = 'Документ';
  } else if (BROWSER_PROCESSES.has(process)) {
    category = 'browser';
    categoryLabel = 'Браузер';
  }

  const friendlyAppName = APP_NAMES[process] || (info.processName ? info.processName.replace(/\.exe$/i, '') : '');

  return {
    processName: info.processName,
    windowTitle: info.windowTitle,
    category,
    categoryLabel,
    friendlyAppName
  };
}
