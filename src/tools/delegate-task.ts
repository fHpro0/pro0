/**
 * Background task delegation system
 * Enables parallel agent execution with task tracking
 */

import type { Pro0Config } from '../types/config.js';

export interface DelegateTaskParams {
  subagent_type: string;
  load_skills?: string[];
  prompt: string;
  run_in_background?: boolean;
}

export interface DelegateTaskResult {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  agent: string;
  message?: string;
}

export interface BackgroundTask {
  id: string;
  agent: string;
  prompt: string;
  skills: string[];
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Global background task storage
 * Maps task_id to task state
 */
export const backgroundTasks = new Map<string, BackgroundTask>();

/**
 * Generate unique task ID
 */
function generateTaskId(agent: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `bg_${agent}_${timestamp}_${random}`;
}

/**
 * Delegate task to a subagent
 * 
 * @example
 * ```typescript
 * // Foreground execution (waits for completion)
 * const result = await delegateTask({
 *   subagent_type: "styling",
 *   load_skills: ["frontend-ui-ux"],
 *   prompt: "Design login form",
 *   run_in_background: false
 * });
 * 
 * // Background execution (returns immediately with task_id)
 * const bgTask = await delegateTask({
 *   subagent_type: "testing",
 *   load_skills: ["javascript-testing-patterns"],
 *   prompt: "Write unit tests for auth",
 *   run_in_background: true
 * });
 * console.log(bgTask.task_id); // Use this to retrieve results later
 * ```
 */
export async function delegateTask(
  params: DelegateTaskParams,
  config: Pro0Config,
  context?: any
): Promise<DelegateTaskResult> {
  const { subagent_type, load_skills = [], prompt, run_in_background = false } = params;

  // Validate agent exists and is enabled
  if (subagent_type === 'proPlanner' || subagent_type === 'proExecutor') {
    // Core agents are always available
  } else if (Object.keys(config.specialists).includes(subagent_type)) {
    const specialistConfig = config.specialists[subagent_type as keyof typeof config.specialists];
    if (!specialistConfig?.enabled) {
      return {
        task_id: '',
        status: 'error',
        agent: subagent_type,
        message: `Specialist '${subagent_type}' is not enabled in config`
      };
    }
  } else if (!['styling', 'security', 'testing', 'docs', 'research', 'self-review'].includes(subagent_type)) {
    return {
      task_id: '',
      status: 'error',
      agent: subagent_type,
      message: `Unknown agent type: ${subagent_type}`
    };
  }

  const taskId = generateTaskId(subagent_type);

  if (run_in_background) {
    // Create background task
    const task: BackgroundTask = {
      id: taskId,
      agent: subagent_type,
      prompt,
      skills: load_skills,
      status: 'pending',
      startedAt: new Date()
    };

    backgroundTasks.set(taskId, task);

    // Spawn background execution (simulated for now)
    // In real implementation, this would use OpenCode's task/delegate API
    setTimeout(() => executeBackgroundTask(taskId, context), 0);

    return {
      task_id: taskId,
      status: 'pending',
      agent: subagent_type,
      message: `Background task ${taskId} created for ${subagent_type}`
    };
  } else {
    // Foreground execution - would use OpenCode's native delegation
    // For now, return a simulated result
    return {
      task_id: taskId,
      status: 'completed',
      agent: subagent_type,
      message: `Foreground task delegated to ${subagent_type}`
    };
  }
}

/**
 * Execute background task (internal)
 * This would integrate with OpenCode's task API
 */
async function executeBackgroundTask(taskId: string, context?: any): Promise<void> {
  const task = backgroundTasks.get(taskId);
  if (!task) return;

  task.status = 'running';

  try {
    // TODO: Integrate with OpenCode's task delegation API
    // For now, simulate task execution
    
    // In real implementation:
    // 1. Use context.task() or similar to spawn subagent
    // 2. Pass prompt and skills to subagent
    // 3. Wait for completion
    // 4. Store result

    // Simulated execution delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    task.status = 'completed';
    task.result = `[Simulated] Task completed for ${task.agent}: ${task.prompt}`;
    task.completedAt = new Date();
  } catch (error) {
    task.status = 'error';
    task.error = error instanceof Error ? error.message : String(error);
    task.completedAt = new Date();
  }
}

/**
 * Get background task count by status
 */
export function getBackgroundTaskStats() {
  const stats = {
    total: backgroundTasks.size,
    pending: 0,
    running: 0,
    completed: 0,
    error: 0
  };

  for (const task of backgroundTasks.values()) {
    stats[task.status]++;
  }

  return stats;
}

/**
 * Clean up completed/error tasks older than specified time
 */
export function cleanupBackgroundTasks(olderThanMs: number = 3600000) {
  const now = new Date();
  const toDelete: string[] = [];

  for (const [id, task] of backgroundTasks.entries()) {
    if ((task.status === 'completed' || task.status === 'error') && task.completedAt) {
      const age = now.getTime() - task.completedAt.getTime();
      if (age > olderThanMs) {
        toDelete.push(id);
      }
    }
  }

  toDelete.forEach(id => backgroundTasks.delete(id));
  return toDelete.length;
}
