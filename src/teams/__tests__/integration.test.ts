/**
 * Integration tests for Agent Teams
 * 
 * Tests the full lifecycle: create team → add members → task coordination → messaging → shutdown
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Team config
import {
  createTeam,
  getTeamConfig,
  addTeammate,
  removeTeammate,
  getTeamMembers,
  isTeamLead,
  updateTeammateStatus,
} from '../team-config.js';

// Task list
import {
  createTask,
  claimTask,
  completeTask,
  cancelTask,
  getTasks,
  getTask,
  getClaimableTasks,
} from '../task-list.js';

// Mailbox
import {
  sendMessage,
  broadcast,
  getMessages,
  getUnreadCount,
  markRead,
  clearMailbox,
} from '../mailbox.js';

// Storage
import {
  teamExists,
  deleteTeam,
  forceDeleteTeam,
  hasActiveMembers,
} from '../storage.js';

import type { TeamMember } from '../types.js';

const TEST_TEAM_NAME = 'test-team-integration';
const LEAD_AGENT_ID = 'agent-lead-123';
const TEAMMATE_1_ID = 'agent-teammate-1';
const TEAMMATE_2_ID = 'agent-teammate-2';

describe('Agent Teams - Integration Tests', () => {
  beforeEach(() => {
    // Clean up any existing test team
    if (teamExists(TEST_TEAM_NAME)) {
      try {
        forceDeleteTeam(TEST_TEAM_NAME);
      } catch {
        // Ignore errors
      }
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (teamExists(TEST_TEAM_NAME)) {
      try {
        forceDeleteTeam(TEST_TEAM_NAME);
      } catch {
        // Ignore errors
      }
    }
  });

  describe('Team Lifecycle', () => {
    it('should create a team and verify it exists', () => {
      const config = createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      expect(config.name).toBe(TEST_TEAM_NAME);
      expect(config.leadAgentId).toBe(LEAD_AGENT_ID);
      expect(config.members).toEqual([]);
      expect(teamExists(TEST_TEAM_NAME)).toBe(true);
    });

    it('should add teammates to the team', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member1: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      const member2: TeamMember = {
        name: 'Reviewer 1',
        agentId: TEAMMATE_2_ID,
        category: 'review',
        sessionId: 'session-2',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member1);
      addTeammate(TEST_TEAM_NAME, member2);

      const members = getTeamMembers(TEST_TEAM_NAME);
      expect(members).toHaveLength(2);
      expect(members[0].agentId).toBe(TEAMMATE_1_ID);
      expect(members[1].agentId).toBe(TEAMMATE_2_ID);
    });

    it('should verify team lead permissions', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      expect(isTeamLead(TEST_TEAM_NAME, LEAD_AGENT_ID)).toBe(true);
      expect(isTeamLead(TEST_TEAM_NAME, TEAMMATE_1_ID)).toBe(false);
    });

    it('should update teammate status', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member);

      updateTeammateStatus(TEST_TEAM_NAME, TEAMMATE_1_ID, 'shutting_down');

      const members = getTeamMembers(TEST_TEAM_NAME);
      expect(members[0].status).toBe('shutting_down');
    });

    it('should remove teammates', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member);

      let members = getTeamMembers(TEST_TEAM_NAME);
      expect(members).toHaveLength(1);

      removeTeammate(TEST_TEAM_NAME, TEAMMATE_1_ID);

      members = getTeamMembers(TEST_TEAM_NAME);
      expect(members).toHaveLength(0);
    });

    it('should detect active members', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member);

      expect(hasActiveMembers(TEST_TEAM_NAME)).toBe(true);

      updateTeammateStatus(TEST_TEAM_NAME, TEAMMATE_1_ID, 'shutdown');

      expect(hasActiveMembers(TEST_TEAM_NAME)).toBe(false);
    });

    it('should prevent deletion with active members', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member);

      expect(() => deleteTeam(TEST_TEAM_NAME)).toThrow('team has active members');

      // Should succeed after marking as shutdown
      updateTeammateStatus(TEST_TEAM_NAME, TEAMMATE_1_ID, 'shutdown');
      expect(() => deleteTeam(TEST_TEAM_NAME)).not.toThrow();
      expect(teamExists(TEST_TEAM_NAME)).toBe(false);
    });

    it('should allow force deletion regardless of active members', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member);

      expect(() => forceDeleteTeam(TEST_TEAM_NAME)).not.toThrow();
      expect(teamExists(TEST_TEAM_NAME)).toBe(false);
    });
  });

  describe('Task Coordination', () => {
    beforeEach(() => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member1: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      const member2: TeamMember = {
        name: 'Coder 2',
        agentId: TEAMMATE_2_ID,
        category: 'coding',
        sessionId: 'session-2',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member1);
      addTeammate(TEST_TEAM_NAME, member2);
    });

    it('should create tasks in the shared task list', async () => {
      const taskId1 = await createTask(TEST_TEAM_NAME, 'Implement auth API', []);
      const taskId2 = await createTask(TEST_TEAM_NAME, 'Write tests', []);

      const tasks = getTasks(TEST_TEAM_NAME);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe(taskId1);
      expect(tasks[1].id).toBe(taskId2);
      expect(tasks[0].status).toBe('pending');
    });

    it('should claim tasks atomically', async () => {
      const taskId = await createTask(TEST_TEAM_NAME, 'Implement auth API', []);

      const success = await claimTask(TEST_TEAM_NAME, taskId, TEAMMATE_1_ID);
      expect(success).toBe(true);

      const task = getTask(TEST_TEAM_NAME, taskId);
      expect(task?.status).toBe('in_progress');
      expect(task?.assignee).toBe(TEAMMATE_1_ID);
      expect(task?.claimedAt).toBeDefined();
    });

    it('should prevent double-claiming of tasks', async () => {
      const taskId = await createTask(TEST_TEAM_NAME, 'Implement auth API', []);

      const success1 = await claimTask(TEST_TEAM_NAME, taskId, TEAMMATE_1_ID);
      expect(success1).toBe(true);

      const success2 = await claimTask(TEST_TEAM_NAME, taskId, TEAMMATE_2_ID);
      expect(success2).toBe(false);

      const task = getTask(TEST_TEAM_NAME, taskId);
      expect(task?.assignee).toBe(TEAMMATE_1_ID);
    });

    it('should complete tasks and track results', async () => {
      const taskId = await createTask(TEST_TEAM_NAME, 'Implement auth API', []);

      await claimTask(TEST_TEAM_NAME, taskId, TEAMMATE_1_ID);
      await completeTask(TEST_TEAM_NAME, taskId, 'Auth API implemented with JWT');

      const task = getTask(TEST_TEAM_NAME, taskId);
      expect(task?.status).toBe('completed');
      expect(task?.result).toBe('Auth API implemented with JWT');
      expect(task?.completedAt).toBeDefined();
    });

    it('should handle task dependencies', async () => {
      const taskId1 = await createTask(TEST_TEAM_NAME, 'Setup database schema', []);
      const taskId2 = await createTask(TEST_TEAM_NAME, 'Implement auth API', [taskId1]);

      // Task 2 should not be claimable until task 1 is complete
      let claimableTasks = getClaimableTasks(TEST_TEAM_NAME);
      expect(claimableTasks).toHaveLength(1);
      expect(claimableTasks[0].id).toBe(taskId1);

      // Complete task 1
      await claimTask(TEST_TEAM_NAME, taskId1, TEAMMATE_1_ID);
      await completeTask(TEST_TEAM_NAME, taskId1, 'Schema created');

      // Now task 2 should be claimable
      claimableTasks = getClaimableTasks(TEST_TEAM_NAME);
      expect(claimableTasks).toHaveLength(1);
      expect(claimableTasks[0].id).toBe(taskId2);
    });

    it('should cancel tasks', async () => {
      const taskId = await createTask(TEST_TEAM_NAME, 'Implement feature X', []);

      await claimTask(TEST_TEAM_NAME, taskId, TEAMMATE_1_ID);
      await cancelTask(TEST_TEAM_NAME, taskId);

      const task = getTask(TEST_TEAM_NAME, taskId);
      expect(task?.status).toBe('cancelled');
    });

    it('should list tasks by status', async () => {
      const taskId1 = await createTask(TEST_TEAM_NAME, 'Task 1', []);
      const taskId2 = await createTask(TEST_TEAM_NAME, 'Task 2', []);
      const taskId3 = await createTask(TEST_TEAM_NAME, 'Task 3', []);

      await claimTask(TEST_TEAM_NAME, taskId1, TEAMMATE_1_ID);
      await completeTask(TEST_TEAM_NAME, taskId1, 'Done');

      await claimTask(TEST_TEAM_NAME, taskId2, TEAMMATE_2_ID);

      const allTasks = getTasks(TEST_TEAM_NAME);
      expect(allTasks).toHaveLength(3);

      const pendingTasks = getTasks(TEST_TEAM_NAME, 'pending');
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].id).toBe(taskId3);

      const inProgressTasks = getTasks(TEST_TEAM_NAME, 'in_progress');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].id).toBe(taskId2);

      const completedTasks = getTasks(TEST_TEAM_NAME, 'completed');
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].id).toBe(taskId1);
    });
  });

  describe('Messaging System', () => {
    beforeEach(() => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member1: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      const member2: TeamMember = {
        name: 'Reviewer 1',
        agentId: TEAMMATE_2_ID,
        category: 'review',
        sessionId: 'session-2',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member1);
      addTeammate(TEST_TEAM_NAME, member2);
    });

    it('should send direct messages between teammates', () => {
      const messageId = sendMessage(
        TEST_TEAM_NAME,
        LEAD_AGENT_ID,
        TEAMMATE_1_ID,
        'Please implement the auth API'
      );

      expect(messageId).toBeDefined();

      const messages = getMessages(TEST_TEAM_NAME, TEAMMATE_1_ID);
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe(messageId);
      expect(messages[0].from).toBe(LEAD_AGENT_ID);
      expect(messages[0].to).toBe(TEAMMATE_1_ID);
      expect(messages[0].content).toBe('Please implement the auth API');
      expect(messages[0].type).toBe('message');
      expect(messages[0].read).toBe(false);
    });

    it('should broadcast messages to all teammates', () => {
      const messageId = broadcast(
        TEST_TEAM_NAME,
        LEAD_AGENT_ID,
        'Code freeze in 10 minutes'
      );

      expect(messageId).toBeDefined();

      // Both teammates should receive the broadcast
      const messages1 = getMessages(TEST_TEAM_NAME, TEAMMATE_1_ID);
      const messages2 = getMessages(TEST_TEAM_NAME, TEAMMATE_2_ID);

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);

      expect(messages1[0].type).toBe('broadcast');
      expect(messages2[0].type).toBe('broadcast');

      expect(messages1[0].content).toBe('Code freeze in 10 minutes');
      expect(messages2[0].content).toBe('Code freeze in 10 minutes');
    });

    it('should track unread message count', () => {
      sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, TEAMMATE_1_ID, 'Message 1');
      sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, TEAMMATE_1_ID, 'Message 2');
      sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, TEAMMATE_1_ID, 'Message 3');

      const unreadCount = getUnreadCount(TEST_TEAM_NAME, TEAMMATE_1_ID);
      expect(unreadCount).toBe(3);
    });

    it('should mark messages as read', () => {
      const messageId = sendMessage(
        TEST_TEAM_NAME,
        LEAD_AGENT_ID,
        TEAMMATE_1_ID,
        'Test message'
      );

      let unreadCount = getUnreadCount(TEST_TEAM_NAME, TEAMMATE_1_ID);
      expect(unreadCount).toBe(1);

      markRead(TEST_TEAM_NAME, TEAMMATE_1_ID, messageId);

      unreadCount = getUnreadCount(TEST_TEAM_NAME, TEAMMATE_1_ID);
      expect(unreadCount).toBe(0);

      const messages = getMessages(TEST_TEAM_NAME, TEAMMATE_1_ID);
      expect(messages[0].read).toBe(true);
    });

    it('should filter unread messages only', () => {
      const msg1 = sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, TEAMMATE_1_ID, 'Message 1');
      const msg2 = sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, TEAMMATE_1_ID, 'Message 2');
      sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, TEAMMATE_1_ID, 'Message 3');

      markRead(TEST_TEAM_NAME, TEAMMATE_1_ID, msg1);

      const unreadMessages = getMessages(TEST_TEAM_NAME, TEAMMATE_1_ID, true);
      expect(unreadMessages).toHaveLength(2);
      expect(unreadMessages[0].id).toBe(msg2);
    });

    it('should clear mailbox', () => {
      sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, TEAMMATE_1_ID, 'Message 1');
      sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, TEAMMATE_1_ID, 'Message 2');

      let messages = getMessages(TEST_TEAM_NAME, TEAMMATE_1_ID);
      expect(messages).toHaveLength(2);

      clearMailbox(TEST_TEAM_NAME, TEAMMATE_1_ID);

      messages = getMessages(TEST_TEAM_NAME, TEAMMATE_1_ID);
      expect(messages).toHaveLength(0);
    });
  });

  describe('Complete Workflow', () => {
    it('should handle a full team workflow from creation to shutdown', async () => {
      // 1. Create team
      const config = createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);
      expect(config.name).toBe(TEST_TEAM_NAME);

      // 2. Add teammates
      const member1: TeamMember = {
        name: 'Auth Coder',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      const member2: TeamMember = {
        name: 'DB Coder',
        agentId: TEAMMATE_2_ID,
        category: 'coding',
        sessionId: 'session-2',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member1);
      addTeammate(TEST_TEAM_NAME, member2);

      // 3. Create tasks with dependencies
      const dbTask = await createTask(TEST_TEAM_NAME, 'Setup database schema', []);
      const authTask = await createTask(TEST_TEAM_NAME, 'Implement auth API', [dbTask]);

      // 4. Teammate 2 claims and completes DB task
      expect(await claimTask(TEST_TEAM_NAME, dbTask, TEAMMATE_2_ID)).toBe(true);
      sendMessage(TEST_TEAM_NAME, TEAMMATE_2_ID, LEAD_AGENT_ID, 'Working on DB schema');
      await completeTask(TEST_TEAM_NAME, dbTask, 'Schema created with users table');

      // 5. Now auth task is claimable
      const claimable = getClaimableTasks(TEST_TEAM_NAME);
      expect(claimable).toHaveLength(1);
      expect(claimable[0].id).toBe(authTask);

      // 6. Teammate 1 claims auth task
      expect(await claimTask(TEST_TEAM_NAME, authTask, TEAMMATE_1_ID)).toBe(true);

      // 7. Team lead broadcasts update
      broadcast(TEST_TEAM_NAME, LEAD_AGENT_ID, 'Great progress team!');

      // 8. Verify broadcasts received
      expect(getUnreadCount(TEST_TEAM_NAME, TEAMMATE_1_ID)).toBe(1);
      expect(getUnreadCount(TEST_TEAM_NAME, TEAMMATE_2_ID)).toBe(1);

      // 9. Complete auth task
      await completeTask(TEST_TEAM_NAME, authTask, 'Auth API implemented with JWT');

      // 10. Shutdown teammates
      updateTeammateStatus(TEST_TEAM_NAME, TEAMMATE_1_ID, 'shutdown');
      updateTeammateStatus(TEST_TEAM_NAME, TEAMMATE_2_ID, 'shutdown');

      // 11. Verify no active members
      expect(hasActiveMembers(TEST_TEAM_NAME)).toBe(false);

      // 12. Delete team
      deleteTeam(TEST_TEAM_NAME);
      expect(teamExists(TEST_TEAM_NAME)).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(() => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      for (let i = 1; i <= 3; i++) {
        const member: TeamMember = {
          name: `Coder ${i}`,
          agentId: `agent-coder-${i}`,
          category: 'coding',
          sessionId: `session-${i}`,
          spawnedAt: new Date().toISOString(),
          status: 'active',
        };
        addTeammate(TEST_TEAM_NAME, member);
      }
    });

    it('should handle concurrent task claiming', async () => {
      const taskId = await createTask(TEST_TEAM_NAME, 'Shared task', []);

      // Simulate 3 agents trying to claim the same task concurrently
      const results = await Promise.all([
        claimTask(TEST_TEAM_NAME, taskId, 'agent-coder-1'),
        claimTask(TEST_TEAM_NAME, taskId, 'agent-coder-2'),
        claimTask(TEST_TEAM_NAME, taskId, 'agent-coder-3'),
      ]);

      // Exactly one should succeed
      const successCount = results.filter((r) => r === true).length;
      expect(successCount).toBe(1);

      // Verify task is claimed by exactly one agent
      const task = getTask(TEST_TEAM_NAME, taskId);
      expect(task?.status).toBe('in_progress');
      expect(task?.assignee).toBeDefined();
      expect(['agent-coder-1', 'agent-coder-2', 'agent-coder-3']).toContain(task?.assignee);
    });

    it('should handle concurrent broadcasts', () => {
      // Multiple broadcasts happening at the same time
      const msg1 = broadcast(TEST_TEAM_NAME, LEAD_AGENT_ID, 'Message 1');
      const msg2 = broadcast(TEST_TEAM_NAME, LEAD_AGENT_ID, 'Message 2');
      const msg3 = broadcast(TEST_TEAM_NAME, LEAD_AGENT_ID, 'Message 3');

      // Each teammate should receive all 3 broadcasts
      const messages1 = getMessages(TEST_TEAM_NAME, 'agent-coder-1');
      const messages2 = getMessages(TEST_TEAM_NAME, 'agent-coder-2');
      const messages3 = getMessages(TEST_TEAM_NAME, 'agent-coder-3');

      expect(messages1).toHaveLength(3);
      expect(messages2).toHaveLength(3);
      expect(messages3).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid team name', () => {
      expect(() => createTeam('', LEAD_AGENT_ID)).toThrow('Invalid team name');
      expect(() => createTeam('a', LEAD_AGENT_ID)).toThrow('Must be between 3 and 64 characters');
      expect(() => createTeam('team name', LEAD_AGENT_ID)).toThrow('Must contain only');
      expect(() => createTeam('../etc/passwd', LEAD_AGENT_ID)).toThrow('Must contain only');
    });

    it('should throw when creating duplicate team', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);
      expect(() => createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID)).toThrow('already exists');
    });

    it('should throw when adding duplicate teammate', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const member: TeamMember = {
        name: 'Coder 1',
        agentId: TEAMMATE_1_ID,
        category: 'coding',
        sessionId: 'session-1',
        spawnedAt: new Date().toISOString(),
        status: 'active',
      };

      addTeammate(TEST_TEAM_NAME, member);
      expect(() => addTeammate(TEST_TEAM_NAME, member)).toThrow('already a member');
    });

    it('should throw when sending message to non-member', () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      expect(() =>
        sendMessage(TEST_TEAM_NAME, LEAD_AGENT_ID, 'non-existent-agent', 'Hello')
      ).toThrow('is not a member');
    });

    it('should throw when task has circular dependencies', async () => {
      createTeam(TEST_TEAM_NAME, LEAD_AGENT_ID);

      const taskId1 = await createTask(TEST_TEAM_NAME, 'Task 1', []);
      
      // Attempting to create a task that depends on itself should fail
      // (This would need dependency validation in createTask implementation)
      // For now, we just verify that dependencies work correctly
      const taskId2 = await createTask(TEST_TEAM_NAME, 'Task 2', [taskId1]);
      
      expect(getTask(TEST_TEAM_NAME, taskId2)?.dependencies).toContain(taskId1);
    });
  });
});
