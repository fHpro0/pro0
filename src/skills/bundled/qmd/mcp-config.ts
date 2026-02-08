import type { QmdSkillConfig } from '../../../types/config.js';

export interface McpServerConfig {
  command: string;
  args: string[];
  env: Record<string, string | undefined>;
}

export function registerQmdMcpServer(config: QmdSkillConfig): McpServerConfig | null {
  if (!config.mcp?.enabled) {
    return null;
  }

  const command = config.mcp.command?.trim() || 'qmd';
  const args = config.mcp.args?.length ? config.mcp.args : ['mcp'];

  return {
    command,
    args,
    env: { ...process.env },
  };
}
