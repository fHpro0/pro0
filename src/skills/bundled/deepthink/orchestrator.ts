import {
  DeepthinkState,
  DeepthinkMode,
  StepDefinition,
  DeepthinkConfig
} from './types.js';
import { loadConfig } from '../../../config/loader.js';
import { step01 } from './steps/01-context-clarification.js';
import { step02 } from './steps/02-abstraction.js';
import { step03 } from './steps/03-characterization.js';
import { step04 } from './steps/04-analogical-recall.js';
import { step05 } from './steps/05-planning.js';
import { step06 } from './steps/06-subagent-design.js';
import { step07 } from './steps/07-design-critique.js';
import { step08 } from './steps/08-design-revision.js';
import { step09 } from './steps/09-dispatch.js';
import { step10 } from './steps/10-quality-gate.js';
import { step11 } from './steps/11-aggregation.js';
import { step12 } from './steps/12-initial-synthesis.js';
import { step13 } from './steps/13-iterative-refinement.js';
import { step14 } from './steps/14-formatting-output.js';

export class DeepthinkOrchestrator {
  private state: DeepthinkState;
  private config: DeepthinkConfig;
  private steps: StepDefinition[];

  constructor(query: string, mode?: DeepthinkMode) {
    const loadedConfig = loadConfig(process.cwd());
    const deepthinkConfig = loadedConfig.skills?.deepthink;
    if (!deepthinkConfig) {
      throw new Error('[Deepthink] Missing deepthink configuration');
    }

    this.config = deepthinkConfig;

    this.state = {
      mode: mode || this.config.defaultMode,
      query,
      steps: [],
      currentStep: 0,
      iterationCount: 0,
      confidence: 'low',
      startTime: Date.now()
    };

    this.steps = this.registerSteps();
  }

  /**
   * Main execution entry point
   */
  async execute(): Promise<DeepthinkState> {
    console.log(`[Deepthink] Starting ${this.state.mode} mode for query: ${this.state.query}`);

    let stepsToRun = this.getStepsForMode(this.state.mode);
    const executedSteps = new Set<number>();

    for (let index = 0; index < stepsToRun.length; index += 1) {
      const stepDef = stepsToRun[index];
      this.state.currentStep = stepDef.number;

      console.log(`[Deepthink] Executing Step ${stepDef.number}: ${stepDef.name}`);

      try {
        const result = await stepDef.execute(this.state);
        this.state.steps.push(result);
      } catch (error) {
        console.error(`[Deepthink] Step ${stepDef.number} failed:`, error);
        this.state.steps.push({
          stepNumber: stepDef.number,
          stepName: stepDef.name,
          status: 'failed',
          output: '',
          error: error instanceof Error ? error.message : String(error)
        });
      }

      executedSteps.add(stepDef.number);

      if (stepDef.number === 3 && this.state.mode === 'auto') {
        await this.handleAutoModeSwitch();
        stepsToRun = this.getStepsForMode(this.state.mode).filter(step => !executedSteps.has(step.number));
        index = -1;
        continue;
      }

      if (stepDef.number === 13) {
        await this.handleIterativeRefinement();
      }
    }

    this.state.endTime = Date.now();
    console.log(`[Deepthink] Completed in ${this.state.endTime - this.state.startTime}ms`);

    return this.state;
  }

  /**
   * Register all 14 step definitions
   * Steps will be imported from individual step files (created in other tasks)
   */
  private registerSteps(): StepDefinition[] {
    return [
      step01,
      step02,
      step03,
      step04,
      step05,
      step06,
      step07,
      step08,
      step09,
      step10,
      step11,
      step12,
      step13,
      step14
    ];
  }

  /**
   * Determine which steps to run based on mode
   */
  private getStepsForMode(mode: DeepthinkMode): StepDefinition[] {
    if (mode === 'auto') {
      return this.steps.filter(step => step.number >= 1 && step.number <= 3);
    }

    if (mode === 'quick') {
      return this.steps.filter(step =>
        (step.number >= 1 && step.number <= 5) || (step.number >= 12 && step.number <= 14)
      );
    }

    return this.steps;
  }

