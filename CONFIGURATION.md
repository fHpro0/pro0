# PRO0 Configuration Guide

## Complete OpenCode Setup

PRO0 has **replaced** oh-my-opencode in this environment. All agent functionality is now provided by PRO0.

### Global Configuration

**File**: `~/.config/opencode/opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-openai-codex-auth",
    "pro0",
    "./plugins/copilot-profile-switcher"
  ],
  "mcp": {
    "gitlab": {
      "type": "local",
      "command": ["bunx", "-y", "@zereight/mcp-gitlab"],
      "environment": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "glpat-...",
        "GITLAB_API_URL": "https://gitlab.tmt.de/api/v4",
        "GITLAB_READ_ONLY_MODE": "true"
      }
    },
    "playwriter": {
      "type": "local",
      "command": ["bunx", "-y", "playwriter@latest"]
    }
  },
  "permission": {
    "bash": {
      "*": "allow",
      "rm*": "ask",
      "cat*": "ask"
    },
    "read": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny",
      "*.env.example": "allow"
    }
  },
  "autoupdate": true
}
```

### PRO0 Agent Configuration

**File**: `~/.config/opencode/pro0.json` (auto-created on first run)

```json
{
  "$schema": "https://raw.githubusercontent.com/YOUR_REPO/main/pro0.schema.json",
  "proPlanner": {
    "model": "github-copilot/claude-opus-4-5",
    "temperature": 0.7
  },
  "proManager": {
    "model": "github-copilot/claude-sonnet-4-5",
    "temperature": 0.3,
    "max_retry_on_test_failure": 3
  },
  "skills": {
    "auto_load": true,
    "disabled": [],
    "qmd": {
      "enabled": true,
      "searchMode": "bm25",
      "minScore": 0.3,
      "timeout": 30000,
      "mcp": { "enabled": false }
    },
    "deepthink": {
      "enabled": true,
      "defaultMode": "auto",
      "maxIterations": 5,
      "subAgentModel": "github-copilot/claude-sonnet-4-5"
    }
  },
  "verification": {
    "run_tests_after_completion": true,
    "test_command": "npm test",
    "allow_partial_success": false,
    "regression_check": true
  }
}
```

## MCP Tool Budget Management

OpenCode loads MCP tool schemas for **all enabled tools on every request**. When PRO0 (14 agents + 5 built-in tools) is used alongside multiple MCP servers, this can push requests over the model token limit.

**The Problem**: MCP tool schemas can consume ~80-100K tokens when many servers/tools are enabled (e.g., GitLab 30+ tools, Playwriter 10+, Context7 2, DuckDuckGo 1). Combined with PRO0 agent prompts, this can exceed the 200K context window.

**Solution**: Disable MCP tools globally in `~/.config/opencode/opencode.json`, then re-enable only what you need per project (or per agent).

Tool IDs follow the naming convention `{mcp-server-name}_{tool-name}` (underscore separator), and the `tools` key supports wildcard patterns.

**Global Config Example** (add `tools` at the root of `~/.config/opencode/opencode.json`):
```json
{
  "tools": {
    "gitlab_*": false,
    "playwriter_*": false,
    "context7_*": false,
    "duckduckgo-search_*": false
  }
}
```

**Per-Project Enable Example** (project-level `opencode.json`):
```json
{
  "tools": {
    "gitlab_*": true
  }
}
```

**Per-Agent Enable Example** (enable only for specific agents):
```json
{
  "agent": {
    "proManager": {
      "tools": {
        "gitlab_*": true
      }
    }
  }
}
```

Note: `tools` supports wildcards (e.g. `gitlab_*`) and OpenCode merges global + per-project config; the project config overrides/extends the global defaults.

## Available Agents

### Primary Agents (Tab-switchable)

1. **proPlanner** - Interview user, research, create execution plans
2. **proManager** - Orchestrate execution by delegating work to specialists

### Specialist Subagents (@-mentionable)

- **@designer** - UI/UX, CSS, component styling/layout
- **@frontend-coder** - React/Vue logic, state, hooks
- **@backend-coder** - Business logic, services, algorithms
- **@database-coder** - Schema design, migrations, query work
- **@api-coder** - REST/GraphQL endpoints, routing, validation
- **@tester** - Unit/integration/E2E tests
- **@security-auditor** - Security review, vulnerabilities
- **@devops-engineer** - CI/CD, deployment, infra
- **@documentation-writer** - README, guides, API docs
- **@document-viewer** - Read/analyze existing docs
- **@researcher** - External docs, OSS examples
- **@self-review** - Final quality review

## Key Differences from oh-my-opencode

| Feature | oh-my-opencode | PRO0 |
|---------|----------------|------|
| **Agents** | 10+ agents (Sisyphus, Oracle, etc.) | 2 core + 5 specialists |
| **Config file** | `oh-my-opencode.json` | `pro0.json` |
| **Model fallback** | 3-step provider chain | **Strict: fail if missing** |
| **Skills** | Explicit config | **Auto-scan directories** |
| **Verification** | Optional hooks | **Built-in, always runs** |
| **Complexity** | High | **Low** |

## Migration from oh-my-opencode

PRO0 is now the active plugin. To complete migration:

1. ✅ Update `opencode.json` plugin list (replace `oh-my-opencode@latest` with `pro0`)
2. ✅ Create `~/.config/opencode/pro0.json` for agent configs
3. ✅ Remove old `~/.config/opencode/oh-my-opencode.json` (if exists)
4. Test agents: Switch to Planner/Executor with Tab key

## Troubleshooting

### Plugin Not Loading

Verify `opencode.json` includes PRO0:
```json
{
  "plugin": ["pro0"]
}
```

### Model Configuration Errors

PRO0 uses **strict model enforcement**. If you see:
```
Error: No model configured for agent 'proPlanner'
```

Fix by editing `~/.config/opencode/pro0.json`:
```json
{
  "proPlanner": {
    "model": "github-copilot/claude-opus-4-5"
  }
}
```

### Specialist Not Available

Check if enabled in `pro0.json`:
```json
{
  "specialists": {
    "documentation-writer": { "enabled": true, "model": "github-copilot/gpt-5.2" }
  }
}
```

## Resources

- [PRO0 Specification](./PRO0_SPEC.md)
- [OpenCode Setup Guide](./README.opencode.md)
- [Project Summary](./PROJECT_SUMMARY.md)
