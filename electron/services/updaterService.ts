import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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
  version: '1.0.4'
};

let downloadedInstallerPath: string | null = null;
let directDownloadUrl: string | null = null;
let directDownloadFileName: string | null = null;
let downloadAbortController: AbortController | null = null;

function isVersionNewer(remoteVer: string, currentVer: string): boolean {
  const r = remoteVer.replace(/^v/, '').split('.').map(x => parseInt(x, 10) || 0);
  const c = currentVer.replace(/^v/, '').split('.').map(x => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rNum = r[i] || 0;
    const cNum = c[i] || 0;
    if (rNum > cNum) return true;
    if (rNum < cNum) return false;
  }
  return false;
}

async function fetchLatestGitHubRelease(): Promise<{
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
} | null> {
  const res = await fetch('https://api.github.com/repos/anufriev163/speaking/releases/latest', {
    headers: {
      'User-Agent': 'govori-desktop',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub API HTTP ${res.status}`);
  }

  const data = await res.json();
  const latestTag: string = data.tag_name || '';
  const latestVersion = latestTag.replace(/^v/, '');
  const releaseNotes: string = data.body || '';

  const winAsset = (data.assets || []).find((a: any) =>
    typeof a.name === 'string' && a.name.endsWith('.exe') && !a.name.includes('.blockmap')
  );

  if (!winAsset || !winAsset.browser_download_url) {
    throw new Error('Файл установщика Windows (.exe) не найден в последнем релизе');
  }

  return {
    latestVersion,
    releaseNotes,
    downloadUrl: winAsset.browser_download_url,
    fileName: winAsset.name,
    fileSize: winAsset.size || 0
  };
}

async function streamDownload(
  url: string,
  fileName: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const updateDir = path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'govori-updater');
  if (!fs.existsSync(updateDir)) {
    fs.mkdirSync(updateDir, { recursive: true });
  }

  const destPath = path.join(updateDir, fileName);

  downloadAbortController = new AbortController();
  const res = await fetch(url, {
    headers: { 'User-Agent': 'govori-desktop' },
    redirect: 'follow',
    signal: downloadAbortController.signal
  });

  if (!res.ok) {
    throw new Error(`Ошибка загрузки: HTTP ${res.status}`);
  }

  const totalBytes = Number(res.headers.get('content-length')) || 88624260;
  let receivedBytes = 0;

  const fileStream = fs.createWriteStream(destPath);

  if (!res.body) {
    throw new Error('Пустой ответ сервера');
  }

  const reader = res.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
      receivedBytes += value.length;
      if (totalBytes > 0) {
        const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
        onProgress(percent);
      }
    }
  } finally {
    fileStream.end();
  }

  onProgress(100);
  return destPath;
}

export function initAutoUpdater(getSettingsWin: () => BrowserWindow | null) {
  // Determine current version:
  // In dev / unpackaged mode, display '1.0.3' so user can test the live in-app update flow to 1.0.4.
  // In production packaged mode, use official app.getVersion().
  const currentVer = app.isPackaged ? (app.getVersion() || '1.0.4') : '1.0.3';
  updateState.version = currentVer;

  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'anufriev163',
      repo: 'speaking'
    });
  } catch (err) {
    console.warn('[AutoUpdater] Failed to set explicit feed URL:', err);
  }

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

  autoUpdater.on('update-not-available', (info) => {
    updateState = {
      ...updateState,
      status: 'not-available',
      latestVersion: info?.version,
      error: undefined
    };
    broadcastState();
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] electron-updater error:', err?.message);
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
    updateState = { ...updateState, status: 'checking', error: undefined };
    broadcastState();

    try {
      // Packaged app: try electron-updater first
      if (app.isPackaged) {
        try {
          const result = await autoUpdater.checkForUpdates();
          if (result && result.updateInfo) {
            return updateState;
          }
        } catch (autoErr: any) {
          console.warn('[AutoUpdater] electron-updater failed, trying GitHub API:', autoErr?.message);
        }
      }

      // Direct GitHub releases API check (works in dev and as fallback)
      const relInfo = await fetchLatestGitHubRelease();
      if (!relInfo) {
        throw new Error('Не удалось получить данные релиза');
      }

      const activeVer = app.isPackaged ? (app.getVersion() || '1.0.4') : '1.0.3';
      const hasUpdate = isVersionNewer(relInfo.latestVersion, activeVer);

      directDownloadUrl = relInfo.downloadUrl;
      directDownloadFileName = relInfo.fileName;

      if (hasUpdate) {
        updateState = {
          ...updateState,
          status: 'available',
          latestVersion: relInfo.latestVersion,
          releaseNotes: relInfo.releaseNotes,
          error: undefined
        };
      } else {
        updateState = {
          ...updateState,
          status: 'not-available',
          latestVersion: relInfo.latestVersion,
          error: undefined
        };
      }
      broadcastState();
      return updateState;
    } catch (err: any) {
      console.error('[AutoUpdater] Check error:', err);
      const msg = err?.message || '';
      updateState = {
        ...updateState,
        status: 'error',
        error: msg.includes('ENOTFOUND') || msg.includes('fetch')
          ? 'Нет подключения к интернету'
          : 'Сервер обновлений временно недоступен'
      };
      broadcastState();
      return updateState;
    }
  });

  ipcMain.handle('updater:download', async () => {
    updateState = { ...updateState, status: 'downloading', progressPercent: 0, error: undefined };
    broadcastState();

    // Packaged mode: attempt electron-updater if available
    if (app.isPackaged && !directDownloadUrl) {
      try {
        await autoUpdater.downloadUpdate();
        return;
      } catch (err: any) {
        console.warn('[AutoUpdater] autoUpdater.downloadUpdate failed, falling back to direct stream:', err?.message);
      }
    }

    // Direct stream download (works in dev mode and packaged fallback)
    try {
      if (!directDownloadUrl || !directDownloadFileName) {
        const rel = await fetchLatestGitHubRelease();
        if (!rel || !rel.downloadUrl) {
          throw new Error('Ссылка на установщик не найдена');
        }
        directDownloadUrl = rel.downloadUrl;
        directDownloadFileName = rel.fileName;
      }

      const savedPath = await streamDownload(
        directDownloadUrl,
        directDownloadFileName,
        (percent) => {
          updateState = {
            ...updateState,
            status: 'downloading',
            progressPercent: percent
          };
          broadcastState();
        }
      );

      downloadedInstallerPath = savedPath;
      updateState = {
        ...updateState,
        status: 'downloaded',
        progressPercent: 100,
        error: undefined
      };
      broadcastState();
    } catch (err: any) {
      console.error('[AutoUpdater] Direct download failed:', err);
      updateState = {
        ...updateState,
        status: 'error',
        error: 'Сбой скачивания: ' + (err?.message || 'ошибка сети')
      };
      broadcastState();
    }
  });

  ipcMain.handle('updater:install', () => {
    // 1. Packaged electron-updater install
    if (app.isPackaged && !downloadedInstallerPath) {
      try {
        autoUpdater.quitAndInstall();
        return;
      } catch (e) {
        console.warn('[AutoUpdater] quitAndInstall failed, checking downloaded installer:', e);
      }
    }

    // 2. Direct downloaded installer spawn
    if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
      console.log('[AutoUpdater] Launching downloaded installer:', downloadedInstallerPath);
      try {
        const child = spawn(downloadedInstallerPath, [], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        setTimeout(() => {
          app.quit();
        }, 500);
        return;
      } catch (err) {
        console.error('[AutoUpdater] Failed to spawn installer:', err);
      }
    }

    // 3. Last resort fallback
    try {
      autoUpdater.quitAndInstall();
    } catch (err) {
      console.error('[AutoUpdater] Fallback install failed:', err);
    }
  });
}
