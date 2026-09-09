import { EventEmitter } from 'events';
import { HarnessState } from '../types';

export class LifecycleManager extends EventEmitter {
  private currentState: HarnessState = 'IDLE';
  private currentSessionId: string | null = null;

  constructor() {
    super();
  }

  public getState(): HarnessState {
    return this.currentState;
  }

  public getSessionId(): string | null {
    return this.currentSessionId;
  }

  public transitionTo(newState: HarnessState, sessionId?: string, meta?: any): void {
    const prevState = this.currentState;
    this.currentState = newState;
    if (sessionId !== undefined) {
      this.currentSessionId = sessionId;
    }

    this.emit('state:change', {
      previous: prevState,
      current: newState,
      sessionId: this.currentSessionId,
      meta,
      timestamp: Date.now()
    });
  }

  public canStartRecording(): boolean {
    return this.currentState === 'IDLE';
  }

  public canTranscribe(): boolean {
    return this.currentState === 'RECORDING';
  }

  public isBusy(): boolean {
    return !['IDLE', 'COMPLETED', 'ERROR'].includes(this.currentState);
  }

  public reset(): void {
    this.currentState = 'IDLE';
    this.currentSessionId = null;
    this.emit('reset', { timestamp: Date.now() });
  }
}
