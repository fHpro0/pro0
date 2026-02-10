/**
 * Type definitions for agent teams
 */

export interface TeamMember {
  /** Member's display name */
  name: string;
  /** Unique agent ID */
  agentId: string;
  /** Agent category (coding, review, research, etc.) */
  category: string;
  /** OpenCode session ID */
  sessionId: string;
  /** When this teammate was spawned */
  spawnedAt: string;
  /** Current status */
  status: 'active' | 'idle' | 'shutting_down' | 'shutdown';
}

export interface TeamConfig {
  /** Team name (alphanumeric + hyphens only) */
  name: string;
  /** Agent ID of the team lead */
  leadAgentId: string;
  /** When the team was created */
  createdAt: string;
  /** Team members */
  members: TeamMember[];
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  /** Unique task ID */
  id: string;
  /** Task description */
  description: string;
  /** Current status */
  status: TaskStatus;
  /** Agent ID of assignee (if claimed) */
  assignee?: string;
  /** Task IDs that must complete before this can be claimed */
  dependencies: string[];
  /** When task was created */
  createdAt: string;
  /** When task was claimed */
  claimedAt?: string;
  /** When task was completed */
  completedAt?: string;
  /** Task result (if completed) */
  result?: string;
}

export interface TaskList {
  /** All tasks for the team */
  tasks: Task[];
}

export type MessageType = 'message' | 'broadcast' | 'notification' | 'shutdown_request' | 'shutdown_response';

export interface Message {
  /** Unique message ID */
  id: string;
  /** Sender agent ID */
  from: string;
  /** Recipient agent ID (or 'all' for broadcast) */
  to: string;
  /** Message type */
  type: MessageType;
  /** Message content */
  content: string;
  /** When message was sent */
  timestamp: string;
  /** Whether message has been read */
  read: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface Mailbox {
  /** Agent ID this mailbox belongs to */
  agentId: string;
  /** All messages in this mailbox */
  messages: Message[];
}

export interface ShutdownRequest {
  /** Requesting agent ID */
  from: string;
  /** Reason for shutdown */
  reason?: string;
  /** When request was sent */
  timestamp: string;
}

export interface ShutdownResponse {
  /** Responding agent ID */
  from: string;
  /** Whether shutdown was approved */
  approved: boolean;
  /** Reason if rejected */
  reason?: string;
  /** When response was sent */
  timestamp: string;
}
