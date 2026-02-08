# Execution Plan: Fix Token Overflow (207K > 200K limit)

**PRD:** `.pro0/prds/2026-02-06-token-overflow-fix.md`
**Created:** 2026-02-06
**Status:** In Progress

---

## Phase 1: MCP Tool Surface Reduction (saves ~50-80K tokens)

**Goal:** Disable all MCP tools globally, enable per-agent where needed.

### Task 1.1: Update global opencode.json
- Add `tools` key to disable all MCP tools globally:
  ```json
  "tools": {
    "gitlab_*": false,
    "playwriter_*": false,
    "context7_*": false,
    "duckduckgo-search_*": false
  }
  ```
- Do NOT add per-agent overrides at global level — that's project-specific
- Keep MCP servers `enabled: true` so they initialize but tools don't load into prompts

### Task 1.2: Document MCP per-project enablement pattern
- Add to CONFIGURATION.md showing how projects can selectively enable MCP tools
- Example: project opencode.json with `"tools": { "gitlab_*": true }` for GitLab projects

**Owner:** Backend Coder (config change)
**Dependencies:** None

---

## Phase 2: Slim Agent Prompts (saves ~15-20K tokens)

**Goal:** Reduce each specialist prompt by ~60-70% by removing verbose examples while preserving essential instructions.

### Current State (6,578 lines total across all prompts):
| File | Lines | Target | Reduction |
|------|-------|--------|-----------|
| tester.md | 824 | ~200 | -624 |
| frontend-coder.md | 847 | ~200 | -647 |
| designer.md | 621 | ~200 | -421 |
| security-auditor.md | 645 | ~200 | -445 |
| self-review.md | 529 | ~150 | -379 |
| backend-coder.md | 503 | ~150 | -353 |
| api-coder.md | 553 | ~150 | -403 |
| database-coder.md | 460 | ~150 | -310 |
| manager.md | 584 | ~200 | -384 |
| planner.md | 364 | ~150 | -214 |
| devops-engineer.md | 289 | ~120 | -169 |
| document-viewer.md | 123 | ~80 | -43 |
| documentation-writer.md | 97 | ~80 | -17 |
| researcher.md | 88 | ~70 | -18 |

### Trimming Rules:
1. **KEEP:** Role definition, critical rules (no auto-commit, security), output format, delegation instructions
2. **REMOVE:** Multi-line code examples (model already knows patterns), verbose checklists, redundant guardrails
3. **COMPRESS:** Replace 10-line examples with 2-line summaries. Replace checklists with bullet lists.
4. **DEDUPLICATE:** Security warning and todowrite template are already injected via shared templates — verify no duplication

**Owner:** Multiple specialists (one per prompt file, parallelized)
**Dependencies:** None (independent of Phase 1)

---

## Phase 3: Verify & Test

### Task 3.1: Build project
- Run `npm run build` to ensure no TypeScript errors

### Task 3.2: Estimate token savings
- Count bytes before/after for all prompt files
- Estimate token savings (1 token ≈ 4 chars)

### Task 3.3: Functional verification
- Verify all agent prompts still contain essential instructions
- Verify shared templates still work (security warning, todowrite)

**Owner:** Tester
**Dependencies:** Phase 1 + Phase 2

---

## Phase 4: Self-Review

- Review all changes for correctness, completeness, and no regressions
- Verify token budget is under target

**Owner:** Self-Review specialist
**Dependencies:** Phase 3

---

## Estimated Total Savings

| Source | Before | After | Savings |
|--------|--------|-------|---------|
| MCP tool schemas | ~80-100K tokens | ~0K (disabled globally) | **~80-100K** |
| Agent prompts | ~44K tokens | ~15K tokens | **~29K** |
| **Total** | **~124-144K** | **~15K** | **~109-129K** |

**Projected baseline:** ~50-60K tokens (opencode base + our prompts), leaving ~140-150K for conversation.
