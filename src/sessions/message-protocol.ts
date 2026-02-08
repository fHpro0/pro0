/**
 * Message Protocol
 *
 * Structured messaging format for manager ↔ agent communication.
 * Messages are serialized as structured text blocks within SDK session prompts.
 *
 * The manager sends tasks/feedback to agents via session.prompt().
 * Agents communicate results back via their session's message history.
 * The manager reads agent output by polling session.messages().
 *
 * This module defines the envelope format and serialization helpers.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentMessageType =
  | 'task_assignment'   // Manager -> Agent: here's your task
  | 'status_update'     // Agent -> Manager: progress update
  | 'question'          // Agent -> Manager: needs clarification
  | 'result'            // Agent -> Manager: task completed
  | 'error'             // Agent -> Manager: task failed
  | 'feedback'          // Manager -> Agent: response to question or correction
  | 'abort';            // Manager -> Agent: stop what you're doing

export interface AgentMessage {
  /** Message type */
  type: AgentMessageType;
  /** Sender agent id (e.g., "proManager", "agent-auth-coder-abc123") */
  from: string;
  /** Recipient agent id */
  to: string;
  /** Main content (markdown-formatted text) */
  content: string;
  /** Optional structured metadata */
  metadata?: AgentMessageMetadata;
  /** ISO timestamp */
  timestamp: string;
}

