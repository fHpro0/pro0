import {
  CharacterizationResult,
  DeepthinkState,
  StepDefinition,
  StepResult,
} from '../types.js';

function detectFactors(query: string): CharacterizationResult['factors'] {
  const lower = query.toLowerCase();

  const multiDomainSignals = ['api', 'database', 'frontend', 'backend', 'ux', 'security'];
  const domainsFound = multiDomainSignals.filter((signal) => lower.includes(signal));

  return {
    multiDomain: domainsFound.length >= 2,
    historicalContext: /history|evolution|over time|legacy|timeline/.test(lower),
    numericalAnalysis: /\d+|calculate|compute|estimate|optimize|performance/.test(lower),
    conflictingViews: /pros and cons|trade[- ]offs|debate|versus|compare/.test(lower),
  };
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const factors = detectFactors(state.query);
    const complexityScore = Object.values(factors).filter(Boolean).length;

    let complexity: 'simple' | 'moderate' | 'complex';
    let recommendedMode: 'quick' | 'full';

    if (complexityScore === 0) {
      complexity = 'simple';
      recommendedMode = 'quick';
    } else if (complexityScore <= 2) {
      complexity = 'moderate';
      recommendedMode = 'quick';
    } else {
      complexity = 'complex';
      recommendedMode = 'full';
    }

    const characterization: CharacterizationResult = {
      complexity,
      recommendedMode,
      reasoning: `Query requires ${complexity} analysis based on ${complexityScore} complexity factors.`,
      factors,
    };

    const output = [
      'Complexity Assessment:',
      `- Complexity Level: ${complexity}`,
      `- Recommended Mode: ${recommendedMode}`,
      `- Reasoning: ${characterization.reasoning}`,
      `- Factors: ${JSON.stringify(factors, null, 2)}`,
    ].join('\n');

    return {
      stepNumber: 3,
      stepName: 'Characterization',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        characterization,
      },
    };
  } catch (error) {
    return {
      stepNumber: 3,
      stepName: 'Characterization',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step03: StepDefinition = {
  number: 3,
  name: 'Characterization',
  description: 'Assess complexity and recommend mode',
  applicableModes: ['quick', 'full'],
  execute,
};
