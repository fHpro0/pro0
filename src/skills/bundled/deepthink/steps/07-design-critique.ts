import { DeepthinkState, StepDefinition, StepResult, SubAgentDefinition } from '../types.js';

function findDuplicateAgents(subAgents: SubAgentDefinition[]): string[] {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];

  for (const agent of subAgents) {
    const key = `${agent.role.toLowerCase()}::${agent.specialization.toLowerCase()}`;
    if (seen.has(key)) {
      duplicates.push(`${agent.name} duplicates ${seen.get(key)}`);
    } else {
      seen.set(key, agent.name);
    }
  }

  return duplicates;
}

function findDependencyIssues(subAgents: SubAgentDefinition[]): string[] {
  const ids = new Set(subAgents.map((agent) => agent.id));
  const issues: string[] = [];

  for (const agent of subAgents) {
    if (!agent.dependencies || agent.dependencies.length === 0) continue;
    for (const dep of agent.dependencies) {
      if (dep === agent.id) {
        issues.push(`${agent.id} depends on itself`);
        continue;
      }
      if (!ids.has(dep)) {
        issues.push(`${agent.id} depends on unknown agent ${dep}`);
      }
    }
  }

  return issues;
}

function detectCycles(subAgents: SubAgentDefinition[]): string[] {
  const graph = new Map<string, string[]>();
  const issues: string[] = [];

  for (const agent of subAgents) {
    graph.set(agent.id, agent.dependencies || []);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (node: string, path: string[]) => {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      issues.push(`Cycle detected: ${[...path, node].join(' -> ')}`);
      return;
    }
    visiting.add(node);
    const deps = graph.get(node) || [];
    for (const dep of deps) {
      visit(dep, [...path, node]);
    }
    visiting.delete(node);
    visited.add(node);
  };

  for (const agent of subAgents) {
    visit(agent.id, []);
  }

  return issues;
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const subAgents = state.subAgents || [];

    if (subAgents.length === 0) {
      return {
        stepNumber: 7,
        stepName: 'Design Critique',
        status: 'failed',
        output: 'No sub-agents defined for critique.',
        error: 'state.subAgents is empty',
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (subAgents.length < 2) {
      issues.push('Too few sub-agents to cover the plan.');
      recommendations.push('Add at least one more agent for coverage.');
    }

    if (subAgents.length > 5) {
      issues.push('Too many sub-agents for manageable execution.');
      recommendations.push('Trim roles to the most critical 5 agents.');
    }

    const hasSynthesis = subAgents.some((agent) =>
      /synthesis|integration|aggregate/i.test(agent.role)
    );
    if (!hasSynthesis) {
      issues.push('Missing integration/synthesis coverage.');
      recommendations.push('Add a synthesis-focused agent to consolidate results.');
    }

    const duplicates = findDuplicateAgents(subAgents);
    if (duplicates.length > 0) {
      issues.push(`Redundant agents: ${duplicates.join('; ')}`);
      recommendations.push('Merge or remove redundant agents with overlapping roles.');
    }

    const dependencyIssues = findDependencyIssues(subAgents);
    if (dependencyIssues.length > 0) {
      issues.push(`Dependency issues: ${dependencyIssues.join('; ')}`);
      recommendations.push('Fix invalid or self-referential dependencies.');
    }

    const cycleIssues = detectCycles(subAgents);
    if (cycleIssues.length > 0) {
      issues.push(`Dependency cycles: ${cycleIssues.join('; ')}`);
      recommendations.push('Remove cyclical dependencies to avoid deadlocks.');
    }

    const output = [
      'Sub-Agent Design Critique:',
      `Issues Found: ${issues.length}`,
      issues.length > 0 ? issues.map((issue) => `- ${issue}`).join('\n') : 'None',
      `Recommendations: ${recommendations.length}`,
      recommendations.length > 0
        ? recommendations.map((rec) => `- ${rec}`).join('\n')
        : 'None',
    ].join('\n');

    return {
      stepNumber: 7,
      stepName: 'Design Critique',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        issues,
        recommendations,
      },
    };
  } catch (error) {
    return {
      stepNumber: 7,
      stepName: 'Design Critique',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step07: StepDefinition = {
  number: 7,
  name: 'Design Critique',
  description: 'Review sub-agent design for coverage, redundancy, and dependencies',
  applicableModes: ['full'],
  execute,
};
