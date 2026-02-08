# Fix: Prompt Token Overflow (207K > 200K limit)

**Created:** 2026-02-06
**Status:** Draft

---

## Executive Summary

Pro0 plugin is unusable on target projects because the combined system prompt exceeds the 200K token limit before the user even types anything. The root cause is that ALL agent prompts (14 agents), ALL MCP tool schemas (~50+ tools), and the target project's context are loaded simultaneously. We need to reduce the baseline token footprint from ~170K+ to under ~50K through lazy loading and prompt trimming.

---

## Problem Statement

**Current State:** Opening any project with pro0 + opencode immediately fails with `prompt is too long: 207896 tokens > 200000 maximum`. The system is completely unusable.

**Desired State:** Pro0 works within the 200K token limit with comfortable headroom (~50K baseline), leaving ~150K for actual conversation, file context, and tool responses.

**Success Metrics:**
- Baseline system prompt + tool definitions < 50K tokens
- Error `prompt is too long` never occurs on initial load
- All existing functionality preserved (specialists, MCP tools, skills)
- No degradation in agent quality or capability

---

## User Stories

**Primary Persona:** Developer using pro0 plugin with opencode on a real project

1. **Start a session without errors**
   - As a developer
   - I want to open my project and start chatting with pro0 immediately
   - So that I can get help without hitting token limits
   
   **Acceptance Criteria:**
   - [ ] First prompt succeeds without token overflow
   - [ ] Agent responds normally to user queries
   - [ ] All specialist agents remain available when needed

2. **Use MCP tools on demand**
   - As a developer
   - I want MCP tools (GitLab, Playwriter, Context7, etc.) to still work
   - So that I don't lose any functionality
   
   **Acceptance Criteria:**
   - [ ] MCP tools work when invoked
   - [ ] Tool schemas are NOT all loaded upfront
   - [ ] No noticeable delay when first using an MCP tool

---

## Requirements

**Functional (Must-Have):**

1. **Slim agent prompts** - Reduce each specialist prompt to essential instructions only (remove redundant sections, examples, verbose guardrails)
2. **Lazy specialist loading** - Only load the active agent's prompt; specialists load their prompts when invoked, not at registration time
3. **MCP tool pruning** - Reduce MCP tool definitions loaded into context (these are the biggest offender at ~80-100K tokens)
4. **Shared template deduplication** - Security warning and todowrite template are injected into EVERY agent prompt; instead, inject once in the base system prompt

**Non-Functional:**
- **Performance:** No noticeable latency increase when invoking specialists or MCP tools
- **Compatibility:** Must work with opencode's plugin API (config hook, tool registration)
- **Maintainability:** Agent prompts remain readable and editable as markdown files

**Nice-to-Have:**
- Token budget monitoring (log token usage per component)
- Per-project MCP tool configuration (only enable GitLab MCP for GitLab projects)
- Dynamic specialist registration based on project type (don't register database-coder for a pure frontend project)

---

## Technical Constraints

- **OpenCode Plugin API:** Agents must be registered in the `config` hook — we need to check if opencode supports registering agents with deferred/lazy prompt loading, or if all prompts must be provided upfront
- **MCP Server Loading:** MCP tool schemas are injected by opencode itself based on `opencode.json` `mcp` config — we may NOT be able to control this from the plugin side
- **Model Token Limit:** 200K tokens is a hard limit from the model provider (GitHub Copilot)

---

## Proposed Solutions (Ranked)

### Solution 1: Reduce MCP tool surface (HIGHEST IMPACT)
The 4 MCP servers (GitLab 30+ tools, Playwriter 10+ tools, Context7 2 tools, DuckDuckGo 1 tool) contribute ~80-100K tokens. Options:
- **A)** Move MCP config out of global `opencode.json` into per-project `.opencode/opencode.json` — only enable what's needed
- **B)** Disable verbose MCP servers (GitLab has 30+ tools with huge schemas) and use pro0's `skill_mcp` wrapper instead
- **C)** Use opencode's `enabled: false` on MCP servers by default, enable per-project

### Solution 2: Slim agent prompts (MEDIUM IMPACT, ~15-20K savings)
- Strip verbose examples, reduce redundant guardrails
- Share common sections (security, todowrite) via a single base injection
- Target: each specialist prompt < 3K tokens (currently 4-6K each)

### Solution 3: Lazy specialist prompt loading (MEDIUM IMPACT, ~30K savings)
- Register specialists with minimal description only (1-line)
- Load full prompt only when `delegate_task` invokes the specialist
- Requires checking if opencode supports deferred prompt loading

### Solution 4: Conditional specialist registration (LOW-MEDIUM IMPACT)
- Only register specialists relevant to the detected project type
- E.g., skip `designer`, `frontend-coder` for a pure backend project

---

## Out of Scope

- Changing the model's token limit (that's provider-controlled)
- Rewriting opencode's core system prompt (not our code)
- Changing MCP server implementations (only configuring which ones load)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OpenCode doesn't support lazy agent prompt loading | Medium | High | Fall back to slim prompts + MCP reduction |
| Disabling MCP servers breaks existing workflows | Low | Medium | Per-project override in `.opencode/opencode.json` |
| Slimmed prompts reduce agent quality | Low | Medium | A/B test before/after; keep essential instructions |
| OpenCode injects MCP schemas regardless of plugin | High | High | Solution 1A/1C: configure at opencode level, not plugin level |

---

## Open Questions

- [ ] Does opencode support lazy/deferred prompt loading for subagents? (If prompt is loaded only when the agent is invoked, this solves ~30K tokens immediately)
- [ ] Can we control which MCP tool schemas get included in the system prompt from the plugin? Or is that entirely opencode-controlled via `opencode.json`?
- [ ] What's the exact token breakdown from opencode's base system prompt vs. our agent prompts vs. MCP schemas? (Need to instrument/log this)
- [ ] Is there a way to set `enabled: false` per MCP server per project?
