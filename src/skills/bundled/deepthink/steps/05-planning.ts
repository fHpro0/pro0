import { DeepthinkState, PlanningResult, StepDefinition, StepResult } from '../types.js';

function buildPlan(query: string): PlanningResult {
  const lower = query.toLowerCase();
  const keySteps: string[] = [
    'Clarify intent and constraints from the query',
    'Apply rule-based heuristics to derive structured outputs',
    'Validate outputs against expected metadata requirements',
  ];

  if (/implement|build|create/.test(lower)) {
    keySteps.push('Translate findings into concrete implementation steps');
  }

  const potentialChallenges = [
    'Ambiguous requirements leading to incomplete heuristics',
    'Missing context for domain-specific assumptions',
  ];

  const successCriteria = [
    'Outputs are structured, consistent, and actionable',
    'Metadata includes required fields for orchestration',
  ];

  return {
    approach: 'Use lightweight heuristics to produce structured, deterministic planning artifacts.',
    keySteps,
    potentialChallenges,
    successCriteria,
  };
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const plan = buildPlan(state.query);
    const output = [
      'Execution Plan:',
      `- Approach: ${plan.approach}`,
      '- Key Steps:',
      plan.keySteps.map((step, index) => `  ${index + 1}. ${step}`).join('\n'),
      '- Challenges:',
      plan.potentialChallenges.map((item) => `  - ${item}`).join('\n'),
      '- Success Criteria:',
      plan.successCriteria.map((item) => `  - ${item}`).join('\n'),
    ].join('\n');

    return {
      stepNumber: 5,
      stepName: 'Planning',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        plan,
      },
    };
  } catch (error) {
    return {
      stepNumber: 5,
      stepName: 'Planning',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step05: StepDefinition = {
  number: 5,
  name: 'Planning',
  description: 'Create an execution strategy',
  applicableModes: ['quick', 'full'],
  execute,
};
