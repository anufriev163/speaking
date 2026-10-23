import { clipboard, ClipboardItem } from 'electron';

// Electron 44+ clipboard is async and W3C-shaped: a snapshot is every item's payload,
// fetched eagerly (getType is lazy and would otherwise read whatever is there later).
// The legacy Win7 build runs Electron 22 with the old sync API — handled separately.
type ItemPayload = Record<string, Blob | Electron.ClipboardBookmark>;

interface LegacyClipboard {
  readText(): string;
  readHTML(): string;
  readRTF(): string;
  readImage(): { isEmpty(): boolean };
  write(data: Record<string, unknown>): void;
}

export interface ClipboardSnapshot {
  items: ItemPayload[];
  text: string;
  legacy?: { html: string; rtf: string; image: { isEmpty(): boolean } };
}

const legacyClipboard: LegacyClipboard | null =
  typeof (clipboard as any).readHTML === 'function' ? (clipboard as unknown as LegacyClipboard) : null;

export async function snapshotClipboard(): Promise<ClipboardSnapshot> {
  if (legacyClipboard) {
    return {
      items: [],
      text: legacyClipboard.readText(),
      legacy: { html: legacyClipboard.readHTML(), rtf: legacyClipboard.readRTF(), image: legacyClipboard.readImage() },
    };
  }

  const items: ItemPayload[] = [];
  let text = '';
  try {
    text = await clipboard.readText();
    for (const item of await clipboard.read()) {
      const payload: ItemPayload = {};
      for (const type of item.types) {
        try {
          payload[type] = await item.getType(type);
        } catch {}
      }
      if (Object.keys(payload).length > 0) items.push(payload);
    }
  } catch (err) {
    console.warn('[Clipboard] Snapshot failed:', err);
  }
  return { items, text };
}

export async function restoreClipboard(snap: ClipboardSnapshot): Promise<void> {
  if (legacyClipboard && snap.legacy) {
    try {
      const { html, rtf, image } = snap.legacy;
      const hasImage = !image.isEmpty();
      if (snap.text || html || rtf || hasImage) {
        legacyClipboard.write({
          text: snap.text || undefined,
          html: html || undefined,
          rtf: rtf || undefined,
          image: hasImage ? image : undefined,
        });
      } else {
        clipboard.clear();
      }
    } catch {}
    return;
  }

  try {
    if (snap.items.length === 0) {
      if (snap.text) await clipboard.writeText(snap.text);
      else clipboard.clear();
      return;
    }
    await clipboard.write(snap.items.map((payload) => new ClipboardItem(payload)));
  } catch (err) {
    // Some OS-specific formats can't be written back — keep at least the text
    console.warn('[Clipboard] Full restore failed, restoring text only:', err);
    try {
      if (snap.text) await clipboard.writeText(snap.text);
      else clipboard.clear();
    } catch {}
  }
}

// Target apps (Electron chats, Office) may read the clipboard well after Ctrl+V is sent
const PASTE_SETTLE_MS = 700;

/**
 * Restores the user's clipboard after a paste-injection, but only if it still holds
 * our injected text — if the user copied something else meanwhile, keep theirs.
 */
export function restoreClipboardAfterPaste(snap: ClipboardSnapshot, injectedText: string): void {
  setTimeout(async () => {
    try {
      if ((await clipboard.readText()) !== injectedText) return;
    } catch {
      return;
    }
    await restoreClipboard(snap);
  }, PASTE_SETTLE_MS);
}
