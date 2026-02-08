# QMD + Deepthink Skills Integration - Execution Plan

**PRD:** `.pro0/prds/2026-02-05-qmd-deepthink-integration.md`
**Created:** 2026-02-05

## Summary

Implement two bundled skills for PRO0: QMD (markdown document search) and Deepthink (structured analytical reasoning). QMD provides auto-invoked document search with skill guidance + MCP support. Deepthink offers a 14-step TypeScript workflow with auto-detection, Full/Quick modes, and parallel sub-agent dispatch via Task tool.

**Additional requirement:** Enforce no-auto-commit policy across all agents - commits only happen when user explicitly requests them.

---

## Phase 1: Foundation & Configuration (Parallel)

### Task 1.1: Extend Configuration Schema
**Specialist:** Backend Coder
**Priority:** High

Add skills configuration to the Pro0Config type system.

**Files to modify:**
- `src/types/config.ts` - Add skills config interface
- `src/config/loader.ts` - Handle skills config loading with defaults

**Implementation:**
```typescript
// In config.ts
interface QmdSkillConfig {
  enabled: boolean;
  searchMode: 'bm25' | 'semantic' | 'hybrid';
  minScore: number;
  timeout: number;
  mcp?: {
    enabled: boolean;
    command: string;
    args: string[];
  };
}

interface DeepthinkSkillConfig {
  enabled: boolean;
  defaultMode: 'full' | 'quick' | 'auto';
  maxIterations: number;
  subAgentModel?: string;
}

interface SkillsConfig {
  qmd?: QmdSkillConfig;
  deepthink?: DeepthinkSkillConfig;
}
```

**Acceptance Criteria:**
- [ ] Skills config types defined
- [ ] Default values applied when not specified
- [ ] Config validated on load

**Guardrails:**
- No breaking changes to existing config
- Maintain backward compatibility

---

### Task 1.2: Create Skills Directory Structure
**Specialist:** Backend Coder
**Priority:** High

Create the directory structure for bundled skills.

**Files to create:**
```
src/skills/
  bundled/
    qmd/
      index.ts
      skill.json
      qmd-skill.md
      mcp-config.ts
    deepthink/
      index.ts
      skill.json
      deepthink-skill.md
      types.ts
      orchestrator.ts
      steps/
        (empty, created in Phase 2)
```

**Acceptance Criteria:**
- [ ] Directory structure created
- [ ] skill.json manifests defined
- [ ] Index files export skill interfaces

**Guardrails:**
- Follow existing skill loader patterns

---

## Phase 2: QMD Skill Implementation (Sequential after Phase 1)

### Task 2.1: QMD Skill Prompt & Detection
**Specialist:** Backend Coder
**Priority:** High

Create the QMD skill prompt with trigger detection patterns.

**Files to create/modify:**
- `src/skills/bundled/qmd/qmd-skill.md` - Skill prompt
- `src/skills/bundled/qmd/detector.ts` - Pattern detection logic

**Trigger patterns to detect:**
- "search my notes/docs/knowledge base"
- "find related notes/documents"
- "retrieve markdown from collection"
- "search local markdown files"
- "what do my notes say about..."
- "check my documentation for..."

**Acceptance Criteria:**
- [ ] Skill prompt with usage instructions
- [ ] Detector function returns confidence score
- [ ] Trigger patterns cover common use cases

**Guardrails:**
- Avoid false positives on code search requests
- Prefer BM25 search by default

---

### Task 2.2: QMD Command Executor
**Specialist:** Backend Coder
**Priority:** High

Implement QMD command execution with error handling.

**Files to create:**
- `src/skills/bundled/qmd/executor.ts`

**Implementation:**
```typescript
interface QmdSearchOptions {
  query: string;
  mode: 'bm25' | 'semantic' | 'hybrid';
  collection?: string;
  limit?: number;
  minScore?: number;
  format?: 'json' | 'files' | 'md';
}

interface QmdSearchResult {
  path: string;
  docid: string;
  score: number;
  title?: string;
  context?: string;
  snippet?: string;
}

async function executeQmdSearch(options: QmdSearchOptions): Promise<QmdSearchResult[]>
async function executeQmdGet(pathOrDocid: string, options?: QmdGetOptions): Promise<string>
async function checkQmdInstalled(): Promise<boolean>
```

