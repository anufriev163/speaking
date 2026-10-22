import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import readline from 'readline';
import { app } from 'electron';
import { TranscriptionResult } from './sttService';

let workerProcess: ChildProcess | null = null;
let workerRl: readline.Interface | null = null;
// Responses are matched by request id: a timed-out request must never
// swallow the answer meant for the next one.
let nextRequestId = 1;
const pendingRequests = new Map<number, {
  resolve: (val: any) => void;
  reject: (err: any) => void;
  timer: NodeJS.Timeout;
}>();
// First transcription loads (and on first run downloads) the model — allow much longer
let modelReady = false;
const MODEL_LOAD_TIMEOUT_MS = 180000;
const TRANSCRIBE_TIMEOUT_MS = 30000;

function getScriptPath(): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(__dirname, '..', 'resources', 'scripts', 'whisper_worker.py');
  }
  return path.join(process.resourcesPath, 'scripts', 'whisper_worker.py');
}

/**
 * Checks if Python with faster-whisper is available in the system environment
 */
export async function checkLocalWhisperAvailable(): Promise<{ available: boolean; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn('python', ['-c', 'import faster_whisper; print("OK")'], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    proc.stdout?.on('data', (d) => { output += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0 && output.includes('OK')) {
        resolve({ available: true });
      } else {
        resolve({ available: false, error: 'faster-whisper не найден в Python' });
      }
    });

    proc.on('error', (err) => {
      resolve({ available: false, error: err.message });
    });
  });
}

/**
 * Spawns or returns existing persistent faster-whisper worker process
 */
function getWorker(): ChildProcess {
  if (workerProcess && !workerProcess.killed) {
    return workerProcess;
  }

  const scriptPath = getScriptPath();
  console.log('[LocalWhisper] Spawning worker from:', scriptPath);

  workerProcess = spawn('python', [scriptPath], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (workerProcess.stdout) {
    workerRl = readline.createInterface({ input: workerProcess.stdout });
    workerRl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const data = JSON.parse(trimmed);
        const pending = pendingRequests.get(data.id);
        if (!pending) return; // late answer to a request that already timed out
        pendingRequests.delete(data.id);
        clearTimeout(pending.timer);
        pending.resolve(data);
      } catch (err) {
        console.error('[LocalWhisper] Failed to parse worker output:', trimmed, err);
      }
    });
  }

  workerProcess.stderr?.on('data', (data) => {
    console.log(`[LocalWhisper:stderr] ${data.toString().trim()}`);
  });

  workerProcess.on('exit', (code, signal) => {
    console.warn(`[LocalWhisper] Worker exited with code ${code}, signal ${signal}`);
    workerProcess = null;
    workerRl = null;
    modelReady = false;
    // Reject any waiting callers
    for (const req of pendingRequests.values()) {
      clearTimeout(req.timer);
      req.reject(new Error('Локальный процесс Whisper внезапно завершился'));
    }
    pendingRequests.clear();
  });

  return workerProcess;
}

/**
 * Sends a JSON command to the worker and waits for JSON line response
 */
function sendWorkerCommand(cmd: Record<string, any>, timeoutMs = 25000): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const worker = getWorker();
      if (!worker.stdin || worker.killed) {
        return reject(new Error('Локальный процесс распознавания не готов'));
      }

      const id = nextRequestId++;
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error('Таймаут локального распознавания'));
      }, timeoutMs);

      pendingRequests.set(id, { resolve, reject, timer });
      worker.stdin.write(JSON.stringify({ ...cmd, id }) + '\n');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Transcribe an audio buffer locally using faster-whisper
 */
export async function transcribeAudioLocal(
  audioBuffer: Buffer,
  mimeType = 'audio/wav',
  language = 'ru'
): Promise<TranscriptionResult> {
  const startTime = Date.now();
  const ext = mimeType.includes('webm') ? '.webm' : '.wav';
  const tempPath = path.join(os.tmpdir(), `govori_local_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);

  try {
    await fs.promises.writeFile(tempPath, audioBuffer);

    const res = await sendWorkerCommand({
      action: 'transcribe',
      path: tempPath,
      language
    }, modelReady ? TRANSCRIBE_TIMEOUT_MS : MODEL_LOAD_TIMEOUT_MS);

    if (res.status !== 'ok') {
      throw new Error(res.message || 'Ошибка локального распознавания');
    }
    modelReady = true;

    const latencyMs = Date.now() - startTime;
    return {
      text: (res.text || '').trim(),
      durationSeconds: res.duration || 0,
      latencyMs
    };
  } finally {
    // Clean up temporary audio file asynchronously
    fs.promises.unlink(tempPath).catch(() => {});
  }
}

/**
 * Terminates the worker process on app exit
 */
export function shutdownLocalWhisper(): void {
  if (workerProcess && !workerProcess.killed) {
    try {
      workerProcess.kill();
    } catch {}
    workerProcess = null;
  }
}
