/**
 * Session Manager
 *
 * Wraps the OpenCode SDK client to manage agent sessions.
 *
 * Architecture:
 * - The manager (proManager) runs in the main/parent session
 * - Each spawned agent gets its own child session via client.session.create()
 * - Tasks are sent via client.session.promptAsync() (non-blocking)
 * - The manager polls session status/messages to track progress
 * - Completed agents' results are extracted from their session messages
 *
 * This module owns the lifecycle of all agent sessions.
 */

import type { OpencodeClient } from '@opencode-ai/sdk';
import type { DynamicAgentDefinition, TeamConfig } from '../types/config.js';
import type { AgentMessage } from './message-protocol.js';
import {
  serializeMessage,
  createTaskAssignment,
  parseMessages,
  extractLastResult,
  wrapForPrompt,
} from './message-protocol.js';
import {
  markActive,
  markInactive,
  getActiveSession,
  getActiveCount,
  canSpawn,
  incrementSpawnCount,
} from '../agents/registry.js';
import { checkThrottle } from '../agents/resource-monitor.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskSessionStatus = 'starting' | 'running' | 'completed' | 'error' | 'aborted';

export interface TaskSession {
  /** Agent ID from the registry */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** OpenCode session ID */
  sessionId: string;
  /** Current status */
  status: TaskSessionStatus;
  /** Task ID (for correlation) */
  taskId: string;
  /** When the session was created */
  startedAt: string;
  /** When it completed (if done) */
  completedAt?: string;
  /** Result summary (if completed) */
  result?: string;
  /** Error message (if errored) */
  error?: string;
  /** Category of the agent */
  category: string;
  /** Linked manager todo id (if provided) */
  todoId?: string;
}

export interface SpawnResult {
  success: boolean;
  taskSession?: TaskSession;
  error?: string;
}

export interface SessionManagerOptions {
  /** OpenCode SDK client */
  client: OpencodeClient;
  /** Team config for limits */
  teamConfig: TeamConfig;
  /** Parent session ID (manager's session) */
  parentSessionId?: string;
  /** Poll interval for checking session status (ms) */
  pollIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Session Manager
// ---------------------------------------------------------------------------

export class SessionManager {
  private client: OpencodeClient;
  private teamConfig: TeamConfig;
  private parentSessionId: string | undefined;
  private pollIntervalMs: number;

  /** All task sessions managed by this instance */
  private taskSessions = new Map<string, TaskSession>();

  /** Active poll timers (taskId -> timer) */
  private pollTimers = new Map<string, ReturnType<typeof setInterval>>();

  /** Completion callbacks (taskId -> resolver) */
  private completionCallbacks = new Map<string, (session: TaskSession) => void>();

  constructor(options: SessionManagerOptions) {
    this.client = options.client;
    this.teamConfig = options.teamConfig;
    this.parentSessionId = options.parentSessionId;
    this.pollIntervalMs = options.pollIntervalMs ?? 3000;
  }

  // -------------------------------------------------------------------------
  // Spawn agent
  // -------------------------------------------------------------------------

