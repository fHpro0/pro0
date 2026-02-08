import { DeepthinkState, StepDefinition, StepResult } from '../types.js';

type Analogy = {
  analogy: string;
  relevance: string;
};

function generateAnalogies(query: string): Analogy[] {
  const lower = query.toLowerCase();
  const analogies: Analogy[] = [];

  if (/workflow|orchestrator|pipeline/.test(lower)) {
    analogies.push({
      analogy: 'Build pipelines with staged checkpoints',
      relevance: 'Similar to stepwise orchestration where each stage produces structured output.',
    });
  }

  if (/analysis|reasoning|clarify/.test(lower)) {
    analogies.push({
      analogy: 'Requirements elicitation in product discovery',
      relevance: 'Clarifying intent before implementation reduces rework and ambiguity.',
    });
  }

  if (/plan|strategy/.test(lower)) {
    analogies.push({
      analogy: 'Project planning with milestones',
      relevance: 'Defines high-level steps, risks, and success criteria before execution.',
    });
  }

  if (analogies.length === 0) {
    analogies.push({
      analogy: 'Checklists for complex tasks',
      relevance: 'Breaking work into repeatable steps improves consistency and quality.',
    });
  }

  return analogies;
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const analogies = generateAnalogies(state.query);
    const list = analogies
      .map(
        (item, index) =>
          `${index + 1}. ${item.analogy}\n   - Relevance: ${item.relevance}`
      )
      .join('\n');

    const output = ['Analogical Recall:', list].join('\n');

    return {
      stepNumber: 4,
      stepName: 'Analogical Recall',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      stepNumber: 4,
      stepName: 'Analogical Recall',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step04: StepDefinition = {
  number: 4,
  name: 'Analogical Recall',
  description: 'Find analogous situations and lessons learned',
  applicableModes: ['quick', 'full'],
  execute,
};
