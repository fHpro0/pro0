import { loadConfig, ensureGlobalConfigExists, validateConfig } from './config/loader.js';
import { loadSkills } from './skills/loader.js';
import { listPlans } from './planner/plan-manager.js';
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
