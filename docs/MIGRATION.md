# Migration Guide: QMD + Deepthink Skills

This guide explains how to enable the bundled QMD and Deepthink skills when upgrading to a PRO0 version that includes skills integration.

## 1) Update Configuration

PRO0 loads configuration from:

- Global: `~/.config/opencode/pro0.json`
- Project overrides: `.opencode/pro0.json`

Add a `skills` section (either file is fine):

```json
{
  "skills": {
    "qmd": {
      "enabled": false,
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
  }
}
```

Notes:

- QMD can be left disabled until `qmd` is installed.
- Deepthink is safe to enable immediately (no external dependency).

## 2) Install QMD (Optional)

If you want to use the QMD skill:

```bash
bun install -g qmd
# or
npm install -g qmd
```

Initialize `qmd` in the directory you want to search:

```bash
cd ~/your-knowledge-base
qmd init
```

Then set `"skills.qmd.enabled": true`.

## 3) No Code Changes Required

Skills are bundled with the PRO0 OpenCode plugin. Once enabled in config, they are available to all agents.

## 4) Test the Skills

In an OpenCode session:

- QMD:
  - "search my notes for incident response"
  - "find in docs about auth flow"

- Deepthink:
  - "Why did Y happen?"
  - "Compare X vs Y and explain tradeoffs"

You can also force a skill explicitly:

```ts
skill_router({ query: "search my notes for deployment checklist", force_skill: "qmd" })
skill_router({ query: "Why did the Roman Empire fall?", force_skill: "deepthink" })
```

## 5) Reminder: No Auto-Commit

PRO0 agents follow a strict policy: they do not create git commits unless you explicitly ask.
