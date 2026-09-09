import { HarnessTrace, HarnessTraceSpan } from '../types';

export class ObservabilityManager {
  private activeTraces: Map<string, HarnessTrace> = new Map();
  private completedTraces: HarnessTrace[] = [];
  private readonly MAX_HISTORY = 100;

  public startTrace(traceId: string, provider: string, appContext: string): HarnessTrace {
    const trace: HarnessTrace = {
      traceId,
      timestamp: Date.now(),
      provider,
      appContext,
      totalLatencyMs: 0,
      spans: [],
      injected: false
    };
    this.activeTraces.set(traceId, trace);
    return trace;
  }

  public recordSpan<T>(traceId: string, spanName: string, action: () => Promise<T> | T): Promise<T> {
    const start = performance.now();
    const trace = this.activeTraces.get(traceId);

    const finish = (result: T, err?: any) => {
      const durationMs = Math.round(performance.now() - start);
      if (trace) {
        trace.spans.push({
          name: spanName,
          startTime: Math.round(start),
          durationMs,
          status: err ? 'error' : 'ok',
          error: err?.message
        });
      }
      return result;
    };

    try {
      const res = action();
      if (res instanceof Promise) {
        return res
          .then((r) => finish(r))
          .catch((err) => {
            finish(undefined as any, err);
            throw err;
          });
      }
      return Promise.resolve(finish(res));
    } catch (err) {
      finish(undefined as any, err);
      return Promise.reject(err);
    }
  }

  public finishTrace(
    traceId: string,
    details: {
      rawText?: string;
      processedText?: string;
      injected: boolean;
      violations?: string[];
    }
  ): HarnessTrace | undefined {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return undefined;

    trace.rawText = details.rawText;
    trace.processedText = details.processedText;
    trace.injected = details.injected;
    trace.governanceViolations = details.violations;
    trace.totalLatencyMs = Math.round(Date.now() - trace.timestamp);

    this.activeTraces.delete(traceId);
    this.completedTraces.unshift(trace);

    if (this.completedTraces.length > this.MAX_HISTORY) {
      this.completedTraces.pop();
    }

    console.log(`[Observability] [${traceId}] Completed in ${trace.totalLatencyMs}ms. Spans: ` +
      trace.spans.map(s => `${s.name}: ${s.durationMs}ms`).join(', '));

    return trace;
  }

  public getRecentTraces(limit = 20): HarnessTrace[] {
    return this.completedTraces.slice(0, limit);
  }

  public getMetricsSummary(): {
    totalRequests: number;
    avgLatencyMs: number;
    successRate: number;
  } {
    if (this.completedTraces.length === 0) {
      return { totalRequests: 0, avgLatencyMs: 0, successRate: 100 };
    }

    const total = this.completedTraces.length;
    const successful = this.completedTraces.filter(t => t.injected).length;
    const avgLatency = Math.round(
      this.completedTraces.reduce((acc, t) => acc + t.totalLatencyMs, 0) / total
    );

    return {
      totalRequests: total,
      avgLatencyMs: avgLatency,
      successRate: Math.round((successful / total) * 100)
    };
  }
}