  /**
   * Handle mode switching after Step 3 (Characterization)
   * Only runs in 'auto' mode
   */
  private async handleAutoModeSwitch(): Promise<void> {
    const step3Result = this.state.steps.find(step => step.stepNumber === 3);
    if (!step3Result) return;

    const characterization = step3Result.metadata?.characterization;
    if (!characterization?.recommendedMode) return;

    const newMode = characterization.recommendedMode;
    console.log(`[Deepthink] Auto mode switch: ${this.state.mode} → ${newMode}`);
    console.log(`[Deepthink] Reasoning: ${characterization.reasoning}`);

    this.state.mode = newMode;
    this.steps = this.registerSteps();
  }

  /**
   * Handle iterative refinement in Step 13
   * Runs up to maxIterations times until confidence is 'certain'
   */
  private async handleIterativeRefinement(): Promise<void> {
    const maxIterations = this.config.maxIterations || 5;

    while (this.state.iterationCount < maxIterations && this.state.confidence !== 'certain') {
      this.state.iterationCount += 1;

      console.log(`[Deepthink] Refinement iteration ${this.state.iterationCount}/${maxIterations}`);
      console.log(`[Deepthink] Current confidence: ${this.state.confidence}`);

      const step13 = this.steps.find(step => step.number === 13);
      if (!step13) break;

      try {
        const result = await step13.execute(this.state);
        const decision = result.metadata?.refinementDecision;

        if (decision?.currentConfidence) {
          this.state.confidence = decision.currentConfidence;
        }

        this.state.steps.push({
          ...result,
          stepName: `${result.stepName} (Iteration ${this.state.iterationCount})`
        });

        if (!decision?.shouldContinue || this.state.confidence === 'certain') {
          console.log(`[Deepthink] Refinement complete at iteration ${this.state.iterationCount}`);
          break;
        }
      } catch (error) {
        console.error(`[Deepthink] Refinement iteration ${this.state.iterationCount} failed:`, error);
        break;
      }
    }

    if (this.state.iterationCount >= maxIterations && this.state.confidence !== 'certain') {
      console.warn('[Deepthink] Max refinement iterations reached without certainty');
    }
  }

  /**
   * Get current state (for inspection/debugging)
   */
  getState(): DeepthinkState {
    return this.state;
  }

  /**
   * Get final output
   */
  getFinalOutput(): string {
    return this.state.finalOutput || 'No output generated';
  }
}

/**
 * Convenience function to execute Deepthink workflow
 */
export async function executeDeepthink(query: string, mode?: DeepthinkMode): Promise<string> {
  const orchestrator = new DeepthinkOrchestrator(query, mode);
  const finalState = await orchestrator.execute();
  return finalState.finalOutput || 'Analysis failed - no output generated';
}

/**
 * Validate that all required steps are registered
 */
export function validateSteps(steps: StepDefinition[]): boolean {
  const requiredSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const registeredSteps = steps.map(step => step.number);

  for (const required of requiredSteps) {
    if (!registeredSteps.includes(required)) {
      console.warn(`[Deepthink] Missing step ${required}`);
      return false;
    }
  }

  return true;
}

/**
 * Get step execution summary for logging
 */
export function getExecutionSummary(state: DeepthinkState): string {
  const completed = state.steps.filter(step => step.status === 'completed').length;
  const failed = state.steps.filter(step => step.status === 'failed').length;
  const duration = state.endTime ? state.endTime - state.startTime : Date.now() - state.startTime;

  return [
    '=== Deepthink Execution Summary ===',
    `Mode: ${state.mode}`,
    `Query: ${state.query}`,
    `Steps Completed: ${completed}/${state.steps.length}`,
    `Failed Steps: ${failed}`,
    `Refinement Iterations: ${state.iterationCount}`,
    `Final Confidence: ${state.confidence}`,
    `Duration: ${duration}ms`
  ].join('\n');
}
