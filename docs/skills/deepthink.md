# Deepthink Skill Guide

## Overview

Deepthink is a structured analytical reasoning workflow designed for complex questions that benefit from explicit reasoning steps, multiple perspectives, and iterative refinement.

It supports three modes:

- `quick` (7 steps)
- `full` (14 steps, includes sub-agent orchestration)
- `auto` (recommended; Step 3 decides quick vs full)

## When to Use Deepthink

Use Deepthink for:

- "Why" / "How" questions that require deep explanation
- Comparative analysis (X vs Y)
- Multi-domain questions (technical + org + historical factors)
- Causal chains, tradeoffs, implications
- Strategy, architecture, or decision-making writeups

Avoid Deepthink for:

- Simple factual lookups
- Straightforward how-to questions
- Pure code generation tasks

## Enable in PRO0

Add this to `~/.config/opencode/pro0.json` (global) or `.opencode/pro0.json` (project override):

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

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable Deepthink |
| `defaultMode` | string | `"auto"` | `auto`, `quick`, or `full` |
| `maxIterations` | number | `5` | Max refinement iterations (Step 13) |
| `subAgentModel` | string | provider default | Model used for sub-agents (Full mode) |
| `timeout` | number | unset | Reserved for an overall timeout (if supported by your build) |

## Modes

### Auto mode (Recommended)

Runs Steps 1-3, then Step 3 (Characterization) decides whether to continue in `quick` or `full`.

### Quick mode (7 steps)

Runs Steps 1-5, then 12-14.

Best for: moderate complexity, time-sensitive analysis.

### Full mode (14 steps)

Runs all steps including sub-agent design and parallel dispatch.

Best for: highly complex questions, multi-domain analysis, competing viewpoints.

## Workflow Steps

Steps 1-5 (common):

1. Context clarification
2. Abstraction
3. Characterization (decides mode in `auto`)
4. Analogical recall
5. Planning

Steps 6-11 (full mode only):

6. Sub-agent design
7. Design critique
8. Design revision
9. Dispatch (parallel)
10. Quality gate
11. Aggregation

Steps 12-14 (synthesis):

12. Initial synthesis
13. Iterative refinement (loops until confident or `maxIterations`)
14. Formatting & output

## Usage

### Auto-detection

Deepthink is automatically triggered for analytical language (e.g. "why", "compare", "analyze") when the detector confidence is high enough.

### Explicit invocation (OpenCode tool)

```ts
skill_router({ query: "Compare TypeScript vs Flow and explain why TypeScript succeeded", force_skill: "deepthink" })
```

The router returns a markdown-formatted analysis.

## Confidence

Deepthink tracks confidence during refinement:

- `low`
- `moderate`
- `high`
- `certain`

If you see consistently low/moderate confidence:

- Increase `maxIterations`
- Ask a more specific question (constraints, timeframe, and what "good" looks like)
- Prefer `full` mode for multi-domain questions

## Troubleshooting

### Not triggering automatically

- Use explicit wording: "deepthink: analyze ..."
- Call the router with `force_skill: "deepthink"`
- Ensure `skills.deepthink.enabled` is `true`

### Too slow

- Use `defaultMode: "quick"` for faster results
- Reduce `maxIterations`
- Ask a narrower question

### Too shallow

- Use `defaultMode: "full"` (or ask for "comprehensive analysis")
- Increase `maxIterations`

## Developer API (PRO0 contributors)

Inside this repository:

- `executeDeepthink(query, mode)` returns the final markdown output
- `DeepthinkOrchestrator` exposes `execute()` + state inspection

See `src/skills/bundled/deepthink/orchestrator.ts`.
