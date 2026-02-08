import { shouldTriggerQmd } from './detector.js';
import {
  checkQmdInstalled,
  executeQmdGet,
  executeQmdSearch,
  type SearchResult,
} from './executor.js';
import { registerQmdMcpServer, type McpServerConfig } from './mcp-config.js';

export interface QmdSkill {
  name: string;
  version: string;
  description: string;
  detector: typeof shouldTriggerQmd;
  skillPromptPath: string;
}

export { shouldTriggerQmd } from './detector.js';
export {
  checkQmdInstalled,
  executeQmdGet,
  executeQmdSearch,
  registerQmdMcpServer,
  type SearchResult,
  type McpServerConfig,
};

export const qmdSkill: QmdSkill = {
  name: 'qmd',
  version: '1.0.0',
  description: 'Search local markdown knowledge base using QMD',
  detector: shouldTriggerQmd,
  skillPromptPath: './qmd-skill.md',
};
