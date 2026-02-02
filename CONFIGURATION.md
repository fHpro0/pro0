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
  "planner": {
    "model": "github-copilot/claude-sonnet-4-5",
    "temperature": 0.7
  },
  "executor": {
    "model": "github-copilot/claude-opus-4-5",
    "temperature": 0.3,
    "max_retry_on_test_failure": 3
  },
  "specialists": {
    "styling": {
      "enabled": true,
      "model": "github-copilot/gemini-2.0-flash-exp",
      "temperature": 0.4
    },
    "security": {
      "enabled": true,
      "model": "github-copilot/claude-sonnet-4-5",
      "temperature": 0.2
    },
    "testing": {
      "enabled": true,
      "model": "github-copilot/claude-sonnet-4-5",
      "temperature": 0.3
    },
    "docs": {
      "enabled": false,
      "model": "github-copilot/gpt-4o",
      "temperature": 0.5
    },
    "research": {
      "enabled": true,
      "model": "github-copilot/claude-sonnet-4-5",
      "temperature": 0.6
    }
  },
  "skills": {
    "auto_load": true,
    "disabled": []
  },
  "verification": {
    "run_tests_after_completion": true,
    "test_command": "npm test",
    "allow_partial_success": false,
    "regression_check": true
  }
}
```

## Available Agents

### Primary Agents (Tab-switchable)

1. **Planner** - Interview user, research, create execution plans
2. **Executor** - Execute plans, spawn specialists, run verification

### Specialist Subagents (@-mentionable)

- **@styling** - UI/UX, CSS, responsive design
- **@security** - Security reviews, vulnerability checks
- **@testing** - Unit tests, integration tests, coverage
- **@docs** - Documentation, README, API docs
- **@research** - External docs, OSS examples, best practices

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
Error: No model configured for agent 'planner'
```

Fix by editing `~/.config/opencode/pro0.json`:
```json
{
  "planner": {
    "model": "github-copilot/claude-sonnet-4-5"
  }
}
```

### Specialist Not Available

Check if enabled in `pro0.json`:
```json
{
  "specialists": {
    "docs": { "enabled": true, "model": "github-copilot/gpt-4o" }
  }
}
```

## Resources

- [PRO0 Specification](./PRO0_SPEC.md)
- [OpenCode Setup Guide](./README.opencode.md)
- [Project Summary](./PROJECT_SUMMARY.md)