**Acceptance Criteria:**
- [ ] Search execution with all three modes
- [ ] Document retrieval by path or docid
- [ ] Installation check with helpful error message
- [ ] Timeout handling for slow operations

**Guardrails:**
- Handle qmd not installed gracefully
- Respect configured timeout
- Parse JSON output correctly

---

### Task 2.3: QMD MCP Server Registration
**Specialist:** Backend Coder
**Priority:** Medium

Add optional MCP server configuration for QMD.

**Files to create/modify:**
- `src/skills/bundled/qmd/mcp-config.ts`
- `src/opencode-plugin.ts` - Register MCP server if enabled

**Implementation:**
```typescript
function getQmdMcpConfig(config: QmdSkillConfig): McpServerConfig | null {
  if (!config.mcp?.enabled) return null;
  return {
    command: config.mcp.command || 'qmd',
    args: config.mcp.args || ['mcp'],
  };
}
```

**Acceptance Criteria:**
- [ ] MCP server registered when enabled
- [ ] Works alongside CLI-based skill
- [ ] Graceful handling if MCP unavailable

**Guardrails:**
- MCP is optional, skill works without it
- Don't duplicate functionality

---

### Task 2.4: QMD Skill Integration
**Specialist:** Backend Coder
**Priority:** High

Integrate QMD skill into agent prompts and auto-detection.

**Files to modify:**
- `src/opencode-plugin.ts` - Add QMD to agent capabilities
- `src/skills/bundled/qmd/index.ts` - Export unified interface

**Implementation:**
- Add QMD skill detection to agent prompt processing
- Auto-inject QMD guidance when patterns detected
- Execute QMD commands and return results

**Acceptance Criteria:**
- [ ] Agents receive QMD capability information
- [ ] Auto-detection triggers skill activation
- [ ] Results incorporated into agent context

**Guardrails:**
- Don't overwhelm agents with skill prompts
- Only activate when relevant

---

## Phase 3: Deepthink Core Implementation (Parallel with Phase 2)

### Task 3.1: Deepthink Types & Interfaces
**Specialist:** Backend Coder
**Priority:** High

Define TypeScript types for the Deepthink workflow.

**Files to create:**
- `src/skills/bundled/deepthink/types.ts`

**Implementation:**
```typescript
type DeepthinkMode = 'full' | 'quick';
type ConfidenceLevel = 'exploring' | 'low' | 'medium' | 'high' | 'certain';
type QuestionType = 'taxonomy' | 'trade-off' | 'definitional' | 'evaluative' | 'exploratory';

interface DeepthinkState {
  mode: DeepthinkMode;
  currentStep: number;
  iteration: number;
  confidence: ConfidenceLevel;
  clarifiedQuestion: string;
  domain: string;
  firstPrinciples: string[];
  questionType: QuestionType;
  subQuestions: string[];
  subAgentDefinitions?: SubAgentDefinition[];
  subAgentOutputs?: SubAgentOutput[];
  synthesis: string;
}

interface SubAgentDefinition {
  name: string;
  strategy: string;
  task: string;
  subQuestions: string[];
  uniqueValue: string;
}

interface SubAgentOutput {
  agentName: string;
  output: string;
  rating: 'pass' | 'partial' | 'fail';
  notes?: string;
}

interface StepResult {
  stepNumber: number;
  title: string;
  output: string;
  nextStep: number | null;
  stateUpdates: Partial<DeepthinkState>;
}
```

**Acceptance Criteria:**
- [ ] All 14 steps have type definitions
- [ ] State transitions typed
- [ ] Sub-agent interfaces defined

**Guardrails:**
- Types must be strict, no `any`
- State must be serializable

---

### Task 3.2: Deepthink Orchestrator
**Specialist:** Backend Coder
**Priority:** High

Implement the main workflow orchestrator.

**Files to create:**
- `src/skills/bundled/deepthink/orchestrator.ts`

