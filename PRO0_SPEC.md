# PRO0 - A Simpler, Better Agent Harness

> **Philosophy**: Simplicity with power. Two core agents (Planner + Executor), strict model enforcement, hierarchical config, auto-loaded skills, and relentless verification.

---

## Core Architecture

### Agents

**TWO PRIMARY AGENTS:**

1. **Planner** (`planner`)
   - Interviews user about requirements
   - Spawns research subagents (optional) to explore codebase, documentation, best practices
   - Creates TODO/PRD document in `.pro0/plans/<timestamp>-<slug>.md`
   - Output: Structured plan with acceptance criteria, tasks, and guardrails

2. **Executor** (`executor`)
   - Takes plan from Planner
   - Executes tasks in loop until all TODOs complete
   - Spawns specialist subagents (configurable):
     - `styling`: UI/UX, CSS, design work
     - `security`: Security review, vulnerability checks
     - `testing`: Write/update unit tests, integration tests
     - `docs`: Documentation creation/updates
     - `research`: External documentation, OSS examples lookup
   - Post-completion: Runs verification loop (unit tests + functional tests)
   - Ensures unchanged functions still work (regression prevention)

**SPECIALIST SUBAGENTS:**

All specialists can be individually enabled/disabled in config:

```json
{
  "specialists": {
    "styling": { "enabled": true, "model": "github-copilot/gemini-2.0-flash-exp" },
    "security": { "enabled": true, "model": "github-copilot/claude-sonnet-4-5" },
    "testing": { "enabled": true, "model": "github-copilot/claude-sonnet-4-5" },
    "docs": { "enabled": false, "model": "github-copilot/gpt-4o" },
    "research": { "enabled": true, "model": "github-copilot/claude-sonnet-4-5" }
  }
}
```

---

## Configuration System

### File Locations & Precedence

**Config files are named `pro0.json` (NOT oh-my-opencode.json)**

Load order (deep merge):
1. **Global config**: `~/.config/opencode/pro0.json` (auto-created on first run if missing)
2. **Project config**: `.opencode/pro0.json` (in project root, overrides/extends global)

**Deep Merge Behavior:**
- Global config provides defaults
- Project config overrides specific keys, inherits unspecified keys from global
- Example:
  - Global: `{ "planner": { "model": "gpt-4", "temperature": 0.7 }, "executor": { "model": "claude-opus" } }`
  - Project: `{ "planner": { "temperature": 0.3 } }`
  - **Result**: `{ "planner": { "model": "gpt-4", "temperature": 0.3 }, "executor": { "model": "claude-opus" } }`

### Auto-Creation of Global Config

On first run, if `~/.config/opencode/pro0.json` doesn't exist:
- Automatically create it with copilot placeholder models
- User can edit later to customize

**Default generated config:**

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
    "styling": {
      "enabled": true,
      "model": "github-copilot/gemini-2.0-flash-exp"
    },
    "security": {
      "enabled": true,
      "model": "github-copilot/claude-sonnet-4-5"
    },
    "testing": {
      "enabled": true,
      "model": "github-copilot/claude-sonnet-4-5"
    },
    "docs": {
      "enabled": false,
      "model": "github-copilot/gpt-4o"
    },
    "research": {
      "enabled": true,
      "model": "github-copilot/claude-sonnet-4-5"
    }
  },
  "skills": {
    "auto_load": true,
    "disabled": []
  },
  "verification": {
    "run_tests_after_completion": true,
    "test_command": "npm test",
    "allow_partial_success": false
  }
}
```

### Strict Model Enforcement

**NO FALLBACK MODELS.** If a model is not configured for an agent/specialist:
- **Fail immediately** with clear error message
- Error format: `Error: No model configured for agent 'planner'. Please set 'planner.model' in ~/.config/opencode/pro0.json or .opencode/pro0.json`
- Do not attempt to proceed with a default/fallback model

**Rationale:** User should explicitly choose models. No surprises, no silent degradation.

---

## Skills System

### Auto-Loading Behavior

**Scan directories for installed skills:**
- Global: `~/.config/opencode/skills/`
- Project: `.opencode/skills/`

**Loading logic:**
1. Scan both directories for skill manifests (`.skill.json` or similar)
2. Load all discovered skills by default
3. Respect `skills.disabled` list in config to exclude specific skills

**Example config to disable specific skills:**

```json
{
  "skills": {
    "auto_load": true,
    "disabled": ["legacy-formatter", "deprecated-linter"]
  }
}
```

**Skill directory structure example:**

```
~/.config/opencode/skills/
  ├── git-master/
  │   ├── skill.json
  │   └── prompts/
  ├── playwright/
  │   ├── skill.json
  │   └── prompts/
  └── custom-skill/
      ├── skill.json
      └── prompts/
