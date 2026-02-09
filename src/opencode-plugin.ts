import { loadConfig, ensureGlobalConfigExists, validateConfig } from './config/loader.js';
import { listPlans } from './planner/plan-manager.js';
import { backgroundOutput, listBackgroundTasks } from './tools/background-output.js';
import { backgroundCancel } from './tools/background-cancel.js';
import { detectSkillForQuery, getRegisteredSkills } from './skills/registry.js';
import { executeQmdSearch, type SearchResult } from './skills/bundled/qmd/index.js';
import { executeDeepthink } from './skills/bundled/deepthink/index.js';
import type { Pro0Config, DynamicAgentDefinition } from './types/config.js';
import {
  loadTemplates,
  loadProjectAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  listAgents,
} from './agents/registry.js';
import {
  buildTemplateAgentConfig,
  createAgentDefinition,
  generateAgentPrompt,
} from './agents/factory.js';
import {
  createSessionManager,
  type SessionManager,
} from './sessions/session-manager.js';
import { createFeedback, createAbort } from './sessions/message-protocol.js';
import { getResourceSummary } from './agents/resource-monitor.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared template cache
let sharedTemplates: { securityWarning: string; todowriteTemplate: string } | null = null;

function formatQmdResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No matching documents found in knowledge base.';
  }

  const lines: string[] = [
    '# Knowledge Base Search Results',
    '',
    `Found ${results.length} matching document${results.length === 1 ? '' : 's'}:`,
    '',
  ];

  results.forEach((result, index) => {
    lines.push(
      `${index + 1}. **${result.path}** (score: ${result.score.toFixed(2)})`,
      `   ${result.snippet}`,
      ''
    );
  });

  return lines.join('\n').trim();
}

function buildSkillsSection(): string {
  const skills = getRegisteredSkills().filter((skill) => skill.enabled);
  if (skills.length === 0) return '';

  const lines: string[] = [
    '---',
    '## Available Skills',
    '',
    'Use `skill_router` to auto-detect and execute bundled skills.',
    '',
  ];

  for (const skill of skills) {
    lines.push(`- ${skill.name}: ${skill.description}`);
  }

  lines.push(
    '',
    '```typescript',
    'skill_router({ query: "search my notes for x" })',
    '```'
  );

  return lines.join('\n');
}

