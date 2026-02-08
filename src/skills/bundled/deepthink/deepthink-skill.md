# Deepthink Skill

Use this skill when you encounter complex analytical questions that require:
- Deep reasoning across multiple domains
- Comparing/contrasting perspectives
- Understanding causal relationships
- Historical or evolutionary analysis
- Multi-step problem decomposition

## When to Use Deepthink

**Trigger Deepthink for:**
- "Why" and "How" questions requiring deep analysis
- Comparative questions (X vs Y)
- Questions involving multiple perspectives or debates
- Historical evolution or causality questions
- Complex philosophical, ethical, or theoretical questions

**Don't use Deepthink for:**
- Simple factual lookups
- Code generation tasks
- Quick definitions
- Straightforward how-to questions

## Usage

```typescript
import { executeDeepthink } from '@/skills/bundled/deepthink';

// Auto mode (recommended - Step 3 decides Quick vs Full)
const answer = await executeDeepthink(userQuery, 'auto');

// Quick mode (7 steps, no sub-agents)
const quickAnswer = await executeDeepthink(userQuery, 'quick');

// Full mode (14 steps with sub-agent orchestration)
const fullAnswer = await executeDeepthink(userQuery, 'full');
```

## Modes

### Quick Mode (Steps 1-5, 12-14)
Best for: Moderate complexity questions, time-sensitive analysis
- Context clarification
- Abstraction
- Characterization
- Analogical recall
- Planning
- Initial synthesis
- Iterative refinement
- Output formatting

### Full Mode (All 14 Steps)
Best for: Highly complex, multi-domain questions requiring parallel sub-agent analysis
- All Quick mode steps PLUS:
- Sub-agent design
- Design critique
- Design revision
- Parallel sub-agent dispatch
- Quality gate
- Aggregation

### Auto Mode (Recommended)
Executes Steps 1-3, then Step 3 (Characterization) decides between Quick and Full based on query complexity.

## Output

Deepthink returns a markdown-formatted analysis including:
- Structured answer
- Confidence level (low/moderate/high/certain)
- Execution metadata (mode, steps, time, iterations)
- Sub-agent summaries (Full mode only)

## Example

**Query:** "Why did the Roman Empire fall, and could it have been prevented?"

**Mode:** Auto -> Full (high complexity)

**Output:**
- Context clarification: Disambiguates "fall" (Western vs Eastern), timeframe
- Abstraction: Identifies patterns (political instability, economic decline, military pressure)
- Characterization: High complexity -> Full mode
- Sub-agents: Economic analyst, Military historian, Political scientist
- Synthesis: Multi-perspective analysis of decline
- Confidence: High (after 3 refinement iterations)
