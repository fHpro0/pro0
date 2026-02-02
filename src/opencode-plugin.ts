import { loadConfig, ensureGlobalConfigExists, validateConfig } from './config/loader.js';
import { loadSkills } from './skills/loader.js';
import { listPlans } from './planner/plan-manager.js';
import { delegateTask } from './tools/delegate-task.js';
import { backgroundOutput, listBackgroundTasks } from './tools/background-output.js';
import { backgroundCancel } from './tools/background-cancel.js';
import type { Pro0Config } from './types/config.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function pro0Plugin(context: any): Promise<any> {
  let config: Pro0Config | null = null;

  const pluginDir = __dirname;

  return {
    agents: {
      proPlanner: {
        mode: 'primary',
        source: path.join(pluginDir, 'agents', 'planner.md'),
      },
      proExecutor: {
        mode: 'primary',
        source: path.join(pluginDir, 'agents', 'executor.md'),
      },
      styling: {
        mode: 'subagent',
        source: path.join(pluginDir, 'agents', 'styling.md'),
      },
      security: {
        mode: 'subagent',
        source: path.join(pluginDir, 'agents', 'security.md'),
      },
      testing: {
        mode: 'subagent',
        source: path.join(pluginDir, 'agents', 'testing.md'),
      },
      docs: {
        mode: 'subagent',
        source: path.join(pluginDir, 'agents', 'docs.md'),
      },
      research: {
        mode: 'subagent',
        source: path.join(pluginDir, 'agents', 'research.md'),
      },
      'self-review': {
        mode: 'subagent',
        source: path.join(pluginDir, 'agents', 'self-review.md'),
      },
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

export default pro0Plugin;
