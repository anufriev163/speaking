import path from 'path';

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

  // KEYBDINPUT struct
  const KEYBDINPUT = koffi.struct('KEYBDINPUT', {
    wVk: 'uint16_t',
    wScan: 'uint16_t',
    dwFlags: 'uint32_t',
    time: 'uint32_t',
    dwExtraInfo: 'uintptr_t',
  });

  // INPUT struct with union
  const INPUT = koffi.struct('INPUT', {
    type: 'uint32_t',
    ki: KEYBDINPUT,
    padding: 'uint64_t', // 64-bit alignment padding
  });

  SendInput = user32.func('uint32_t SendInput(uint32_t cInputs, INPUT *pInputs, int cbSize)');
  GetAsyncKeyState = user32.func('short GetAsyncKeyState(int vKey)');
  console.log('[Win32] Native Win32 FFI successfully initialized via koffi');
} catch (err) {
  console.warn('[Win32] Failed to initialize koffi native Win32 FFI. Falling back to non-native mode:', err);
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
  if (!GetAsyncKeyState) return false;
  const lower = hotkey.toLowerCase();

  // 1. Check modifiers
  if (lower.includes('ctrl') || lower.includes('control')) {
    if (!isKeyHeld(VK.CONTROL)) return false;
  }
  if (lower.includes('alt')) {
    if (!isKeyHeld(VK.MENU)) return false;
  }
  if (lower.includes('shift')) {
    if (!isKeyHeld(VK.SHIFT)) return false;
  }

  // 2. Check trigger/action key
  if (lower.includes('~') || lower.includes('`') || lower.includes('ё')) {
    return isKeyHeld(VK.OEM_3);
  }
  if (lower.includes('space') || lower.includes('пробел')) {
    return isKeyHeld(VK.SPACE);
  }
  if (lower.includes('caps') || lower.includes('капс')) {
    return isKeyHeld(VK.CAPITAL);
  }

  // Default fallback to OEM_3 (` / ~ / ё)
  return isKeyHeld(VK.OEM_3);
}

export function getActiveWindowInfo(): Win32ActiveWindow {
  if (!GetForegroundWindow || !user32) {
    return { processName: 'unknown', processPath: '', windowTitle: '' };
  }

  try {
    const hwnd = GetForegroundWindow();
    if (!hwnd) {
      return { processName: 'unknown', processPath: '', windowTitle: '' };
    }

    // Get window title
    const titleBuffer = new Uint16Array(512);
    GetWindowTextW(hwnd, titleBuffer, 512);
    const windowTitle = String.fromCharCode(...titleBuffer.filter(c => c !== 0));

    // Get process ID
    const pidHolder = [0];
    GetWindowThreadProcessId(hwnd, pidHolder);
    const pid = pidHolder[0];

    if (!pid) {
      return { processName: 'unknown', processPath: '', windowTitle };
    }

    // Get process image name
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
    console.error('[Win32] Error getting active window:', err);
    return { processName: 'unknown', processPath: '', windowTitle: '' };
  }
}

/**
 * Injects text directly into the focused window using Win32 SendInput (Unicode mode).
 * Zero clipboard pollution!
 */
export function injectTextUnicode(text: string): boolean {
  if (!SendInput || !koffi || typeof text !== 'string' || text.length === 0) {
    return false;
  }

  try {
    const inputs: any[] = [];
    const cbSize = koffi.sizeof('INPUT');

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);

      if (code === 10) { // Newline '\n' -> simulate Enter key
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

      // Key Down
      inputs.push({
        type: INPUT_KEYBOARD,
        ki: {
          wVk: 0,
          wScan: code,
          dwFlags: KEYEVENTF_UNICODE,
          time: 0,
          dwExtraInfo: 0
        },
        padding: 0
      });

      // Key Up
      inputs.push({
        type: INPUT_KEYBOARD,
        ki: {
          wVk: 0,
          wScan: code,
          dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
          time: 0,
          dwExtraInfo: 0
        },
        padding: 0
      });
    }

    const sent = SendInput(inputs.length, inputs, cbSize);
    return sent > 0;
  } catch (err) {
    console.error('[Win32] Error injecting text via SendInput:', err);
    return false;
  }
}

/**
 * Simulates Ctrl+C in the active window using Win32 SendInput.
 */
export function simulateCopy(): void {
  if (!SendInput || !koffi) return;

  try {
    const cbSize = koffi.sizeof('INPUT');
    const inputs = [
      // Ctrl DOWN
      { type: INPUT_KEYBOARD, ki: { wVk: VK.CONTROL, wScan: 0, dwFlags: 0, time: 0, dwExtraInfo: 0 }, padding: 0 },
      // 'C' (0x43) DOWN
      { type: INPUT_KEYBOARD, ki: { wVk: 0x43, wScan: 0, dwFlags: 0, time: 0, dwExtraInfo: 0 }, padding: 0 },
      // 'C' UP
      { type: INPUT_KEYBOARD, ki: { wVk: 0x43, wScan: 0, dwFlags: KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 }, padding: 0 },
      // Ctrl UP
      { type: INPUT_KEYBOARD, ki: { wVk: VK.CONTROL, wScan: 0, dwFlags: KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0 }, padding: 0 },
    ];
    SendInput(inputs.length, inputs, cbSize);
  } catch (err) {
    console.warn('[Win32] simulateCopy error:', err);
  }
}
