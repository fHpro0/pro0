import { DeepthinkState, StepDefinition, StepResult } from '../types.js';

function extractKeywords(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  return Array.from(new Set(tokens)).slice(0, 12);
}

function detectAmbiguities(query: string): string[] {
  const ambiguities: string[] = [];
  const lower = query.toLowerCase();
  const pronouns = ['this', 'that', 'it', 'they', 'those', 'these'];

  if (pronouns.some((word) => lower.includes(` ${word} `))) {
    ambiguities.push('Pronoun references may be unclear.');
  }

  if (query.trim().length < 15) {
    ambiguities.push('Query is very short and may lack detail.');
  }

  if (!/[?]/.test(query) && !/request|implement|build|explain|analyze/i.test(query)) {
    ambiguities.push('Intent is not explicit (question vs. instruction).');
  }

  return ambiguities;
}

function inferAssumptions(query: string): string[] {
  const assumptions: string[] = [];
  const lower = query.toLowerCase();

  if (!/deadline|timeline|timeframe|schedule/i.test(lower)) {
    assumptions.push('No timeline constraints provided.');
  }

  if (!/format|output|structure/i.test(lower)) {
    assumptions.push('Output format is flexible unless specified.');
  }

  if (!/budget|cost|price/i.test(lower)) {
    assumptions.push('No budget constraints mentioned.');
  }

  return assumptions;
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const keywords = extractKeywords(state.query);
    const ambiguities = detectAmbiguities(state.query);
    const assumptions = inferAssumptions(state.query);

    const rephrased = `Clarify the request: ${state.query.trim()}`;

    const output = [
      'Query Analysis:',
      `- Original query: ${state.query}`,
      `- Rephrased: ${rephrased}`,
      `- Key terms: ${keywords.length > 0 ? keywords.join(', ') : 'None detected'}`,
      `- Ambiguities: ${ambiguities.length > 0 ? ambiguities.join(' ') : 'None detected'}`,
      `- Assumptions: ${assumptions.length > 0 ? assumptions.join(' ') : 'None stated'}`,
    ].join('\n');

    return {
      stepNumber: 1,
      stepName: 'Context Clarification',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      stepNumber: 1,
      stepName: 'Context Clarification',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step01: StepDefinition = {
  number: 1,
  name: 'Context Clarification',
  description: 'Understand and clarify the user query',
  applicableModes: ['quick', 'full'],
  execute,
};
