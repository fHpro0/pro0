import { DeepthinkState, StepDefinition, StepResult, SubAgentResult } from '../types.js';

function extractKeyInsight(output: string): string {
  const lines = output.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return 'No insight extracted.';
  return lines[0].slice(0, 120);
}

function gatherSubAgentSummary(state: DeepthinkState): string[] {
  if (state.mode !== 'full' || !state.subAgents) return [];

  const dispatchResult = state.steps.find((step) => step.stepNumber === 9);
  const results = (dispatchResult?.metadata?.results || []) as SubAgentResult[];

  if (!Array.isArray(results) || results.length === 0) return ['No sub-agent results were captured.'];

  return results.map((result) => {
    const snippet = result.output ? result.output.substring(0, 150).replace(/\s+/g, ' ') : 'No output.';
    return `${result.agentName}: ${snippet}${result.output && result.output.length > 150 ? '...' : ''}`;
  });
}

function determineConfidence(state: DeepthinkState): 'low' | 'moderate' | 'high' | 'certain' {
  const completedSteps = state.steps.filter((step) => step.status === 'completed').length;
  const failedSteps = state.steps.filter((step) => step.status === 'failed').length;
  const expectedCompleted = state.mode === 'full' ? 11 : 5;

  if (failedSteps >= 2) return 'low';
  if (completedSteps >= expectedCompleted && state.mode === 'full') return 'high';
  if (completedSteps >= expectedCompleted && state.mode === 'quick') return 'moderate';

  return 'moderate';
}

function buildDraftAnswer(query: string, insights: string[]): string {
  const insightText = insights.length > 0 ? insights.join(' ') : 'No material insights were collected.';
  return [
    `The analysis of "${query}" points to the following themes: ${insightText}`,
    'Based on these themes, the response should focus on the most consistent findings, highlight any caveats, and translate the analysis into actionable guidance.',
  ].join(' ');
}

function collectGaps(state: DeepthinkState): string[] {
  const gaps: string[] = [];
  const failedSteps = state.steps.filter((step) => step.status === 'failed');
  const expectedSteps = state.mode === 'full' ? 11 : 5;

  if (failedSteps.length > 0) {
    gaps.push(`Some steps failed: ${failedSteps.map((step) => `Step ${step.stepNumber}`).join(', ')}.`);
  }

  if (state.steps.filter((step) => step.status === 'completed').length < expectedSteps) {
    gaps.push('Not all expected steps completed before synthesis.');
  }

  if (state.mode === 'full' && state.subAgents) {
    const hasSubAgentResults = state.steps.some(
      (step) => step.stepNumber === 9 && Array.isArray(step.metadata?.results) && step.metadata?.results.length > 0,
    );
    if (!hasSubAgentResults) {
      gaps.push('Sub-agent results were not available for synthesis.');
    }
  }

  return gaps.length > 0 ? gaps : ['No major gaps detected.'];
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const completedOutputs = state.steps
      .filter((step) => step.status === 'completed')
      .map((step) => ({
        step: step.stepName,
        output: step.output,
      }));

    const insights = completedOutputs.slice(0, 5).map((output) =>
      `From ${output.step}: ${extractKeyInsight(output.output)}`
    );

    const subAgentSummary = gatherSubAgentSummary(state);
    const gaps = collectGaps(state);

    const synthesis = [
      'Initial Synthesis:',
      `Query: ${state.query}`,
      `Mode: ${state.mode}`,
      '',
      'Key Insights:',
      insights.length > 0 ? insights.map((insight) => `- ${insight}`).join('\n') : '- No insights available.',
      '',
      subAgentSummary.length > 0 ? `Sub-Agent Findings:\n${subAgentSummary.map((item) => `- ${item}`).join('\n')}` : '',
      subAgentSummary.length > 0 ? '' : '',
      'Synthesis Draft:',
      buildDraftAnswer(state.query, insights),
      '',
      'Gaps/Uncertainties:',
      gaps.map((gap) => `- ${gap}`).join('\n'),
    ]
      .filter((line) => line !== '')
      .join('\n');

    state.confidence = determineConfidence(state);

    return {
      stepNumber: 12,
      stepName: 'Initial Synthesis',
      status: 'completed',
      output: synthesis,
      metadata: {
        duration: Date.now() - startTime,
        confidence: state.confidence,
        wordCount: synthesis.length,
      },
    };
  } catch (error) {
    return {
      stepNumber: 12,
      stepName: 'Initial Synthesis',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step12: StepDefinition = {
  number: 12,
  name: 'Initial Synthesis',
  description: 'Create first draft of the answer',
  applicableModes: ['quick', 'full'],
  execute,
};
