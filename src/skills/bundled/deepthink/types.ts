/**
 * Deepthink execution modes.
 */
export type DeepthinkMode = 'full' | 'quick' | 'auto';

/**
 * Confidence levels used to control refinement loops.
 */
export type ConfidenceLevel = 'low' | 'moderate' | 'high' | 'certain';

/**
 * Status values for step tracking.
 */
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

/**
 * Result produced by a single Deepthink step.
 */
export interface StepResult {
  stepNumber: number;
  stepName: string;
  status: StepStatus;
  /** Main output from the step. */
  output: string;
  /** Optional metadata emitted by the step. */
  metadata?: {
    /** Execution time in ms. */
    duration?: number;
    /** Token usage if tracked. */
    tokensUsed?: number;
    /** Model identifier used for execution. */
    model?: string;
    /** Step-specific metadata extensions. */
    [key: string]: any;
  };
  /** Error message when status is failed. */
  error?: string;
}

/**
 * Full workflow state for a Deepthink run.
 */
export interface DeepthinkState {
  /** Current execution mode. */
  mode: DeepthinkMode;
  /** Original user question. */
  query: string;
  /** Results from completed steps. */
  steps: StepResult[];
  /** Current step index (1-14). */
  currentStep: number;
  /** Refinement iterations for step 13. */
  iterationCount: number;
  /** Current confidence assessment. */
  confidence: ConfidenceLevel;
  /** Sub-agent definitions (full mode only). */
  subAgents?: SubAgentDefinition[];
  /** Final synthesized answer. */
  finalOutput?: string;
  /** Timestamp when execution started. */
  startTime: number;
  /** Timestamp when execution completed. */
  endTime?: number;
}

/**
 * Sub-agent definition for full-mode orchestration (step 6).
 */
export interface SubAgentDefinition {
  /** Unique identifier (e.g., "agent-1"). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Responsibility of the agent. */
  role: string;
  /** Domain expertise of the agent. */
  specialization: string;
  /** Specific task to perform. */
  taskDescription: string;
  /** IDs of other agents this depends on. */
  dependencies?: string[];
  /** Model identifier to use. */
  model?: string;
  /** Execution priority (1-10). */
  priority?: number;
}

/**
 * Result emitted by a sub-agent (step 9).
 */
export interface SubAgentResult {
  agentId: string;
  agentName: string;
  status: 'success' | 'failed';
  output: string;
  /** Duration in ms. */
  executionTime: number;
  error?: string;
}

/**
 * Quality gate assessment for full-mode synthesis (step 10).
 */
export interface QualityGateResult {
  passed: boolean;
  /** Quality issues found. */
  issues: string[];
  /** Recommended fixes for issues. */
  recommendations: string[];
  /** Quality score from 0-100. */
  overallScore: number;
}

/**
 * Configuration for the Deepthink skill.
 */
export interface DeepthinkConfig {
  enabled: boolean;
  defaultMode: DeepthinkMode;
  /** Max iterations for step 13. */
  maxIterations: number;
  /** Model identifier for sub-agents in full mode. */
  subAgentModel: string;
  /** Optional overall timeout in ms. */
  timeout?: number;
}

/**
 * Step 3: Characterization output.
 */
export interface CharacterizationResult {
  complexity: 'simple' | 'moderate' | 'complex';
  recommendedMode: 'quick' | 'full';
  reasoning: string;
  factors: {
    /** Requires multiple domains. */
    multiDomain: boolean;
    /** Needs historical analysis. */
    historicalContext: boolean;
    /** Requires calculations. */
    numericalAnalysis: boolean;
    /** Multiple perspectives required. */
    conflictingViews: boolean;
    [key: string]: boolean;
  };
}

/**
 * Step 5: Planning output.
 */
export interface PlanningResult {
  /** High-level strategy. */
  approach: string;
  /** Major steps to take. */
  keySteps: string[];
  /** Known difficulties. */
  potentialChallenges: string[];
  /** Success criteria. */
  successCriteria: string[];
}

/**
 * Step 13: Iterative refinement decision.
 */
export interface RefinementDecision {
  shouldContinue: boolean;
  currentConfidence: ConfidenceLevel;
  issuesIdentified: string[];
  improvementsMade: string[];
}

/**
 * Step definition used by the orchestrator.
 */
export interface StepDefinition {
  number: number;
  name: string;
  description: string;
  applicableModes: DeepthinkMode[];
  execute: (state: DeepthinkState) => Promise<StepResult>;
}

/**
 * Metadata for skill registration.
 */
export interface DeepthinkSkillMetadata {
  name: string;
  version: string;
  description: string;
  modes: DeepthinkMode[];
  maxSteps: number;
}
