import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage, session, clipboard, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { storage } from './services/storage';
import { detectActiveContext } from './services/contextDetector';
import { injectTextUnicode, isHotkeyTriggerHeld, simulateCopy } from './services/win32';
import { transcribeAudio } from './services/sttService';
import { checkLocalWhisperAvailable, shutdownLocalWhisper } from './services/localWhisper';
import { cleanTextRules, refineTextWithLLM } from './services/llmProcessor';
import { harness } from './harness';
import { ActiveContext } from '../src/types';
import { initAutoUpdater } from './services/updaterService';

import net from 'net';
import os from 'os';

let hudWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastActiveContext: ActiveContext | null = null;
let isQuitting = false;
let pipeServer: net.Server | null = null;
const PIPE_NAME = process.platform === 'win32'
  ? '\\\\.\\pipe\\govori-single-instance-pipe'
  : path.join(os.tmpdir(), 'govori-single-instance.sock');


function wakeUpApp() {
  console.log('[SingleInstance] Waking up app windows...');
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    createSettingsWindow();
  } else {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    settingsWindow.show();
    settingsWindow.focus();
    settingsWindow.setAlwaysOnTop(true);
    setTimeout(() => {
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.setAlwaysOnTop(false);
      }
    }, 600);
  }

  if (!hudWindow || hudWindow.isDestroyed()) {
    createHudWindow();
  }
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.showInactive();
    hudWindow.setAlwaysOnTop(true, 'screen-saver');
    hudWindow.moveTop();
    hudWindow.webContents.send('hotkey:trigger', 'show');
  }
}

app.on('before-quit', () => {
  isQuitting = true;
  if (pipeServer) {
    try { pipeServer.close(); } catch {}
  }
  if (process.platform !== 'win32') {
    try { if (fs.existsSync(PIPE_NAME)) fs.unlinkSync(PIPE_NAME); } catch {}
  }
});

function notifyExistingInstanceAndExit() {
  const client = net.connect(PIPE_NAME, () => {
    try {
      client.write('wake\n');
      client.end();
    } catch {}
    process.exit(0);
  });

  client.on('error', () => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(0);
  }, 300);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[SingleInstance] requestSingleInstanceLock returned false. Waking up primary instance...');
  notifyExistingInstanceAndExit();
} else {
  try {
    if (process.platform !== 'win32') {
      try { if (fs.existsSync(PIPE_NAME)) fs.unlinkSync(PIPE_NAME); } catch {}
    }
    pipeServer = net.createServer((socket) => {
      socket.on('data', (chunk) => {
        const msg = chunk.toString().trim();
        if (msg === 'wake') {
          console.log('[SingleInstance] Valid wake request received via named pipe!');
          wakeUpApp();
        }
      });
    });
    pipeServer.listen(PIPE_NAME, () => {
      console.log('[SingleInstance] Primary instance listening on', PIPE_NAME);
    });
    pipeServer.on('error', (err) => {
      console.warn('[SingleInstance] Pipe server error:', err);
    });
  } catch (err) {
    console.warn('[SingleInstance] Failed to start named pipe server:', err);
  }

  app.on('second-instance', () => {
    console.log('[SingleInstance] app.on(second-instance) fired!');
    wakeUpApp();
  });
}

const distHtml = path.join(__dirname, '../dist/index.html');
const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_URL = 'http://localhost:5173';

