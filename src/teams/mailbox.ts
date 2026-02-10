/**
 * Mailbox Messaging System
 *
 * Manages inter-agent messaging with atomic delivery and read tracking.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Message, Mailbox, MessageType } from './types.js';
import {
  ensureMailboxDirectory,
  getMailboxMessagesPath,
  validateTeamName,
} from './storage.js';
import { getTeamMembers, getTeamConfig } from './team-config.js';

const MAX_MESSAGE_SIZE = 10 * 1024; // 10KB

/**
 * Read mailbox from file
 */
function readMailbox(teamName: string, agentId: string): Mailbox {
  const mailboxPath = getMailboxMessagesPath(teamName, agentId);

  if (!existsSync(mailboxPath)) {
    return { agentId, messages: [] };
  }

  try {
    const content = readFileSync(mailboxPath, 'utf-8');
    return JSON.parse(content) as Mailbox;
  } catch (err) {
    console.error(`[PRO0] Failed to read mailbox for agent "${agentId}":`, err);
    return { agentId, messages: [] };
  }
}

/**
 * Write mailbox to file (atomic)
 */
function writeMailbox(teamName: string, agentId: string, mailbox: Mailbox): void {
  const mailboxPath = getMailboxMessagesPath(teamName, agentId);
  const tmpPath = `${mailboxPath}.tmp`;

  writeFileSync(tmpPath, JSON.stringify(mailbox, null, 2), 'utf-8');
  require('fs').renameSync(tmpPath, mailboxPath);
}

/**
 * Validate message content size
 */
function validateMessageSize(content: string): void {
  const size = Buffer.byteLength(content, 'utf-8');
  if (size > MAX_MESSAGE_SIZE) {
    throw new Error(
      `Message too large: ${size} bytes (max: ${MAX_MESSAGE_SIZE} bytes)`
    );
  }
}

/**
 * Send a message to a specific agent
 *
 * @param teamName - Team name
 * @param from - Sender agent ID
 * @param to - Recipient agent ID
 * @param content - Message content
 * @param type - Message type (default: 'message')
 * @param metadata - Additional metadata (optional)
 * @returns Message ID
 */
export function sendMessage(
  teamName: string,
  from: string,
  to: string,
  content: string,
  type: MessageType = 'message',
  metadata?: Record<string, unknown>
): string {
  validateTeamName(teamName);
  validateMessageSize(content);

  // Verify sender and recipient are team members or team lead
  const config = getTeamConfig(teamName);
  if (!config) {
    throw new Error(`Team "${teamName}" does not exist`);
  }

  const members = getTeamMembers(teamName);
  const senderIsLead = config.leadAgentId === from;
  const senderExists = senderIsLead || members.some((m) => m.agentId === from);
  const recipientIsLead = config.leadAgentId === to;
  const recipientExists = recipientIsLead || members.some((m) => m.agentId === to);

  if (!senderExists) {
    throw new Error(`Sender "${from}" is not a member of team "${teamName}"`);
  }

  if (!recipientExists) {
    throw new Error(`Recipient "${to}" is not a member of team "${teamName}"`);
  }

  ensureMailboxDirectory(teamName, to);

  const message: Message = {
    id: randomUUID(),
    from,
    to,
    type,
    content,
    timestamp: new Date().toISOString(),
    read: false,
    metadata,
  };

  const mailbox = readMailbox(teamName, to);
  mailbox.messages.push(message);
  writeMailbox(teamName, to, mailbox);

  console.log(`[PRO0] Message sent from "${from}" to "${to}" (type: ${type})`);

  return message.id;
}

/**
 * Broadcast a message to all team members
 *
 * @param teamName - Team name
 * @param from - Sender agent ID
 * @param content - Message content
 * @param metadata - Additional metadata (optional)
 * @returns Array of message IDs (one per recipient)
 */
