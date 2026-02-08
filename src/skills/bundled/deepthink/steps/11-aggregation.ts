import { DeepthinkState, StepDefinition, StepResult, SubAgentResult } from '../types.js';

function extractThemes(outputs: string[]): string[] {
  const frequencies = new Map<string, number>();

  for (const output of outputs) {
    const tokens = output
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !/^(that|with|this|from|have|will|they|their|which)$/.test(token));

    for (const token of tokens) {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    }
  }

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([token]) => token);
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const dispatchResult = state.steps.find((step) => step.stepNumber === 9);
    const subAgentResults = (dispatchResult?.metadata?.results || []) as SubAgentResult[];

    if (subAgentResults.length === 0) {
      return {
        stepNumber: 11,
        stepName: 'Aggregation',
        status: 'failed',
        output: 'No sub-agent results available for aggregation.',
        error: 'Missing dispatch results',
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }

    const successes = subAgentResults.filter((result) => result.status === 'success');
    const failures = subAgentResults.filter((result) => result.status === 'failed');
    const outputs = successes.map((result) => result.output);
    const themes = extractThemes(outputs);

    const output = [
      'Aggregated Sub-Agent Findings:',
      `Total Agents: ${subAgentResults.length}`,
      `Successful: ${successes.length}`,
      `Failed: ${failures.length}`,
      '',
      'Agent Outputs:',
      subAgentResults
        .map((result) => {
          return `- ${result.agentName}: ${result.output.substring(0, 220)}${
            result.output.length > 220 ? '...' : ''
          }`;
        })
        .join('\n'),
      '',
      `Common Themes: ${themes.length > 0 ? themes.join(', ') : 'None detected'}`,
    ].join('\n');

    return {
      stepNumber: 11,
      stepName: 'Aggregation',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        aggregation: {
          successes: successes.length,
          failures: failures.length,
          themes,
        },
      },
    };
  } catch (error) {
    return {
      stepNumber: 11,
      stepName: 'Aggregation',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step11: StepDefinition = {
  number: 11,
  name: 'Aggregation',
  description: 'Aggregate sub-agent outputs into a cohesive summary',
  applicableModes: ['full'],
  execute,
};
