# Configuration Guide

PRO0 configuration is loaded from two locations and deep-merged:

- Global (all projects): `~/.config/opencode/pro0.json`
- Project override (current project): `.opencode/pro0.json`

Project config extends global config (it does not replace it).

For the full configuration reference (agents, specialists, verification, etc.), see `CONFIGURATION.md`.

## Skills Configuration

Bundled skills live under `skills.*`:

```json
{
  "skills": {
    "qmd": {
      "enabled": true,
      "searchMode": "bm25",
      "minScore": 0.3,
      "timeout": 30000,
      "mcp": { "enabled": false, "command": "qmd", "args": ["mcp"] }
    },
    "deepthink": {
      "enabled": true,
      "defaultMode": "auto",
      "maxIterations": 5,
      "subAgentModel": "github-copilot/claude-sonnet-4-5"
    }
  }
}
```

User guides:

- `docs/skills/qmd.md`
- `docs/skills/deepthink.md`