export interface AgentMessageMetadata {
  /** Task ID this message relates to */
  taskId?: string;
  /** Parent task ID (for subtask tracking) */
  parentTaskId?: string;
  /** Completion percentage (0-100) for status updates */
  progress?: number;
  /** List of files modified */
  filesChanged?: string[];
  /** Error details */
  errorCode?: string;
  /** Urgency flag */
  urgent?: boolean;
  /** Arbitrary key-value data */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Message markers (for parsing from session text)
// ---------------------------------------------------------------------------

const MESSAGE_START = '<!-- PRO0_MSG_START -->';
const MESSAGE_END = '<!-- PRO0_MSG_END -->';

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Serialize an AgentMessage into a text block that can be injected
 * into a session prompt. Uses HTML comments as delimiters so they
 * don't interfere with markdown rendering.
 */
export function serializeMessage(msg: AgentMessage): string {
  const lines: string[] = [];

  lines.push(MESSAGE_START);
  lines.push(`**[${msg.type.toUpperCase()}]** from \`${msg.from}\` → \`${msg.to}\``);
  lines.push(`_${msg.timestamp}_`);
  lines.push('');
  lines.push(msg.content);

  if (msg.metadata && Object.keys(msg.metadata).length > 0) {
    lines.push('');
    lines.push('```json:metadata');
    lines.push(JSON.stringify(msg.metadata, null, 2));
    lines.push('```');
  }

  lines.push(MESSAGE_END);

  return lines.join('\n');
}

/**
 * Parse AgentMessage blocks from raw session text.
 * Returns all messages found (there may be multiple in a single response).
 */
export function parseMessages(text: string): AgentMessage[] {
  const messages: AgentMessage[] = [];
  let searchFrom = 0;

  while (true) {
    const startIdx = text.indexOf(MESSAGE_START, searchFrom);
    if (startIdx === -1) break;

    const endIdx = text.indexOf(MESSAGE_END, startIdx);
    if (endIdx === -1) break;

    const block = text.slice(startIdx + MESSAGE_START.length, endIdx).trim();
    const parsed = parseMessageBlock(block);
    if (parsed) {
      messages.push(parsed);
    }

    searchFrom = endIdx + MESSAGE_END.length;
  }

  return messages;
}

/**
 * Parse a single message block (content between markers).
 */
function parseMessageBlock(block: string): AgentMessage | null {
  try {
    // Line 1: **[TYPE]** from `sender` → `recipient`
    const headerMatch = block.match(
      /\*\*\[(\w+)\]\*\*\s+from\s+`([^`]+)`\s*→\s*`([^`]+)`/
    );
    if (!headerMatch) return null;

    const typeStr = headerMatch[1].toLowerCase() as AgentMessageType;
    const from = headerMatch[2];
    const to = headerMatch[3];

    // Line 2: _timestamp_
    const timestampMatch = block.match(/_(\d{4}-\d{2}-\d{2}T[^_]+)_/);
    const timestamp = timestampMatch?.[1] || new Date().toISOString();

    // Metadata: ```json:metadata ... ```
    let metadata: AgentMessageMetadata | undefined;
    const metaMatch = block.match(/```json:metadata\n([\s\S]*?)```/);
    if (metaMatch) {
      try {
        metadata = JSON.parse(metaMatch[1]);
      } catch {
        // Ignore malformed metadata
      }
    }

    // Content: everything between timestamp line and metadata block (or end)
    const timestampEnd = block.indexOf('\n', block.indexOf('_' + timestamp + '_'));
    const metaStart = metaMatch ? block.indexOf('```json:metadata') : block.length;
    const content = block
      .slice(timestampEnd >= 0 ? timestampEnd + 1 : 0, metaStart)
      .trim();

    return { type: typeStr, from, to, content, metadata, timestamp };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Message constructors (convenience)
// ---------------------------------------------------------------------------

/**
 * Create a task assignment message from the manager to an agent.
 */
export function createTaskAssignment(
  agentId: string,
  taskDescription: string,
  taskId: string,
  options?: { parentTaskId?: string; urgent?: boolean }
): AgentMessage {
  return {
    type: 'task_assignment',
    from: 'proManager',
    to: agentId,
    content: taskDescription,
    metadata: {
      taskId,
      parentTaskId: options?.parentTaskId,
      urgent: options?.urgent,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a feedback message from the manager to an agent.
 */
export function createFeedback(
  agentId: string,
  feedback: string,
  taskId: string
): AgentMessage {
  return {
    type: 'feedback',
    from: 'proManager',
    to: agentId,
    content: feedback,
    metadata: { taskId },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an abort message.
 */
export function createAbort(
  agentId: string,
  reason: string,
  taskId: string
): AgentMessage {
  return {
    type: 'abort',
    from: 'proManager',
    to: agentId,
    content: reason,
    metadata: { taskId },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a result message from an agent back to the manager.
 */
export function createResult(
  agentId: string,
  summary: string,
  taskId: string,
  filesChanged?: string[]
): AgentMessage {
  return {
    type: 'result',
    from: agentId,
    to: 'proManager',
    content: summary,
    metadata: {
      taskId,
      progress: 100,
      filesChanged,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a status update from an agent.
 */
export function createStatusUpdate(
  agentId: string,
  status: string,
  taskId: string,
  progress?: number
): AgentMessage {
  return {
    type: 'status_update',
    from: agentId,
    to: 'proManager',
    content: status,
    metadata: { taskId, progress },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error message from an agent.
 */
export function createError(
  agentId: string,
  errorMessage: string,
  taskId: string,
  errorCode?: string
): AgentMessage {
  return {
    type: 'error',
    from: agentId,
    to: 'proManager',
    content: errorMessage,
    metadata: { taskId, errorCode },
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Prompt injection helpers
// ---------------------------------------------------------------------------

/**
 * Wrap a message into a prompt string suitable for session.prompt().
 * Includes the serialized message plus any plain-text preamble.
 */
export function wrapForPrompt(msg: AgentMessage, preamble?: string): string {
  const parts: string[] = [];

  if (preamble) {
    parts.push(preamble);
    parts.push('');
  }

  parts.push(serializeMessage(msg));

  return parts.join('\n');
}

/**
 * Extract the last result or error message from a session's text output.
 * Useful for polling agent completion.
 */
export function extractLastResult(sessionText: string): AgentMessage | null {
  const messages = parseMessages(sessionText);

  // Find last result or error (most recent)
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === 'result' || messages[i].type === 'error') {
      return messages[i];
    }
  }

  return null;
}