```

---

## Agent Prompts & Safety

### CRITICAL: .env File Safety

**ALL agent system prompts MUST include this warning:**

```markdown
⚠️ **SECURITY WARNING: NEVER READ .env FILES** ⚠️

NEVER use Read, Grep, or any other tool to access .env, .env.local, .env.production, or any environment variable files.

These files contain secrets (API keys, passwords, database credentials) that must NEVER be exposed to LLM context.

If you need environment configuration:
- Ask the user which variables are needed
- Refer to .env.example (if it exists) for structure
- Request user to provide non-sensitive config values

**Violation of this rule is a critical security breach.**
```

This warning should appear:
- At the top of every agent's system prompt
- In the Planner's interview script
- In the Executor's task execution prompt
- In all specialist subagent prompts

### Planner Prompt Template

```markdown
You are the **Planner** agent for PRO0.

⚠️ **SECURITY WARNING: NEVER READ .env FILES** ⚠️
[... full warning text from above ...]

## Your Role

1. **Interview the user** to understand their requirements
   - Use the `askquestion` tool to gather clarifying information in a wizard-style interface
   - Identify scope, constraints, and acceptance criteria
   
2. **Spawn research subagents** (if needed)
   - Explore existing codebase patterns
   - Look up documentation for unfamiliar libraries
   - Find best practices and examples
   
3. **Create a detailed plan** in `.pro0/plans/<timestamp>-<slug>.md`
   - Break down work into atomic tasks
   - Define acceptance criteria for each task
   - Set guardrails (what NOT to do)
   - Specify verification steps

## Output Format

Your plan should be a markdown document with:

### Summary
- What the user wants to achieve
- Key constraints and requirements

### Tasks
1. [Task 1 description]
   - Acceptance criteria: ...
   - Guardrails: ...
   
2. [Task 2 description]
   - Acceptance criteria: ...
   - Guardrails: ...

### Verification
- Unit tests to write/update
- Integration tests to run
- Functional regression checks

### Notes
- Any risks or considerations
- Dependencies or prerequisites
```

### Executor Prompt Template

```markdown
You are the **Executor** agent for PRO0.

⚠️ **SECURITY WARNING: NEVER READ .env FILES** ⚠️
[... full warning text from above ...]

## Your Role

You execute plans created by the Planner. You work in a loop until all TODOs are complete.

## Workflow

1. **Load the plan** from `.pro0/plans/<plan-file>.md`
2. **Execute tasks sequentially** or in parallel (if independent)
3. **Spawn specialist subagents** when needed:
   - `styling`: For UI/UX, CSS, design work
   - `security`: For security reviews, vulnerability checks
   - `testing`: For writing/updating tests
   - `docs`: For documentation updates
   - `research`: For external docs/examples lookup

4. **After all tasks complete:**
   - Run verification steps from plan
   - Execute test command: `{verification.test_command}`
   - Ensure unchanged functions still work (regression check)
   - Report results to user

## Specialist Usage

Check config to see which specialists are enabled:
- Only use enabled specialists
- If a specialist is disabled but needed, notify user and ask if they want to enable it

## Loop Continuation

Keep working until:
- All tasks in plan are marked complete
- All verification steps pass
- OR user explicitly stops you