function createHudWindow() {
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.show();
    hudWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { bounds } = primaryDisplay;

  const hudWidth = 440;
  const hudHeight = 80;

  const settings = storage.getSettings();
  let x = settings.hudPosition?.x;
  let y = settings.hudPosition?.y;

  if (x === undefined || y === undefined || (x === 1452 && y === 952)) {
    // Default position: centered horizontally at the bottom above taskbar
    x = Math.round(bounds.x + (bounds.width - hudWidth) / 2);
    y = Math.round(bounds.y + bounds.height - hudHeight - 24);
  }

  hudWindow = new BrowserWindow({
    width: hudWidth,
    height: hudHeight,
    x,
    y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false, // Hidden until hotkey is pressed or triggered
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    }
  });

  hudWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  hudWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:') && !url.includes('localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  hudWindow.setAlwaysOnTop(true, 'screen-saver');
  hudWindow.setVisibleOnAllWorkspaces(true);

  hudWindow.webContents.on('console-message', (_e, _level, message) => {
    console.log(`[HUD Console] ${message}`);
  });
  hudWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[HUD Load Failed] ${code} ${desc}`);
  });
  hudWindow.webContents.on('did-finish-load', () => {
    console.log('[HUD] Page loaded. Bounds:', JSON.stringify(hudWindow?.getBounds()), 'Visible:', hudWindow?.isVisible());
  });

  if (isDev) {
    hudWindow.loadURL(`${VITE_DEV_URL}/#hud`);
  } else {
    hudWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'hud' });
  }

  hudWindow.on('closed', () => {
    hudWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 550,
    frame: true,
    center: true,
    title: 'говори',
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    }
  });

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  settingsWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:') && !url.includes('localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  settingsWindow.webContents.on('console-message', (_e, _level, message) => {
    console.log(`[Settings Console] ${message}`);
  });
  settingsWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[Settings Load Failed] ${code} ${desc}`);
  });
  settingsWindow.webContents.on('did-finish-load', () => {
    console.log('[Settings] Page loaded. Bounds:', JSON.stringify(settingsWindow?.getBounds()), 'Visible:', settingsWindow?.isVisible());
  });

  if (isDev) {
    settingsWindow.loadURL(`${VITE_DEV_URL}/#settings`);
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'settings' });
  }

  settingsWindow.setAlwaysOnTop(true);
  settingsWindow.show();
  settingsWindow.focus();
  setTimeout(() => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.setAlwaysOnTop(false);
    }
  }, 1200);

  settingsWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      settingsWindow?.hide();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  try {
    const iconPath = app.isPackaged
      ? (fs.existsSync(path.join(process.resourcesPath, 'assets/icon-16.png'))
          ? path.join(process.resourcesPath, 'assets/icon-16.png')
          : path.join(__dirname, '../assets/icon-16.png'))
      : path.join(__dirname, '../assets/icon-16.png');
    const icon = fs.existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath)
      : nativeImage.createFromBuffer(
          Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAElJREFUOE9jZKAQMFKon2HUAAYGxv+E1DEyMhIjhsswomvE5xkGBgYm/F6G24AMz4NMQZfH5xkyfI/NEAwDk4+HAYw4Gg4wDAG95BEr5u8O5AAAAABJRU5ErkJggg==',
            'base64'
          )
        );

    tray = new Tray(icon);
    tray.setToolTip('говори');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Настройки и профили',
        click: () => createSettingsWindow()
      },
      {
        label: 'Показать виджет',
        click: () => {
          if (!hudWindow || hudWindow.isDestroyed()) {
            createHudWindow();
          }
          if (hudWindow) {
            hudWindow.showInactive();
            hudWindow.setAlwaysOnTop(true, 'screen-saver');
            hudWindow.moveTop();
            hudWindow.webContents.send('hotkey:trigger', 'show');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Выход',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => createSettingsWindow());
  } catch (err) {
    console.warn('[Tray] Could not initialize tray icon:', err);
  }
}

let lastHotkeyTimestamp = 0;

let pttPollingTimer: NodeJS.Timeout | null = null;
let isPttRecording = false;
let currentSelectionText = '';

async function captureActiveSelection(): Promise<string> {
  try {
    const oldClipboard = clipboard.readText();
    clipboard.writeText('');
    simulateCopy();

    // Small delay for target app to copy selection
    await new Promise((r) => setTimeout(r, 45));

    const copied = clipboard.readText();
    if (!copied || copied.trim().length === 0) {
      if (oldClipboard) {
        clipboard.writeText(oldClipboard);
      }
      return '';
    }
    return copied.trim();
  } catch (err) {
    console.warn('[Selection] Could not capture text selection:', err);
    return '';
  }
}

function stopPttPolling() {
  if (pttPollingTimer) {
    clearInterval(pttPollingTimer);
    pttPollingTimer = null;
  }
  isPttRecording = false;
}

function registerHotkeys() {
  stopPttPolling();
  globalShortcut.unregisterAll();

  // On Windows Control+~ / Control+`, on macOS CommandOrControl+~
  const isMac = process.platform === 'darwin';
  const primaryKeys = isMac
    ? ['CommandOrControl+`', 'CommandOrControl+~', 'Option+Space']
    : ['Control+`', 'Control+~'];
  let registered = false;

  for (const key of primaryKeys) {
    try {
      const success = globalShortcut.register(key, () => {
        const now = Date.now();
        const currentSettings = storage.getSettings();
        const isPtt = currentSettings.mode === 'ptt';

        lastActiveContext = detectActiveContext();

        if (!hudWindow || hudWindow.isDestroyed()) {
          createHudWindow();
        }

        if (hudWindow && !hudWindow.isDestroyed()) {
          let posX = currentSettings.hudPosition?.x;
          let posY = currentSettings.hudPosition?.y;

          if (posX === undefined || posY === undefined || (posX === 1452 && posY === 952)) {
            const primaryDisplay = screen.getPrimaryDisplay();
            const { bounds } = primaryDisplay;
            posX = Math.round(bounds.x + (bounds.width - 440) / 2);
            posY = Math.round(bounds.y + bounds.height - 80 - 24);
          }

          hudWindow.setPosition(posX, posY);
          hudWindow.showInactive();
          hudWindow.setAlwaysOnTop(true, 'screen-saver');
          hudWindow.moveTop();

          hudWindow.webContents.send('context:changed', lastActiveContext);

          // Detect active selection in foreground window for AI Rewrite
          captureActiveSelection().then((selected) => {
            currentSelectionText = selected;
            if (hudWindow && !hudWindow.isDestroyed()) {
              hudWindow.webContents.send('context:selection', {
                hasSelection: Boolean(selected && selected.length > 0),
                snippet: selected ? selected.slice(0, 35) : ''
              });
            }
          });

          if (isPtt) {
            // Push-to-Talk mode: keydown starts recording, poll until key release
            if (isPttRecording) {
              return; // Ignore OS key-repeat
            }
            isPttRecording = true;
            console.log(`[Hotkeys] PTT Start: ${key}`);
            hudWindow.webContents.send('hotkey:trigger', 'start');

            if (pttPollingTimer) clearInterval(pttPollingTimer);
            pttPollingTimer = setInterval(() => {
              const held = isHotkeyTriggerHeld(currentSettings.hotkey || 'Ctrl+~');
              if (!held) {
                stopPttPolling();
                console.log('[Hotkeys] PTT Stop (key released)');
                if (hudWindow && !hudWindow.isDestroyed()) {
                  hudWindow.webContents.send('hotkey:trigger', 'stop');
                }
              }
            }, 25);
          } else {
            // Toggle mode: start/stop on click with 600ms debounce
            if (now - lastHotkeyTimestamp < 600) {
              return;
            }
            lastHotkeyTimestamp = now;
            console.log(`[Hotkeys] Toggle Triggered: ${key}`);
            hudWindow.webContents.send('hotkey:trigger', 'toggle');
          }
        }
      });

      if (success) {
        console.log(`[Hotkeys] Successfully registered: ${key}`);
        registered = true;
        break; // Stop after first successful registration to avoid duplicate event handlers
      } else {
        console.warn(`[Hotkeys] Key ${key} is busy or could not be registered`);
      }
    } catch (err) {
      console.error(`[Hotkeys] Error registering ${key}:`, err);
    }
  }

  if (registered) {
    storage.updateSettings({ hotkey: 'Ctrl+~' });
  } else {
    console.warn('[Hotkeys] Could not register Ctrl+~ shortcut.');
  }
}

function applyAutoStart(enabled: boolean) {
  try {
    const isPackaged = app.isPackaged;
    if (isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath,
        args: ['--autostart']
      });
    } else {
      const { exec } = require('child_process');
      const exePath = path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'govori.exe');
      const appPath = process.cwd();
      const runKey = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';

      if (enabled) {
        const psCommand = `$val = '"${exePath}" "${appPath}" --autostart'; Set-ItemProperty -Path "${runKey}" -Name "Govori" -Value $val`;
        exec(`powershell -NoProfile -NonInteractive -Command "${psCommand.replace(/"/g, '\\"')}"`, (err: any) => {
          if (err) console.error('[AutoStart] Error setting registry:', err);
          else console.log('[AutoStart] Successfully registered in HKCU Run registry');
        });
      } else {
        const psCommand = `Remove-ItemProperty -Path "${runKey}" -Name "Govori" -ErrorAction SilentlyContinue`;
        exec(`powershell -NoProfile -NonInteractive -Command "${psCommand.replace(/"/g, '\\"')}"`, (err: any) => {
          if (err) console.error('[AutoStart] Error removing from registry:', err);
          else console.log('[AutoStart] Removed from HKCU Run registry');
        });
      }

      // Cleanup legacy VBScript if present in Startup
      const startupFolder = path.join(
        process.env.APPDATA || '',
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        'Startup'
      );
      const legacyVbs = path.join(startupFolder, 'GovoriAI.vbs');
      if (fs.existsSync(legacyVbs)) {
        try { fs.unlinkSync(legacyVbs); } catch {}
      }
    }
  } catch (err) {
    console.error('[AutoStart] Error applying autostart:', err);
  }
}