async function pro0Plugin(context: any): Promise<any> {
  let config: Pro0Config | null = null;
  let sessionManager: SessionManager | null = null;

  const pluginDir = __dirname;
  const projectRoot = process.cwd();

  console.log('[PRO0] Plugin loading from:', pluginDir);
  console.log('[PRO0] Registering proManager as sole primary agent + template subagents');

  const readAgentPrompt = async (fileName: string): Promise<string> => {
    const fullPath = path.join(pluginDir, 'prompts', fileName);
    let raw = await readFile(fullPath, 'utf-8');

    // Strip frontmatter
    if (raw.startsWith('---')) {
      const end = raw.indexOf('\n---', 3);
      if (end !== -1) {
        raw = raw.slice(end + 4).trimStart();
      }
    }

    // Load shared templates (cached)
    if (!sharedTemplates) {
      sharedTemplates = {
        securityWarning: await readFile(
           path.join(pluginDir, 'prompts', '_shared', 'security-warning.md'),
          'utf-8'
        ),
        todowriteTemplate: await readFile(
           path.join(pluginDir, 'prompts', '_shared', 'todowrite-template.md'),
          'utf-8'
        ),
      };
    }

    // Replace security warning marker
    raw = raw.replace(/\{SECURITY_WARNING\}/g, sharedTemplates.securityWarning);

    // Replace TodoWrite template with specialist-specific content
    const todowritePattern =
      /\{TODOWRITE_TEMPLATE\}\s*TRIGGERS:\s*([^\n]+)\s*THRESHOLD:\s*([^\n]+)/g;
    raw = raw.replace(todowritePattern, (_match, triggers, threshold) => {
      return sharedTemplates!
        .todowriteTemplate.replace('{TRIGGERS}', triggers.trim())
        .replace('{THRESHOLD}', threshold.trim())
        .replace('{EXAMPLE_TASK_1}', 'Complete first task')
        .replace('{EXAMPLE_TASK_2}', 'Complete second task');
    });

    const skillsSection = buildSkillsSection();
    return skillsSection ? `${raw}\n\n${skillsSection}\n` : raw;
  };

  // ---------------------------------------------------------------------------
  // Helper: ensure config + session manager are initialized
  // ---------------------------------------------------------------------------

  const ensureInitialized = () => {
    if (!config) {
      config = loadConfig(projectRoot);
    }
    if (!sessionManager && context?.client) {
      sessionManager = createSessionManager(context.client, config.team);
    }
  };

  const generateTaskId = (name: string): string => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
    const random = Math.random().toString(36).substring(2, 8);
    return `task-${slug}-${random}`;
  };

  return {
    config: async (opencodeConfig: any) => {
      config = loadConfig(projectRoot);

      opencodeConfig.permission = {
        ...(opencodeConfig.permission || {}),
        question: 'allow',
      };

      const agents: Record<string, any> = {};

      // -----------------------------------------------------------------------
      // Register proManager as the sole primary agent
      // -----------------------------------------------------------------------
      agents.proManager = {
        mode: 'primary',
        description:
          'Team leader - plans requirements, creates PRDs, delegates to dynamic agents, tracks execution via Ralph Loop',
        prompt: await readAgentPrompt('manager.md'),
      };

      // Apply manager config overrides
      if (config.proManager.model) {
        agents.proManager.model = config.proManager.model;
      }
      if (config.proManager.temperature !== undefined) {
        agents.proManager.temperature = config.proManager.temperature;
      }
      if (config.proManager.top_p !== undefined) {
        agents.proManager.top_p = config.proManager.top_p;
      }

      // -----------------------------------------------------------------------
      // Register enabled template agents as subagents
      // -----------------------------------------------------------------------
      const templates = loadTemplates(pluginDir, config.templates);
      for (const [id, template] of templates) {
        if (!template.enabled) continue;

        const templateConfig = config.templates[id];
        if (!templateConfig) continue;

        try {
          const promptContent = await readAgentPrompt(template.promptFile);
          const agentConfig = buildTemplateAgentConfig(
            template,
            promptContent,
            templateConfig
          );
          agents[id] = agentConfig;
        } catch (err) {
          console.error(`[PRO0] Failed to load template agent "${id}":`, err);
        }
      }

      opencodeConfig.agent = agents;
      opencodeConfig.default_agent = 'proManager';

      // Initialize session manager if client is available
      if (context?.client) {
        sessionManager = createSessionManager(context.client, config.team);
      }
    },

    tools: {
      // -------------------------------------------------------------------
      // Team management tools (new)
      // -------------------------------------------------------------------

      create_agent: {
        description:
          'Create a new dynamic agent definition. The agent is saved to .pro0/agents/ and can be spawned with spawn_agent.',
        parameters: {
          name: {
            type: 'string',
            description: 'Human-readable name for the agent (e.g., "Auth API Coder")',
            required: true,
          },
          category: {
            type: 'string',
            description:
              'Agent category: coding, review, research, ops, or design',
            required: true,
          },
          task: {
            type: 'string',
            description: 'Task description for the agent',
            required: true,
          },
          context: {
            type: 'string',
            description: 'Additional context about the project or task (optional)',
            required: false,
          },
          model: {
            type: 'string',
            description: 'Override default model for this agent (optional)',
            required: false,
          },
          parent_task_id: {
            type: 'string',
            description: 'Parent task ID for correlation (optional)',
            required: false,
          },
        },
        execute: async (params: any) => {
          ensureInitialized();
          if (!config) return { error: 'Config not loaded' };

          const categoryKey = params.category;
          const category = config.team.categories[categoryKey];
          if (!category) {
            return {
              error: `Unknown category: ${categoryKey}. Valid: ${Object.keys(config.team.categories).join(', ')}`,
            };
          }

          const definition = createAgentDefinition(
            params.name,
            params.task,
            category,
            categoryKey,
            {
              model: params.model,
              additionalContext: params.context,
              securityWarning: sharedTemplates?.securityWarning,
              parentTaskId: params.parent_task_id,
            }
          );

          const agent = createAgent(definition, projectRoot);

          return {
            agent_id: agent.id,
            name: agent.name,
            category: categoryKey,
            model: agent.model || category.defaultModel,
            message: `Agent "${agent.name}" created. Use spawn_agent({ agent_id: "${agent.id}" }) to start it.`,
          };
        },
      },

      spawn_agent: {
        description:
          'Spawn a created agent (starts its session and sends it the task). The agent must have been created with create_agent first. Optionally link a todo_id so completion can be mapped back to TodoWrite.',
        parameters: {
          agent_id: {
            type: 'string',
            description: 'Agent ID returned by create_agent',
            required: true,
          },
          todo_id: {
            type: 'string',
            description:
              'Optional TodoWrite item ID this agent is responsible for (recommended)',
            required: false,
          },
        },
        execute: async (params: any) => {
          ensureInitialized();
          if (!config) return { error: 'Config not loaded' };
          if (!sessionManager) {
            return {
              error:
                'Session manager not available. The OpenCode SDK client may not be accessible.',
            };
          }

          // Look up the agent definition
          const projectAgents = loadProjectAgents(projectRoot);
          const agent = projectAgents.get(params.agent_id);
          if (!agent) {
            return {
              error: `Agent not found: ${params.agent_id}. Create it first with create_agent.`,
            };
          }

          const taskId = generateTaskId(agent.name);
          const result = await sessionManager.spawn(agent, taskId);

          if (!result.success) {
            return {
              error: result.error,
              agent_id: params.agent_id,
            };
          }

          if (params.todo_id) {
            sessionManager.linkTodo(result.taskSession!.taskId, params.todo_id);
          }

          return {
            task_id: result.taskSession!.taskId,
            agent_id: params.agent_id,
            agent_name: agent.name,
            session_id: result.taskSession!.sessionId,
            status: result.taskSession!.status,
            ...(params.todo_id ? { todo_id: params.todo_id } : {}),
            message: params.todo_id
              ? `Agent "${agent.name}" spawned for todo ${params.todo_id}. Use check_agent({ task_id: "${result.taskSession!.taskId}" }) and update TodoWrite when done.`
              : `Agent "${agent.name}" spawned and running. Use check_agent({ task_id: "${result.taskSession!.taskId}" }) to monitor.`,
          };
        },
      },

      message_agent: {
        description:
          'Send a follow-up message to a running agent (feedback, clarification, or abort signal).',
        parameters: {
          task_id: {
            type: 'string',
            description: 'Task ID returned by spawn_agent',
            required: true,
          },
          message: {
            type: 'string',
            description: 'Message to send to the agent',
            required: true,
          },
          type: {
            type: 'string',
            description:
              'Message type: feedback (default) or abort',
            required: false,
          },
        },
        execute: async (params: any) => {
          ensureInitialized();
          if (!sessionManager) {
            return { error: 'Session manager not available' };
          }

          const session = sessionManager.getSession(params.task_id);
          if (!session) {
            return { error: `No session found for task: ${params.task_id}` };
          }

          const msgType = params.type || 'feedback';

          if (msgType === 'abort') {
            const aborted = await sessionManager.abort(
              params.task_id,
              params.message
            );
            return {
              success: aborted,
              task_id: params.task_id,
              message: aborted
                ? `Agent "${session.agentName}" aborted.`
                : 'Failed to abort agent.',
            };
          }

          const msg = createFeedback(
            session.agentId,
            params.message,
            params.task_id
          );
          const sent = await sessionManager.sendMessage(params.task_id, msg);

          return {
            success: sent,
            task_id: params.task_id,
            message: sent
              ? `Message sent to "${session.agentName}".`
              : 'Failed to send message.',
          };
        },
      },

      check_agent: {
        description:
          'Check the current status of a running agent. Returns status, result (if completed), and session details.',
        parameters: {
          task_id: {
            type: 'string',
            description: 'Task ID returned by spawn_agent',
            required: true,
          },
          include_output: {
            type: 'boolean',
            description:
              'Include the full output from the agent (default: false)',
            required: false,
          },
          include_diff: {
            type: 'boolean',
            description:
              'Include file changes made by the agent (default: false)',
            required: false,
          },
        },
        execute: async (params: any) => {
          ensureInitialized();
          if (!sessionManager) {
            return { error: 'Session manager not available' };
          }

          const session = await sessionManager.checkStatus(params.task_id);
          if (!session) {
            return { error: `No session found for task: ${params.task_id}` };
          }

          const result: Record<string, any> = {
            task_id: session.taskId,
            agent_id: session.agentId,
            agent_name: session.agentName,
            category: session.category,
            status: session.status,
            started_at: session.startedAt,
          };

          if (session.todoId) {
            result.todo_id = session.todoId;
          }

          if (session.completedAt) {
            result.completed_at = session.completedAt;
          }
          if (session.result) {
            result.result_summary =
              session.result.length > 500
                ? session.result.slice(0, 500) + '...'
                : session.result;
          }
          if (session.error) {
            result.error = session.error;
          }

          if (session.todoId && session.status === 'completed') {
            result.todo_update_hint = `Mark todo ${session.todoId} as completed via TodoWrite now.`;
          }
          if (
            session.todoId &&
            (session.status === 'error' || session.status === 'aborted')
          ) {
            result.todo_update_hint = `Update todo ${session.todoId} status to in_progress or cancelled via TodoWrite, then retry or reassign.`;
          }

          if (params.include_output) {
            const output = await sessionManager.getSessionMessages(
              params.task_id
            );
            if (output) {
              result.full_output = output;
            }
          }

          if (params.include_diff) {
            const diff = await sessionManager.getSessionDiff(params.task_id);
            if (diff) {
              result.files_changed = diff;
            }
          }

          return result;
        },
      },

      list_agents: {
        description:
          'List all agents (templates + dynamic) with their current status, models, and categories.',
        parameters: {
          active_only: {
            type: 'boolean',
            description: 'Only show currently active/running agents (default: false)',
            required: false,
          },
          include_resources: {
            type: 'boolean',
            description:
              'Include system resource usage info (default: false)',
            required: false,
          },
        },
        execute: async (params: any) => {
          ensureInitialized();
          if (!config) return { error: 'Config not loaded' };

          const agents = listAgents(pluginDir, projectRoot, config);

          let filtered = agents;
          if (params.active_only) {
            filtered = agents.filter((a) => a.active);
          }

          const result: Record<string, any> = {
            total: agents.length,
            active: agents.filter((a) => a.active).length,
            agents: filtered.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              category: a.category,
              model: a.model,
              active: a.active,
              ...(a.createdAt ? { created_at: a.createdAt } : {}),
            })),
          };

          // Include session info if session manager available
          if (sessionManager) {
            const sessions = sessionManager.listSessions();
            result.sessions = {
              total: sessions.length,
              active: sessions.filter(
                (s) => s.status === 'running' || s.status === 'starting'
              ).length,
              completed: sessions.filter((s) => s.status === 'completed')
                .length,
              errored: sessions.filter((s) => s.status === 'error').length,
            };
          }

          if (params.include_resources) {
            result.resources = getResourceSummary();
          }

          // Team limits
          result.team_limits = {
            max_parallel: config.team.maxParallel,
            max_total: config.team.maxTotal,
            resource_aware: config.team.resourceAware,
          };

          return result;
        },
      },

      modify_agent: {
        description:
          "Update an existing dynamic agent's definition (instructions, model, temperature, etc.).",
        parameters: {
          agent_id: {
            type: 'string',
            description: 'Agent ID to modify',
            required: true,
          },
          changes: {
            type: 'object',
            description:
              'Changes to apply (model, temperature, prompt, name, etc.)',
            required: true,
          },
        },
        execute: async (params: any) => {
          ensureInitialized();

          const updated = updateAgent(
            params.agent_id,
            params.changes,
            projectRoot
          );

          if (!updated) {
            return {
              error: `Agent not found: ${params.agent_id}. Only dynamic agents (in .pro0/agents/) can be modified.`,
            };
          }

          return {
            agent_id: updated.id,
            name: updated.name,
            category: updated.category,
            model: updated.model,
            modified_at: updated.modifiedAt,
            message: `Agent "${updated.name}" updated.`,
          };
        },
      },

      // -------------------------------------------------------------------
      // Legacy background task tools (kept for compatibility)
      // -------------------------------------------------------------------

      background_output: {
        description: 'Retrieve results from background task(s)',
        parameters: {
          task_id: {
            type: 'string',
            description:
              'Specific task ID to retrieve (optional if all=true)',
            required: false,
          },
          all: {
            type: 'boolean',
            description: 'Retrieve all background task results',
            required: false,
          },
        },
        execute: async (params: any) => {
          return backgroundOutput(params);
        },
      },

      background_cancel: {
        description: 'Cancel background task(s)',
        parameters: {
          task_id: {
            type: 'string',
            description:
              'Specific task ID to cancel (optional if all=true)',
            required: false,
          },
          all: {
            type: 'boolean',
            description: 'Cancel all background tasks',
            required: false,
          },
        },
        execute: async (params: any) => {
          return backgroundCancel(params);
        },
      },

      list_background_tasks: {
        description: 'List all background tasks with their status',
        parameters: {},
        execute: async () => {
          return listBackgroundTasks();
        },
      },

      // -------------------------------------------------------------------
      // Skill router (kept)
      // -------------------------------------------------------------------

      skill_router: {
        description:
          'Auto-detect and execute bundled skills (qmd, deepthink).',
        parameters: {
          query: {
            type: 'string',
            description: 'User query to route to a skill',
            required: true,
          },
          force_skill: {
            type: 'string',
            description: 'Optional skill name override (qmd or deepthink)',
            required: false,
          },
        },
        execute: async (params: any) => {
          ensureInitialized();
          if (!config) return { handled: false, message: 'Config not loaded' };

          const query =
            typeof params.query === 'string' ? params.query.trim() : '';
          if (!query) {
            return {
              handled: false,
              message: 'Missing query for skill routing.',
            };
          }

          const forcedSkill =
            typeof params.force_skill === 'string'
              ? params.force_skill.trim()
              : '';
          const detected = forcedSkill
            ? getRegisteredSkills().find((s) => s.name === forcedSkill)
            : detectSkillForQuery(query);

          if (!detected || !detected.enabled) {
            return { handled: false, message: 'No skill matched this query.' };
          }

          console.log(`[PRO0] Triggering skill: ${detected.name}`);

          try {
            if (detected.name === 'qmd') {
              const qmdConfig = config.skills?.qmd;
              const results = await executeQmdSearch(query, {
                mode: qmdConfig?.searchMode,
                minScore: qmdConfig?.minScore,
                timeout: qmdConfig?.timeout,
              });
              return {
                handled: true,
                skill: detected.name,
                output: formatQmdResults(results),
              };
            }

            if (detected.name === 'deepthink') {
              const deepthinkConfig = config.skills?.deepthink;
              const output = await executeDeepthink(
                query,
                deepthinkConfig?.defaultMode
              );
              return {
                handled: true,
                skill: detected.name,
                output,
              };
            }

            return {
              handled: false,
              message: `Skill ${detected.name} is not supported.`,
            };
          } catch (error) {
            console.error(`[PRO0] Skill ${detected.name} failed:`, error);
            return {
              handled: false,
              skill: detected.name,
              error:
                error instanceof Error ? error.message : String(error),
            };
          }
        },
      },
    },

    // ---------------------------------------------------------------------
    // Hooks
    // ---------------------------------------------------------------------

    async 'tool.execute.before'(input: any, output: any) {
      if (
        (input.tool === 'read' || input.tool === 'grep') &&
        output.args &&
        output.args.filePath &&
        /\.env(\.|$)/i.test(output.args.filePath)
      ) {
        throw new Error(
          '[PRO0] SECURITY VIOLATION: Attempted to read .env file. ' +
            'This is forbidden. See PRO0 security guidelines.'
        );
      }
    },
  };
}

// Export as default (OpenCode expects this)
export default pro0Plugin;
