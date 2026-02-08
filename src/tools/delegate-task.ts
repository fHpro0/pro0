/**
 * Background task shared state
 *
 * This module holds the shared background task map used by
 * background-output.ts and background-cancel.ts.
 *
 * The old delegate-task logic (specialist-based, simulated execution) has been
 * replaced by the SessionManager (src/sessions/session-manager.ts) which uses
 * real OpenCode SDK sessions. This file is kept only for backward compatibility
 * with the background_output / background_cancel tools.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

/**
 * Global background task storage.
 * Maps task_id to task state.
 *
 * NOTE: New agent sessions are managed by SessionManager.
 * This map is only used by the legacy background_output / background_cancel tools.
 */
export const backgroundTasks = new Map<string, BackgroundTask>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get background task count by status.
 */
export function getBackgroundTaskStats() {
  const stats = {
    total: backgroundTasks.size,
    pending: 0,
    running: 0,
    completed: 0,
    error: 0,
  };

  for (const task of backgroundTasks.values()) {
    stats[task.status]++;
  }

  return stats;
}

/**
 * Clean up completed/error tasks older than specified time.
 */
export function cleanupBackgroundTasks(olderThanMs: number = 3600000) {
  const now = new Date();
  const toDelete: string[] = [];

  for (const [id, task] of backgroundTasks.entries()) {
    if (
      (task.status === 'completed' || task.status === 'error') &&
      task.completedAt
    ) {
      const age = now.getTime() - task.completedAt.getTime();
      if (age > olderThanMs) {
        toDelete.push(id);
      }
    }
  }

  toDelete.forEach((id) => backgroundTasks.delete(id));
  return toDelete.length;
}
