/**
 * Dynamic Agent Registry
 *
 * Central registry for all agents (templates + dynamically generated).
 * Templates are loaded from prompts/*.md, dynamic agents from .pro0/agents/.
 * The manager calls into this to create, update, list, and track agents.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  DynamicAgentDefinition,
  TemplateConfig,
  TeamConfig,
  Pro0Config,
} from '../types/config.js';
import { ensureProjectAgentsDir, getProjectAgentsDir } from '../config/loader.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  model: string;
  temperature?: number;
  promptFile: string; // relative to prompts/ dir
  enabled: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  type: 'template' | 'dynamic';
  category: string;
  model: string;
  active: boolean;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Registry state
// ---------------------------------------------------------------------------

/** Active dynamic agent sessions (id -> session id) */
const activeSessions = new Map<string, string>();

/** All spawned dynamic agent count (for maxTotal enforcement) */
let totalSpawnedCount = 0;

// ---------------------------------------------------------------------------
// Template loading
// ---------------------------------------------------------------------------

/**
 * Load template agents from prompts/*.md files.
 * Reads frontmatter to extract metadata. Falls back to template config for
 * properties not in frontmatter.
 */
export function loadTemplates(
  pluginDir: string,
  templatesConfig: Record<string, TemplateConfig>
): Map<string, AgentTemplate> {
  const templates = new Map<string, AgentTemplate>();
  const specialistsDir = path.join(pluginDir, 'prompts', 'specialists');

  if (!fs.existsSync(specialistsDir)) {
    return templates;
  }

  const files = fs.readdirSync(specialistsDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const id = file.replace('.md', '');
    const config = templatesConfig[id];

    if (!config) continue;

    // Parse frontmatter for name/description
    const content = fs.readFileSync(path.join(specialistsDir, file), 'utf-8');
    const frontmatter = parseFrontmatter(content);

    templates.set(id, {
      id,
      name: frontmatter.name || id,
      description: frontmatter.description || `Template agent: ${id}`,
      category: config.category || 'coding',
      model: config.model,
      temperature: config.temperature,
      promptFile: `specialists/${file}`,
      enabled: config.enabled ?? true,
    });
  }

  return templates;
}

function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!content.startsWith('---')) return result;

  const end = content.indexOf('\n---', 3);
  if (end === -1) return result;

  const fm = content.slice(3, end);
  for (const line of fm.split('\n')) {
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
    if (match) {
      result[match[1].trim()] = match[2].trim();
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Dynamic agent CRUD (stored in .pro0/agents/)
// ---------------------------------------------------------------------------

/**
 * Load all dynamic agent definitions from the project's .pro0/agents/ directory.
 */
export function loadProjectAgents(projectRoot: string): Map<string, DynamicAgentDefinition> {
  const agents = new Map<string, DynamicAgentDefinition>();
  const dir = getProjectAgentsDir(projectRoot);

  if (!fs.existsSync(dir)) return agents;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const def: DynamicAgentDefinition = JSON.parse(content);
      if (def.id) {
        agents.set(def.id, def);
      }
    } catch (err) {
      console.error(`[PRO0] Failed to load dynamic agent ${file}:`, err);
    }
  }

  return agents;
}

/**
 * Create a new dynamic agent definition and persist it.
 * Returns the agent id.
 */
export function createAgent(
  definition: Omit<DynamicAgentDefinition, 'id' | 'createdAt'>,
  projectRoot: string
): DynamicAgentDefinition {
  const dir = ensureProjectAgentsDir(projectRoot);
  const id = generateAgentId(definition.name);

  const agent: DynamicAgentDefinition = {
    ...definition,
    id,
    createdAt: new Date().toISOString(),
    active: false,
  };

  const filePath = path.join(dir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(agent, null, 2));
  console.log(`[PRO0] Created dynamic agent: ${id} (${definition.name})`);

  return agent;
}

/**
 * Update an existing dynamic agent's definition.
 */
