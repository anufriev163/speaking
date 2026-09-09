import path from 'path';
import { execSync } from 'child_process';
import { clipboard } from 'electron';

export interface Win32ActiveWindow {
  processName: string;
  processPath: string;
  windowTitle: string;
}

let koffi: any = null;
let user32: any = null;
let kernel32: any = null;

// Native Win32 API wrappers
let GetForegroundWindow: any = null;
let GetWindowTextW: any = null;
let GetWindowThreadProcessId: any = null;
let OpenProcess: any = null;
let CloseHandle: any = null;
let QueryFullProcessImageNameW: any = null;
let SendInput: any = null;
let GetAsyncKeyState: any = null;

const INPUT_KEYBOARD = 1;
const KEYEVENTF_UNICODE = 0x0004;
const KEYEVENTF_KEYUP = 0x0002;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

// Initialize Win32 FFI only on Windows platform
if (process.platform === 'win32') {
  try {
    koffi = require('koffi');
    user32 = koffi.load('user32.dll');
    kernel32 = koffi.load('kernel32.dll');

    GetForegroundWindow = user32.func('intptr_t GetForegroundWindow()');
    GetWindowTextW = user32.func('int GetWindowTextW(intptr_t hWnd, _Out_ uint16_t *lpString, int nMaxCount)');
    GetWindowThreadProcessId = user32.func('uint32_t GetWindowThreadProcessId(intptr_t hWnd, _Out_ uint32_t *lpdwProcessId)');

    OpenProcess = kernel32.func('intptr_t OpenProcess(uint32_t dwDesiredAccess, bool bInheritHandle, uint32_t dwProcessId)');
    CloseHandle = kernel32.func('bool CloseHandle(intptr_t hObject)');
    QueryFullProcessImageNameW = kernel32.func('bool QueryFullProcessImageNameW(intptr_t hProcess, uint32_t dwFlags, _Out_ uint16_t *lpExeName, _Inout_ uint32_t *lpdwSize)');

    const KEYBDINPUT = koffi.struct('KEYBDINPUT', {
      wVk: 'uint16_t',
      wScan: 'uint16_t',
      dwFlags: 'uint32_t',
      time: 'uint32_t',
      dwExtraInfo: 'uintptr_t',
    });

    const INPUT = koffi.struct('INPUT', {
      type: 'uint32_t',
      ki: KEYBDINPUT,
      padding: 'uint64_t',
    });

    SendInput = user32.func('uint32_t SendInput(uint32_t cInputs, INPUT *pInputs, int cbSize)');
    GetAsyncKeyState = user32.func('short GetAsyncKeyState(int vKey)');
    console.log('[Platform] Native Win32 FFI successfully initialized via koffi');
  } catch (err) {
    console.warn('[Platform] Win32 FFI initialization skipped or failed. Falling back to clipboard/SendKeys:', err);
  }
}

export const VK = {
  SHIFT: 0x10,
  CONTROL: 0x11,
  MENU: 0x12, // Alt
  CAPITAL: 0x14, // Caps Lock
  ESCAPE: 0x1B,
  SPACE: 0x20,
  LWIN: 0x5B,
  RWIN: 0x5C,
  OEM_3: 0xC0, // ` ~ ё
};

export function isKeyHeld(vKey: number): boolean {
  if (!GetAsyncKeyState) return false;
  try {
    return (GetAsyncKeyState(vKey) & 0x8000) !== 0;
  } catch {
    return false;
  }
}

export function isHotkeyTriggerHeld(hotkey = 'Ctrl+~'): boolean {
  if (process.platform !== 'win32' || !GetAsyncKeyState) {
    return false;
  }
  const lower = hotkey.toLowerCase();

  if (lower.includes('ctrl') || lower.includes('control')) {
    if (!isKeyHeld(VK.CONTROL)) return false;
  }
  if (lower.includes('alt')) {
    if (!isKeyHeld(VK.MENU)) return false;
  }
  if (lower.includes('shift')) {
    if (!isKeyHeld(VK.SHIFT)) return false;
  }

  if (lower.includes('~') || lower.includes('`') || lower.includes('ё')) {
    return isKeyHeld(VK.OEM_3);
  }
  if (lower.includes('space') || lower.includes('пробел')) {
    return isKeyHeld(VK.SPACE);
  }
  if (lower.includes('caps') || lower.includes('капс')) {
    return isKeyHeld(VK.CAPITAL);
  }

  return isKeyHeld(VK.OEM_3);
}

/**
 * Gets active foreground window details across Windows and macOS.
 */
