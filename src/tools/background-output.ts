/**
 * Retrieve results from background tasks
 */

import { backgroundTasks, type BackgroundTask } from './delegate-task.js';

export interface BackgroundOutputParams {
  task_id?: string;
  all?: boolean;
}

export interface BackgroundOutputResult {
  task_id: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
  error?: string;
  duration_ms?: number;
}

/**
 * Get output from background task(s)
 * 
 * @example
 * ```typescript
 * // Get specific task result
 * const result = backgroundOutput({ task_id: "bg_styling_12345" });
 * 
 * // Get all task results
 * const allResults = backgroundOutput({ all: true });
 * ```
 */
export function backgroundOutput(params: BackgroundOutputParams): BackgroundOutputResult | BackgroundOutputResult[] {
  if (params.all) {
    // Return all background tasks
    const results: BackgroundOutputResult[] = [];
    
    for (const task of backgroundTasks.values()) {
      results.push(formatTaskOutput(task));
    }

    return results.length > 0 ? results : [{
      task_id: '',
      agent: '',
      status: 'error',
      error: 'No background tasks found'
    }];
  }

  if (!params.task_id) {
    return {
      task_id: '',
      agent: '',
      status: 'error',
      error: 'Must specify task_id or all=true'
    };
  }

  const task = backgroundTasks.get(params.task_id);
  
  if (!task) {
    return {
      task_id: params.task_id,
      agent: '',
      status: 'error',
      error: `Task ${params.task_id} not found. It may have been completed and cleaned up.`
    };
  }

  return formatTaskOutput(task);
}

/**
 * Format task output for response
 */
function formatTaskOutput(task: BackgroundTask): BackgroundOutputResult {
  const result: BackgroundOutputResult = {
    task_id: task.id,
    agent: task.agent,
    status: task.status
  };

  if (task.result) {
    result.result = task.result;
  }

  if (task.error) {
    result.error = task.error;
  }

  if (task.completedAt) {
    result.duration_ms = task.completedAt.getTime() - task.startedAt.getTime();
  }

  return result;
}

/**
 * List all background tasks with their status
 */
export function listBackgroundTasks() {
  const tasks: Array<{
    task_id: string;
    agent: string;
    status: string;
    prompt: string;
    started_at: string;
  }> = [];

  for (const task of backgroundTasks.values()) {
    tasks.push({
      task_id: task.id,
      agent: task.agent,
      status: task.status,
      prompt: task.prompt.substring(0, 100) + (task.prompt.length > 100 ? '...' : ''),
      started_at: task.startedAt.toISOString()
    });
  }

  return tasks;
}
