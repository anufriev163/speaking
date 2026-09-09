import { ActiveContext, AppSettings } from '../../src/types';

export type HarnessState = 
  | 'IDLE' 
  | 'RECORDING' 
  | 'TRANSCRIBING' 
  | 'VERIFYING' 
  | 'REFINING' 
  | 'INJECTING' 
  | 'COMPLETED' 
  | 'ERROR';

export interface HarnessTraceSpan {
  name: string;
  startTime: number;
  durationMs: number;
  status: 'ok' | 'error';
  error?: string;
}

export interface HarnessTrace {
  traceId: string;
  timestamp: number;
  provider: string;
  appContext: string;
  totalLatencyMs: number;
  spans: HarnessTraceSpan[];
  rawText?: string;
  processedText?: string;
  injected: boolean;
  governanceViolations?: string[];
}

export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  execute: (params: TParams) => Promise<TResult> | TResult;
}

export interface VerificationResult {
  isValid: boolean;
  sanitizedText: string;
  reason?: string;
  hallucinationDetected?: boolean;
}

export interface GovernanceCheckResult {
  allowed: boolean;
  redactedText: string;
  violations: string[];
}

export interface HarnessPipelineInput {
  audioBuffer: Buffer;
  mimeType: string;
  requestedContext?: ActiveContext;
  selectedText?: string;
}

export interface HarnessPipelineOutput {
  success: boolean;
  traceId: string;
  text: string;
  rawText: string;
  latencyMs: number;
  injected: boolean;
  isRewrite?: boolean;
  macroCreated?: { trigger: string; replacement: string };
  error?: string;
}
