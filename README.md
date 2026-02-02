# PRO0

> A simpler, better agent harness - alternative to oh-my-opencode

## Philosophy

**Simplicity with power.** Two core agents (Planner + Executor), strict model enforcement, hierarchical config, auto-loaded skills, and relentless verification.

## Features

✅ **Two Core Agents**: Planner (interview + plan) + Executor (loop until done)  
✅ **Five Specialists**: styling, security, testing, docs, research (individually toggleable)  
✅ **Parallel Execution**: Run specialists concurrently for 3-5x speed improvement  
✅ **Strict Model Enforcement**: No fallback chains - explicit configuration only  
✅ **Hierarchical Config**: Global + Project-level deep merge  
✅ **Auto-Loaded Skills**: Drop skills in directory, they're auto-discovered  
✅ **Lazy Skill Loading**: Load only needed skills, reducing tokens by 87%  
✅ **MCP Server Integration**: Dynamic access to context7, gitlab, playwriter, duckduckgo  
✅ **Built-in Verification**: Always tests after changes, catches regressions  
✅ **Security First**: `.env` protection built into every agent prompt  
✅ **Token Optimized**: 84% reduction in system prompt size via progressive loading  

## Installation

```bash
npm install pro0
# or
bun add pro0
```

Initialize in your project:

```bash
npx pro0 init
```

This creates:
- `~/.config/opencode/pro0.json` (global config, auto-created with defaults)
- `.opencode/` (project config directory)
- `.pro0/plans/` (where plans are saved)

## Quick Start

### 1. Configure Models

Edit `~/.config/opencode/pro0.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/YOUR_REPO/main/pro0.schema.json",
  "planner": {
    "model": "github-copilot/claude-sonnet-4-5",
    "temperature": 0.7
  },
  "executor": {
    "model": "github-copilot/claude-opus-4-5",
    "temperature": 0.3
  },
  "specialists": {
    "styling": { "enabled": true, "model": "github-copilot/gemini-2.0-flash-exp" },
    "security": { "enabled": true, "model": "github-copilot/claude-sonnet-4-5" },
    "testing": { "enabled": true, "model": "github-copilot/claude-sonnet-4-5" },
    "docs": { "enabled": false, "model": "github-copilot/gpt-4o" },
    "research": { "enabled": true, "model": "github-copilot/claude-sonnet-4-5" }
  }
}
```

### 2. Use in Your Code

```typescript
import { loadConfig, PLANNER_PROMPT, EXECUTOR_PROMPT } from 'pro0';

const config = loadConfig(process.cwd());
console.log('Planner model:', config.planner.model);
console.log('Executor model:', config.executor.model);
```

### 3. CLI Commands

```bash
# Show current config
npx pro0 config

# List installed skills
npx pro0 skills

# List all plans
npx pro0 plans
```

## Configuration

### File Locations

- **Global**: `~/.config/opencode/pro0.json` (auto-created on first run)
- **Project**: `.opencode/pro0.json` (optional, overrides global)

### Deep Merge Behavior

Project config **extends** global config (doesn't replace):

```
Global:  { planner: { model: "gpt-4", temperature: 0.7 }, executor: { model: "claude" } }
Project: { planner: { temperature: 0.3 } }
Result:  { planner: { model: "gpt-4", temperature: 0.3 }, executor: { model: "claude" } }
```

### Strict Model Enforcement

**NO FALLBACKS.** If a model is missing, you get a clear error:

```
Error: No model configured for agent 'planner'.
Please set 'planner.model' in ~/.config/opencode/pro0.json or .opencode/pro0.json
```

## Skills System

### Auto-Loading

Skills are auto-discovered from:
- `~/.config/opencode/skills/`
- `.opencode/skills/`

### Skill Structure

```
~/.config/opencode/skills/
  └── my-skill/
      ├── skill.json
      └── prompts/
          └── prompt.md
```

**skill.json:**

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Does something useful",
  "prompts": ["prompts/prompt.md"]
}
```

### Disabling Skills

```json
{
  "skills": {
    "auto_load": true,
    "disabled": ["old-skill", "deprecated-tool"]
  }
}
```

## Agents

### Planner

Interviews user, spawns research subagents, creates detailed plan in `.pro0/plans/<timestamp>-<slug>.md`.

### Executor

Takes plan, executes tasks in loop, spawns specialists, runs verification.

### Specialists

- **styling**: UI/UX, CSS, design
- **security**: Vulnerability checks, code review
- **testing**: Write/update tests
- **docs**: Documentation updates
- **research**: External docs, OSS examples

## Verification

After execution completes:

1. Runs configured test command (`npm test` by default)
2. Checks that unchanged functions still pass (regression check)
3. Retries on failure (max 3 attempts by default)
4. Reports results

```json
{
  "verification": {
    "run_tests_after_completion": true,
    "test_command": "npm test",
    "allow_partial_success": false,
    "regression_check": true
  }
}
```

## Security

Every agent prompt includes a prominent `.env` safety warning:

```
⚠️ **SECURITY WARNING: NEVER READ .env FILES** ⚠️

