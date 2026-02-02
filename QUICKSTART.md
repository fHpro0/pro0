# PRO0 Quick Start Guide

## 5-Minute Setup

### Step 1: Install (when published)

```bash
npm install -g pro0
# or
bun add -g pro0
```

### Step 2: Initialize Your Project

```bash
cd your-project
pro0 init
```

This creates:
- `~/.config/opencode/pro0.json` (global config)
- `.opencode/` (project config directory)
- `.pro0/plans/` (plan storage)

### Step 3: Review Configuration

```bash
pro0 config
```

Default config uses GitHub Copilot models:
- Planner: `claude-sonnet-4-5`
- Executor: `claude-opus-4-5`
- Specialists: Mix of `gemini-2.0-flash-exp`, `claude-sonnet-4-5`, `gpt-4o`

**Edit if needed:**
```bash
# Global config (all projects)
code ~/.config/opencode/pro0.json

# Project config (this project only)
code .opencode/pro0.json
```

### Step 4: Use PRO0

**In code:**

```typescript
import {
  loadConfig,
  PLANNER_PROMPT,
  EXECUTOR_PROMPT,
  getSpecialistPrompt,
  savePlan,
  runTests
} from 'pro0';

// Load config
const config = loadConfig(process.cwd());

// Use agent prompts
console.log(PLANNER_PROMPT);
console.log(EXECUTOR_PROMPT);
console.log(getSpecialistPrompt('security'));

// Create a plan
const planPath = savePlan(
  process.cwd(),
  'My Feature',
  '# My Feature\n\n## Tasks\n1. Do thing\n2. Test thing'
);

// Run verification
const result = await runTests(config, process.cwd());
if (!result.passed) {
  console.error('Tests failed:', result.output);
}
```

**Via CLI:**

```bash
# Show current config
pro0 config

# List installed skills
pro0 skills

# List all plans
pro0 plans
```

## Common Tasks

### Configure a Different Model

Edit `~/.config/opencode/pro0.json`:

```json
{
  "planner": {
    "model": "anthropic/claude-opus-4",
    "temperature": 0.7
  }
}
```

### Disable a Specialist

Edit config:

```json
{
  "specialists": {
    "docs": {
      "enabled": false,
      "model": "github-copilot/gpt-4o"
    }
  }
}
```

### Add a Custom Skill

1. Create skill directory:
   ```bash
   mkdir -p ~/.config/opencode/skills/my-skill/prompts
   ```

2. Create `skill.json`:
   ```json
   {
     "name": "my-skill",
     "version": "1.0.0",
     "description": "Does something useful",
     "prompts": ["prompts/prompt.md"]
   }
   ```

3. Create `prompts/prompt.md`:
   ```markdown
   You are a specialist in X. When called, you should...
   ```

4. Verify:
   ```bash
   pro0 skills
   ```

### Change Test Command

Edit config:

```json
{
  "verification": {
    "test_command": "pnpm test",
    "allow_partial_success": true
  }
}
```

### Project-Specific Overrides

Create `.opencode/pro0.json` in your project:

```json
{
  "executor": {
    "model": "openai/gpt-4-turbo"
  },
  "verification": {
    "test_command": "make test"
  }
}
```

This **extends** the global config (doesn't replace it).

## Troubleshooting

### "No model configured for agent X"

Fix: Edit `~/.config/opencode/pro0.json` and add the missing model:

```json
{
  "planner": {
    "model": "your-provider/model-name"
  }
}
```

### Skills Not Loading

Check:
1. Skill directory exists: `~/.config/opencode/skills/`
2. Skill has valid `skill.json`
3. Skill is not in disabled list

Debug:
```bash
pro0 skills
```

### Tests Failing After Execution

Check:
1. Test command is correct: `pro0 config | grep test_command`
2. Tests pass manually: Run the test command yourself
3. Max retries not exceeded (default: 3)

## Security Reminder

**NEVER read .env files.** All PRO0 agent prompts include this warning:

```
⚠️ **SECURITY WARNING: NEVER READ .env FILES** ⚠️
```

If you need environment configuration:
- Ask the user which variables are needed
- Refer to `.env.example` for structure
- Request non-sensitive values from user

## Next Steps

- Read full [README.md](./README.md) for detailed documentation
- Review [PRO0_SPEC.md](./PRO0_SPEC.md) for architecture details
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) for development guide

## Getting Help

- Open an issue on GitHub
- Check existing plans: `pro0 plans`
- Review config: `pro0 config`
