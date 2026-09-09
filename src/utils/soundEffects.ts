/**
 * Apple-inspired acoustic sound cues for dictation
 * Designed with warm harmonics, gentle envelopes and low-pass filtering.
 */
class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Apple-inspired crisp, warm start chime (C5 -> G5)
   */
  public playStart() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.Q.setValueAtTime(1.2, now);
      filter.connect(ctx.destination);

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.045, now + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc1.connect(gain1);
      gain1.connect(filter);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Note 2: G5 (783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.045);
      gain2.gain.setValueAtTime(0.001, now + 0.045);
      gain2.gain.linearRampToValueAtTime(0.05, now + 0.053);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc2.connect(gain2);
      gain2.connect(filter);
      osc2.start(now + 0.045);
      osc2.stop(now + 0.15);
    } catch {}
  }

  /**
   * Apple-inspired gentle descending stop chime (G5 -> E5)
   */
  public playStop() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.connect(ctx.destination);

      // Note 1: G5 (783.99 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.04, now + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc1.connect(gain1);
      gain1.connect(filter);
      osc1.start(now);
      osc1.stop(now + 0.07);

      // Note 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.04);
      gain2.gain.setValueAtTime(0.001, now + 0.04);
      gain2.gain.linearRampToValueAtTime(0.035, now + 0.048);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc2.connect(gain2);
      gain2.connect(filter);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.13);
    } catch {}
  }

  /**
   * Subtle haptic confirmation pop / tick (B5 -> E6)
   */
  public playSuccess() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.03);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }
}

export const soundEffects = new SoundEffectsManager();
