import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Persistent error log so failures in the tray app are never silent: users can attach it to bug reports
const MAX_LOG_BYTES = 1024 * 1024;

function logFilePath(): string {
  let dir: string;
  try {
    dir = app.getPath('logs');
  } catch {
    dir = path.join(app.getPath('userData'), 'logs');
  }
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'errors.log');
}

export function logError(source: string, err: unknown): void {
  const detail = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`[${source}]`, detail);
  try {
    const file = logFilePath();
    try {
      if (fs.statSync(file).size > MAX_LOG_BYTES) fs.renameSync(file, `${file}.old`);
    } catch {}
    fs.appendFileSync(file, `${new Date().toISOString()} [${source}] ${detail}\n`, 'utf-8');
  } catch {}
}
