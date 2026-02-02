/**
 * Cancel background tasks
 */

import { backgroundTasks } from './delegate-task.js';

export interface BackgroundCancelParams {
  task_id?: string;
  all?: boolean;
}

export interface BackgroundCancelResult {
  cancelled: string[];
  failed: Array<{ task_id: string; reason: string }>;
  message: string;
}

/**
 * Cancel background task(s)
 * 
 * @example
 * ```typescript
 * // Cancel specific task
 * backgroundCancel({ task_id: "bg_styling_12345" });
 * 
 * // Cancel all background tasks
 * backgroundCancel({ all: true });
 * ```
 */
export function backgroundCancel(params: BackgroundCancelParams): BackgroundCancelResult {
  const cancelled: string[] = [];
  const failed: Array<{ task_id: string; reason: string }> = [];

  if (params.all) {
    // Cancel all pending/running tasks
    for (const [id, task] of backgroundTasks.entries()) {
      if (task.status === 'pending' || task.status === 'running') {
        task.status = 'error';
        task.error = 'Cancelled by user';
        task.completedAt = new Date();
        cancelled.push(id);
      }
    }

    if (cancelled.length === 0) {
      return {
        cancelled: [],
        failed: [],
        message: 'No active background tasks to cancel'
      };
    }

    return {
      cancelled,
      failed: [],
      message: `Cancelled ${cancelled.length} background task(s)`
    };
  }

  if (!params.task_id) {
    return {
      cancelled: [],
      failed: [{
        task_id: '',
        reason: 'Must specify task_id or all=true'
      }],
      message: 'No tasks cancelled'
    };
  }

  const task = backgroundTasks.get(params.task_id);
  
  if (!task) {
    return {
      cancelled: [],
      failed: [{
        task_id: params.task_id,
        reason: 'Task not found'
      }],
      message: `Task ${params.task_id} not found`
    };
  }

  if (task.status === 'completed') {
    return {
      cancelled: [],
      failed: [{
        task_id: params.task_id,
        reason: 'Task already completed'
      }],
      message: `Task ${params.task_id} is already completed and cannot be cancelled`
    };
  }

  if (task.status === 'error') {
    return {
      cancelled: [],
      failed: [{
        task_id: params.task_id,
        reason: 'Task already in error state'
      }],
      message: `Task ${params.task_id} is already in error state`
    };
  }

  task.status = 'error';
  task.error = 'Cancelled by user';
  task.completedAt = new Date();
  cancelled.push(params.task_id);

  return {
    cancelled,
    failed: [],
    message: `Cancelled task ${params.task_id}`
  };
}

/**
 * Cancel all tasks for a specific agent type
 */
export function cancelByAgent(agentType: string): BackgroundCancelResult {
  const cancelled: string[] = [];

  for (const [id, task] of backgroundTasks.entries()) {
    if (task.agent === agentType && (task.status === 'pending' || task.status === 'running')) {
      task.status = 'error';
      task.error = `Cancelled: all ${agentType} tasks cancelled`;
      task.completedAt = new Date();
      cancelled.push(id);
    }
  }

  return {
    cancelled,
    failed: [],
    message: `Cancelled ${cancelled.length} ${agentType} task(s)`
  };
}