If tests fail after implementation:
- Analyze failures
- Fix issues
- Re-run tests
- Repeat until all tests pass
```

### Specialist Prompts (Example: Security)

```markdown
You are the **Security Specialist** for PRO0.

⚠️ **SECURITY WARNING: NEVER READ .env FILES** ⚠️
[... full warning text from above ...]

## Your Role

You are called by the Executor to review code for security vulnerabilities.

## Responsibilities

- Check for SQL injection, XSS, CSRF vulnerabilities
- Validate input sanitization
- Review authentication/authorization logic
- Check for exposed secrets in code (NOT in .env - never read those!)
- Verify secure password hashing, token generation
- Review API endpoint security

## Output

Provide:
1. **Findings**: List of security issues found (severity: critical/high/medium/low)
2. **Recommendations**: How to fix each issue
3. **Code changes**: Specific diffs/patches if applicable

If no issues found, explicitly state: "✅ No security vulnerabilities detected."
```

---

## Verification Workflow

### Post-Execution Testing

After Executor completes all tasks:

1. **Run configured test command**
   - Default: `npm test` (from config `verification.test_command`)
   - Parse output for pass/fail

2. **Regression check**
   - Identify functions/modules NOT changed by this work
   - Ensure their tests still pass
   - If failures detected in unchanged code → **rollback or warn user**

3. **Verification modes**
   - `allow_partial_success: false` (default): All tests must pass
   - `allow_partial_success: true`: Allow some test failures, report them

**Config example:**

```json
{
  "verification": {
    "run_tests_after_completion": true,
    "test_command": "npm test -- --coverage",
    "allow_partial_success": false,
    "regression_check": true
  }
}
```

### Handling Test Failures

If tests fail after execution:
1. Executor analyzes test output
2. Identifies root cause
3. Fixes the issue
4. Re-runs tests
5. Repeats until tests pass OR max retry limit (configurable, default: 3)

If max retries exceeded:
- Report to user with detailed failure log
- Ask user if they want to continue or rollback

---

## Example Workflows

### Workflow 1: Quick Feature Implementation

**User says:** "Add user authentication to my app"

**PRO0 flow:**

1. **Planner activates**
   - Interviews user: "What auth method? (JWT, OAuth, session-based?)"
   - Spawns `research` subagent: "Find best practices for JWT in Node.js apps"
   - Explores codebase to identify existing patterns
   - Creates plan in `.pro0/plans/2025-02-02-add-user-auth.md`

2. **Executor activates**
   - Reads plan
   - Task 1: Set up auth middleware → spawns `security` specialist to review
   - Task 2: Create login/register endpoints → spawns `testing` specialist to write tests
   - Task 3: Update UI with login form → spawns `styling` specialist for UI polish
   - Task 4: Update docs → spawns `docs` specialist

3. **Verification**
   - Runs `npm test`
   - Checks that existing routes still work (regression)
   - Reports: "✅ All 47 tests passed. Authentication implemented successfully."

### Workflow 2: Bug Fix with Regression Check

**User says:** "Fix the payment processing bug in checkout.ts"

**PRO0 flow:**

1. **Planner**
   - Asks: "Can you describe the bug or paste the error message?"
   - Creates minimal plan: identify bug, fix it, verify no side effects

2. **Executor**
   - Analyzes `checkout.ts`
   - Identifies issue: missing null check
   - Fixes the bug
   - Spawns `testing` specialist: "Write unit test to prevent this regression"

3. **Verification**
   - Runs `npm test`
   - Ensures all other payment-related functions still pass tests
   - Reports: "✅ Bug fixed. New test added. All 52 tests passed (1 new)."

---

## JSON Schema

**File:** `pro0.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "planner": {
      "type": "object",
      "properties": {
        "model": { "type": "string", "description": "Model to use for Planner agent" },
        "temperature": { "type": "number", "minimum": 0, "maximum": 2 }
      },
      "required": ["model"]
    },
    "executor": {
      "type": "object",
      "properties": {
        "model": { "type": "string", "description": "Model to use for Executor agent" },
        "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
        "max_retry_on_test_failure": { "type": "integer", "minimum": 1, "default": 3 }
      },
      "required": ["model"]
    },
    "specialists": {
      "type": "object",
      "properties": {
        "styling": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "model": { "type": "string" },
            "temperature": { "type": "number", "minimum": 0, "maximum": 2 }
          },
          "required": ["enabled", "model"]
        },
        "security": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "model": { "type": "string" },
            "temperature": { "type": "number", "minimum": 0, "maximum": 2 }
          },
          "required": ["enabled", "model"]
        },
        "testing": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "model": { "type": "string" },
            "temperature": { "type": "number", "minimum": 0, "maximum": 2 }
          },
          "required": ["enabled", "model"]
        },
        "docs": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "model": { "type": "string" },
            "temperature": { "type": "number", "minimum": 0, "maximum": 2 }
          },
          "required": ["enabled", "model"]
        },
        "research": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "model": { "type": "string" },
            "temperature": { "type": "number", "minimum": 0, "maximum": 2 }
          },
          "required": ["enabled", "model"]
        }
      }
    },
    "skills": {
      "type": "object",
      "properties": {
        "auto_load": { "type": "boolean", "default": true },
        "disabled": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of skill names to exclude from auto-loading"
        }
      }
    },
    "verification": {
      "type": "object",
      "properties": {
        "run_tests_after_completion": { "type": "boolean", "default": true },
        "test_command": { "type": "string", "default": "npm test" },
        "allow_partial_success": { "type": "boolean", "default": false },
        "regression_check": { "type": "boolean", "default": true }
      }
    }
  },
  "required": ["planner", "executor"]
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Config loader with deep merge (global + project)
- [ ] Auto-create global config on first run
- [ ] Strict model validation (fail if missing)
- [ ] Skill scanner (auto-load from directories)