**Implementation:**
```typescript
class DeepthinkOrchestrator {
  private state: DeepthinkState;
  private config: DeepthinkSkillConfig;
  
  constructor(config: DeepthinkSkillConfig);
  
  async start(question: string): Promise<void>;
  async executeStep(stepNumber: number): Promise<StepResult>;
  async determineMode(): DeepthinkMode;
  async dispatchSubAgents(definitions: SubAgentDefinition[]): Promise<SubAgentOutput[]>;
  async synthesize(): Promise<string>;
  async refine(iteration: number): Promise<StepResult>;
  getState(): DeepthinkState;
  isComplete(): boolean;
}
```

**Acceptance Criteria:**
- [ ] Orchestrator manages full workflow
- [ ] Mode switching at Step 3
- [ ] Iteration loop in Step 13
- [ ] Clean exit at Step 14

**Guardrails:**
- Max 5 iterations in refinement
- Handle sub-agent failures

---

### Task 3.3: Deepthink Steps 1-5 (Common)
**Specialist:** Backend Coder
**Priority:** High

Implement steps 1-5 used by both Full and Quick modes.

**Files to create:**
- `src/skills/bundled/deepthink/steps/01-context-clarification.ts`
- `src/skills/bundled/deepthink/steps/02-abstraction.ts`
- `src/skills/bundled/deepthink/steps/03-characterization.ts`
- `src/skills/bundled/deepthink/steps/04-analogical-recall.ts`
- `src/skills/bundled/deepthink/steps/05-planning.ts`

**Each step implements:**
```typescript
interface Step {
  number: number;
  title: string;
  brief: string;
  execute(state: DeepthinkState, context: any): Promise<StepResult>;
  getPrompt(state: DeepthinkState): string;
}
```

**Step details:**
1. **Context Clarification** - Extract objective content, remove bias
2. **Abstraction** - Identify domain, first principles, key concepts
3. **Characterization** - Classify question type, determine mode
4. **Analogical Recall** - Retrieve similar problems
5. **Planning** - Define sub-questions, success criteria

**Acceptance Criteria:**
- [ ] Each step produces structured output
- [ ] State updated after each step
- [ ] Step 3 determines Full vs Quick mode

**Guardrails:**
- Follow prompt structure from reference
- Handle missing/incomplete answers

---

### Task 3.4: Deepthink Steps 6-11 (Full Mode Only)
**Specialist:** Backend Coder
**Priority:** High

Implement sub-agent design and dispatch steps.

**Files to create:**
- `src/skills/bundled/deepthink/steps/06-subagent-design.ts`
- `src/skills/bundled/deepthink/steps/07-design-critique.ts`
- `src/skills/bundled/deepthink/steps/08-design-revision.ts`
- `src/skills/bundled/deepthink/steps/09-dispatch.ts`
- `src/skills/bundled/deepthink/steps/10-quality-gate.ts`
- `src/skills/bundled/deepthink/steps/11-aggregation.ts`

**Step 9 (Dispatch) uses Task tool:**
```typescript
async function dispatchSubAgents(
  definitions: SubAgentDefinition[],
  sharedContext: SharedContext
): Promise<SubAgentOutput[]> {
  // Launch all sub-agents in parallel using Task tool
  const tasks = definitions.map(def => ({
    subagent_type: 'general',
    prompt: buildSubAgentPrompt(def, sharedContext),
    description: def.name
  }));
  
  // Execute via Task tool
  return Promise.all(tasks.map(task => dispatchTask(task)));
}
```

**Acceptance Criteria:**
- [ ] Sub-agent definitions generated
- [ ] Self-critique and revision cycle
- [ ] Parallel dispatch via Task tool
- [ ] Quality gate filters outputs
- [ ] Aggregation collects findings

**Guardrails:**
- Limit to 5 sub-agents maximum
- Handle dispatch failures gracefully
- Timeout for sub-agent responses

---

### Task 3.5: Deepthink Steps 12-14 (Synthesis)
**Specialist:** Backend Coder
**Priority:** High

Implement synthesis and refinement steps.

**Files to create:**
- `src/skills/bundled/deepthink/steps/12-initial-synthesis.ts`
- `src/skills/bundled/deepthink/steps/13-iterative-refinement.ts`
- `src/skills/bundled/deepthink/steps/14-formatting-output.ts`

