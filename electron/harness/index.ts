import { ToolRegistry } from './tooling/ToolRegistry';
import { ContextManager } from './context/ContextManager';
import { LifecycleManager } from './lifecycle/LifecycleManager';
import { ObservabilityManager } from './observability/ObservabilityManager';
import { VerificationManager } from './verification/VerificationManager';
import { GovernanceManager } from './governance/GovernanceManager';
import { ExecutionManager } from './execution/ExecutionManager';
import { HarnessPipelineInput, HarnessPipelineOutput } from './types';

export class GovoriHarness {
  public readonly tooling: ToolRegistry;
  public readonly context: ContextManager;
  public readonly lifecycle: LifecycleManager;
  public readonly observability: ObservabilityManager;
  public readonly verification: VerificationManager;
  public readonly governance: GovernanceManager;
  public readonly execution: ExecutionManager;

  constructor() {
    this.tooling = new ToolRegistry();
    this.context = new ContextManager(this.tooling);
    this.lifecycle = new LifecycleManager();
    this.observability = new ObservabilityManager();
    this.verification = new VerificationManager();
    this.governance = new GovernanceManager();

    this.execution = new ExecutionManager(
      this.tooling,
      this.context,
      this.lifecycle,
      this.observability,
      this.verification,
      this.governance
    );
  }

  public async execute(input: HarnessPipelineInput): Promise<HarnessPipelineOutput> {
    return await this.execution.executePipeline(input);
  }
}

// Global Harness singleton instance
export const harness = new GovoriHarness();