export function getActiveWindowInfo(): Win32ActiveWindow {
  if (process.platform === 'darwin') {
    return getActiveWindowInfoMac();
  }

  if (process.platform !== 'win32' || !GetForegroundWindow || !user32) {
    return { processName: 'unknown', processPath: '', windowTitle: '' };
  }

  try {
    const hwnd = GetForegroundWindow();
    if (!hwnd) {
      return { processName: 'unknown', processPath: '', windowTitle: '' };
    }

    const titleBuffer = new Uint16Array(512);
    GetWindowTextW(hwnd, titleBuffer, 512);
    const nullIdx = titleBuffer.indexOf(0);
    const windowTitle = String.fromCharCode(...titleBuffer.slice(0, nullIdx >= 0 ? nullIdx : 512));

    const pidHolder = [0];
    GetWindowThreadProcessId(hwnd, pidHolder);
    const pid = pidHolder[0];

    if (!pid) {
      return { processName: 'unknown', processPath: '', windowTitle };
    }

    let processPath = '';
    let processName = '';
    const hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);

    if (hProcess) {
      const pathBuffer = new Uint16Array(1024);
      const sizeHolder = [1024];
      if (QueryFullProcessImageNameW(hProcess, 0, pathBuffer, sizeHolder)) {
        processPath = String.fromCharCode(...pathBuffer.slice(0, sizeHolder[0]));
        processName = path.basename(processPath);
      }
      CloseHandle(hProcess);
    }

    return {
      processName: processName.toLowerCase(),
      processPath,
      windowTitle
    };
  } catch (err) {
    console.error('[Platform] Error getting active window on Windows:', err);
    return { processName: 'unknown', processPath: '', windowTitle: '' };
  }
}

function getActiveWindowInfoMac(): Win32ActiveWindow {
  try {
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set winTitle to ""
        try
          set winTitle to name of front window of frontApp
        end try
        return appName & "|||" & winTitle
      end tell
    `;
    const res = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf-8',
      timeout: 600,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    const [processName, windowTitle] = res.split('|||');
    return {
      processName: (processName || 'unknown').toLowerCase(),
      processPath: '',
      windowTitle: windowTitle || ''
    };
  } catch {
    return { processName: 'unknown', processPath: '', windowTitle: '' };
  }
}

/**
 * Direct unicode injection using Win32 SendInput (Windows only).
 */
function sendInputUnicode(text: string): boolean {
  if (!SendInput || !koffi || typeof text !== 'string' || text.length === 0) {
    return false;
  }

  try {
    const inputs: any[] = [];
    const cbSize = koffi.sizeof('INPUT');

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);

      if (code === 10) { // Newline '\n' -> Enter key
        inputs.push({
          type: INPUT_KEYBOARD,
          ki: { wVk: 0x0D, wScan: 0, dwFlags: 0, time: 0, dwExtraInfo: 0 },
          padding: 0
        });
        inputs.push({
          type: INPUT_KEYBOARD,
          ki: { wVk: 0x0D, wScan: 0, dwFlags: KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 },
          padding: 0
        });
        continue;
      }

      inputs.push({
        type: INPUT_KEYBOARD,
        ki: { wVk: 0, wScan: code, dwFlags: KEYEVENTF_UNICODE, time: 0, dwExtraInfo: 0 },
        padding: 0
      });
      inputs.push({
        type: INPUT_KEYBOARD,
        ki: { wVk: 0, wScan: code, dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 },
        padding: 0
      });
    }

    const sent = SendInput(inputs.length, inputs, cbSize);
    return sent > 0;
  } catch (err) {
    console.warn('[Platform] SendInput failed:', err);
    return false;
  }
}

/**
 * Fallback injection for Windows using Clipboard + simulated Ctrl+V.
 * Works on older Windows versions, when koffi is unavailable, or when UIPI blocks direct input.
 */
function injectClipboardWindows(text: string): boolean {
  try {
    const prevText = clipboard.readText();
    const prevImage = clipboard.readImage();
    const hadImage = !prevImage.isEmpty();

    clipboard.writeText(text);

    if (SendInput && koffi) {
      const cbSize = koffi.sizeof('INPUT');
      const inputs = [
        { type: INPUT_KEYBOARD, ki: { wVk: VK.CONTROL, wScan: 0, dwFlags: 0, time: 0, dwExtraInfo: 0 }, padding: 0 },
        { type: INPUT_KEYBOARD, ki: { wVk: 0x56, wScan: 0, dwFlags: 0, time: 0, dwExtraInfo: 0 }, padding: 0 },
        { type: INPUT_KEYBOARD, ki: { wVk: 0x56, wScan: 0, dwFlags: KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 }, padding: 0 },
        { type: INPUT_KEYBOARD, ki: { wVk: VK.CONTROL, wScan: 0, dwFlags: KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 }, padding: 0 },
      ];
      SendInput(inputs.length, inputs, cbSize);
    } else {
      // Fallback via PowerShell SendKeys on older or restricted Windows setups
      const psCmd = `powershell.exe -NoProfile -WindowStyle Hidden -Command "$ws = New-Object -ComObject WScript.Shell; $ws.SendKeys('^v')"`;
      execSync(psCmd, { timeout: 1000, stdio: ['ignore', 'ignore', 'ignore'] });
    }

    setTimeout(() => {
      try {
        if (hadImage) {
          clipboard.writeImage(prevImage);
        } else if (prevText) {
          clipboard.writeText(prevText);
        }
      } catch {}
    }, 280);

    return true;
  } catch (err) {
    console.error('[Platform] Windows clipboard fallback failed:', err);
    return false;
  }
}

/**
 * macOS text injection using Clipboard + AppleScript Cmd+V.
 */
function injectTextMac(text: string): boolean {
  try {
    const prevText = clipboard.readText();
    const prevImage = clipboard.readImage();
    const hadImage = !prevImage.isEmpty();

    clipboard.writeText(text);

    execSync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`, {
      timeout: 1000,
      stdio: ['ignore', 'ignore', 'ignore']
    });

    setTimeout(() => {
      try {
        if (hadImage) {
          clipboard.writeImage(prevImage);
        } else if (prevText) {
          clipboard.writeText(prevText);
        }
      } catch {}
    }, 300);

    return true;
  } catch (err) {
    console.error('[Platform] macOS injection failed:', err);
    return false;
  }
}