  /**
   * Spawn a new agent session for a task.
   *
   * 1. Checks capacity (maxParallel, maxTotal, resource throttle)
   * 2. Creates a child session via the SDK
   * 3. Sends the task prompt via promptAsync
   * 4. Starts polling for completion
   *
   * Returns immediately after the session is created and prompt sent.
   */
  async spawn(
    agent: DynamicAgentDefinition,
    taskId: string
  ): Promise<SpawnResult> {
    // --- Capacity checks ---
    const capacityCheck = canSpawn(this.teamConfig);
    if (!capacityCheck.allowed) {
      return { success: false, error: capacityCheck.reason };
    }

    const throttle = checkThrottle(this.teamConfig);
    if (throttle.shouldThrottle && getActiveCount() >= throttle.effectiveMaxParallel) {
      return {
        success: false,
        error: `Resource throttle active: ${throttle.reason}. Effective parallel limit: ${throttle.effectiveMaxParallel}`,
      };
    }

    // --- Create session ---
    try {
      const createResult = await this.client.session.create({
        body: {
          parentID: this.parentSessionId,
          title: `[PRO0] ${agent.name} — ${taskId}`,
        },
      });

      if (!createResult.data) {
        return { success: false, error: 'Failed to create session: no data returned' };
      }

      const sessionId = createResult.data.id;

      // --- Build task session record ---
      const taskSession: TaskSession = {
        agentId: agent.id,
        agentName: agent.name,
        sessionId,
        status: 'starting',
        taskId,
        startedAt: new Date().toISOString(),
        category: agent.category,
      };

      this.taskSessions.set(taskId, taskSession);
      markActive(agent.id, sessionId);
      incrementSpawnCount();

      // --- Send task prompt ---
      const taskMsg = createTaskAssignment(agent.id, agent.prompt, taskId, {
        parentTaskId: agent.parentTaskId,
      });

      const promptText = wrapForPrompt(taskMsg, agent.prompt);

      await this.client.session.promptAsync({
        path: { id: sessionId },
        body: {
          parts: [{ type: 'text', text: promptText }],
          system: agent.prompt,
          tools: agent.tools,
        },
      });

      taskSession.status = 'running';

      // --- Start polling ---
      this.startPolling(taskId, sessionId);

      console.log(`[PRO0] Spawned agent "${agent.name}" (session: ${sessionId}, task: ${taskId})`);

      return { success: true, taskSession };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[PRO0] Failed to spawn agent "${agent.name}":`, errMsg);
      return { success: false, error: errMsg };
    }
  }

  // -------------------------------------------------------------------------
  // Send message to agent
  // -------------------------------------------------------------------------

  /**
   * Send a follow-up message to an agent's session (e.g., feedback, abort).
   */
  async sendMessage(taskId: string, message: AgentMessage): Promise<boolean> {
    const session = this.taskSessions.get(taskId);
    if (!session) {
      console.error(`[PRO0] No task session found for task: ${taskId}`);
      return false;
    }

    if (session.status !== 'running') {
      console.error(`[PRO0] Cannot send message to non-running session (status: ${session.status})`);
      return false;
    }

    try {
      const text = serializeMessage(message);

      await this.client.session.prompt({
        path: { id: session.sessionId },
        body: {
          parts: [{ type: 'text', text }],
        },
      });

      return true;
    } catch (err) {
      console.error(`[PRO0] Failed to send message to ${session.agentName}:`, err);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Abort agent
  // -------------------------------------------------------------------------

  /**
   * Abort a running agent session.
   */
  async abort(taskId: string, reason?: string): Promise<boolean> {
    const session = this.taskSessions.get(taskId);
    if (!session) return false;

    try {
      this.stopPolling(taskId);

      await this.client.session.abort({
        path: { id: session.sessionId },
      });

      session.status = 'aborted';
      session.completedAt = new Date().toISOString();
      session.error = reason || 'Aborted by manager';

      markInactive(session.agentId);

      // Resolve any waiters
      const callback = this.completionCallbacks.get(taskId);
      if (callback) {
        callback(session);
        this.completionCallbacks.delete(taskId);
      }

      console.log(`[PRO0] Aborted agent "${session.agentName}" (task: ${taskId})`);
      return true;
    } catch (err) {
      console.error(`[PRO0] Failed to abort session for task ${taskId}:`, err);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Check agent status
  // -------------------------------------------------------------------------

  /**
   * Get the current status of a task session.
   */
  async checkStatus(taskId: string): Promise<TaskSession | null> {
    const session = this.taskSessions.get(taskId);
    if (!session) return null;

    // If already completed/errored/aborted, return cached
    if (session.status !== 'running' && session.status !== 'starting') {
      return session;
    }

    // Poll the SDK for live status (returns map of all sessions)
    try {
      const statusResult = await this.client.session.status();

      if (statusResult.data) {
        const sdkStatus = statusResult.data[session.sessionId];
        if (sdkStatus && sdkStatus.type === 'idle') {
          // Session finished -- extract result
          await this.handleCompletion(taskId, session);
        }
        // 'busy' means still running -- no change
      }
    } catch {
      // Session may have been deleted or errored
      session.status = 'error';
      session.error = 'Failed to check session status';
    }

    return session;
  }

  /**
   * Wait for a task to complete. Returns when the agent is done.
   */
  waitForCompletion(taskId: string, timeoutMs?: number): Promise<TaskSession> {
    const session = this.taskSessions.get(taskId);

    // Already done
    if (session && session.status !== 'running' && session.status !== 'starting') {
      return Promise.resolve(session);
    }

    return new Promise<TaskSession>((resolve, reject) => {
      this.completionCallbacks.set(taskId, resolve);

      if (timeoutMs) {
        setTimeout(() => {
          if (this.completionCallbacks.has(taskId)) {
            this.completionCallbacks.delete(taskId);
            const ts = this.taskSessions.get(taskId);
            if (ts) {
              ts.status = 'error';
              ts.error = `Timed out after ${timeoutMs}ms`;
              resolve(ts);
            } else {
              reject(new Error(`Task ${taskId} not found after timeout`));
            }
          }
        }, timeoutMs);
      }
    });
  }

  // -------------------------------------------------------------------------
  // List sessions
  // -------------------------------------------------------------------------

  /**
   * List all task sessions (active and completed).
   */
  listSessions(): TaskSession[] {
    return Array.from(this.taskSessions.values());
  }

  /**
   * List only active (running) sessions.
   */
  listActiveSessions(): TaskSession[] {
    return this.listSessions().filter(
      (s) => s.status === 'running' || s.status === 'starting'
    );
  }

  /**
   * Get a specific task session by task ID.
   */
  getSession(taskId: string): TaskSession | undefined {
    return this.taskSessions.get(taskId);
  }

  /**
   * Link a manager todo item to a spawned task session.
   */
  linkTodo(taskId: string, todoId: string): boolean {
    const session = this.taskSessions.get(taskId);
    if (!session) return false;
    session.todoId = todoId;
    return true;
  }

  // -------------------------------------------------------------------------
  // Get agent output
  // -------------------------------------------------------------------------

  /**
   * Retrieve the full message history from an agent session.
   */
  async getSessionMessages(taskId: string): Promise<string | null> {
    const session = this.taskSessions.get(taskId);
    if (!session) return null;

    try {
      const result = await this.client.session.messages({
        path: { id: session.sessionId },
      });

      if (!result.data) return null;

      // Concatenate all text parts from assistant messages
      const textParts: string[] = [];

      for (const msg of result.data) {
        if (msg.info.role === 'assistant') {
          for (const part of msg.parts) {
            if ('text' in part) {
              textParts.push(part.text);
            }
          }
        }
      }

      return textParts.join('\n\n');
    } catch (err) {
      console.error(`[PRO0] Failed to get messages for task ${taskId}:`, err);
      return null;
    }
  }

  /**
   * Get the summarized diff for a session (files changed by the agent).
   */
  async getSessionDiff(taskId: string): Promise<string | null> {
    const session = this.taskSessions.get(taskId);
    if (!session) return null;

    try {
      const result = await this.client.session.diff({
        path: { id: session.sessionId },
      });

      if (!result.data) return null;
      return JSON.stringify(result.data, null, 2);
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  /**
   * Stop all polling and clean up resources.
   */
  dispose(): void {
    for (const [taskId] of this.pollTimers) {
      this.stopPolling(taskId);
    }

    for (const session of this.taskSessions.values()) {
      if (session.status === 'running' || session.status === 'starting') {
        markInactive(session.agentId);
      }
    }

    this.completionCallbacks.clear();
    console.log('[PRO0] Session manager disposed');
  }

  /**
   * Update the team config (e.g., after config reload).
   */
  updateTeamConfig(teamConfig: TeamConfig): void {
    this.teamConfig = teamConfig;
  }

  /**
   * Set the parent session ID (manager's session).
   * This is typically set once when the manager session is known.
   */
  setParentSessionId(sessionId: string): void {
    this.parentSessionId = sessionId;
  }

  // -------------------------------------------------------------------------
  // Internal: polling
  // -------------------------------------------------------------------------

  private startPolling(taskId: string, sessionId: string): void {
    const timer = setInterval(async () => {
      await this.pollSessionStatus(taskId, sessionId);
    }, this.pollIntervalMs);

    this.pollTimers.set(taskId, timer);
  }

  private stopPolling(taskId: string): void {
    const timer = this.pollTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.pollTimers.delete(taskId);
    }
  }

  private async pollSessionStatus(taskId: string, sessionId: string): Promise<void> {
    const session = this.taskSessions.get(taskId);
    if (!session) {
      this.stopPolling(taskId);
      return;
    }

    try {
      const statusResult = await this.client.session.status();

      if (statusResult.data) {
        const sdkStatus = statusResult.data[sessionId];
        if (sdkStatus && sdkStatus.type === 'idle' && session.status === 'running') {
          // Agent finished
          await this.handleCompletion(taskId, session);
        }
      }
    } catch (err) {
      // If we can't reach the session, mark as error
      console.error(`[PRO0] Poll failed for task ${taskId}:`, err);
      session.status = 'error';
      session.error = 'Session unreachable during polling';
      session.completedAt = new Date().toISOString();
      this.stopPolling(taskId);
      markInactive(session.agentId);

      const callback = this.completionCallbacks.get(taskId);
      if (callback) {
        callback(session);
        this.completionCallbacks.delete(taskId);
      }
    }
  }

  private async handleCompletion(taskId: string, session: TaskSession): Promise<void> {
    this.stopPolling(taskId);

    // Try to extract the result from session messages
    const output = await this.getSessionMessages(taskId);

    if (output) {
      // Check for structured result/error messages
      const lastResult = extractLastResult(output);
      if (lastResult) {
        session.result = lastResult.content;
        session.status = lastResult.type === 'error' ? 'error' : 'completed';
        if (lastResult.type === 'error') {
          session.error = lastResult.content;
        }
      } else {
        // No structured message -- use the raw output as the result
        session.result = output.length > 2000 ? output.slice(-2000) : output;
        session.status = 'completed';
      }
    } else {
      session.status = 'completed';
      session.result = '(no output captured)';
    }

    session.completedAt = new Date().toISOString();
    markInactive(session.agentId);

    console.log(`[PRO0] Agent "${session.agentName}" completed (task: ${taskId}, status: ${session.status})`);

    // Resolve any waiters
    const callback = this.completionCallbacks.get(taskId);
    if (callback) {
      callback(session);
      this.completionCallbacks.delete(taskId);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/**
 * Create a SessionManager instance. Typically called once during plugin init.
 */
export function createSessionManager(
  client: OpencodeClient,
  teamConfig: TeamConfig,
  parentSessionId?: string
): SessionManager {
  return new SessionManager({
    client,
    teamConfig,
    parentSessionId,
  });
}
