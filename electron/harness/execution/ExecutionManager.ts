import { ToolRegistry } from '../tooling/ToolRegistry';
import { ContextManager } from '../context/ContextManager';
import { LifecycleManager } from '../lifecycle/LifecycleManager';
import { ObservabilityManager } from '../observability/ObservabilityManager';
import { VerificationManager } from '../verification/VerificationManager';
import { GovernanceManager } from '../governance/GovernanceManager';
import { HarnessPipelineInput, HarnessPipelineOutput } from '../types';
import { transcribeAudio } from '../../services/sttService';
import { cleanTextRules, refineTextWithLLM, rewriteTextWithLLM } from '../../services/llmProcessor';
import { parseVoiceMacroCommand } from '../../services/macroParser';
import { storage } from '../../services/storage';
import { TextSnippet } from '../../../src/types';

export class ExecutionManager {
  private readonly STT_TIMEOUT_MS = 10000; // 10s max for STT

  constructor(
    private tooling: ToolRegistry,
    private context: ContextManager,
    private lifecycle: LifecycleManager,
    private observability: ObservabilityManager,
    private verification: VerificationManager,
    private governance: GovernanceManager
  ) {}

  public async executePipeline(input: HarnessPipelineInput): Promise<HarnessPipelineOutput> {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const settings = storage.getSettings();

    // 1. Governance check
    const policy = this.governance.checkRequestPolicy(settings);
    if (!policy.allowed) {
      this.lifecycle.transitionTo('ERROR', traceId, { reason: policy.reason });
      throw new Error(`[Governance] ${policy.reason}`);
    }

    // 2. Lifecycle: start transcribing
    this.lifecycle.transitionTo('TRANSCRIBING', traceId);
    this.governance.trackRequest();

    // 3. Context gathering
    const enrichedContext = await this.context.getEnrichedContext(input.requestedContext);
    this.observability.startTrace(traceId, settings.provider, enrichedContext.activeContext.processName);

    try {
      // 4. Execution: STT with timeout
      const sttResult = await this.observability.recordSpan(traceId, 'stt_transcribe', async () => {
        return await this.withTimeout(
          transcribeAudio(input.audioBuffer, input.mimeType),
          this.STT_TIMEOUT_MS,
          'STT Request timed out'
        );
      });

      if (!sttResult || !sttResult.text) {
        this.lifecycle.transitionTo('COMPLETED', traceId);
        this.observability.finishTrace(traceId, { rawText: '', processedText: '', injected: false });
        return {
          success: true,
          traceId,
          text: '',
          rawText: '',
          latencyMs: sttResult?.latencyMs || 0,
          injected: false
        };
      }

      // 5. Lifecycle: Verifying
      this.lifecycle.transitionTo('VERIFYING', traceId);
      const verification = await this.observability.recordSpan(traceId, 'verification', () => {
        return this.verification.verifyTranscription(sttResult.text);
      });

      if (!verification.isValid) {
        console.warn(`[Verification] Rejected transcription: ${verification.reason}`);
        this.lifecycle.transitionTo('COMPLETED', traceId, { rejected: true, reason: verification.reason });
        this.observability.finishTrace(traceId, { rawText: sttResult.text, processedText: '', injected: false });
        return {
          success: true,
          traceId,
          text: '',
          rawText: sttResult.text,
          latencyMs: sttResult.latencyMs,
          injected: false
        };
      }

      // 5.5 Check for voice-activated macro creation command
      const isRewrite = Boolean(input.selectedText && input.selectedText.trim().length > 0);
      if (!isRewrite && settings.handsFreeCommands) {
        const macro = parseVoiceMacroCommand(verification.sanitizedText);
        if (macro) {
          const currentSnippets = storage.getSnippets();
          const existingIdx = currentSnippets.findIndex(s => s.trigger.toLowerCase() === macro.trigger.toLowerCase());
          let updatedSnippets: TextSnippet[];
          if (existingIdx >= 0) {
            updatedSnippets = [...currentSnippets];
            updatedSnippets[existingIdx] = {
              ...updatedSnippets[existingIdx],
              replacement: macro.replacement
            };
          } else {
            updatedSnippets = [
              ...currentSnippets,
              {
                id: Date.now().toString(),
                trigger: macro.trigger,
                replacement: macro.replacement,
                description: 'Создано голосом'
              }
            ];
          }
          storage.saveSnippets(updatedSnippets);

          const totalLatency = Math.round(sttResult.latencyMs);
          storage.addHistoryItem({
            id: traceId,
            timestamp: Date.now(),
            rawText: sttResult.text,
            processedText: `[Макрос сохранен] «${macro.trigger}» → ${macro.replacement}`,
            durationMs: Math.round((sttResult.durationSeconds || 1) * 1000),
            latencyMs: totalLatency,
            appContext: enrichedContext.activeContext.processName,
            category: enrichedContext.activeContext.category
          });

          this.lifecycle.transitionTo('COMPLETED', traceId);
          this.observability.finishTrace(traceId, {
            rawText: sttResult.text,
            processedText: `[Макрос: ${macro.trigger}]`,
            injected: false
          });

          return {
            success: true,
            traceId,
            text: `Макрос «${macro.trigger}» сохранен`,
            rawText: sttResult.text,
            latencyMs: totalLatency,
            injected: false,
            macroCreated: macro
          };
        }
      }

      // 6. Lifecycle: Refining (Context & Snippets) or AI Rewrite
      this.lifecycle.transitionTo('REFINING', traceId);

      let processedText = await this.observability.recordSpan(traceId, isRewrite ? 'ai_rewrite' : 'refinement', async () => {
        if (isRewrite && input.selectedText) {
          return await rewriteTextWithLLM(input.selectedText, verification.sanitizedText, enrichedContext.activeContext);
        } else {
          const cleaned = await refineTextWithLLM(verification.sanitizedText, enrichedContext.activeContext);
          return this.context.applySnippets(cleaned, enrichedContext.snippets);
        }
      });

      // 7. Governance: PII Sanitization
      const govFilter = this.governance.filterPII(processedText);
      processedText = govFilter.redactedText;

      // 8. Lifecycle: Injecting via Tooling layer
      let injected = false;
      if (this.verification.verifyPreInjection(processedText)) {
        this.lifecycle.transitionTo('INJECTING', traceId);
        injected = await this.observability.recordSpan(traceId, 'tool_injection', async () => {
          return await this.tooling.executeTool<string, boolean>('win32_inject_text', processedText);
        });
      }

      // 9. Storage: Persist in dictation history
      const totalLatency = Math.round(sttResult.latencyMs);
      storage.addHistoryItem({
        id: traceId,
        timestamp: Date.now(),
        rawText: sttResult.text,
        processedText,
        durationMs: Math.round((sttResult.durationSeconds || 1) * 1000),
        latencyMs: totalLatency,
        appContext: enrichedContext.activeContext.processName,
        category: enrichedContext.activeContext.category
      });

      // 10. Finish
      this.lifecycle.transitionTo('COMPLETED', traceId);
      this.observability.finishTrace(traceId, {
        rawText: sttResult.text,
        processedText,
        injected,
        violations: govFilter.violations
      });

      return {
        success: true,
        traceId,
        text: processedText,
        rawText: sttResult.text,
        latencyMs: totalLatency,
        injected,
        isRewrite
      };

    } catch (err: any) {
      this.lifecycle.transitionTo('ERROR', traceId, { error: err?.message });
      this.observability.finishTrace(traceId, { injected: false });
      console.error(`[ExecutionManager] Pipeline error on ${traceId}:`, err);
      throw err;
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
