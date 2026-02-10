/**
 * Team Storage Utilities
 *
 * Manages file paths and directory structure for agent teams.
 * Base path: ~/.pro0/
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';

const BASE_PATH = join(homedir(), '.pro0');
const TEAMS_DIR = 'teams';
const TASKS_DIR = 'tasks';
const MAILBOXES_DIR = 'mailboxes';

/**
 * Validate team name (alphanumeric + hyphens only)
 */
export function validateTeamName(teamName: string): void {
  if (!/^[a-z0-9-]+$/i.test(teamName)) {
    throw new Error(
      `Invalid team name: "${teamName}". Must contain only alphanumeric characters and hyphens.`
    );
  }
  if (teamName.length < 3 || teamName.length > 64) {
    throw new Error(
      `Invalid team name: "${teamName}". Must be between 3 and 64 characters.`
    );
  }
}

/**
 * Get base PRO0 path (~/.pro0/)
 */
export function getBasePath(): string {
  return BASE_PATH;
}

/**
 * Get team directory path
 */
export function getTeamPath(teamName: string): string {
  validateTeamName(teamName);
  return join(BASE_PATH, TEAMS_DIR, teamName);
}

/**
 * Get team config file path
 */
export function getTeamConfigPath(teamName: string): string {
  return join(getTeamPath(teamName), 'config.json');
}

/**
 * Get tasks directory path for a team
 */
export function getTaskPath(teamName: string): string {
  validateTeamName(teamName);
  return join(BASE_PATH, TASKS_DIR, teamName);
}

/**
 * Get task list file path
 */
export function getTaskListPath(teamName: string): string {
  return join(getTaskPath(teamName), 'tasks.json');
}

/**
 * Get task lock file path
 */
export function getTaskLockPath(teamName: string): string {
  return join(getTaskPath(teamName), '.lock');
}

/**
 * Get mailboxes directory path for a team
 */
export function getMailboxesPath(teamName: string): string {
  validateTeamName(teamName);
  return join(BASE_PATH, MAILBOXES_DIR, teamName);
}

/**
 * Get mailbox path for a specific agent
 */
export function getMailboxPath(teamName: string, agentId: string): string {
  validateTeamName(teamName);
  if (!agentId || agentId.length === 0) {
    throw new Error('Agent ID cannot be empty');
  }
  return join(getMailboxesPath(teamName), agentId);
}

/**
 * Get mailbox messages file path
 */
export function getMailboxMessagesPath(teamName: string, agentId: string): string {
  return join(getMailboxPath(teamName, agentId), 'messages.json');
}

/**
 * Get errors log path for a team
 */
export function getErrorsLogPath(teamName: string): string {
  return join(getTeamPath(teamName), 'errors.log');
}

/**
 * Check if a team exists
 */
export function teamExists(teamName: string): boolean {
  try {
    validateTeamName(teamName);
    return existsSync(getTeamConfigPath(teamName));
  } catch {
    return false;
  }
}

/**
 * Ensure team directory exists (creates if missing)
 */
export function ensureTeamDirectory(teamName: string): void {
  validateTeamName(teamName);
  const teamPath = getTeamPath(teamName);
  if (!existsSync(teamPath)) {
    mkdirSync(teamPath, { recursive: true });
  }
}

/**
 * Ensure tasks directory exists
 */
export function ensureTaskDirectory(teamName: string): void {
  validateTeamName(teamName);
  const taskPath = getTaskPath(teamName);
  if (!existsSync(taskPath)) {
    mkdirSync(taskPath, { recursive: true });
  }
}

/**
 * Ensure mailbox directory exists for an agent
 */
export function ensureMailboxDirectory(teamName: string, agentId: string): void {
  validateTeamName(teamName);
  const mailboxPath = getMailboxPath(teamName, agentId);
  if (!existsSync(mailboxPath)) {
    mkdirSync(mailboxPath, { recursive: true });
  }
}

/**
 * Check if team has active members (by checking config)
 */
export function hasActiveMembers(teamName: string): boolean {
  try {
    const configPath = getTeamConfigPath(teamName);
    if (!existsSync(configPath)) {
      return false;
    }

    const config = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
    return config.members && config.members.some((m: any) => 
      m.status === 'active' || m.status === 'idle' || m.status === 'shutting_down'
    );
  } catch {
    return false;
  }
}

/**
 * Delete a team (all associated files and directories)
 * Throws error if team has active members
 */
export function deleteTeam(teamName: string): void {
  validateTeamName(teamName);

  // Safety check: refuse to delete if team has active members
  if (hasActiveMembers(teamName)) {
    throw new Error(
      `Cannot delete team "${teamName}": team has active members. ` +
      `Shut down all teammates before cleanup.`
    );
  }

  // Delete team config
  const teamPath = getTeamPath(teamName);
  if (existsSync(teamPath)) {
    rmSync(teamPath, { recursive: true, force: true });
  }

  // Delete tasks
  const taskPath = getTaskPath(teamName);
  if (existsSync(taskPath)) {
    rmSync(taskPath, { recursive: true, force: true });
  }

  // Delete mailboxes
  const mailboxPath = getMailboxesPath(teamName);
  if (existsSync(mailboxPath)) {
    rmSync(mailboxPath, { recursive: true, force: true });
  }
}

/**
 * Force delete a team (bypasses active members check)
 * USE WITH CAUTION - for manual cleanup only
 */
export function forceDeleteTeam(teamName: string): void {
  validateTeamName(teamName);

  const teamPath = getTeamPath(teamName);
  const taskPath = getTaskPath(teamName);
  const mailboxPath = getMailboxesPath(teamName);

  if (existsSync(teamPath)) {
    rmSync(teamPath, { recursive: true, force: true });
  }
  if (existsSync(taskPath)) {
    rmSync(taskPath, { recursive: true, force: true });
  }
  if (existsSync(mailboxPath)) {
    rmSync(mailboxPath, { recursive: true, force: true });
  }
}

/**
 * List all teams
 */
export function listTeams(): string[] {
  const teamsDir = join(BASE_PATH, TEAMS_DIR);
  if (!existsSync(teamsDir)) {
    return [];
  }

  return readdirSync(teamsDir).filter((name) => {
    const path = join(teamsDir, name);
    return statSync(path).isDirectory() && existsSync(join(path, 'config.json'));
  });
}
