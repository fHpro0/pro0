/**
 * Parallel specialist dispatch tool
 * Enables executing multiple specialists concurrently
 */

import type { Pro0Config } from '../types/config.js';
import { delegateTask, type DelegateTaskResult } from './delegate-task.js';

export interface SpecialistTask {
  specialist: 'styling' | 'security' | 'testing' | 'docs' | 'research';
  task: string;
  background?: boolean;
}

export interface DispatchResult {
  specialist: string;
  status: 'pending' | 'completed' | 'error';
  taskId?: string;
  result?: string;
  error?: string;
}

/**
 * Dispatch multiple specialists in parallel
 * 
 * @example
 * ```typescript
 * const results = await dispatchSpecialists([
 *   { specialist: "styling", task: "Design login form", background: true },
 *   { specialist: "testing", task: "Write auth tests", background: true },
 *   { specialist: "security", task: "Review auth code", background: true }
 * ], config);
 * ```
 */
export async function dispatchSpecialists(
  tasks: SpecialistTask[],
  config: Pro0Config,
  context?: any
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];

  // Execute all tasks using delegate_task
  for (const task of tasks) {
    const specialistConfig = config.specialists[task.specialist];
    if (!specialistConfig?.enabled) {
      results.push({
        specialist: task.specialist,
        status: 'error',
        error: `Specialist '${task.specialist}' is not enabled in config`
      });
      continue;
    }

    // Use delegate_task for actual execution
    const delegateResult = await delegateTask({
      subagent_type: task.specialist,
      load_skills: [], // Skills can be added later if needed
      prompt: task.task,
      run_in_background: task.background ?? false
    }, config, context);

    results.push({
      specialist: task.specialist,
      status: delegateResult.status === 'pending' ? 'pending' : 
              delegateResult.status === 'running' ? 'pending' :
              delegateResult.status === 'error' ? 'error' : 'completed',
      taskId: delegateResult.task_id,
      error: delegateResult.status === 'error' ? delegateResult.message : undefined
    });
  }

  return results;
}

/**
 * Format specialist dispatch for agent prompt
 */
export function formatSpecialistDispatch(tasks: SpecialistTask[]): string {
  const lines: string[] = [
    '## Parallel Specialist Dispatch',
    '',
    'Executing specialists in parallel:',
    ''
  ];

  for (const task of tasks) {
    const bg = task.background ? ' (background)' : '';
    lines.push(`- **@${task.specialist}**${bg}: ${task.task}`);
  }

  lines.push('');
  lines.push('Use `delegate_task` with `run_in_background=true` for parallel execution.');

  return lines.join('\n');
}
