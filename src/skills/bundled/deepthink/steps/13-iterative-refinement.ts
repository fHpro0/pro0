import {
  ConfidenceLevel,
  DeepthinkState,
  RefinementDecision,
  StepDefinition,
  StepResult,
} from '../types.js';

function getLatestSynthesis(state: DeepthinkState): string {
  const candidates = state.steps.filter(
    (step) => step.stepNumber === 12 || step.stepNumber === 13,
  );

  const latest = candidates[candidates.length - 1];
  if (!latest) return 'No synthesis available.';

  return (latest.metadata?.refinedSynthesis as string | undefined) || latest.output || 'No synthesis available.';
}

function calculateRefinedConfidence(state: DeepthinkState, issues: string[]): ConfidenceLevel {
  const iteration = state.iterationCount;

  if (issues.length === 0) {
    if (iteration >= 2) return 'certain';
    if (iteration >= 1) return 'high';
    return state.confidence === 'low' ? 'moderate' : state.confidence;
  }

  if (issues.length <= 1 && iteration >= 2) return 'high';
  if (iteration >= 1) return 'moderate';

  return 'low';
}

function extractDraftAnswer(synthesis: string): string {
  const match = synthesis.match(/Synthesis Draft:\n([\s\S]*?)(\n\nGaps\/Uncertainties:|$)/);
  if (match?.[1]) return match[1].trim();
  return synthesis.trim();
}

function buildSupportSummary(state: DeepthinkState, limit: number): string {
  const completed = state.steps
    .filter((step) => step.status === 'completed')
    .slice(0, limit)
    .map((step) => {
      const line = step.output.split('\n').map((l) => l.trim()).find(Boolean);
      return line ? `- ${line.slice(0, 120)}` : null;
    })
    .filter((line): line is string => Boolean(line));

  if (completed.length === 0) return 'No supporting points available.';
  return completed.join('\n');
}

function applyRefinements(
  state: DeepthinkState,
  synthesis: string,
  issues: string[],
  improvements: string[],
): string {
  let refined = synthesis.trim();

  if (issues.includes('Missing synthesis output.')) {
    refined = [
      `Query: ${state.query}`,
      'Answer:',
      extractDraftAnswer(refined),
    ].join('\n');
  }

  if (issues.includes('Answer is too brief.')) {
    const support = buildSupportSummary(state, 5);
    refined = `${refined}\n\nSupporting Points:\n${support}`;
    improvements.push('Added supporting points from completed steps.');
  }

  if (issues.includes('Placeholders detected in answer.')) {
    refined = refined.replace(/\[[^\]]+\]/g, '').replace(/TODO/gi, '').trim();
    improvements.push('Removed placeholders from the response.');
  }

  return refined;
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const latestSynthesis = getLatestSynthesis(state);
    const issuesIdentified: string[] = [];
    const improvementsMade: string[] = [];

    if (!latestSynthesis || latestSynthesis === 'No synthesis available.') {
      issuesIdentified.push('Missing synthesis output.');
    }

    if (/\[[^\]]+\]/.test(latestSynthesis) || /TODO/i.test(latestSynthesis)) {
      issuesIdentified.push('Placeholders detected in answer.');
    }

    if (latestSynthesis.length < 350) {
      issuesIdentified.push('Answer is too brief.');
    }

    const currentConfidence = calculateRefinedConfidence(state, issuesIdentified);
    const shouldContinue = currentConfidence !== 'certain';

    const refinedOutput = applyRefinements(state, latestSynthesis, issuesIdentified, improvementsMade);

    if (issuesIdentified.length > 0) {
      improvementsMade.push('Expanded clarity based on detected issues.');
    }

    const decision: RefinementDecision = {
      shouldContinue,
      currentConfidence,
      issuesIdentified,
      improvementsMade,
    };

    state.confidence = currentConfidence;

    const output = [
      `Refinement Iteration ${state.iterationCount}:`,
      '',
      `Current Confidence: ${currentConfidence}`,
      `Issues Identified: ${issuesIdentified.length}`,
      issuesIdentified.length > 0 ? issuesIdentified.map((issue) => `- ${issue}`).join('\n') : 'None',
      '',
      `Improvements Made: ${improvementsMade.length}`,
      improvementsMade.length > 0 ? improvementsMade.map((item) => `- ${item}`).join('\n') : 'None',
      '',
      `Decision: ${shouldContinue ? 'CONTINUE REFINEMENT' : 'REFINEMENT COMPLETE'}`,
    ].join('\n');

    return {
      stepNumber: 13,
      stepName: 'Iterative Refinement',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        refinementDecision: decision,
        refinedSynthesis: refinedOutput,
      },
    };
  } catch (error) {
    return {
      stepNumber: 13,
      stepName: 'Iterative Refinement',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step13: StepDefinition = {
  number: 13,
  name: 'Iterative Refinement',
  description: 'Refine answer iteratively until confidence is certain',
  applicableModes: ['quick', 'full'],
  execute,
};
