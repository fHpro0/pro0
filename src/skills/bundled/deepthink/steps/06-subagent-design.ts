import {
  DeepthinkState,
  StepDefinition,
  StepResult,
  SubAgentDefinition,
  PlanningResult,
} from '../types.js';

const MAX_AGENTS = 5;
const MIN_AGENTS = 2;

function getPlan(state: DeepthinkState): PlanningResult | undefined {
  const planResult = state.steps.find((step) => step.stepNumber === 5);
  return planResult?.metadata?.plan as PlanningResult | undefined;
}

function deriveAgentCount(plan?: PlanningResult): number {
  const keySteps = plan?.keySteps?.length || 0;

  if (keySteps >= 7) return 5;
  if (keySteps >= 5) return 4;
  if (keySteps >= 3) return 3;
  return 2;
}

function buildCandidateAgents(state: DeepthinkState, plan?: PlanningResult): SubAgentDefinition[] {
  const hasNumbers = /\d/.test(state.query);
  const hasRisks = plan?.potentialChallenges && plan.potentialChallenges.length > 0;

  const candidates: SubAgentDefinition[] = [
    {
      id: 'agent-1',
      name: 'Domain Expert',
      role: 'Primary domain analysis',
      specialization: 'Domain framing and terminology',
      taskDescription: 'Identify core domain concepts and assumptions',
      priority: 1,
    },
    {
      id: 'agent-2',
      name: 'Planner',
      role: 'Plan translation',
      specialization: 'Strategy decomposition',
      taskDescription: 'Translate the plan into actionable workstreams',
      dependencies: ['agent-1'],
      priority: 2,
    },
  ];

  if (hasNumbers) {
    candidates.push({
      id: 'agent-3',
      name: 'Data Analyst',
      role: 'Quantitative analysis',
      specialization: 'Metrics and numerical reasoning',
      taskDescription: 'Analyze numerical or measurement aspects of the query',
      dependencies: ['agent-1'],
      priority: 3,
    });
  }

  if (hasRisks) {
    candidates.push({
      id: 'agent-4',
      name: 'Risk Reviewer',
      role: 'Risk assessment',
      specialization: 'Potential challenges and mitigations',
      taskDescription: 'Identify risks and propose mitigations',
      dependencies: ['agent-2'],
      priority: 4,
    });
  }

  candidates.push({
    id: 'agent-5',
    name: 'Synthesis Lead',
    role: 'Integration and synthesis',
    specialization: 'Consolidation and consistency',
    taskDescription: 'Combine findings and resolve inconsistencies',
    dependencies: ['agent-1', 'agent-2'],
    priority: 5,
  });

  return candidates;
}

function selectAgents(candidates: SubAgentDefinition[], targetCount: number): SubAgentDefinition[] {
  const sorted = [...candidates].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const trimmed = sorted.slice(0, Math.min(targetCount, sorted.length));

  if (trimmed.length >= MIN_AGENTS) return trimmed;

  return sorted.slice(0, Math.min(MIN_AGENTS, sorted.length));
}

function formatAgentOutput(subAgents: SubAgentDefinition[]): string {
  return subAgents
    .map((agent) => {
      return [
        `Agent: ${agent.name} (${agent.id})`,
        `- Role: ${agent.role}`,
        `- Specialization: ${agent.specialization}`,
        `- Task: ${agent.taskDescription}`,
        `- Dependencies: ${agent.dependencies?.join(', ') || 'None'}`,
        `- Priority: ${agent.priority ?? 'N/A'}`,
      ].join('\n');
    })
    .join('\n\n');
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const plan = getPlan(state);
    const targetCount = deriveAgentCount(plan);
    const candidates = buildCandidateAgents(state, plan);
    const subAgents = selectAgents(candidates, targetCount).slice(0, MAX_AGENTS);

    state.subAgents = subAgents;

    const output = [
      'Sub-Agent Design:',
      `Total Agents: ${subAgents.length}`,
      '',
      formatAgentOutput(subAgents),
    ].join('\n');

    return {
      stepNumber: 6,
      stepName: 'Sub-Agent Design',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        subAgents,
      },
    };
  } catch (error) {
    return {
      stepNumber: 6,
      stepName: 'Sub-Agent Design',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step06: StepDefinition = {
  number: 6,
  name: 'Sub-Agent Design',
  description: 'Design specialized sub-agents for parallel execution',
  applicableModes: ['full'],
  execute,
};
