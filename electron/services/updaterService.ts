import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateInfoState {
  status: UpdateStatus;
  version: string;
  latestVersion?: string;
  releaseNotes?: string;
  progressPercent?: number;
  error?: string;
}

let updateState: UpdateInfoState = {
  status: 'idle',
  version: '1.0.0'
};

export function initAutoUpdater(getSettingsWin: () => BrowserWindow | null) {
  try {
    updateState.version = app.getVersion() || '1.0.0';
  } catch {}

  // Explicitly configure GitHub feed URL to ensure correct target repo
  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'anufriev163',
      repo: 'speaking'
    });
  } catch (err) {
    console.warn('[AutoUpdater] Failed to set explicit feed URL:', err);
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  function broadcastState() {
    const win = getSettingsWin();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status-changed', updateState);
    }
  }

  autoUpdater.on('checking-for-update', () => {
    updateState = { ...updateState, status: 'checking', error: undefined };
    broadcastState();
  });

  autoUpdater.on('update-available', (info) => {
    updateState = {
      ...updateState,
      status: 'available',
      latestVersion: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      error: undefined
    };
    broadcastState();
  });

  autoUpdater.on('update-not-available', () => {
    updateState = {
      ...updateState,
      status: 'not-available',
      error: undefined
    };
    broadcastState();
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Error checking update:', err?.message);
    const msg = err?.message || '';
    if (msg.includes('404') || msg.includes('releases.atom') || msg.includes('Cannot find') || msg.includes('HttpError: 404')) {
      // 404 on release repository means no published releases yet -> current version is latest
      updateState = {
        ...updateState,
        status: 'not-available',
        error: undefined
      };
    } else {
      updateState = {
        ...updateState,
        status: 'error',
        error: msg.includes('net::') || msg.includes('ENOTFOUND')
          ? 'Нет подключения к интернету'
          : 'Сервер обновлений временно недоступен'
      };
    }
    broadcastState();
  });

  autoUpdater.on('download-progress', (progressObj) => {
    updateState = {
      ...updateState,
      status: 'downloading',
      progressPercent: Math.round(progressObj.percent)
    };
    broadcastState();
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateState = {
      ...updateState,
      status: 'downloaded',
      latestVersion: info.version,
      progressPercent: 100
    };
    broadcastState();
  });

  // IPC Handlers
  ipcMain.handle('updater:get-status', () => updateState);

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      // In dev mode, simulate check to verify UI behavior smoothly
      updateState = { ...updateState, status: 'checking', error: undefined };
      broadcastState();
      await new Promise(r => setTimeout(r, 600));
      updateState = {
        ...updateState,
        status: 'not-available'
      };
      broadcastState();
      return updateState;
    }

    try {
      updateState = { ...updateState, status: 'checking', error: undefined };
      broadcastState();
      await autoUpdater.checkForUpdates();
      return updateState;
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('404') || msg.includes('releases.atom') || msg.includes('Cannot find') || msg.includes('HttpError: 404')) {
        updateState = {
          ...updateState,
          status: 'not-available',
          error: undefined
        };
      } else {
        updateState = {
          ...updateState,
          status: 'error',
          error: msg.includes('net::') || msg.includes('ENOTFOUND')
            ? 'Нет подключения к интернету'
            : 'Сервер обновлений временно недоступен'
        };
      }
      broadcastState();
      return updateState;
    }
  });

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) {
      // Dev mode mock download
      updateState = { ...updateState, status: 'downloading', progressPercent: 45 };
      broadcastState();
      await new Promise(r => setTimeout(r, 800));
      updateState = { ...updateState, status: 'downloaded', progressPercent: 100 };
      broadcastState();
      return;
    }

    updateState = { ...updateState, status: 'downloading', progressPercent: 0 };
    broadcastState();
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle('updater:install', () => {
    if (app.isPackaged) {
      autoUpdater.quitAndInstall();
    }
  });
}