**Step 13 iteration logic:**
```typescript
async function executeRefinement(
  state: DeepthinkState,
  iteration: number
): Promise<StepResult> {
  // Generate verification questions
  // Independent verification
  // Discrepancy identification
  // Synthesis update
  // Confidence assessment
  
  const confidence = assessConfidence(state);
  
  if (confidence === 'certain' || iteration >= MAX_ITERATIONS) {
    return { nextStep: 14, ... };
  }
  return { nextStep: 13, stateUpdates: { iteration: iteration + 1 }, ... };
}
```

**Acceptance Criteria:**
- [ ] Initial synthesis from aggregated findings
- [ ] Refinement loop with confidence check
- [ ] Max 5 iterations enforced
- [ ] Clean formatted output

**Guardrails:**
- Prevent infinite loops
- Track iteration count in state

---

### Task 3.6: Deepthink Auto-Detection
**Specialist:** Backend Coder
**Priority:** High

Implement detection of complex analytical questions.

**Files to create:**
- `src/skills/bundled/deepthink/detector.ts`

**Detection patterns:**
- Open-ended "why" and "how" questions
- Trade-off analysis requests
- Multi-perspective evaluation needs
- Strategic/architectural decisions
- Questions with no clear single answer

**Implementation:**
```typescript
interface DetectionResult {
  shouldActivate: boolean;
  suggestedMode: 'full' | 'quick' | 'auto';
  confidence: number;
  reasoning: string;
}

function detectDeepthinkCandidate(
  question: string,
  context?: string
): DetectionResult;
```

**Acceptance Criteria:**
- [ ] Detects complex analytical questions
- [ ] Suggests appropriate mode
- [ ] Avoids false positives on simple questions

**Guardrails:**
- Default to Quick mode when uncertain
- Allow user override

---

## Phase 4: Integration & Testing (Sequential after Phases 2-3)

### Task 4.1: Plugin Integration
**Specialist:** Backend Coder
**Priority:** High

Integrate both skills into the opencode plugin.

**Files to modify:**
- `src/opencode-plugin.ts`
- `src/skills/loader.ts`

**Implementation:**
- Load bundled skills at startup
- Register skill detectors
- Add skills config to plugin config
- Inject skill capabilities into agent prompts

**Acceptance Criteria:**
- [ ] Both skills load on plugin init
- [ ] Skills configurable via pro0.json
- [ ] Agents aware of skill capabilities

**Guardrails:**
- Skills should not break existing functionality
- Graceful degradation if skills disabled

---

### Task 4.2: Agent Prompt Updates
**Specialist:** Backend Coder
**Priority:** High

Update agent prompts to use skills and enforce no-auto-commit policy.

**Files to modify:**
- `agents/planner.md` - Add Deepthink awareness
- `agents/manager.md` - Add skill delegation + no-auto-commit rule
- `agents/specialists/researcher.md` - Add QMD usage
- `agents/specialists/*.md` - All specialists get no-auto-commit rule
- `agents/_shared/security-warning.md` - Add git commit policy

**Changes:**
- Planner: Detect when to invoke Deepthink for complex questions
- Manager: Aware of skill capabilities for delegation
- Researcher: Uses QMD for document search
- **ALL AGENTS**: Add explicit no-auto-commit policy

**No-Auto-Commit Policy (add to all agents):**
```markdown
## Git Commit Policy

**NEVER auto-commit changes.** After making fixes or modifications:
- Do NOT run `git add` or `git commit` automatically
- Wait for explicit user request to commit
- User maintains full control over when changes are staged and committed
- Only create commits when the user explicitly asks (e.g., "commit this", "create a commit")
```

**Acceptance Criteria:**
- [ ] Planner invokes Deepthink for analytical questions
- [ ] Researcher uses QMD for document search
- [ ] Skills integrate naturally with existing workflows
- [ ] ALL agent prompts include no-auto-commit policy
- [ ] Shared template includes commit policy

**Guardrails:**
- Don't overload prompts
- Skills are additive, not replacements
- Commit policy must be clear and prominent

---

### Task 4.3: Build & Package Updates
**Specialist:** DevOps Engineer
**Priority:** Medium

Update build process to include skills.

**Files to modify:**
- `package.json` - Update build script
- `tsconfig.json` - Ensure skills compiled

**Changes:**
- Include `src/skills/bundled/` in compilation
- Copy skill markdown files to dist
- Add skills to package files list

