# QMD Skill Guide

## Overview

The QMD skill lets PRO0 agents search local Markdown notes/docs using the external `qmd` CLI.

This is ideal for searching a personal knowledge base, team runbooks, ADRs, or a docs repo.

## Prerequisites

Install `qmd` globally:

```bash
bun install -g qmd
# or
npm install -g qmd
```

Verify installation:

```bash
qmd --version
```

## Setup

1. Create (or pick) the directory that contains your Markdown knowledge base.
2. Initialize `qmd` in that directory:

```bash
cd ~/my-notes
qmd init
```

3. Start OpenCode in (or pointed at) the directory you want to search.

QMD runs in the current working directory. If you want to search `~/my-notes`, start OpenCode in that folder, or make it your workspace.

## Enable in PRO0

Add this to `~/.config/opencode/pro0.json` (global) or `.opencode/pro0.json` (project override):

```json
{
  "skills": {
    "qmd": {
      "enabled": true,
      "searchMode": "bm25",
      "minScore": 0.3,
      "timeout": 30000,
      "mcp": {
        "enabled": false,
        "command": "qmd",
        "args": ["mcp"]
      }
    }
  }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the QMD skill |
| `searchMode` | string | `"bm25"` | Search mode: `bm25`, `semantic`, `hybrid` |
| `minScore` | number | `0.3` | Minimum relevance score (0-1) |
| `timeout` | number | `30000` | Command timeout in milliseconds |
| `mcp.enabled` | boolean | `false` | Enable MCP server registration for QMD |
| `mcp.command` | string | `"qmd"` | Command used to start MCP server |
| `mcp.args` | string[] | `["mcp"]` | Args used to start MCP server |

## Search Modes

### BM25 (Default, Fast)

- Keyword-based search
- Fast and predictable
- Best for exact term matches

### Semantic (Slow)

- Similarity-based matching
- Better when you don't remember exact keywords
- Slower execution

### Hybrid (Slowest)

- Combines BM25 + semantic signals
- Best accuracy
- Slowest execution

## Usage

### Auto-detection

QMD is automatically triggered for queries like:

- "search my notes for X"
- "find in docs about Y"
- "check knowledge base for Z"
- Anything explicitly mentioning "qmd"

### Explicit invocation (OpenCode tool)

You can also call the router explicitly:

```ts
skill_router({ query: "search my notes for deployment checklist", force_skill: "qmd" })
```

The tool returns a formatted summary of top matches.

## Troubleshooting

### "qmd not found"

```bash
which qmd
npm install -g qmd
```

Make sure your global install directory is on `PATH` (restart your terminal/OpenCode after installing).

### No results

- Lower `minScore` (e.g. `0.1`)
- Use `searchMode: "semantic"` or `"hybrid"`
- Rebuild your index if your knowledge base changed (exact command depends on your `qmd` version; common options are `qmd rebuild` or re-running init/indexing steps)

### Timeouts

- Increase `timeout`
- Use `searchMode: "bm25"`
- Search a smaller subset (run OpenCode in a narrower directory)

## MCP Server (Optional)

If you want to run QMD via MCP (instead of spawning the CLI directly), enable MCP registration:

```json
{
  "skills": {
    "qmd": {
      "mcp": {
        "enabled": true,
        "command": "qmd",
        "args": ["mcp"]
      }
    }
  }
}
```

Restart OpenCode after changing MCP settings.

## Developer API (PRO0 contributors)

Inside this repository, the QMD skill exposes helpers:

- `executeQmdSearch(query, options)`
- `executeQmdGet(path, options)`
- `checkQmdInstalled()`

See `src/skills/bundled/qmd/executor.ts`.
