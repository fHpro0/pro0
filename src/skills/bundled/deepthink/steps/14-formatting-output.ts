import { DeepthinkState, StepDefinition, StepResult } from '../types.js';

function getFinalSynthesis(state: DeepthinkState): string {
  const refinementResults = state.steps.filter(
    (step) => step.stepNumber === 13 && step.metadata?.refinedSynthesis,
  );
  const latestRefinement = refinementResults[refinementResults.length - 1];
  if (latestRefinement?.metadata?.refinedSynthesis) {
    return latestRefinement.metadata.refinedSynthesis as string;
  }

  const initial = state.steps.find((step) => step.stepNumber === 12);
  return initial?.output || 'No synthesis available.';
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const synthesis = getFinalSynthesis(state);
    const durationSeconds = state.endTime
      ? Math.round((state.endTime - state.startTime) / 1000)
      : Math.round((Date.now() - state.startTime) / 1000);

    const formattedOutput = [
      '# Deepthink Analysis Results',
      '',
      `**Query:** ${state.query}`,
      '',
      `**Mode:** ${state.mode.toUpperCase()}  `,
      `**Confidence:** ${state.confidence.toUpperCase()}  `,
      `**Iterations:** ${state.iterationCount}`,
      '',
      '---',
      '',
      '## Answer',
      '',
      synthesis,
      '',
      '---',
      '',
      '## Metadata',
      '',
      `- **Total Steps Executed:** ${state.steps.length}`,
      `- **Execution Time:** ${durationSeconds}s`,
      `- **Mode:** ${state.mode}`,
      state.subAgents ? `- **Sub-Agents Used:** ${state.subAgents.length}` : '',
      '',
      state.confidence !== 'certain'
        ? `> **Note:** This analysis reached ${state.confidence} confidence. Consider running in Full mode or providing more context for higher confidence results.`
        : '',
    ]
      .filter((line) => line !== '')
      .join('\n');

    state.finalOutput = formattedOutput;

    return {
      stepNumber: 14,
      stepName: 'Formatting & Output',
      status: 'completed',
      output: formattedOutput,
      metadata: {
        duration: Date.now() - startTime,
        finalConfidence: state.confidence,
        totalIterations: state.iterationCount,
      },
    };
  } catch (error) {
    return {
      stepNumber: 14,
      stepName: 'Formatting & Output',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step14: StepDefinition = {
  number: 14,
  name: 'Formatting & Output',
  description: 'Format final answer with metadata',
  applicableModes: ['quick', 'full'],
  execute,
};
