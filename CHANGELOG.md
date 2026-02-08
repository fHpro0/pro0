# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- QMD skill: search local Markdown knowledge bases via the external `qmd` CLI
  - Auto-detection for "search my notes/docs/knowledge base" queries
  - Search modes: BM25 (`bm25`), semantic (`semantic`), hybrid (`hybrid`)
  - Configurable relevance threshold (`minScore`) and timeout
  - Optional MCP server registration (`skills.qmd.mcp`)

- Deepthink skill: multi-step analytical reasoning workflow
  - Modes: `auto`, `quick` (7 steps), `full` (14 steps)
  - Step 3 characterization auto-switches in `auto`
  - Full mode includes sub-agent orchestration and aggregation
  - Iterative refinement (Step 13) bounded by `maxIterations`

- Skill routing: `skill_router` tool for bundled skill execution
  - Auto-detect and execute `qmd` and `deepthink`
  - Optional `force_skill` override

### Documentation

- Added skills guides: `docs/skills/qmd.md` and `docs/skills/deepthink.md`
- Added migration guide for skills integration: `docs/MIGRATION.md`
