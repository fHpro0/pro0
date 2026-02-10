/**
 * Team Configuration Manager
 *
 * Manages team config files (create, read, update team members).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import type { TeamConfig, TeamMember } from './types.js';
import {
  ensureTeamDirectory,
  getTeamConfigPath,
  teamExists,
  validateTeamName,
} from './storage.js';

/**
 * Atomic file write (write to temp, then rename)
 */
function atomicWrite(path: string, content: string): void {
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, content, 'utf-8');
  require('fs').renameSync(tmpPath, path);
}

/**
 * Create a new team
 *
 * @param teamName - Team name (alphanumeric + hyphens)
 * @param leadAgentId - Agent ID of the team lead
 * @returns Created team config
 */
export function createTeam(teamName: string, leadAgentId: string): TeamConfig {
  validateTeamName(teamName);

  if (!leadAgentId || leadAgentId.trim().length === 0) {
    throw new Error('Lead agent ID cannot be empty');
  }

  if (teamExists(teamName)) {
    throw new Error(`Team "${teamName}" already exists`);
  }

  const config: TeamConfig = {
    name: teamName,
    leadAgentId,
    createdAt: new Date().toISOString(),
    members: [],
  };

  ensureTeamDirectory(teamName);
  const configPath = getTeamConfigPath(teamName);
  atomicWrite(configPath, JSON.stringify(config, null, 2));

  return config;
}

/**
 * Get team config
 *
 * @param teamName - Team name
 * @returns Team config or null if not found
 */
export function getTeamConfig(teamName: string): TeamConfig | null {
  validateTeamName(teamName);

  if (!teamExists(teamName)) {
    return null;
  }

  try {
    const configPath = getTeamConfigPath(teamName);
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as TeamConfig;
  } catch (err) {
    console.error(`[PRO0] Failed to read team config for "${teamName}":`, err);
    return null;
  }
}

/**
 * Update team config
 *
 * @param teamName - Team name
 * @param updates - Partial config updates
 */
export function updateTeamConfig(
  teamName: string,
  updates: Partial<Omit<TeamConfig, 'name'>>
): void {
  validateTeamName(teamName);

  const config = getTeamConfig(teamName);
  if (!config) {
    throw new Error(`Team "${teamName}" does not exist`);
  }

  const updated: TeamConfig = {
    ...config,
    ...updates,
    name: teamName, // Ensure name doesn't change
  };

  const configPath = getTeamConfigPath(teamName);
  atomicWrite(configPath, JSON.stringify(updated, null, 2));
}

/**
 * Add a teammate to the team
 *
 * @param teamName - Team name
 * @param member - Team member to add
 */
export function addTeammate(teamName: string, member: TeamMember): void {
  validateTeamName(teamName);

  const config = getTeamConfig(teamName);
  if (!config) {
    throw new Error(`Team "${teamName}" does not exist`);
  }

  // Check for duplicate agent ID
  if (config.members.some((m) => m.agentId === member.agentId)) {
    throw new Error(`Agent "${member.agentId}" is already a member of team "${teamName}"`);
  }

  config.members.push(member);

  const configPath = getTeamConfigPath(teamName);
  atomicWrite(configPath, JSON.stringify(config, null, 2));
}

/**
 * Remove a teammate from the team
 *
 * @param teamName - Team name
 * @param agentId - Agent ID to remove
 */
export function removeTeammate(teamName: string, agentId: string): void {
  validateTeamName(teamName);

  const config = getTeamConfig(teamName);
  if (!config) {
    throw new Error(`Team "${teamName}" does not exist`);
  }

  config.members = config.members.filter((m) => m.agentId !== agentId);

  const configPath = getTeamConfigPath(teamName);
  atomicWrite(configPath, JSON.stringify(config, null, 2));
}

/**
 * Update a teammate's status
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 * @param status - New status
 */
export function updateTeammateStatus(
  teamName: string,
  agentId: string,
  status: TeamMember['status']
): void {
  validateTeamName(teamName);

  const config = getTeamConfig(teamName);
  if (!config) {
    throw new Error(`Team "${teamName}" does not exist`);
  }

  const member = config.members.find((m) => m.agentId === agentId);
  if (!member) {
    throw new Error(`Agent "${agentId}" is not a member of team "${teamName}"`);
  }

  member.status = status;

  const configPath = getTeamConfigPath(teamName);
  atomicWrite(configPath, JSON.stringify(config, null, 2));
}

/**
 * Get a specific teammate
 *
 * @param teamName - Team name
 * @param agentId - Agent ID
 * @returns Team member or null if not found
 */
export function getTeammate(teamName: string, agentId: string): TeamMember | null {
  const config = getTeamConfig(teamName);
  if (!config) {
    return null;
  }

  return config.members.find((m) => m.agentId === agentId) || null;
}

/**
 * Check if an agent is the team lead
 *
 * @param teamName - Team name
 * @param agentId - Agent ID to check
 * @returns True if agent is the lead
 */
export function isTeamLead(teamName: string, agentId: string): boolean {
  const config = getTeamConfig(teamName);
  if (!config) {
    return false;
  }

  return config.leadAgentId === agentId;
}

/**
 * Get all team members
 *
 * @param teamName - Team name
 * @returns Array of team members
 */
export function getTeamMembers(teamName: string): TeamMember[] {
  const config = getTeamConfig(teamName);
  return config?.members || [];
}
