import { GovernanceCheckResult } from '../types';
import { AppSettings } from '../../../src/types';

export class GovernanceManager {
  private dailyRequestCount = 0;
  private currentDay = new Date().toDateString();
  private readonly GROQ_DAILY_LIMIT = 14400;

  // Patterns for potential PII or secrets
  private readonly PII_PATTERNS = [
    { name: 'Credit Card', regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, mask: '[CARD-REDACTED]' },
    { name: 'API Key', regex: /\b(gsk_[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,})\b/g, mask: '[API-KEY-REDACTED]' },
    { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, mask: (match: string) => match } // Leave emails untouched by default
  ];

  public checkRequestPolicy(settings: AppSettings): { allowed: boolean; reason?: string } {
    this.rotateDailyCounterIfNeeded();

    // 1. Quota check for free Groq tier
    if (settings.provider === 'groq' && this.dailyRequestCount >= this.GROQ_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: `Daily Groq quota reached (${this.dailyRequestCount}/${this.GROQ_DAILY_LIMIT}). Please switch to OpenAI or Local.`
      };
    }

    // 2. Secret presence check
    if (settings.provider === 'groq' && !settings.groqApiKey) {
      return {
        allowed: false,
        reason: 'Groq API key is missing in settings'
      };
    }
    if (settings.provider === 'openai' && !settings.openaiApiKey) {
      return {
        allowed: false,
        reason: 'OpenAI API key is missing in settings'
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

  public filterPII(text: string): GovernanceCheckResult {
    let redacted = text;
    const violations: string[] = [];

    for (const item of this.PII_PATTERNS) {
      if (typeof item.mask === 'string') {
        if (item.regex.test(redacted)) {
          violations.push(item.name);
          redacted = redacted.replace(item.regex, item.mask);
        }
      }
    }

    return {
      allowed: true,
      redactedText: redacted,
      violations
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
