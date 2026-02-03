import { loadConfig, ensureGlobalConfigExists, validateConfig } from './config/loader.js';
import { loadSkills } from './skills/loader.js';
import { listPlans } from './planner/plan-manager.js';
import { delegateTask } from './tools/delegate-task.js';
import { backgroundOutput, listBackgroundTasks } from './tools/background-output.js';
import { backgroundCancel } from './tools/background-cancel.js';
import type { Pro0Config } from './types/config.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared template cache
let sharedTemplates: { securityWarning: string; todowriteTemplate: string } | null = null;

async function pro0Plugin(context: any): Promise<any> {
  let config: Pro0Config | null = null;

  const pluginDir = __dirname;

  console.log('[PRO0] Plugin loading from:', pluginDir);
  console.log('[PRO0] Registering agents via config hook: proPlanner, proManager + 12 specialists');

  const readAgentPrompt = async (fileName: string): Promise<string> => {
    const fullPath = path.join(pluginDir, 'agents', fileName);
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
          path.join(pluginDir, 'agents', '_shared', 'security-warning.md'),
          'utf-8'
        ),
        todowriteTemplate: await readFile(
          path.join(pluginDir, 'agents', '_shared', 'todowrite-template.md'),
          'utf-8'
        )
      };
    }
    
    // Replace security warning marker
    raw = raw.replace(/\{SECURITY_WARNING\}/g, sharedTemplates.securityWarning);
    
    // Replace TodoWrite template with specialist-specific content
    const todowritePattern = /\{TODOWRITE_TEMPLATE\}\s*TRIGGERS:\s*([^\n]+)\s*THRESHOLD:\s*([^\n]+)/g;
    raw = raw.replace(todowritePattern, (match, triggers, threshold) => {
      return sharedTemplates!.todowriteTemplate
        .replace('{TRIGGERS}', triggers.trim())
        .replace('{THRESHOLD}', threshold.trim())
        .replace('{EXAMPLE_TASK_1}', 'Complete first task')
        .replace('{EXAMPLE_TASK_2}', 'Complete second task');
    });
    
    return raw;
  };

  const applyAgentConfig = (
    agentConfig: Record<string, any>,
    configKey: 'proPlanner' | 'proManager'
  ) => {
    if (!config) {
      config = loadConfig(process.cwd());
    }

    const selectedConfig = config[configKey];
    if (selectedConfig.model) {
      agentConfig.model = selectedConfig.model;
    }
    if (selectedConfig.temperature !== undefined) {
      agentConfig.temperature = selectedConfig.temperature;
    }
    if (selectedConfig.top_p !== undefined) {
      agentConfig.top_p = selectedConfig.top_p;
    }
  };

  const applySpecialistConfig = (
    agentConfig: Record<string, any>,
    specialistKey: keyof Pro0Config['specialists']
  ) => {
    if (!config) {
      config = loadConfig(process.cwd());
    }

    const specialistConfig = config.specialists?.[specialistKey];
    if (!specialistConfig?.enabled) {
      return false;
    }

    if (specialistConfig.model) {
      agentConfig.model = specialistConfig.model;
    }
    if (specialistConfig.temperature !== undefined) {
      agentConfig.temperature = specialistConfig.temperature;
    }
    if (specialistConfig.top_p !== undefined) {
      agentConfig.top_p = specialistConfig.top_p;
    }

    return true;
  };

  return {
    config: async (opencodeConfig: any) => {
      config = loadConfig(process.cwd());

      opencodeConfig.permission = {
        ...(opencodeConfig.permission || {}),
        question: 'allow',
      };

      const agents: Record<string, any> = {};

      agents.proPlanner = {
        mode: 'primary',
        description: 'Interview user, research requirements, create PRD and detailed execution plan',
        prompt: await readAgentPrompt('planner.md'),
      };
      applyAgentConfig(agents.proPlanner, 'proPlanner');

      agents.proManager = {
        mode: 'primary',
        description: 'Pure delegation agent - orchestrates specialists, tracks progress via Ralph Loop (NEVER codes)',
        prompt: await readAgentPrompt('manager.md'),
      };
      applyAgentConfig(agents.proManager, 'proManager');

      // Coding specialists
      agents.designer = {
        mode: 'subagent',
        description: 'Designer specialist for frontend components, CSS, styling, and layouts',
        prompt: await readAgentPrompt('specialists/designer.md'),
      };
      if (!applySpecialistConfig(agents.designer, 'designer')) {
        delete agents.designer;
      }

      agents['frontend-coder'] = {
        mode: 'subagent',
        description: 'Frontend Coder specialist for React/Vue logic, state management, hooks',
        prompt: await readAgentPrompt('specialists/frontend-coder.md'),
      };
      if (!applySpecialistConfig(agents['frontend-coder'], 'frontend-coder')) {
        delete agents['frontend-coder'];
      }

      agents['backend-coder'] = {
        mode: 'subagent',
        description: 'Backend Coder specialist for business logic, services, controllers',
        prompt: await readAgentPrompt('specialists/backend-coder.md'),
      };
      if (!applySpecialistConfig(agents['backend-coder'], 'backend-coder')) {
        delete agents['backend-coder'];
      }

      agents['database-coder'] = {
        mode: 'subagent',
        description: 'Database Coder specialist for schema design, queries, migrations',
        prompt: await readAgentPrompt('specialists/database-coder.md'),
      };
      if (!applySpecialistConfig(agents['database-coder'], 'database-coder')) {
        delete agents['database-coder'];
      }

      agents['api-coder'] = {
        mode: 'subagent',
        description: 'API Coder specialist for REST/GraphQL endpoints and routing',
        prompt: await readAgentPrompt('specialists/api-coder.md'),
      };
      if (!applySpecialistConfig(agents['api-coder'], 'api-coder')) {
        delete agents['api-coder'];
      }

      // Quality specialists
      agents.tester = {
        mode: 'subagent',
        description: 'Tester specialist for unit/integration/E2E tests',
        prompt: await readAgentPrompt('specialists/tester.md'),
      };
      if (!applySpecialistConfig(agents.tester, 'tester')) {
        delete agents.tester;
      }

      agents['security-auditor'] = {
        mode: 'subagent',
        description: 'Security Auditor specialist for vulnerability checks and security review',
        prompt: await readAgentPrompt('specialists/security-auditor.md'),
      };
      if (!applySpecialistConfig(agents['security-auditor'], 'security-auditor')) {
        delete agents['security-auditor'];
      }

      agents['self-review'] = {
        mode: 'subagent',
        description: 'Self-Review specialist for comprehensive code review after task completion',
        prompt: await readAgentPrompt('specialists/self-review.md'),
      };
      if (!applySpecialistConfig(agents['self-review'], 'self-review')) {
        delete agents['self-review'];
      }

      // Infrastructure specialists
      agents['devops-engineer'] = {
        mode: 'subagent',
        description: 'DevOps Engineer specialist for CI/CD, deployment, infrastructure',
        prompt: await readAgentPrompt('specialists/devops-engineer.md'),
      };
      if (!applySpecialistConfig(agents['devops-engineer'], 'devops-engineer')) {
        delete agents['devops-engineer'];
      }

      // Documentation specialists
      agents['document-viewer'] = {
        mode: 'subagent',
        description: 'Document Viewer specialist for reading and analyzing documentation',
        prompt: await readAgentPrompt('specialists/document-viewer.md'),
      };
      if (!applySpecialistConfig(agents['document-viewer'], 'document-viewer')) {
        delete agents['document-viewer'];
      }

      agents['documentation-writer'] = {
        mode: 'subagent',
        description: 'Documentation Writer specialist for creating docs, README, and guides',
        prompt: await readAgentPrompt('specialists/documentation-writer.md'),
      };
      if (!applySpecialistConfig(agents['documentation-writer'], 'documentation-writer')) {
        delete agents['documentation-writer'];
      }

      agents.researcher = {
        mode: 'subagent',
        description: 'Researcher specialist for external docs, OSS examples, web search',
        prompt: await readAgentPrompt('specialists/researcher.md'),
      };
      if (!applySpecialistConfig(agents.researcher, 'researcher')) {
        delete agents.researcher;
      }

      opencodeConfig.agent = agents;
      opencodeConfig.default_agent = 'proPlanner';
    },
    tools: {
      delegate_task: {
        description: 'Delegate a task to a subagent. Supports background execution for parallel task processing.',
        parameters: {
          subagent_type: {
            type: 'string',
            description: 'Agent to invoke (styling, security, testing, docs, research, self-review, proPlanner, proExecutor)',
            required: true
          },
          prompt: {
            type: 'string',
            description: 'Task prompt for the subagent',
            required: true
          },
          load_skills: {
            type: 'array',
            description: 'Skills to load for this task (optional)',
            required: false
          },
          run_in_background: {
            type: 'boolean',
            description: 'Run in background for parallel execution (default: false)',
            required: false
          }
        },
        execute: async (params: any) => {
          if (!config) {
            config = loadConfig(process.cwd());
          }
          return delegateTask(params, config, context);
        }
      },
      background_output: {
        description: 'Retrieve results from background task(s)',
        parameters: {
          task_id: {
            type: 'string',
            description: 'Specific task ID to retrieve (optional if all=true)',
            required: false
          },
          all: {
            type: 'boolean',
            description: 'Retrieve all background task results',
            required: false
          }
        },
        execute: async (params: any) => {
          return backgroundOutput(params);
        }
      },
      background_cancel: {
        description: 'Cancel background task(s)',
        parameters: {
          task_id: {
            type: 'string',
            description: 'Specific task ID to cancel (optional if all=true)',
            required: false
          },
          all: {
            type: 'boolean',
            description: 'Cancel all background tasks',
            required: false
          }
        },
        execute: async (params: any) => {
          return backgroundCancel(params);
        }
      },
      list_background_tasks: {
        description: 'List all background tasks with their status',
        parameters: {},
        execute: async () => {
          return listBackgroundTasks();
        }
      }
    },
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
