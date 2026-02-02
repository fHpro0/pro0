# PRO0 for OpenCode

> A simpler, better agent harness for OpenCode - alternative to oh-my-opencode

**PRO0** integrates seamlessly with OpenCode, providing two powerful agents (Planner + Executor) and five specialist subagents.

## Quick Install

### Option 1: NPM Package (Recommended)

```bash
npm install pro0
```

Then add to your OpenCode config (`.opencode/opencode.json` or `~/.config/opencode/opencode.json`):

```json
{
  "plugins": ["pro0"]
}
```

### Option 2: Local Installation

Clone or copy the `agents/` directory:

```bash
mkdir -p ~/.config/opencode/plugins/pro0
cp -r agents ~/.config/opencode/plugins/pro0/
```

Create plugin entry:

```javascript
// ~/.config/opencode/plugins/pro0/index.js
export { default } from 'pro0/plugin';
```

## Configuration

PRO0 uses `pro0.json` config files (NOT `oh-my-opencode.json`).

### Auto-Setup (First Run)

On first use, PRO0 auto-creates `~/.config/opencode/pro0.json` with these defaults:

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

### Project-Specific Config (Optional)

Create `.opencode/pro0.json` in your project to override specific settings:

```json
{
  "executor": {
    "temperature": 0.1
  },
  "specialists": {
    "docs": { "enabled": true }
  }
}
```

