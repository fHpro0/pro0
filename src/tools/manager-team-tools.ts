/**
 * Manager Team Coordination Tools
 *
 * OpenCode tools for the Manager agent to coordinate teams.
 */

import type { OpencodeClient } from '@opencode-ai/sdk';
import {
  createTeam,
  getTeamConfig,
  addTeammate,
  removeTeammate,
  getTeamMembers,
  isTeamLead,
  updateTeammateStatus,
} from '../teams/team-config.js';
import {
  createTask,
  getTasks,
  getClaimableTasks,
  cancelTask,
} from '../teams/task-list.js';
import {
  sendMessage,
  broadcast as broadcastMessage,
  getPendingShutdownRequest,
} from '../teams/mailbox.js';
import {
  deleteTeam,
  forceDeleteTeam,
  teamExists,
} from '../teams/storage.js';
import type { TeamMember } from '../teams/types.js';

/**
 * Tool: create_team
 *
 * Create a new agent team.
 */
export const createTeamTool = {
  name: 'create_team',
  description: 'Create a new agent team for coordinating multiple agents working together',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name (alphanumeric and hyphens only, 3-64 chars)',
      },
    },
    required: ['team_name'],
  },
  handler: async (args: { team_name: string }, context: { agentId: string }) => {
    try {
      const { team_name } = args;
      const { agentId } = context;

      if (teamExists(team_name)) {
        return {
          success: false,
          error: `Team "${team_name}" already exists`,
        };
      }

      const config = createTeam(team_name, agentId);

      return {
        success: true,
        team_name: config.name,
        lead_agent_id: config.leadAgentId,
        created_at: config.createdAt,
        message: `Team "${team_name}" created successfully. You are the team lead.`,
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
 * Tool: spawn_teammate
 *
 * Spawn a new teammate agent and add to the team.
 * Note: This tool signature is for the tool definition only.
 * Actual spawning happens in the SessionManager extension.
 */
export const spawnTeammateTool = {
  name: 'spawn_teammate',
  description: 'Spawn a new teammate agent and add them to the team',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      name: {
        type: 'string',
        description: 'Teammate display name (e.g., "Frontend Coder", "Security Reviewer")',
      },
      category: {
        type: 'string',
        enum: ['coding', 'review', 'research', 'ops', 'design'],
        description: 'Agent category',
      },
      task: {
        type: 'string',
        description: 'Task description for this teammate',
      },
      todo_id: {
        type: 'string',
        description: 'Optional todo ID to link this teammate to a manager todo',
      },
    },
    required: ['team_name', 'name', 'category', 'task'],
  },
  // Handler is implemented in SessionManager
};

/**
 * Tool: message_teammate
 *
 * Send a message to a specific teammate.
 */
export const messageTeammateTool = {
  name: 'message_teammate',
  description: 'Send a message to a specific teammate',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      teammate_name: {
        type: 'string',
        description: 'Teammate display name',
      },
      message: {
        type: 'string',
        description: 'Message content',
      },
    },
    required: ['team_name', 'teammate_name', 'message'],
  },
  handler: async (
    args: { team_name: string; teammate_name: string; message: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, teammate_name, message } = args;
      const { agentId } = context;

      // Verify caller is team lead
      if (!isTeamLead(team_name, agentId)) {
        return {
          success: false,
          error: 'Only the team lead can send messages to teammates',
        };
      }

      // Find teammate by name
      const members = getTeamMembers(team_name);
      const teammate = members.find((m) => m.name === teammate_name);

      if (!teammate) {
        return {
          success: false,
          error: `Teammate "${teammate_name}" not found in team "${team_name}"`,
        };
      }

      const messageId = sendMessage(team_name, agentId, teammate.agentId, message);

      return {
        success: true,
        message_id: messageId,
        to: teammate_name,
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
 * Tool: broadcast
 *
 * Broadcast a message to all teammates.
 */
export const broadcastTool = {
  name: 'broadcast',
  description: 'Broadcast a message to all teammates',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      message: {
        type: 'string',
        description: 'Message content',
      },
    },
    required: ['team_name', 'message'],
  },
  handler: async (
    args: { team_name: string; message: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, message } = args;
      const { agentId } = context;

      // Verify caller is team lead
      if (!isTeamLead(team_name, agentId)) {
        return {
          success: false,
          error: 'Only the team lead can broadcast to teammates',
        };
      }

      const messageIds = broadcastMessage(team_name, agentId, message);

      return {
        success: true,
        message_ids: messageIds,
        recipient_count: messageIds.length,
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
 * Tool: shutdown_teammate
 *
 * Request a teammate to shut down gracefully.
 */
export const shutdownTeammateTool = {
  name: 'shutdown_teammate',
  description: 'Request a teammate to shut down gracefully',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      teammate_name: {
        type: 'string',
        description: 'Teammate display name',
      },
      reason: {
        type: 'string',
        description: 'Reason for shutdown (optional)',
      },
    },
    required: ['team_name', 'teammate_name'],
  },
  handler: async (
    args: { team_name: string; teammate_name: string; reason?: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, teammate_name, reason } = args;
      const { agentId } = context;

      // Verify caller is team lead
      if (!isTeamLead(team_name, agentId)) {
        return {
          success: false,
          error: 'Only the team lead can request teammate shutdown',
        };
      }

      // Find teammate by name
      const members = getTeamMembers(team_name);
      const teammate = members.find((m) => m.name === teammate_name);

      if (!teammate) {
        return {
          success: false,
          error: `Teammate "${teammate_name}" not found in team "${team_name}"`,
        };
      }

      // Send shutdown request
      const messageId = sendMessage(
        team_name,
        agentId,
        teammate.agentId,
        reason || 'Shutdown requested by team lead',
        'shutdown_request',
        { reason }
      );

      // Update status
      updateTeammateStatus(team_name, teammate.agentId, 'shutting_down');

      return {
        success: true,
        message_id: messageId,
        teammate: teammate_name,
        status: 'shutdown_requested',
        message: `Shutdown request sent to "${teammate_name}". Waiting for approval.`,
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
 * Tool: cleanup_team
 *
 * Clean up team resources (fails if teammates are active).
 */
export const cleanupTeamTool = {
  name: 'cleanup_team',
  description: 'Clean up team resources. Fails if any teammates are still active.',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      force: {
        type: 'boolean',
        description: 'Force cleanup even with active members (use with caution)',
      },
    },
    required: ['team_name'],
  },
  handler: async (
    args: { team_name: string; force?: boolean },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, force } = args;
      const { agentId } = context;

      // Verify caller is team lead
      if (!isTeamLead(team_name, agentId)) {
        return {
          success: false,
          error: 'Only the team lead can cleanup the team',
        };
      }

      if (force) {
        forceDeleteTeam(team_name);
        return {
          success: true,
          team_name,
          message: `Team "${team_name}" force-cleaned up (all resources deleted)`,
        };
      } else {
        deleteTeam(team_name);
        return {
          success: true,
          team_name,
          message: `Team "${team_name}" cleaned up successfully`,
        };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * Tool: list_teammates
 *
 * List all teammates in the team.
 */
export const listTeammatesTool = {
  name: 'list_teammates',
  description: 'List all teammates in the team with their status',
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

      // Verify caller is team lead
      if (!isTeamLead(team_name, agentId)) {
        return {
          success: false,
          error: 'Only the team lead can list teammates',
        };
      }

      const members = getTeamMembers(team_name);

      return {
        success: true,
        team_name,
        teammate_count: members.length,
        teammates: members.map((m) => ({
          name: m.name,
          category: m.category,
          status: m.status,
          spawned_at: m.spawnedAt,
          session_id: m.sessionId,
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
 * Tool: create_task
 *
 * Create a task in the shared task list.
 */
export const createTaskTool = {
  name: 'create_task',
  description: 'Create a task in the shared task list',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      description: {
        type: 'string',
        description: 'Task description',
      },
      dependencies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Task IDs that must complete before this task can be claimed',
      },
    },
    required: ['team_name', 'description'],
  },
  handler: async (
    args: { team_name: string; description: string; dependencies?: string[] },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, description, dependencies = [] } = args;
      const { agentId } = context;

      // Verify caller is team lead
      if (!isTeamLead(team_name, agentId)) {
        return {
          success: false,
          error: 'Only the team lead can create tasks',
        };
      }

      const taskId = await createTask(team_name, description, dependencies);

      return {
        success: true,
        task_id: taskId,
        description,
        status: 'pending',
        dependencies,
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
 * Tool: list_tasks
 *
 * List tasks in the shared task list.
 */
export const listTasksTool = {
  name: 'list_tasks',
  description: 'List tasks in the shared task list',
  input_schema: {
    type: 'object',
    properties: {
      team_name: {
        type: 'string',
        description: 'Team name',
      },
      filter: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        description: 'Filter tasks by status (optional)',
      },
    },
    required: ['team_name'],
  },
  handler: async (
    args: { team_name: string; filter?: string },
    context: { agentId: string }
  ) => {
    try {
      const { team_name, filter } = args;

      const tasks = getTasks(
        team_name,
        filter as 'pending' | 'in_progress' | 'completed' | 'cancelled' | undefined
      );

      return {
        success: true,
        team_name,
        task_count: tasks.length,
        tasks: tasks.map((t) => ({
          id: t.id,
          description: t.description,
          status: t.status,
          assignee: t.assignee,
          dependencies: t.dependencies,
          created_at: t.createdAt,
          claimed_at: t.claimedAt,
          completed_at: t.completedAt,
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
 * All manager team tools
 */
export const managerTeamTools = {
  create_team: createTeamTool,
  spawn_teammate: spawnTeammateTool,
  message_teammate: messageTeammateTool,
  broadcast: broadcastTool,
  shutdown_teammate: shutdownTeammateTool,
  cleanup_team: cleanupTeamTool,
  list_teammates: listTeammatesTool,
  create_task: createTaskTool,
  list_tasks: listTasksTool,
};
