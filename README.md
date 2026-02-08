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

## Skills

PRO0 includes two bundled skills for enhanced agent capabilities. Skills are automatically routed via the `skill_router` tool (used internally by PRO0 agents), and can also be invoked explicitly.

### 🔍 QMD Skill

Search your local markdown knowledge base using the external `qmd` CLI tool.

Installation:

```bash
# Install qmd globally
bun install -g qmd
# or
npm install -g qmd
```

Configuration (add to `~/.config/opencode/pro0.json` or `.opencode/pro0.json`):

```json
{
  "skills": {
    "qmd": {
      "enabled": true,
      "searchMode": "bm25",
      "minScore": 0.3,
      "timeout": 30000,
      "mcp": {
        "enabled": false
      }
    }
  }
}
```

Usage:

- Auto-detected for queries like: "search my notes for X", "find in docs about Y", "check knowledge base for Z"
- Explicit via tool call:

```ts
skill_router({ query: "search my notes for authentication patterns" })
```

Internal API (PRO0 contributors):

```ts
import { executeQmdSearch } from "./src/skills/bundled/qmd/executor";

const results = await executeQmdSearch("authentication patterns", {
  mode: "bm25",
  minScore: 0.3,
});
```

---

### 🧠 Deepthink Skill

Deep analytical reasoning with a 14-step workflow for complex questions.

Configuration:

```json
{
  "skills": {
    "deepthink": {
      "enabled": true,
      "defaultMode": "auto",
      "maxIterations": 5,
      "subAgentModel": "github-copilot/claude-sonnet-4-5"
    }
  }
}
```

Modes:

- Quick mode (7 steps): for moderate complexity questions
- Full mode (14 steps): for highly complex, multi-domain analysis with sub-agents
- Auto mode (recommended): Step 3 decides Quick vs Full based on complexity

Usage:

- Auto-detected for analytical queries like: "Why did X happen?", "Compare X vs Y", "How does X work and what are the implications?"
- Explicit via tool call:

```ts
skill_router({ query: "Why did the Roman Empire fall?", force_skill: "deepthink" })
```

Internal API (PRO0 contributors):

```ts
import { executeDeepthink } from "./src/skills/bundled/deepthink";

const analysis = await executeDeepthink("Why did the Roman Empire fall?", "auto");
```

Guides:

- `docs/skills/qmd.md`
- `docs/skills/deepthink.md`

See `docs/configuration.md` for configuration file locations and all options.


## Installation

### As OpenCode Plugin (Recommended)

1. Install the plugin:

```bash
npm install -g pro0
# or
bun add -g pro0
```

2. Configure OpenCode to use PRO0 agents (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["pro0"],
  "default_agent": "proPlanner"
}
```

This configuration:
- Loads the PRO0 plugin (adds 8 agents: proPlanner, proExecutor + 6 specialists)
- Sets `proPlanner` as the default agent

3. Start using OpenCode:

```bash
cd your-project
opencode
```

You should now see **proPlanner** as the active agent in the UI!

4. Switch between agents:
   - **Tab** key: Cycle through all primary agents (`proPlanner` ↔ `proExecutor` ↔ `build` ↔ `plan`)
   - **@ mention**: Invoke specialists (`@styling`, `@security`, `@testing`, `@docs`, `@research`, `@self-review`)

**Note:** PRO0 agents coexist with OpenCode's built-in agents. You can switch between them using Tab. If you only want PRO0 agents, you can disable the built-in ones:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["pro0"],
  "default_agent": "proPlanner",
  "agent": {
    "build": { "disable": true },
    "plan": { "disable": true }
  }
}
```

This disables `build` and `plan` while keeping PRO0's `proPlanner` and `proExecutor`.

### As Standalone Package

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
  "proPlanner": {
    "model": "github-copilot/claude-opus-4-5",
    "temperature": 0.7
  },
  "proManager": {
    "model": "github-copilot/claude-sonnet-4-5",
    "temperature": 0.3
  }
}
```

### 2. Use in Your Code

```typescript
import { loadConfig, PLANNER_PROMPT, EXECUTOR_PROMPT } from 'pro0';

const config = loadConfig(process.cwd());
console.log('Planner model:', config.proPlanner.model);
console.log('Manager model:', config.proManager.model);
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
Error: No model configured for agent 'proPlanner'.
Please set 'proPlanner.model' in ~/.config/opencode/pro0.json or .opencode/pro0.json
```

## Custom Skills System

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
