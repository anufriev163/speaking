import { AppSettings } from '../../../src/types';

export class GovernanceManager {
  private dailyRequestCount = 0;
  private currentDay = new Date().toDateString();
  private readonly GROQ_DAILY_LIMIT = 14400;

  public checkRequestPolicy(settings: AppSettings): { allowed: boolean; reason?: string } {
    this.rotateDailyCounterIfNeeded();

    // Quota check for free Groq tier.
    // A missing API key is NOT blocked here: sttService falls back to local Whisper
    // or reports a clear error itself.
    if (settings.provider === 'groq' && this.dailyRequestCount >= this.GROQ_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: `Дневной лимит Groq исчерпан (${this.dailyRequestCount}/${this.GROQ_DAILY_LIMIT}). Переключитесь на локальный Whisper или OpenAI.`
      };
    }

    return { allowed: true };
  }

  public trackRequest(): void {
    this.rotateDailyCounterIfNeeded();
    this.dailyRequestCount++;
  }

  public getDailyQuotaStatus(): { used: number; limit: number; remaining: number } {
    this.rotateDailyCounterIfNeeded();
    return {
      used: this.dailyRequestCount,
      limit: this.GROQ_DAILY_LIMIT,
      remaining: Math.max(0, this.GROQ_DAILY_LIMIT - this.dailyRequestCount)
    };
  }

  private rotateDailyCounterIfNeeded(): void {
    const today = new Date().toDateString();
    if (today !== this.currentDay) {
      this.currentDay = today;
      this.dailyRequestCount = 0;
    }
  }
}