/**
 * Linux text injection using Clipboard + xdotool.
 */
function injectTextLinux(text: string): boolean {
  try {
    const prevText = clipboard.readText();
    const prevImage = clipboard.readImage();
    const hadImage = !prevImage.isEmpty();

    clipboard.writeText(text);

    execSync(`xdotool key --clearmodifiers ctrl+v`, {
      timeout: 1000,
      stdio: ['ignore', 'ignore', 'ignore']
    });

    setTimeout(() => {
      try {
        if (hadImage) {
          clipboard.writeImage(prevImage);
        } else if (prevText) {
          clipboard.writeText(prevText);
        }
      } catch {}
    }, 300);

    return true;
  } catch (err) {
    console.error('[Platform] Linux injection failed:', err);
    return false;
  }
}

/**
 * Universal text injection supporting Windows (SendInput + Clipboard fallback),
 * macOS (AppleScript Cmd+V), and Linux (xdotool).
 */
export function injectText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  if (process.platform === 'darwin') {
    return injectTextMac(text);
  }

  if (process.platform === 'linux') {
    return injectTextLinux(text);
  }

  // On Windows: First attempt direct Unicode SendInput (cleanest, zero clipboard pollution)
  const sent = sendInputUnicode(text);
  if (sent) return true;

  // Fallback to Clipboard injection for older Windows PCs or restricted windows
  const success = injectClipboardWindows(text);
  if (!success) {
    console.warn('[Platform] Text injection failed. If target application is running as Administrator, run govorilka as Administrator to satisfy Windows UIPI.');
  }
  return success;
}

// Backwards-compatible alias for existing callers
export const injectTextUnicode = injectText;

/**
 * Universal clipboard copy simulation across Windows, macOS, and Linux.
 */
export function simulateCopy(): void {
  if (process.platform === 'darwin') {
    try {
      execSync(`osascript -e 'tell application "System Events" to keystroke "c" using command down'`, {
        timeout: 600,
        stdio: ['ignore', 'ignore', 'ignore']
      });
    } catch {}
    return;
  }

  if (process.platform === 'linux') {
    try {
      execSync(`xdotool key --clearmodifiers ctrl+c`, {
        timeout: 600,
        stdio: ['ignore', 'ignore', 'ignore']
      });
    } catch {}
    return;
  }

  // Windows:
  if (SendInput && koffi) {
    try {
      const cbSize = koffi.sizeof('INPUT');
      const inputs = [
        { type: INPUT_KEYBOARD, ki: { wVk: VK.CONTROL, wScan: 0, dwFlags: 0, time: 0, dwExtraInfo: 0 }, padding: 0 },
        { type: INPUT_KEYBOARD, ki: { wVk: 0x43, wScan: 0, dwFlags: 0, time: 0, dwExtraInfo: 0 }, padding: 0 },
        { type: INPUT_KEYBOARD, ki: { wVk: 0x43, wScan: 0, dwFlags: KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 }, padding: 0 },
        { type: INPUT_KEYBOARD, ki: { wVk: VK.CONTROL, wScan: 0, dwFlags: KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 }, padding: 0 },
      ];
      SendInput(inputs.length, inputs, cbSize);
    } catch (err) {
      console.warn('[Platform] simulateCopy error:', err);
    }
  }
}
