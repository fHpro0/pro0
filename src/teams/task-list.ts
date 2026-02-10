/**
 * Shared Task List with File-Based Locking
 *
 * Manages tasks for a team with atomic operations to prevent race conditions.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Task, TaskList, TaskStatus } from './types.js';
import {
  ensureTaskDirectory,
  getTaskListPath,
  getTaskLockPath,
  validateTeamName,
} from './storage.js';

const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_ATTEMPTS = 3;
const LOCK_RETRY_DELAY_MS = 100;

/**
 * Simple file-based lock using atomic file operations
 */
class FileLock {
  private lockPath: string;
  private lockId: string;
  private acquired: boolean = false;

  constructor(lockPath: string) {
    this.lockPath = lockPath;
    this.lockId = randomUUID();
  }

  /**
   * Attempt to acquire the lock
   */
  async acquire(): Promise<boolean> {
    const startTime = Date.now();

    for (let attempt = 0; attempt < LOCK_RETRY_ATTEMPTS; attempt++) {
      try {
        // Try to create lock file exclusively
        writeFileSync(this.lockPath, this.lockId, { flag: 'wx' });
        this.acquired = true;
        return true;
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        
        if (error.code !== 'EEXIST') {
          // Unexpected error
          throw error;
        }

        // Lock file exists, check if it's stale
        if (this.isLockStale()) {
          // Remove stale lock and retry
          this.forceRelease();
          continue;
        }

        // Check timeout
        if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
          return false;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS * (attempt + 1)));
      }
    }

    return false;
  }

  /**
   * Release the lock
   */
  release(): void {
    if (!this.acquired) {
      return;
    }

    try {
      // Verify we own the lock before releasing
      const currentLockId = readFileSync(this.lockPath, 'utf-8');
      if (currentLockId === this.lockId) {
        require('fs').unlinkSync(this.lockPath);
      }
    } catch {
      // Lock file may have been removed already
    } finally {
      this.acquired = false;
    }
  }

  /**
   * Force release the lock (for stale locks)
   */
  private forceRelease(): void {
    try {
      if (existsSync(this.lockPath)) {
        require('fs').unlinkSync(this.lockPath);
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if the lock is stale (older than timeout)
   */
  private isLockStale(): boolean {
    try {
      const stats = require('fs').statSync(this.lockPath);
      const age = Date.now() - stats.mtimeMs;
      return age > LOCK_TIMEOUT_MS;
    } catch {
      return false;
    }
  }
}

/**
 * Execute an operation with a file lock
 */
async function withLock<T>(
  teamName: string,
  operation: () => T
): Promise<T> {
  const lockPath = getTaskLockPath(teamName);
  const lock = new FileLock(lockPath);

  const acquired = await lock.acquire();
  if (!acquired) {
    throw new Error(`Failed to acquire lock for team "${teamName}" after ${LOCK_TIMEOUT_MS}ms`);
  }

  try {
    return operation();
  } finally {
    lock.release();
  }
}

/**
 * Read task list from file
 */
function readTaskList(teamName: string): TaskList {
  const taskListPath = getTaskListPath(teamName);

  if (!existsSync(taskListPath)) {
    return { tasks: [] };
  }

  try {
    const content = readFileSync(taskListPath, 'utf-8');
    return JSON.parse(content) as TaskList;
  } catch (err) {
    console.error(`[PRO0] Failed to read task list for team "${teamName}":`, err);
    return { tasks: [] };
  }
}

/**
 * Write task list to file (atomic)
 */
function writeTaskList(teamName: string, taskList: TaskList): void {
  const taskListPath = getTaskListPath(teamName);
  const tmpPath = `${taskListPath}.tmp`;

  writeFileSync(tmpPath, JSON.stringify(taskList, null, 2), 'utf-8');
  require('fs').renameSync(tmpPath, taskListPath);
}

/**
 * Create a new task
 *
 * @param teamName - Team name
 * @param description - Task description
 * @param dependencies - Task IDs that must complete first
 * @returns Created task ID
 */
export async function createTask(
  teamName: string,
  description: string,
  dependencies: string[] = []
): Promise<string> {
  validateTeamName(teamName);
  ensureTaskDirectory(teamName);

  return withLock(teamName, () => {
    const taskList = readTaskList(teamName);

    const task: Task = {
      id: randomUUID(),
      description,
      status: 'pending',
      dependencies,
      createdAt: new Date().toISOString(),
    };

    taskList.tasks.push(task);
    writeTaskList(teamName, taskList);

    return task.id;
  });
}

/**
 * Claim a task (atomic operation with lock)
 *
 * @param teamName - Team name
 * @param taskId - Task ID to claim
 * @param agentId - Agent ID claiming the task
 * @returns True if successfully claimed, false if task unavailable
 */
export async function claimTask(
  teamName: string,
  taskId: string,
  agentId: string
): Promise<boolean> {
  validateTeamName(teamName);

  return withLock(teamName, () => {
    const taskList = readTaskList(teamName);
    const task = taskList.tasks.find((t) => t.id === taskId);

    if (!task) {
      throw new Error(`Task "${taskId}" not found in team "${teamName}"`);
    }

    // Check if already claimed
    if (task.status !== 'pending') {
      return false;
    }

    // Check dependencies
    const unresolvedDeps = task.dependencies.filter((depId) => {
      const dep = taskList.tasks.find((t) => t.id === depId);
      return !dep || dep.status !== 'completed';
    });

    if (unresolvedDeps.length > 0) {
      throw new Error(
        `Cannot claim task "${taskId}": unresolved dependencies: ${unresolvedDeps.join(', ')}`
      );
    }

    // Claim the task
    task.status = 'in_progress';
    task.assignee = agentId;
    task.claimedAt = new Date().toISOString();

    writeTaskList(teamName, taskList);
    return true;
  });
}

/**
 * Complete a task
 *
 * @param teamName - Team name
 * @param taskId - Task ID to complete
 * @param result - Task result (optional)
 */
export async function completeTask(
  teamName: string,
  taskId: string,
  result?: string
): Promise<void> {
  validateTeamName(teamName);

  await withLock(teamName, () => {
    const taskList = readTaskList(teamName);
    const task = taskList.tasks.find((t) => t.id === taskId);

    if (!task) {
      throw new Error(`Task "${taskId}" not found in team "${teamName}"`);
    }

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    if (result) {
      task.result = result;
    }

    writeTaskList(teamName, taskList);
  });

  // Unblock dependent tasks (no lock needed for read-only operation)
  await unblockDependents(teamName, taskId);
}

/**
 * Cancel a task
 *
 * @param teamName - Team name
 * @param taskId - Task ID to cancel
 */
export async function cancelTask(teamName: string, taskId: string): Promise<void> {
  validateTeamName(teamName);

  await withLock(teamName, () => {
    const taskList = readTaskList(teamName);
    const task = taskList.tasks.find((t) => t.id === taskId);

    if (!task) {
      throw new Error(`Task "${taskId}" not found in team "${teamName}"`);
    }

    task.status = 'cancelled';
    task.completedAt = new Date().toISOString();

    writeTaskList(teamName, taskList);
  });
}

/**
 * Get all tasks for a team
 *
 * @param teamName - Team name
 * @param filter - Optional filter by status
 * @returns Array of tasks
 */
export function getTasks(teamName: string, filter?: TaskStatus): Task[] {
  validateTeamName(teamName);
  ensureTaskDirectory(teamName);

  const taskList = readTaskList(teamName);

  if (filter) {
    return taskList.tasks.filter((t) => t.status === filter);
  }

  return taskList.tasks;
}

/**
 * Get a specific task
 *
 * @param teamName - Team name
 * @param taskId - Task ID
 * @returns Task or null if not found
 */
export function getTask(teamName: string, taskId: string): Task | null {
  validateTeamName(teamName);
  ensureTaskDirectory(teamName);

  const taskList = readTaskList(teamName);
  return taskList.tasks.find((t) => t.id === taskId) || null;
}

/**
 * Unblock tasks that depend on a completed task
 * (This is informational - tasks are checked for dependencies when claimed)
 *
 * @param teamName - Team name
 * @param completedTaskId - Completed task ID
 */
export async function unblockDependents(
  teamName: string,
  completedTaskId: string
): Promise<void> {
  // This function logs which tasks are now unblocked
  // Actual dependency checking happens in claimTask
  const taskList = readTaskList(teamName);

  const unblocked = taskList.tasks.filter(
    (t) =>
      t.status === 'pending' &&
      t.dependencies.includes(completedTaskId) &&
      t.dependencies.every((depId) => {
        const dep = taskList.tasks.find((d) => d.id === depId);
        return dep && dep.status === 'completed';
      })
  );

  if (unblocked.length > 0) {
    console.log(
      `[PRO0] Task "${completedTaskId}" completion unblocked ${unblocked.length} task(s): ` +
      unblocked.map((t) => t.id).join(', ')
    );
  }
}

/**
 * Get tasks available for claiming (pending with no unresolved dependencies)
 *
 * @param teamName - Team name
 * @returns Array of claimable tasks
 */
export function getClaimableTasks(teamName: string): Task[] {
  validateTeamName(teamName);
  ensureTaskDirectory(teamName);

  const taskList = readTaskList(teamName);

  return taskList.tasks.filter((task) => {
    if (task.status !== 'pending') {
      return false;
    }

    // Check if all dependencies are completed
    return task.dependencies.every((depId) => {
      const dep = taskList.tasks.find((t) => t.id === depId);
      return dep && dep.status === 'completed';
    });
  });
}