// IPC Handlers
function setupIpcHandlers() {
  ipcMain.handle('storage:get-settings', () => storage.getSettings());
  ipcMain.handle('storage:update-settings', (_event, newSettings) => {
    const updated = storage.updateSettings(newSettings);
    if (newSettings.hotkey || newSettings.mode) {
      registerHotkeys();
    }
    if (newSettings.autoStart !== undefined) {
      applyAutoStart(newSettings.autoStart);
    }
    if (hudWindow && !hudWindow.isDestroyed()) {
      hudWindow.webContents.send('settings:changed', updated);
    }
    return updated;
  });

  initAutoUpdater(() => settingsWindow);

  ipcMain.handle('storage:get-dictionary', () => storage.getDictionary());
  ipcMain.handle('storage:save-dictionary', (_event, dict) => storage.saveDictionary(dict));

  ipcMain.handle('storage:get-snippets', () => storage.getSnippets());
  ipcMain.handle('storage:save-snippets', (_event, snippets) => storage.saveSnippets(snippets));

  ipcMain.handle('storage:get-history', () => storage.getHistory());
  ipcMain.handle('storage:clear-history', () => storage.clearHistory());

  ipcMain.handle('history:export', async (_event, format: 'md' | 'txt' = 'md') => {
    const history = storage.getHistory();
    if (!history || history.length === 0) {
      return { success: false, reason: 'empty' };
    }

    const ext = format === 'txt' ? 'txt' : 'md';
    const dateStr = new Date().toISOString().slice(0, 10);
    const defaultFilename = `govori_history_${dateStr}.${ext}`;

    const saveRes = await dialog.showSaveDialog(settingsWindow || BrowserWindow.getFocusedWindow() || undefined, {
      title: 'Экспорт истории записей',
      defaultPath: path.join(app.getPath('documents'), defaultFilename),
      filters: [
        format === 'txt'
          ? { name: 'Текстовый документ (*.txt)', extensions: ['txt'] }
          : { name: 'Markdown документ (*.md)', extensions: ['md'] },
        { name: 'Все файлы (*.*)', extensions: ['*'] }
      ]
    });

    if (saveRes.canceled || !saveRes.filePath) {
      return { success: false, reason: 'canceled' };
    }

    let fileContent = '';
    const nowReadable = new Date().toLocaleString('ru-RU');

    if (format === 'txt') {
      fileContent = `ЖУРНАЛ ДИКТОВОК «ГОВОРИ»\nЭкспортировано: ${nowReadable}\nВсего записей: ${history.length}\n` +
        '='.repeat(60) + '\n\n' +
        history.map((item) => {
          const date = new Date(item.timestamp).toLocaleString('ru-RU');
          const appName = item.appContext ? ` [${item.appContext}]` : '';
          return `[${date}]${appName} (${item.latencyMs}мс)\n${item.processedText}\n` + '-'.repeat(40);
        }).join('\n\n');
    } else {
      fileContent = `# Журнал диктовок «Говори»\n\n` +
        `> **Экспортировано:** ${nowReadable}  \n` +
        `> **Всего записей:** ${history.length}\n\n---\n\n` +
        history.map((item) => {
          const date = new Date(item.timestamp).toLocaleString('ru-RU');
          const appName = item.appContext ? ` \`${item.appContext}\`` : '';
          return `### ${date}${appName} • ${item.latencyMs}мс\n\n${item.processedText}`;
        }).join('\n\n---\n\n');
    }

    await fs.promises.writeFile(saveRes.filePath, fileContent, 'utf-8');
    return { success: true, filePath: saveRes.filePath };
  });

  ipcMain.handle('win32:get-context', () => detectActiveContext());

  ipcMain.handle('win32:inject-text', (_event, text) => {
    return injectTextUnicode(text);
  });

  ipcMain.handle('stt:transcribe', async (_event, audioArrayBuffer: ArrayBuffer, mimeType = 'audio/wav') => {
    const audioBuffer = Buffer.from(audioArrayBuffer);
    const context = lastActiveContext || detectActiveContext();
    const selectedText = currentSelectionText;
    currentSelectionText = ''; // Consume once

    const result = await harness.execute({
      audioBuffer,
      mimeType,
      requestedContext: context,
      selectedText
    });

    if (result.macroCreated && settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('storage:snippets-changed', storage.getSnippets());
    }

    return result;
  });

  ipcMain.handle('stt:check-local', () => checkLocalWhisperAvailable());

  ipcMain.handle('harness:get-metrics', () => {
    return harness.observability.getMetricsSummary();
  });

  ipcMain.on('window:open-settings', () => createSettingsWindow());
  ipcMain.on('window:close-settings', () => settingsWindow?.close());
  ipcMain.on('window:minimize-settings', () => settingsWindow?.minimize());
  ipcMain.on('window:move-hud', (_event, { deltaX, deltaY }) => {
    if (!hudWindow || hudWindow.isDestroyed()) return;
    const [currentX, currentY] = hudWindow.getPosition();
    const newX = Math.round(currentX + deltaX);
    const newY = Math.round(currentY + deltaY);
    hudWindow.setPosition(newX, newY);
    storage.updateSettings({ hudPosition: { x: newX, y: newY } });
  });
  ipcMain.on('window:save-hud-position', (_event, pos: { x: number; y: number }) => {
    storage.updateSettings({ hudPosition: pos });
  });
  ipcMain.on('window:hide-hud', () => {
    if (hudWindow && !hudWindow.isDestroyed()) {
      hudWindow.hide();
    }
  });
  ipcMain.on('hud:recording-stopped', () => {
    stopPttPolling();
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Only allow media (microphone) capture for speech dictation
    if (permission === 'media') {
      return callback(true);
    }
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media';
  });

  setupIpcHandlers();
  createHudWindow();

  const settings = storage.getSettings();

  // Show settings window on manual launch; keep quiet only on system boot autostart
  const isAutostart = process.argv.includes('--autostart');
  if (!isAutostart) {
    createSettingsWindow();
    setTimeout(() => {
      if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.showInactive();
        hudWindow.setAlwaysOnTop(true, 'screen-saver');
        hudWindow.moveTop();
        hudWindow.webContents.send('hotkey:trigger', 'show');
      }
    }, 400);
  }

  createTray();
  registerHotkeys();

  // Apply autostart state if configured
  if (settings.autoStart) {
    applyAutoStart(true);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createHudWindow();
    }
  });
});

app.on('will-quit', () => {
  shutdownLocalWhisper();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e: any) => {
  // Don't quit app on Windows when windows close; keep in tray
  e?.preventDefault?.();
});
