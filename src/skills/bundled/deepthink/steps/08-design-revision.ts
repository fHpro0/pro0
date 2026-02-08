import { DeepthinkState, StepDefinition, StepResult, SubAgentDefinition } from '../types.js';

function dedupeAgents(subAgents: SubAgentDefinition[]): SubAgentDefinition[] {
  const seen = new Set<string>();
  const result: SubAgentDefinition[] = [];

  for (const agent of subAgents) {
    const key = `${agent.role.toLowerCase()}::${agent.specialization.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(agent);
  }

  return result;
}

function normalizeDependencies(subAgents: SubAgentDefinition[]): SubAgentDefinition[] {
  const ids = new Set(subAgents.map((agent) => agent.id));

  return subAgents.map((agent) => {
    if (!agent.dependencies) return agent;

    const cleaned = agent.dependencies.filter((dep) => dep !== agent.id && ids.has(dep));

    return {
      ...agent,
      dependencies: cleaned.length > 0 ? cleaned : undefined,
    };
  });
}

function ensureSynthesisAgent(subAgents: SubAgentDefinition[]): SubAgentDefinition[] {
  const hasSynthesis = subAgents.some((agent) =>
    /synthesis|integration|aggregate/i.test(agent.role)
  );

  if (hasSynthesis) return subAgents;

  const nextId = `agent-${subAgents.length + 1}`;
  return [
    ...subAgents,
    {
      id: nextId,
      name: 'Synthesis Lead',
      role: 'Integration and synthesis',
      specialization: 'Consolidation and consistency',
      taskDescription: 'Combine outputs and resolve inconsistencies',
      dependencies: subAgents.map((agent) => agent.id),
      priority: 5,
    },
  ];
}

function enforceAgentCount(subAgents: SubAgentDefinition[]): SubAgentDefinition[] {
  if (subAgents.length < 2) {
    const nextId = `agent-${subAgents.length + 1}`;
    return [
      ...subAgents,
      {
        id: nextId,
        name: 'Generalist',
        role: 'Additional coverage',
        specialization: 'Broad analysis',
        taskDescription: 'Cover gaps left by other agents',
        priority: 9,
      },
    ];
  }

  if (subAgents.length > 5) {
    return [...subAgents]
      .sort((a, b) => (a.priority || 10) - (b.priority || 10))
      .slice(0, 5);
  }

  return subAgents;
}

function formatAgents(subAgents: SubAgentDefinition[]): string {
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
    if (!state.subAgents || state.subAgents.length === 0) {
      return {
        stepNumber: 8,
        stepName: 'Design Revision',
        status: 'failed',
        output: 'No sub-agents available for revision.',
        error: 'state.subAgents is empty',
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }

    let revised = dedupeAgents(state.subAgents);
    revised = normalizeDependencies(revised);
    revised = ensureSynthesisAgent(revised);
    revised = enforceAgentCount(revised);

    state.subAgents = revised;

    const output = [
      'Sub-Agent Design Revision:',
      `Total Agents: ${revised.length}`,
      '',
      formatAgents(revised),
    ].join('\n');

    return {
      stepNumber: 8,
      stepName: 'Design Revision',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        subAgents: revised,
      },
    };
  } catch (error) {
    return {
      stepNumber: 8,
      stepName: 'Design Revision',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step08: StepDefinition = {
  number: 8,
  name: 'Design Revision',
  description: 'Refine sub-agent design based on critique',
  applicableModes: ['full'],
  execute,
};
