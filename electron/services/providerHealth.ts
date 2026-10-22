// Remembers cloud providers that recently failed at the network level (blocked by
// VPN/ISP, outage), so dictation skips them instead of waiting on timeouts every time.

export type CloudProvider = 'groq' | 'openai';

const COOLDOWN_MS = 5 * 60 * 1000;
const downUntil = new Map<CloudProvider, number>();

export function markProviderDown(provider: CloudProvider): void {
  console.warn(`[ProviderHealth] ${provider} unreachable, skipping it for ${COOLDOWN_MS / 60000} min`);
  downUntil.set(provider, Date.now() + COOLDOWN_MS);
}

export function markProviderUp(provider: CloudProvider): void {
  downUntil.delete(provider);
}

export function isProviderDown(provider: CloudProvider): boolean {
  const until = downUntil.get(provider);
  if (!until) return false;
  if (Date.now() >= until) {
    downUntil.delete(provider);
    return false;
  }
  return true;
}