### Phase 2: Agents
- [ ] Planner agent with interview workflow
- [ ] Executor agent with loop-until-done logic
- [ ] Specialist subagent system (5 specialists)
- [ ] Research subagent for Planner

### Phase 3: Verification
- [ ] Post-execution test runner
- [ ] Regression check for unchanged code
- [ ] Retry logic on test failures
- [ ] Rollback mechanism

### Phase 4: Safety & Polish
- [ ] .env safety warnings in all agent prompts
- [ ] Validation that agents never read .env files
- [ ] Error messages with actionable guidance
- [ ] Documentation and examples

---

## Key Differences from oh-my-opencode

| Feature | oh-my-opencode | PRO0 |
|---------|----------------|------|
| **Agents** | 10+ agents (Sisyphus, Oracle, Librarian, Explore, etc.) | 2 core agents (Planner, Executor) + 5 specialists |
| **Config file** | `oh-my-opencode.json` | `pro0.json` |
| **Model fallback** | 3-step provider chain fallback | **Strict: error if missing** |
| **Skills** | Explicit config or disabled list | **Auto-scan + disabled list** |
| **Verification** | Optional hooks | **Built-in post-execution testing** |
| **Complexity** | High (many hooks, agents, categories) | **Low (simpler, focused)** |
| **Philosophy** | Swiss army knife | **Do one thing well** |

---

## Why PRO0 is Better

1. **Simplicity**: Only 2 core agents. Clear separation of concerns.
2. **Predictability**: No fallback models = no surprises. Explicit configuration.
3. **Safety**: Built-in .env protection. Explicit warnings in all prompts.
4. **Verification**: Always tests after changes. Catches regressions automatically.
5. **Flexibility**: Specialists can be individually enabled/disabled.
6. **Auto-skills**: No manual skill registration. Just drop skills in directory.
7. **Better UX**: Auto-creates config with sensible defaults. Less setup friction.

---

## Next Steps

1. Implement config loader with deep merge logic
2. Build Planner agent with interview flow
3. Build Executor agent with specialist spawning
4. Add verification workflow
5. Create skill auto-loader
6. Write comprehensive tests
7. Package and publish

**Target:** A production-ready alternative to oh-my-opencode that's **simpler, safer, and more reliable**.