**Acceptance Criteria:**
- [ ] Skills compiled with plugin
- [ ] Skill files included in npm package
- [ ] Build succeeds without errors

**Guardrails:**
- Don't break existing build

---

### Task 4.4: Unit Tests
**Specialist:** Tester
**Priority:** High

Write tests for skill functionality.

**Files to create:**
- `src/skills/bundled/qmd/__tests__/detector.test.ts`
- `src/skills/bundled/qmd/__tests__/executor.test.ts`
- `src/skills/bundled/deepthink/__tests__/detector.test.ts`
- `src/skills/bundled/deepthink/__tests__/orchestrator.test.ts`
- `src/skills/bundled/deepthink/__tests__/steps.test.ts`

**Test coverage:**
- QMD trigger detection
- QMD command building
- Deepthink mode detection
- Step transitions
- Iteration limits
- Sub-agent dispatch mocking

**Acceptance Criteria:**
- [ ] Detection logic tested
- [ ] Step transitions tested
- [ ] Error handling tested
- [ ] 80%+ code coverage

**Guardrails:**
- Mock external dependencies (qmd CLI, Task tool)
- Test edge cases

---

### Task 4.5: Documentation Updates
**Specialist:** Documentation Writer
**Priority:** Medium

Document the new skills.

**Files to modify:**
- `README.opencode.md` - Add skills section
- `CONFIGURATION.md` - Add skills config

**Files to create:**
- `docs/skills/qmd.md` - QMD skill documentation
- `docs/skills/deepthink.md` - Deepthink skill documentation

**Content:**
- Installation requirements (qmd CLI)
- Configuration options
- Usage examples
- Troubleshooting

**Acceptance Criteria:**
- [ ] Skills documented in README
- [ ] Config options explained
- [ ] Usage examples provided

**Guardrails:**
- Keep docs concise
- Include troubleshooting

---

## Execution Order

### Phase 1 (Parallel) - Foundation
- **Backend Coder:** Task 1.1 (Config schema)
- **Backend Coder:** Task 1.2 (Directory structure)

### Phase 2 (Sequential) - QMD Skill
- **Backend Coder:** Task 2.1 → 2.2 → 2.3 → 2.4

### Phase 3 (Parallel with Phase 2) - Deepthink Skill
- **Backend Coder:** Task 3.1 (Types)
- **Backend Coder:** Task 3.2 (Orchestrator) - depends on 3.1
- **Backend Coder:** Task 3.3 (Steps 1-5) - depends on 3.1
- **Backend Coder:** Task 3.4 (Steps 6-11) - depends on 3.1
- **Backend Coder:** Task 3.5 (Steps 12-14) - depends on 3.1
- **Backend Coder:** Task 3.6 (Detection) - depends on 3.1

### Phase 4 (Sequential) - Integration
- **Backend Coder:** Task 4.1 (Plugin integration) - depends on Phases 2, 3
- **Backend Coder:** Task 4.2 (Agent prompts + no-auto-commit policy) - HIGH PRIORITY, depends on 4.1
- **DevOps Engineer:** Task 4.3 (Build) - depends on 4.1
- **Tester:** Task 4.4 (Tests) - depends on 4.1
- **Documentation Writer:** Task 4.5 (Docs) - depends on 4.1

---

## Verification

**Unit Tests:**
- Detector pattern matching
- Step execution and state updates
- Orchestrator flow control
- QMD command building

**Integration Tests:**
- Full Deepthink workflow (mocked sub-agents)
- QMD skill with mock CLI responses
- Plugin loading with skills enabled/disabled

**Manual Testing:**
- Test QMD with real indexed collections
- Test Deepthink with complex questions
- Verify auto-detection accuracy
- Verify agents do NOT auto-commit after making changes

---

## Notes

**Dependencies:**
- QMD requires `qmd` CLI installed (`bun install -g https://github.com/tobi/qmd`)
- Deepthink uses Task tool from Claude context (no external deps)

**Complexity:** Complex - involves workflow orchestration, sub-agent dispatch, and auto-detection

**Estimated effort:** 
- Phase 1: 2-3 hours
- Phase 2 (QMD): 4-6 hours  
- Phase 3 (Deepthink): 8-12 hours
- Phase 4: 4-6 hours
- **Total: ~20-27 hours**
