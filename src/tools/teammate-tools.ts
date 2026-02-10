/**
 * Teammate Tools
 *
 * OpenCode tools for teammate agents to coordinate with the team.
 */

import {
  claimTask,
  completeTask as completeTaskInList,
  getClaimableTasks,
  getTask,
} from '../teams/task-list.js';
import {
  sendMessage,
  getMessages,
  markAllRead,
  getUnreadCount,
  getPendingShutdownRequest,
} from '../teams/mailbox.js';
import {
  getTeamMembers,
  getTeammate,
} from '../teams/team-config.js';

/**
 * Tool: claim_task
 *
 * Claim a task from the shared task list.
 */
export const claimTaskTool = {
  name: 'claim_task',
  description: 'Claim a task from the shared task list',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      task_id: {
        type: 'string',
        description: 'Task ID to claim',
      },
    },
    required: ['team_name', 'task_id'],
  },
  handler: async (
    args: { team_name: string; task_id: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, task_id } = args;
      const { agentId } = context;

      // Verify caller is a team member
      const teammate = getTeammate(team_name, agentId);
      if (!teammate) {
        return {
          success: false,
          error: `You are not a member of team "${team_name}"`,
        };
      }

      const claimed = await claimTask(team_name, task_id, agentId);

      if (!claimed) {
        return {
          success: false,
          error: 'Task is no longer available (already claimed or has unresolved dependencies)',
        };
      }

      const task = getTask(team_name, task_id);

      return {
        success: true,
        task_id,
        description: task?.description,
        status: 'in_progress',
        claimed_at: task?.claimedAt,
        dependencies: task?.dependencies || [],
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * Tool: complete_task
 *
 * Mark a task as completed.
 */
export const completeTaskTool = {
  name: 'complete_task',
  description: 'Mark a task as completed',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      task_id: {
        type: 'string',
        description: 'Task ID to complete',
      },
      result: {
        type: 'string',
        description: 'Task result or summary (optional)',
      },
    },
    required: ['team_name', 'task_id'],
  },
  handler: async (
    args: { team_name: string; task_id: string; result?: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, task_id, result } = args;
      const { agentId } = context;

      // Verify caller is a team member
      const teammate = getTeammate(team_name, agentId);
      if (!teammate) {
        return {
          success: false,
          error: `You are not a member of team "${team_name}"`,
        };
      }

      // Verify task is assigned to this agent
      const task = getTask(team_name, task_id);
      if (!task) {
        return {
          success: false,
          error: `Task "${task_id}" not found`,
        };
      }

      if (task.assignee !== agentId) {
        return {
          success: false,
          error: 'You cannot complete a task you did not claim',
        };
      }

      await completeTaskInList(team_name, task_id, result);

      return {
        success: true,
        task_id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        result,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * Tool: send_message
 *
 * Send a message to another teammate.
 */
export const sendMessageTool = {
  name: 'send_message',
  description: 'Send a message to another teammate',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      to: {
        type: 'string',
        description: 'Recipient teammate name or agent ID',
      },
      message: {
        type: 'string',
        description: 'Message content',
      },
    },
    required: ['team_name', 'to', 'message'],
  },
  handler: async (
    args: { team_name: string; to: string; message: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, to, message } = args;
      const { agentId } = context;

      // Verify caller is a team member
      const sender = getTeammate(team_name, agentId);
      if (!sender) {
        return {
          success: false,
          error: `You are not a member of team "${team_name}"`,
        };
      }

      // Find recipient by name or agent ID
      const members = getTeamMembers(team_name);
      const recipient = members.find((m) => m.name === to || m.agentId === to);

      if (!recipient) {
        return {
          success: false,
          error: `Teammate "${to}" not found in team "${team_name}"`,
        };
      }

      const messageId = sendMessage(team_name, agentId, recipient.agentId, message);

      return {
        success: true,
        message_id: messageId,
        to: recipient.name,
        sent_at: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * Tool: check_messages
 *
 * Check for new messages in the mailbox.
 */
export const checkMessagesTool = {
  name: 'check_messages',
  description: 'Check for new messages in your mailbox',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      unread_only: {
        type: 'boolean',
        description: 'Only return unread messages (default: true)',
      },
    },
    required: ['team_name'],
  },
  handler: async (
    args: { team_name: string; unread_only?: boolean },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, unread_only = true } = args;
      const { agentId } = context;

      // Verify caller is a team member
      const teammate = getTeammate(team_name, agentId);
      if (!teammate) {
        return {
          success: false,
          error: `You are not a member of team "${team_name}"`,
        };
      }

      const messages = getMessages(team_name, agentId, unread_only);
      const unreadCount = getUnreadCount(team_name, agentId);

      // Mark all as read
      if (unread_only && messages.length > 0) {
        markAllRead(team_name, agentId);
      }

      return {
        success: true,
        message_count: messages.length,
        unread_count: unreadCount,
        messages: messages.map((m) => ({
          id: m.id,
          from: m.from,
          type: m.type,
          content: m.content,
          timestamp: m.timestamp,
          read: m.read,
        })),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * Tool: get_team_members
 *
 * Get list of all team members.
 */
export const getTeamMembersTool = {
  name: 'get_team_members',
  description: 'Get list of all team members',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
    },
    required: ['team_name'],
  },
  handler: async (args: { team_name: string }, context: { agentId: string }) => {
    try {
      const { team_name } = args;
      const { agentId } = context;

      // Verify caller is a team member
      const teammate = getTeammate(team_name, agentId);
      if (!teammate) {
        return {
          success: false,
          error: `You are not a member of team "${team_name}"`,
        };
      }

      const members = getTeamMembers(team_name);

      return {
        success: true,
        team_name,
        member_count: members.length,
        members: members.map((m) => ({
          name: m.name,
          agent_id: m.agentId,
          category: m.category,
          status: m.status,
          spawned_at: m.spawnedAt,
        })),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * Tool: approve_shutdown
 *
 * Approve a shutdown request from the team lead.
 */
export const approveShutdownTool = {
  name: 'approve_shutdown',
  description: 'Approve a shutdown request from the team lead',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      reason: {
        type: 'string',
        description: 'Reason for approving (optional)',
      },
    },
    required: ['team_name'],
  },
  handler: async (
    args: { team_name: string; reason?: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, reason } = args;
      const { agentId } = context;

      // Verify caller is a team member
      const teammate = getTeammate(team_name, agentId);
      if (!teammate) {
        return {
          success: false,
          error: `You are not a member of team "${team_name}"`,
        };
      }

      // Check for pending shutdown request
      const shutdownRequest = getPendingShutdownRequest(team_name, agentId);
      if (!shutdownRequest) {
        return {
          success: false,
          error: 'No pending shutdown request',
        };
      }

      // Send approval response
      const config = require('../teams/team-config.js').getTeamConfig(team_name);
      if (!config) {
        return {
          success: false,
          error: 'Team config not found',
        };
      }

      sendMessage(
        team_name,
        agentId,
        config.leadAgentId,
        reason || 'Shutdown approved',
        'shutdown_response',
        { approved: true, reason }
      );

      return {
        success: true,
        status: 'shutdown_approved',
        message: 'Shutdown approved. You can now exit gracefully.',
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * Tool: reject_shutdown
 *
 * Reject a shutdown request from the team lead.
 */
export const rejectShutdownTool = {
  name: 'reject_shutdown',
  description: 'Reject a shutdown request from the team lead with a reason',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      reason: {
        type: 'string',
        description: 'Reason for rejecting',
      },
    },
    required: ['team_name', 'reason'],
  },
  handler: async (
    args: { team_name: string; reason: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, reason } = args;
      const { agentId } = context;

      // Verify caller is a team member
      const teammate = getTeammate(team_name, agentId);
      if (!teammate) {
        return {
          success: false,
          error: `You are not a member of team "${team_name}"`,
        };
      }

      // Check for pending shutdown request
      const shutdownRequest = getPendingShutdownRequest(team_name, agentId);
      if (!shutdownRequest) {
        return {
          success: false,
          error: 'No pending shutdown request',
        };
      }

      // Send rejection response
      const config = require('../teams/team-config.js').getTeamConfig(team_name);
      if (!config) {
        return {
          success: false,
          error: 'Team config not found',
        };
      }

      sendMessage(
        team_name,
        agentId,
        config.leadAgentId,
        reason,
        'shutdown_response',
        { approved: false, reason }
      );

      return {
        success: true,
        status: 'shutdown_rejected',
        message: `Shutdown rejected. Reason: ${reason}`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * Tool: get_claimable_tasks
 *
 * Get list of tasks available for claiming (no unresolved dependencies).
 */
export const getClaimableTasksTool = {
  name: 'get_claimable_tasks',
  description: 'Get list of tasks available for claiming',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
    },
    required: ['team_name'],
  },
  handler: async (args: { team_name: string }, context: { agentId: string }) => {
    try {
      const { team_name } = args;
      const { agentId } = context;

      // Verify caller is a team member
      const teammate = getTeammate(team_name, agentId);
      if (!teammate) {
        return {
          success: false,
          error: `You are not a member of team "${team_name}"`,
        };
      }

      const tasks = getClaimableTasks(team_name);

      return {
        success: true,
        team_name,
        task_count: tasks.length,
        tasks: tasks.map((t) => ({
          id: t.id,
          description: t.description,
          dependencies: t.dependencies,
          created_at: t.createdAt,
        })),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * All teammate tools
 */
export const teammateTools = {
  claim_task: claimTaskTool,
  complete_task: completeTaskTool,
  send_message: sendMessageTool,
  check_messages: checkMessagesTool,
  get_team_members: getTeamMembersTool,
  approve_shutdown: approveShutdownTool,
  reject_shutdown: rejectShutdownTool,
  get_claimable_tasks: getClaimableTasksTool,
};