export function updateAgent(
  id: string,
  changes: Partial<DynamicAgentDefinition>,
  projectRoot: string
): DynamicAgentDefinition | null {
  const dir = getProjectAgentsDir(projectRoot);
  const filePath = path.join(dir, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`[PRO0] Agent not found: ${id}`);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const existing: DynamicAgentDefinition = JSON.parse(content);

  const updated: DynamicAgentDefinition = {
    ...existing,
    ...changes,
    id: existing.id, // never change id
    createdAt: existing.createdAt, // never change createdAt
    modifiedAt: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  console.log(`[PRO0] Updated dynamic agent: ${id}`);

  return updated;
}

/**
 * Delete a dynamic agent definition.
 */
export function deleteAgent(id: string, projectRoot: string): boolean {
  const dir = getProjectAgentsDir(projectRoot);
  const filePath = path.join(dir, `${id}.json`);

  if (!fs.existsSync(filePath)) return false;

  fs.unlinkSync(filePath);
  activeSessions.delete(id);
  console.log(`[PRO0] Deleted dynamic agent: ${id}`);
  return true;
}

// ---------------------------------------------------------------------------
// Active session tracking
// ---------------------------------------------------------------------------

/**
 * Mark an agent as active with its session id.
 */
export function markActive(agentId: string, sessionId: string): void {
  activeSessions.set(agentId, sessionId);
}

/**
 * Mark an agent as inactive.
 */
export function markInactive(agentId: string): void {
  activeSessions.delete(agentId);
}

/**
 * Get the session id for an active agent.
 */
export function getActiveSession(agentId: string): string | undefined {
  return activeSessions.get(agentId);
}

/**
 * Get count of currently active agents.
 */
export function getActiveCount(): number {
  return activeSessions.size;
}

/**
 * Get total agents spawned this session (for maxTotal enforcement).
 */
export function getTotalSpawnedCount(): number {
  return totalSpawnedCount;
}

/**
 * Increment the spawned count (called when a new agent is spawned).
 */
export function incrementSpawnCount(): void {
  totalSpawnedCount++;
}

/**
 * Reset counters (for testing or session restart).
 */
export function resetCounters(): void {
  activeSessions.clear();
  totalSpawnedCount = 0;
}

// ---------------------------------------------------------------------------
// Capacity checks
// ---------------------------------------------------------------------------

/**
 * Check if we can spawn another agent given team config constraints.
 */
export function canSpawn(teamConfig: TeamConfig): { allowed: boolean; reason?: string } {
  if (getActiveCount() >= teamConfig.maxParallel) {
    return {
      allowed: false,
      reason: `Max parallel agents reached (${teamConfig.maxParallel}). Wait for an active agent to finish.`,
    };
  }

  if (totalSpawnedCount >= teamConfig.maxTotal) {
    return {
      allowed: false,
      reason: `Max total agents reached (${teamConfig.maxTotal}). Cannot create more agents for this task.`,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Combined listing
// ---------------------------------------------------------------------------

/**
 * List all available agents (templates + dynamic) with their status.
 */
export function listAgents(
  pluginDir: string,
  projectRoot: string,
  config: Pro0Config
): AgentInfo[] {
  const result: AgentInfo[] = [];

  // Templates
  const templates = loadTemplates(pluginDir, config.templates);
  for (const [id, tpl] of templates) {
    if (!tpl.enabled) continue;
    result.push({
      id,
      name: tpl.name,
      type: 'template',
      category: tpl.category,
      model: tpl.model,
      active: activeSessions.has(id),
    });
  }

  // Dynamic agents
  const dynamic = loadProjectAgents(projectRoot);
  for (const [id, def] of dynamic) {
    const category = config.team.categories[def.category];
    result.push({
      id,
      name: def.name,
      type: 'dynamic',
      category: def.category,
      model: def.model || category?.defaultModel || 'unknown',
      active: activeSessions.has(id),
      createdAt: def.createdAt,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateAgentId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  const random = Math.random().toString(36).substring(2, 8);
  return `agent-${slug}-${random}`;
}
