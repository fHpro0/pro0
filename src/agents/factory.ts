/**
 * Agent Factory
 *
 * Builds OpenCode-compatible agent configs from dynamic definitions and templates.
 * The manager calls the factory to generate agents for specific tasks.
 */

import type {
  DynamicAgentDefinition,
  AgentCategory,
  TemplateConfig,
  TeamConfig,
} from '../types/config.js';
import type { AgentTemplate } from './registry.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpenCodeAgentConfig {
  mode: 'subagent';
  description: string;
  prompt: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  tools?: Record<string, boolean>;
  hidden?: boolean;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build an OpenCode agent config from a dynamic agent definition.
 * Resolves model/temperature from the category if not overridden.
 */
export function buildAgentConfig(
  definition: DynamicAgentDefinition,
  categories: Record<string, AgentCategory>
): OpenCodeAgentConfig {
  const category = categories[definition.category];

  return {
    mode: 'subagent',
    description: `[${definition.category}] ${definition.name}`,
    prompt: definition.prompt,
    model: definition.model || category?.defaultModel,
    temperature: definition.temperature ?? category?.defaultTemperature,
    tools: definition.tools || category?.defaultTools,
    hidden: true, // dynamic agents are hidden from autocomplete; invoked by manager
  };
}

/**
 * Build an OpenCode agent config from a template.
 */
export function buildTemplateAgentConfig(
  template: AgentTemplate,
  promptContent: string,
  templateConfig: TemplateConfig
): OpenCodeAgentConfig {
  return {
    mode: 'subagent',
    description: template.description,
    prompt: promptContent,
    model: templateConfig.model || undefined,
    temperature: templateConfig.temperature,
    hidden: false, // templates are visible in autocomplete
  };
}

/**
 * Generate a system prompt for a dynamically created agent.
 *
 * The manager provides:
 * - taskDescription: what the agent should do
 * - category: which category this agent belongs to
 * - additionalContext: any extra instructions (project conventions, etc.)
 *
 * The factory wraps this in a structured prompt with role, constraints,
 * and communication protocol instructions.
 */
export function generateAgentPrompt(
  taskDescription: string,
  category: AgentCategory,
  options?: {
    additionalContext?: string;
    communicationInstructions?: string;
    securityWarning?: string;
  }
): string {
  const sections: string[] = [];

  // Header
  sections.push(`# ${category.name} Agent`);
  sections.push('');

  // Security
  if (options?.securityWarning) {
    sections.push(options.securityWarning);
    sections.push('');
    sections.push('---');
    sections.push('');
  }

  // Role
  sections.push('## Your Role');
  sections.push('');
  sections.push(
    `You are a dynamically created **${category.name}** agent in the PRO0 team system. ` +
    `Your specialty: ${category.description}.`
  );
  sections.push('');
  sections.push(
    'You were created by the Manager agent to handle a specific task. ' +
    'Complete your task thoroughly, then report back.'
  );
  sections.push('');

  // Task
  sections.push('## Your Task');
  sections.push('');
  sections.push(taskDescription);
  sections.push('');

  // Communication protocol
  sections.push('## Communication Protocol');
  sections.push('');
  sections.push(
    'You are part of a team coordinated by the Manager agent. Follow these rules:'
  );
  sections.push('');
  sections.push('1. **Focus on your task.** Do not deviate or take on unrelated work.');
  sections.push('2. **Report completion clearly.** When done, summarize what you did and any issues found.');
  sections.push('3. **Ask for clarification** if the task is ambiguous -- the Manager will respond.');
  sections.push('4. **Never auto-commit.** Do not run `git commit` unless explicitly told to.');
  sections.push('5. **Use TodoWrite** to track subtasks if your task has 3+ steps.');
  sections.push('');

  if (options?.communicationInstructions) {
    sections.push(options.communicationInstructions);
    sections.push('');
  }

  // Additional context
  if (options?.additionalContext) {
    sections.push('## Project Context');
    sections.push('');
    sections.push(options.additionalContext);
    sections.push('');
  }

  // Constraints
  sections.push('## Constraints');
  sections.push('');
  sections.push('- Do NOT modify files outside your task scope');
  sections.push('- Do NOT read .env files or files containing secrets');
  sections.push('- Do NOT push to remote repositories');
  sections.push('- Do NOT run destructive git operations (force push, hard reset)');
  sections.push('- Complete your work, then stop. The Manager will handle next steps.');
  sections.push('');

  return sections.join('\n');
}

/**
 * Convenience: create a full DynamicAgentDefinition from a task description.
 */
export function createAgentDefinition(
  name: string,
  taskDescription: string,
  category: AgentCategory,
  categoryKey: string,
  options?: {
    model?: string;
    temperature?: number;
    tools?: Record<string, boolean>;
    additionalContext?: string;
    communicationInstructions?: string;
    securityWarning?: string;
    parentTaskId?: string;
  }
): Omit<DynamicAgentDefinition, 'id' | 'createdAt'> {
  return {
    name,
    category: categoryKey,
    model: options?.model,
    temperature: options?.temperature,
    tools: options?.tools || category.defaultTools,
    prompt: generateAgentPrompt(taskDescription, category, {
      additionalContext: options?.additionalContext,
      communicationInstructions: options?.communicationInstructions,
      securityWarning: options?.securityWarning,
    }),
    parentTaskId: options?.parentTaskId,
  };
}
