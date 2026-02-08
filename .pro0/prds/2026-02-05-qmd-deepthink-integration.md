# QMD and Deepthink Skills Integration

**Created:** 2026-02-05
**Status:** Draft

---

## Executive Summary

Add two powerful bundled skills to the PRO0 opencode plugin: **QMD** (Quick Markdown Document search) for local document/notes search, and **Deepthink** for structured analytical reasoning. Both skills will be implemented natively in TypeScript, with QMD providing skill-based guidance plus optional MCP server registration, and Deepthink offering a 14-step structured reasoning workflow for complex analytical questions.

---

## Problem Statement

**Current State:** PRO0 currently has no built-in document search or structured reasoning capabilities. Users must manually configure external tools and lack systematic approaches for deep analytical thinking.

**Desired State:** PRO0 agents automatically detect when to search local markdown documents (notes, docs, knowledge bases) and when complex questions require structured multi-step reasoning. Both capabilities are bundled and work out-of-the-box.

**Success Metrics:**
- Agents automatically invoke QMD when document search patterns are detected
- Complex analytical questions trigger Deepthink workflow automatically
- Both skills configurable via `pro0.json`
- Zero additional setup required beyond having `qmd` CLI installed (for QMD)

---

## User Stories

**Primary Persona:** Developer using PRO0 for planning and code generation

1. **QMD Document Search**
   - As a developer
   - I want agents to search my indexed markdown notes/docs when relevant
   - So that I can leverage my knowledge base without manual tool invocation
   
   **Acceptance Criteria:**
   - [ ] Agents detect phrases like "search my notes", "find in docs", "check my knowledge base"
   - [ ] QMD search commands are executed automatically
   - [ ] Results are incorporated into agent responses
   - [ ] Works with qmd CLI commands and/or MCP server

2. **Deepthink Structured Reasoning**
   - As a developer with complex analytical questions
   - I want agents to apply systematic reasoning workflows
   - So that I get well-reasoned, multi-perspective answers
   
   **Acceptance Criteria:**
   - [ ] Agents detect open-ended analytical questions requiring deep analysis
   - [ ] Full mode (14 steps with sub-agents) available for complex questions
   - [ ] Quick mode (7 steps) available for simpler analytical questions
   - [ ] Sub-agents dispatched via Task tool for parallel analysis

3. **Skill Configuration**
   - As a user
   - I want to enable/disable and configure these skills
   - So that I can customize behavior to my needs
   
   **Acceptance Criteria:**
   - [ ] Skills configurable in `pro0.json`
   - [ ] Can disable either skill independently
   - [ ] Can configure QMD collection paths and search preferences
   - [ ] Can configure Deepthink mode preference (full/quick/auto)

---

## Requirements

**Functional (Must-Have):**

1. **QMD Skill**
   - Bundled skill definition with trigger phrase detection
   - Auto-invocation when document search patterns detected
   - Support for `qmd search` (BM25), `qmd vsearch` (semantic), `qmd query` (hybrid)
   - Support for `qmd get` document retrieval
   - Optional MCP server registration for tighter integration

2. **Deepthink Skill**
   - Native TypeScript implementation of 14-step workflow
   - Full mode: All 14 steps with sub-agent dispatch (Steps 6-11)
   - Quick mode: 7 steps skipping sub-agent phases (1-5, 12-14)
   - Auto-detection of complex analytical questions
   - Sub-agent dispatch via Task tool for parallel analysis
   - Iteration loop in Step 13 with confidence assessment

3. **Configuration**
   - Enable/disable via `pro0.json` under `skills` section
   - QMD: configurable search mode preference, min-score threshold
   - Deepthink: configurable default mode (full/quick/auto)

4. **Git Commit Control**
   - Agents MUST NOT auto-commit after making fixes or changes
   - Commits only happen when user explicitly requests them
   - All agent prompts must include clear instructions to never auto-commit
   - User maintains full control over when changes are committed

**Non-Functional:**
- **Performance:** QMD search should prefer fast BM25 over slow semantic search
- **Reliability:** Deepthink workflow must handle sub-agent failures gracefully
- **Usability:** Clear step output format for Deepthink progress visibility
- **User Control:** Agents never auto-commit; user explicitly requests commits

**Nice-to-Have:**
- Deepthink `/deepthink` slash command for manual invocation
- QMD collection auto-discovery based on project structure
- Deepthink step persistence for resuming interrupted workflows
- Integration with existing researcher specialist for Deepthink analogical recall

---

## Technical Constraints

- **Tech Stack:** TypeScript, Node.js 18+
- **Dependencies:** 
  - QMD: Requires `qmd` CLI installed externally (via `bun install -g`)
  - Deepthink: No external dependencies (pure TypeScript)
- **Plugin System:** Must work with OpenCode plugin architecture
- **Sub-agent Dispatch:** Use existing Task tool from Claude context

---

## Out of Scope

- Installing `qmd` CLI automatically (user responsibility)
- QMD index management/creation (done via `qmd collection add`)
- Custom GGUF model configuration for QMD
- Deepthink state persistence across sessions
- Multi-language support for Deepthink prompts

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| QMD not installed | Medium | High | Clear error message with install instructions |
| QMD search timeout (vsearch/query) | Medium | Medium | Prefer BM25, add timeout handling |
| Sub-agent dispatch failures | Low | Medium | Quality gate filters bad outputs |
| Deepthink overuse on simple questions | Medium | Low | Auto-mode detection, Quick mode default |
| Context window limits in Full mode | Medium | High | Limit sub-agent count, summarize outputs |

---

## Architecture

### QMD Skill Structure

```
skills/
  qmd/
    skill.json           # Skill manifest
    qmd.md               # Skill prompt with triggers and usage
    mcp-config.json      # Optional MCP server configuration
```

### Deepthink Skill Structure

```
skills/
  deepthink/
    skill.json           # Skill manifest
    deepthink.md         # Main skill prompt with triggers
    steps/
      01-context.ts      # Context clarification
      02-abstraction.ts  # Domain/first principles
      03-characterization.ts  # Question type classification
      04-analogical.ts   # Analogical recall
      05-planning.ts     # Sub-questions, success criteria
      06-subagent-design.ts   # Sub-agent task definitions (Full)
      07-design-critique.ts   # Self-critique (Full)
      08-design-revision.ts   # Revise based on critique (Full)
      09-dispatch.ts     # Launch sub-agents (Full)
      10-quality-gate.ts # Filter outputs (Full)
      11-aggregation.ts  # Collect findings (Full)
      12-synthesis.ts    # Initial synthesis
      13-refinement.ts   # Iterative refinement loop
      14-output.ts       # Final formatting
    orchestrator.ts      # Workflow control, mode switching
    types.ts             # TypeScript interfaces
```

### Configuration Schema Addition

```json
{
  "skills": {
    "qmd": {
      "enabled": true,
      "searchMode": "bm25",
      "minScore": 0.3,
      "timeout": 30000
    },
    "deepthink": {
      "enabled": true,
      "defaultMode": "auto",
      "maxIterations": 5,
      "subAgentModel": "sonnet"
    }
  }
}
```

---

## Open Questions

- [ ] Should Deepthink sub-agents use the same model as the parent or a different one?
- [ ] How to handle QMD when no collections are indexed?
- [ ] Should Deepthink output be streamed step-by-step or collected?
- [ ] Maximum number of sub-agents for Deepthink Full mode?
