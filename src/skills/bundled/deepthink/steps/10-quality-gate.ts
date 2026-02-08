import { DeepthinkState, StepDefinition, StepResult, QualityGateResult, SubAgentResult } from '../types.js';

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const dispatchResult = state.steps.find((step) => step.stepNumber === 9);
    const subAgentResults = (dispatchResult?.metadata?.results || []) as SubAgentResult[];

    if (subAgentResults.length === 0) {
      return {
        stepNumber: 10,
        stepName: 'Quality Gate',
        status: 'failed',
        output: 'No sub-agent results available for quality assessment.',
        error: 'Missing dispatch results',
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    let overallScore = 100;

    const failures = subAgentResults.filter((result) => result.status === 'failed');
    if (failures.length > 0) {
      issues.push(`${failures.length} sub-agents failed`);
      recommendations.push('Re-dispatch failed agents with adjusted dependencies.');
      overallScore -= failures.length * 20;
    }

    const emptyOutputs = subAgentResults.filter(
      (result) => !result.output || result.output.trim().length < 10
    );
    if (emptyOutputs.length > 0) {
      issues.push(`${emptyOutputs.length} agents returned minimal output`);
      recommendations.push('Review task descriptions for clarity and depth.');
      overallScore -= emptyOutputs.length * 10;
    }

    const uniqueAgents = new Set(subAgentResults.map((result) => result.agentId));
    if (uniqueAgents.size !== subAgentResults.length) {
      issues.push('Duplicate agent results detected.');
      recommendations.push('Ensure each agent dispatches exactly once.');
      overallScore -= 10;
    }

    const qualityGate: QualityGateResult = {
      passed: issues.length === 0,
      issues,
      recommendations,
      overallScore: Math.max(0, overallScore),
    };

    const output = [
      'Quality Gate Assessment:',
      `Status: ${qualityGate.passed ? 'PASSED' : 'FAILED'}`,
      `Overall Score: ${qualityGate.overallScore}/100`,
      '',
      `Issues Found: ${issues.length}`,
      issues.length > 0 ? issues.map((issue) => `- ${issue}`).join('\n') : 'None',
      '',
      `Recommendations: ${recommendations.length}`,
      recommendations.length > 0
        ? recommendations.map((rec) => `- ${rec}`).join('\n')
        : 'None',
    ].join('\n');

    return {
      stepNumber: 10,
      stepName: 'Quality Gate',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        qualityGate,
      },
    };
  } catch (error) {
    return {
      stepNumber: 10,
      stepName: 'Quality Gate',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step10: StepDefinition = {
  number: 10,
  name: 'Quality Gate',
  description: 'Assess sub-agent outputs for completeness and quality',
  applicableModes: ['full'],
  execute,
};
