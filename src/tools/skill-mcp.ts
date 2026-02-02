/**
 * MCP server integration tool
 * Enables skills and agents to invoke MCP server operations dynamically
 */

export interface SkillMcpArgs {
  mcp_name: string;
  tool_name?: string;
  resource_name?: string;
  prompt_name?: string;
  arguments?: string | Record<string, any>;
}

export interface SkillMcpResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Invoke MCP server operations from skills/agents
 * 
 * Requires exactly one of: tool_name, resource_name, or prompt_name
 * 
 * @example
 * ```typescript
 * // Call MCP tool
 * skill_mcp({
 *   mcp_name: "gitlab",
 *   tool_name: "get_merge_request",
 *   arguments: { merge_request_iid: "123" }
 * })
 * 
 * // Read MCP resource
 * skill_mcp({
 *   mcp_name: "context7",
 *   resource_name: "docs://react/hooks"
 * })
 * 
 * // Get MCP prompt
 * skill_mcp({
 *   mcp_name: "playwriter",
 *   prompt_name: "automate-test",
 *   arguments: { url: "https://example.com" }
 * })
 * ```
 */
export async function skillMcp(args: SkillMcpArgs): Promise<SkillMcpResult> {
  const { mcp_name, tool_name, resource_name, prompt_name } = args;
  
  // Validate exactly one operation type specified
  const operations = [tool_name, resource_name, prompt_name].filter(Boolean);
  
  if (operations.length === 0) {
    return {
      success: false,
      error: 'Missing operation. Exactly one of tool_name, resource_name, or prompt_name must be specified.\n\n' +
        'Examples:\n' +
        '  skill_mcp({ mcp_name: "gitlab", tool_name: "get_project", arguments: {...} })\n' +
        '  skill_mcp({ mcp_name: "context7", resource_name: "docs://react" })\n' +
        '  skill_mcp({ mcp_name: "playwriter", prompt_name: "summarize", arguments: {...} })'
    };
  }
  
  if (operations.length > 1) {
    const provided = [
      tool_name && 'tool_name',
      resource_name && 'resource_name',
      prompt_name && 'prompt_name'
    ].filter(Boolean);
    
    return {
      success: false,
      error: `Multiple operations specified: ${provided.join(', ')}. Provide exactly one.`
    };
  }
  
  // Parse arguments if string
  let parsedArgs: Record<string, any> = {};
  if (args.arguments) {
    if (typeof args.arguments === 'string') {
      try {
        parsedArgs = JSON.parse(args.arguments);
      } catch (err) {
        return {
          success: false,
          error: `Failed to parse arguments JSON: ${err instanceof Error ? err.message : String(err)}`
        };
      }
    } else {
      parsedArgs = args.arguments;
    }
  }
  
  // In actual implementation, this would call the OpenCode MCP client
  // For now, return structure that shows what would be called
  
  try {
    // This is a placeholder - actual implementation would use:
    // const mcpClient = await getMcpClient(mcp_name);
    // 
    // if (tool_name) {
    //   const result = await mcpClient.callTool({ name: tool_name, arguments: parsedArgs });
    //   return { success: true, data: result };
    // }
    // if (resource_name) {
    //   const result = await mcpClient.readResource({ uri: resource_name });
    //   return { success: true, data: result };
    // }
    // if (prompt_name) {
    //   const result = await mcpClient.getPrompt({ name: prompt_name, arguments: parsedArgs });
    //   return { success: true, data: result };
    // }
    
    return {
      success: false,
      error: 'MCP client integration not yet implemented. This is a placeholder for the skill_mcp tool structure.'
    };
  } catch (err) {
    return {
      success: false,
      error: `MCP operation failed: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Get available MCP servers from OpenCode config
 */
export function getAvailableMcpServers(): string[] {
  // This would read from opencode.json in actual implementation
  // For now, return common MCP servers
  return [
    'context7',
    'duckduckgo-search',
    'gitlab',
    'playwriter'
  ];
}

/**
 * Format MCP server capabilities for agent prompt
 */
export function formatMcpServersForPrompt(): string {
  const servers = getAvailableMcpServers();
  
  const lines: string[] = [
    '## Connected MCP Servers',
    '',
    'Use `skill_mcp` tool to access MCP server capabilities:',
    ''
  ];
  
  const serverDescriptions: Record<string, { description: string; examples: string[] }> = {
    'context7': {
      description: 'Official documentation lookup for libraries and frameworks',
      examples: [
        'skill_mcp({ mcp_name: "context7", tool_name: "query-docs", arguments: { libraryId: "/react/react", query: "hooks best practices" } })'
      ]
    },
    'duckduckgo-search': {
      description: 'Web search for current information and research',
      examples: [
        'skill_mcp({ mcp_name: "duckduckgo-search", tool_name: "web_search", arguments: { query: "React 19 new features" } })'
      ]
    },
    'gitlab': {
      description: 'GitLab repository operations (MRs, issues, commits, projects)',
      examples: [
        'skill_mcp({ mcp_name: "gitlab", tool_name: "get_merge_request", arguments: { merge_request_iid: "123" } })',
        'skill_mcp({ mcp_name: "gitlab", tool_name: "get_project", arguments: { project_id: "my-org/my-repo" } })'
      ]
    },
    'playwriter': {
      description: 'Browser automation via Playwright (testing, scraping, screenshots)',
      examples: [
        'skill_mcp({ mcp_name: "playwriter", tool_name: "execute", arguments: { code: "await page.goto(\'https://example.com\'); await page.screenshot({ path: \'screenshot.png\' });" } })'
      ]
    }
  };
  
  for (const server of servers) {
    const info = serverDescriptions[server];
    if (info) {
      lines.push(`### ${server}`);
      lines.push(`${info.description}`);
      lines.push('');
      lines.push('```typescript');
      lines.push(...info.examples);
      lines.push('```');
      lines.push('');
    }
  }
  
  lines.push('**Benefits:**');
  lines.push('- Access external tools without loading them upfront');
  lines.push('- Lazy loading reduces token usage');
  lines.push('- Dynamic invocation based on task needs');
  
  return lines.join('\n');
}