**Deep merge**: Project config extends global config (doesn't replace).

### Model Configuration

PRO0 uses **strict model enforcement** - no fallbacks. If a model is missing, you'll get a clear error.

Set models using environment variables in agent definitions:

```markdown
---
model: $PRO0_PLANNER_MODEL
---
```

To customize, edit your `pro0.json`:

```json
{
  "planner": {
    "model": "anthropic/claude-3-5-sonnet-20250219"
  }
}
```

## Usage

### Two Primary Agents

Switch between agents using **Tab key** in OpenCode:

#### 1. Planner Agent

Interviews you, researches requirements, creates detailed execution plan.

**When to use**:
- Starting a new feature
- Planning complex refactoring
- Need structured breakdown of work

**Example**:
```
You: "Add user authentication to my Express app"

Planner:
- Uses `askquestion` tool to gather preferences (JWT vs session? OAuth? Token expiration?)
- Spawns @research to find best practices
- Explores existing codebase patterns
- Creates plan in .pro0/plans/2025-02-02-add-auth.md
```

#### 2. Executor Agent

Takes a plan, executes tasks in loop, spawns specialists, runs verification.

**When to use**:
- After Planner creates a plan
- Ready to implement planned work
- Want automated testing after changes

**Example**:
```
You: [Switch to Executor, run: /execute 2025-02-02-add-auth.md]

Executor:
- Reads plan tasks
- Implements auth middleware
- @security reviews for vulnerabilities
- @testing writes unit tests
- Runs npm test
- Reports completion
```

### Five Specialist Subagents

Invoke with @mentions:

| Specialist | Use For | Example |
|------------|---------|---------|
| `@styling` | UI/UX, CSS, responsive design | `@styling Make this form mobile-friendly` |
| `@security` | Security reviews, vulnerability checks | `@security Review this auth code` |
| `@testing` | Write/update tests | `@testing Add tests for login endpoint` |
| `@docs` | Documentation, README, API docs | `@docs Document the new API endpoints` |
| `@research` | External docs, OSS examples | `@research Find JWT best practices` |

**Enable/disable specialists** in your `pro0.json`:

```json
{
  "specialists": {
    "docs": { "enabled": false }
  }
}
```

## Workflow Example

### Typical Feature Implementation

1. **Switch to Planner** (Tab key)
   ```
   You: "Add password reset functionality"
   
   Planner: 
   - What email service? (SendGrid, Mailgun, SMTP?)
   - Token expiration time? (default: 1 hour)
   - @research finds best practices
   - Creates plan with 6 tasks
   ```

2. **Switch to Executor** (Tab key)
   ```
   Executor:
   - Task 1: Generate reset tokens ✓
   - Task 2: Create /forgot-password endpoint ✓
     @security reviews for timing attacks
   - Task 3: Create /reset-password endpoint ✓
     @testing writes unit tests
   - Task 4: Send reset emails ✓
   - Task 5: Add rate limiting ✓
   - Task 6: Update docs ✓
     @docs creates API documentation
   
   Verification:
   - npm test → ✅ All 67 tests passed (8 new)
   - No regressions detected
   ```

## Key Features

### ✅ Simplicity
Only 2 core agents vs 10+ in oh-my-opencode. Clear separation of concerns.

### ✅ Strict Model Enforcement
No fallback models = no surprises. Explicit configuration required.

```
Error: No model configured for agent 'planner'.
Please set 'planner.model' in pro0.json
```

### ✅ Built-in Verification
Always runs tests after changes. Catches regressions automatically.

```json
{
  "verification": {
    "run_tests_after_completion": true,
    "test_command": "npm test",
    "regression_check": true
  }
}
```

### ✅ Security First
Every agent prompt includes `.env` safety warnings. Built-in checks prevent reading secrets.

### ✅ Auto-Loaded Skills
Just drop skills in `~/.config/opencode/skills/` or `.opencode/skills/` - they're auto-discovered.

## Configuration Reference

### Full Config Schema

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

### Config File Locations

- **Global**: `~/.config/opencode/pro0.json` (auto-created)
- **Project**: `.opencode/pro0.json` (optional)

### Skills System

Skills are auto-loaded from:
- `~/.config/opencode/skills/`
- `.opencode/skills/`

**Disable specific skills**:

```json
{
  "skills": {
    "disabled": ["old-skill", "deprecated-tool"]
  }
}
```

## CLI Commands

```bash
# Show current config
npx pro0 config

# Show config paths
npx pro0 config -g  # Global config path
npx pro0 config -p  # Project config path

# List installed skills
npx pro0 skills

# List all plans
npx pro0 plans

# Initialize PRO0 in project
npx pro0 init
```

## Comparison: PRO0 vs oh-my-opencode

| Feature | oh-my-opencode | PRO0 |
|---------|----------------|------|
| **Agents** | 10+ agents | 2 core + 5 specialists |
| **Config file** | `oh-my-opencode.json` | `pro0.json` |
| **Model fallback** | 3-step provider chain | **Strict: error if missing** |
| **Skills** | Explicit config | **Auto-scan + blacklist** |
| **Verification** | Optional hooks | **Built-in, always runs** |
| **Complexity** | High | **Low** |
| **.env protection** | Not emphasized | **Built-in warnings + checks** |
| **Auto-setup** | Manual config required | **Auto-creates global config** |

## Troubleshooting

### Plugin Not Loading

Check OpenCode config includes PRO0:

```json
{
  "plugins": ["pro0"]
}
```

Restart OpenCode after adding plugin.

### Model Not Configured Error

```
Error: No model configured for agent 'executor'
```

**Fix**: Edit `~/.config/opencode/pro0.json` and set the model:

```json
{
  "executor": {
    "model": "github-copilot/claude-opus-4-5"
  }
}
```

### Specialist Not Available

If `@docs` isn't working, check if it's enabled:

```json
{
  "specialists": {
    "docs": { "enabled": true, "model": "github-copilot/gpt-4o" }
  }
}
```

### Tests Not Running After Execution

Check verification config:

```json
{
  "verification": {
    "run_tests_after_completion": true,
    "test_command": "npm test"
  }
}
```

## License

MIT

## Contributing

PRs welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Resources

- [Full Specification](./PRO0_SPEC.md)
- [Quick Start Guide](./QUICKSTART.md)
- [OpenCode Documentation](https://opencode.ai/docs)