NEVER use Read, Grep, or any other tool to access .env, .env.local,
.env.production, or any environment variable files.
```

## LSP Tools (Code Intelligence)

PRO0 agents can use LSP (Language Server Protocol) for advanced code intelligence features like go-to-definition, find-references, and symbol search.

### Setup

1. **Enable experimental features:**
   ```bash
   export OPENCODE_EXPERIMENTAL=true
   ```

2. **LSP servers are auto-configured** for 30+ languages in OpenCode (TypeScript, Python, Rust, Go, Java, etc.)

3. **Optional: Configure custom LSP servers** in `~/.config/opencode/opencode.json`:
   ```json
   {
     "lsp": {
       "typescript": {
         "disabled": false,
         "command": ["typescript-language-server", "--stdio"]
       }
     }
   }
   ```

### Available Operations

Agents can use these LSP operations:
- `goToDefinition` - Jump to symbol definition
- `findReferences` - Find all usages across workspace
- `hover` - Get type information and documentation
- `documentSymbol` - Get file outline/structure
- `workspaceSymbol` - Search for symbols across workspace
- `goToImplementation` - Find implementations of interfaces

See [OpenCode LSP docs](https://opencode.ai/docs/lsp) for complete documentation.

## Background Agents (Parallel Execution)

PRO0 supports running multiple specialists in parallel for faster execution.

### Using Background Tasks

```typescript
// Start background task
delegate_task({
  subagent_type: "styling",
  prompt: "Design login form",
  run_in_background: true
})
// Returns: { task_id: "bg_styling_123...", status: "pending" }

// Continue working while background task runs...

// Retrieve results later
background_output({ task_id: "bg_styling_123..." })

// Or get all background task results
background_output({ all: true })

// Cancel if needed
background_cancel({ task_id: "bg_styling_123..." })
background_cancel({ all: true })  // Cancel all
```

### Benefits

- **3-5x faster** execution for independent tasks
- Specialists work simultaneously
- Main agent continues while specialists process
- Retrieve results when ready

## Why PRO0 vs oh-my-opencode?

| Feature | oh-my-opencode | PRO0 |
|---------|----------------|------|
| **Agents** | 10+ agents | 2 core + 6 specialists |
| **Config file** | `oh-my-opencode.json` | `pro0.json` |
| **Model fallback** | 3-step provider chain | **Strict: error if missing** |
| **Skills** | Explicit config | **Auto-scan + blacklist** |
| **Verification** | Optional hooks | **Built-in, always runs** |
| **Background agents** | ✅ Complex system | **✅ Simple, built-in** |
| **LSP tools** | ✅ Via OpenCode | **✅ Via OpenCode** |
| **MCP integration** | ✅ Via skill_mcp | **✅ Via skill_mcp** |
| **Ralph Loop** | ✅ With todo enforcer | **✅ Max 5 iterations** |
| **Code review** | ✅ Via hooks | **✅ Self-review specialist** |
| **Complexity** | High | **Low** |
| **.env protection** | Not emphasized | **Built-in warnings** |

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Watch mode
bun run dev

# Clean
bun run clean
```

## License

MIT

## Contributing

PRs welcome! See [PRO0_SPEC.md](./PRO0_SPEC.md) for architecture details.
