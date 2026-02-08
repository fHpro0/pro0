import { DeepthinkState, StepDefinition, StepResult } from '../types.js';

function extractCoreConcepts(query: string): string[] {
  const lower = query.toLowerCase();
  const concepts: string[] = [];

  if (/workflow|orchestrator|pipeline|process/.test(lower)) {
    concepts.push('workflow orchestration');
  }

  if (/analysis|reasoning|think|reflect/.test(lower)) {
    concepts.push('structured reasoning');
  }

  if (/mode|quick|full|auto/.test(lower)) {
    concepts.push('mode selection');
  }

  if (/step|phase|stage/.test(lower)) {
    concepts.push('stepwise execution');
  }

  if (concepts.length === 0) {
    concepts.push('task decomposition');
  }

  return concepts;
}

function mapFrameworks(query: string): string[] {
  const lower = query.toLowerCase();
  const frameworks: string[] = [];

  if (/analysis|reasoning|think/.test(lower)) {
    frameworks.push('structured analysis');
  }

  if (/plan|strategy|roadmap/.test(lower)) {
    frameworks.push('planning frameworks');
  }

  if (/system|architecture|orchestrator/.test(lower)) {
    frameworks.push('system design');
  }

  return frameworks.length > 0 ? frameworks : ['general problem solving'];
}

function mapDomains(query: string): string[] {
  const lower = query.toLowerCase();
  const domains: string[] = [];

  if (/backend|service|logic|orchestrator/.test(lower)) {
    domains.push('backend engineering');
  }

  if (/product|requirements|user/.test(lower)) {
    domains.push('requirements analysis');
  }

  if (/testing|validate|verify/.test(lower)) {
    domains.push('quality assurance');
  }

  return domains.length > 0 ? domains : ['software engineering'];
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const concepts = extractCoreConcepts(state.query);
    const frameworks = mapFrameworks(state.query);
    const domains = mapDomains(state.query);

    const output = [
      'Abstraction Summary:',
      `- Core concepts: ${concepts.join(', ')}`,
      `- Relevant frameworks: ${frameworks.join(', ')}`,
      `- Broader domains: ${domains.join(', ')}`,
    ].join('\n');

    return {
      stepNumber: 2,
      stepName: 'Abstraction',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      stepNumber: 2,
      stepName: 'Abstraction',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step02: StepDefinition = {
  number: 2,
  name: 'Abstraction',
  description: 'Identify patterns and underlying principles',
  applicableModes: ['quick', 'full'],
  execute,
};