export function broadcast(
  teamName: string,
  from: string,
  content: string,
  metadata?: Record<string, unknown>
): string[] {
  validateTeamName(teamName);
  validateMessageSize(content);

  const members = getTeamMembers(teamName);
  const messageIds: string[] = [];

  for (const member of members) {
    // Don't send to self
    if (member.agentId === from) {
      continue;
    }

    const messageId = sendMessage(teamName, from, member.agentId, content, 'broadcast', metadata);
    messageIds.push(messageId);
  }

  console.log(`[PRO0] Broadcast from "${from}" to ${messageIds.length} recipient(s)`);

  return messageIds;
}

/**
 * Get messages from a mailbox
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 * @param unreadOnly - Only return unread messages (default: false)
 * @returns Array of messages
 */
export function getMessages(
  teamName: string,
  agentId: string,
  unreadOnly: boolean = false
): Message[] {
  validateTeamName(teamName);
  ensureMailboxDirectory(teamName, agentId);

  const mailbox = readMailbox(teamName, agentId);

  if (unreadOnly) {
    return mailbox.messages.filter((m) => !m.read);
  }

  return mailbox.messages;
}

/**
 * Mark a message as read
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 * @param messageId - Message ID to mark as read
 */
export function markRead(teamName: string, agentId: string, messageId: string): void {
  validateTeamName(teamName);
  ensureMailboxDirectory(teamName, agentId);

  const mailbox = readMailbox(teamName, agentId);
  const message = mailbox.messages.find((m) => m.id === messageId);

  if (!message) {
    throw new Error(`Message "${messageId}" not found in mailbox for agent "${agentId}"`);
  }

  message.read = true;
  writeMailbox(teamName, agentId, mailbox);
}

/**
 * Mark all messages as read
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 */
export function markAllRead(teamName: string, agentId: string): void {
  validateTeamName(teamName);
  ensureMailboxDirectory(teamName, agentId);

  const mailbox = readMailbox(teamName, agentId);

  for (const message of mailbox.messages) {
    message.read = true;
  }

  writeMailbox(teamName, agentId, mailbox);
}

/**
 * Get unread message count
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 * @returns Number of unread messages
 */
export function getUnreadCount(teamName: string, agentId: string): number {
  validateTeamName(teamName);
  ensureMailboxDirectory(teamName, agentId);

  const mailbox = readMailbox(teamName, agentId);
  return mailbox.messages.filter((m) => !m.read).length;
}

/**
 * Delete a message
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 * @param messageId - Message ID to delete
 */
export function deleteMessage(teamName: string, agentId: string, messageId: string): void {
  validateTeamName(teamName);
  ensureMailboxDirectory(teamName, agentId);

  const mailbox = readMailbox(teamName, agentId);
  mailbox.messages = mailbox.messages.filter((m) => m.id !== messageId);

  writeMailbox(teamName, agentId, mailbox);
}

/**
 * Clear all messages from a mailbox
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 */
export function clearMailbox(teamName: string, agentId: string): void {
  validateTeamName(teamName);
  ensureMailboxDirectory(teamName, agentId);

  const mailbox: Mailbox = { agentId, messages: [] };
  writeMailbox(teamName, agentId, mailbox);
}

/**
 * Get messages by type
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 * @param type - Message type to filter by
 * @returns Array of messages of the specified type
 */
export function getMessagesByType(
  teamName: string,
  agentId: string,
  type: MessageType
): Message[] {
  validateTeamName(teamName);
  ensureMailboxDirectory(teamName, agentId);

  const mailbox = readMailbox(teamName, agentId);
  return mailbox.messages.filter((m) => m.type === type);
}

/**
 * Check if an agent has a pending shutdown request
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 * @returns The shutdown request message or null
 */
export function getPendingShutdownRequest(
  teamName: string,
  agentId: string
): Message | null {
  const shutdownRequests = getMessagesByType(teamName, agentId, 'shutdown_request');
  const unread = shutdownRequests.filter((m) => !m.read);

  return unread.length > 0 ? unread[0] : null;
}
