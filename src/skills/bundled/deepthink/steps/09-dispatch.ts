import { DeepthinkState, StepDefinition, StepResult, SubAgentResult, SubAgentDefinition } from '../types.js';

function estimateExecutionTime(agent: SubAgentDefinition): number {
  const base = 200;
  const taskWeight = Math.min(agent.taskDescription.length * 6, 600);
  const priorityWeight = (agent.priority || 5) * 20;
  return base + taskWeight + priorityWeight;
}

function simulateDispatch(agent: SubAgentDefinition, status: 'success' | 'failed', reason?: string): SubAgentResult {
  return {
    agentId: agent.id,
    agentName: agent.name,
    status,
    output:
      status === 'success'
        ? `[Simulated] ${agent.name} completed task: ${agent.taskDescription}`
        : `[Simulated] ${agent.name} failed: ${reason || 'Dependency failure'}`,
    executionTime: estimateExecutionTime(agent),
    error: status === 'failed' ? reason || 'Dependency failure' : undefined,
  };
}

async function execute(state: DeepthinkState): Promise<StepResult> {
  const startTime = Date.now();

  try {
    if (!state.subAgents || state.subAgents.length === 0) {
      return {
        stepNumber: 9,
        stepName: 'Dispatch',
        status: 'failed',
        output: 'No sub-agents defined',
        error: 'state.subAgents is empty',
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }

    const results: SubAgentResult[] = [];
    const resultById = new Map<string, SubAgentResult>();

    const independentAgents = state.subAgents.filter(
      (agent) => !agent.dependencies || agent.dependencies.length === 0
    );
    const dependentAgents = state.subAgents.filter(
      (agent) => agent.dependencies && agent.dependencies.length > 0
    );

    for (const agent of independentAgents) {
      const result = simulateDispatch(agent, 'success');
      results.push(result);
      resultById.set(agent.id, result);
    }

    const orderedDependents = [...dependentAgents].sort(
      (a, b) => (a.priority || 10) - (b.priority || 10)
    );

    for (const agent of orderedDependents) {
      const dependencies = agent.dependencies || [];
      const missingDeps = dependencies.filter((dep) => !resultById.has(dep));
      if (missingDeps.length > 0) {
        const result = simulateDispatch(agent, 'failed', `Missing dependencies: ${missingDeps.join(', ')}`);
        results.push(result);
        resultById.set(agent.id, result);
        continue;
      }

      const failedDeps = dependencies
        .map((dep) => resultById.get(dep))
        .filter((dep) => dep && dep.status === 'failed');
      if (failedDeps.length > 0) {
        const failedIds = failedDeps.map((dep) => dep?.agentId).join(', ');
        const result = simulateDispatch(agent, 'failed', `Dependency failures: ${failedIds}`);
        results.push(result);
        resultById.set(agent.id, result);
        continue;
      }

      const result = simulateDispatch(agent, 'success');
      results.push(result);
      resultById.set(agent.id, result);
    }

    const totalTime = results.reduce((sum, result) => sum + result.executionTime, 0);

    const output = [
      'Sub-Agent Execution Results:',
      `Total Agents: ${results.length}`,
      `Total Time: ${totalTime}ms`,
      '',
      results
        .map((result) => {
          return [
            `Agent: ${result.agentName} (${result.agentId})`,
            `Status: ${result.status}`,
            `Time: ${result.executionTime.toFixed(2)}ms`,
            `Output: ${result.output.substring(0, 200)}${result.output.length > 200 ? '...' : ''}`,
          ].join('\n');
        })
        .join('\n\n'),
    ].join('\n');

    return {
      stepNumber: 9,
      stepName: 'Dispatch',
      status: 'completed',
      output,
      metadata: {
        duration: Date.now() - startTime,
        results,
        totalExecutionTime: totalTime,
      },
    };
  } catch (error) {
    return {
      stepNumber: 9,
      stepName: 'Dispatch',
      status: 'failed',
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }
}

export const step09: StepDefinition = {
  number: 9,
  name: 'Dispatch',
  description: 'Execute sub-agents and collect results',
  applicableModes: ['full'],
  execute,
};
