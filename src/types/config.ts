/**
 * PRO0 Configuration Type Definitions
 * 
 * Team-based dynamic agent system where:
 * - proManager is the sole primary agent (team leader)
 * - Agents are dynamically generated per-task based on categories
 * - Agent instructions stored per-project in .pro0/agents/
 * - Configurable parallel/total agent limits with resource awareness
 */

// ---------------------------------------------------------------------------
// Core agent config
// ---------------------------------------------------------------------------

export interface AgentConfig {
  model: string;
  temperature?: number;
  top_p?: number;
}

// ---------------------------------------------------------------------------
// Manager (team leader -- plans first, then delegates)
// ---------------------------------------------------------------------------

export interface ManagerConfig extends AgentConfig {
  max_retry_on_test_failure?: number;
  coding_allowed?: boolean;
  mandatory_todos?: boolean;
  ralph_loop?: RalphLoopConfig;
  planning?: PlanningConfig;
}

export interface PlanningConfig {
  /** Whether to require PRD approval before execution */
  require_approval?: boolean;
  /** Auto-create PRD for complex tasks (3+ subtasks) */
  auto_prd?: boolean;
  /** Directory for PRDs (relative to project root) */
  prd_directory?: string;
}

export interface RalphLoopConfig {
  enabled?: boolean;
  max_iterations?: number;
  auto_review?: boolean;
  continuation?: RalphContinuationConfig;
}

export interface RalphContinuationConfig {
  enabled?: boolean;
  ask_user_at_max?: boolean;
  default_extension?: number;
}

// ---------------------------------------------------------------------------
// Agent categories -- define roles with default models
// ---------------------------------------------------------------------------

export interface AgentCategory {
  /** Human-readable name */
  name: string;
  /** What this category is for */
  description: string;
  /** Default model for agents in this category */
  defaultModel: string;
  /** Default temperature */
  defaultTemperature?: number;
  /** Default tool permissions */
  defaultTools?: Record<string, boolean>;
  /** Path to base prompt template (relative to prompts/ or .pro0/agents/) */
  basePromptTemplate?: string;
}

// ---------------------------------------------------------------------------
// Team configuration -- controls dynamic agent behavior
// ---------------------------------------------------------------------------

export interface TeamConfig {
  /** Max agents running simultaneously (default: 3) */
  maxParallel: number;
  /** Max agents that can be created per task (default: 10) */
  maxTotal: number;
  /** Adjust limits based on system resources */
  resourceAware: boolean;
  /** Resource thresholds for throttling */
  resourceLimits?: ResourceLimits;
  /** Agent categories with their default models */
  categories: Record<string, AgentCategory>;
}

export interface ResourceLimits {
  /** Throttle if memory usage exceeds this percent (default: 80) */
  maxMemoryPercent: number;
  /** Throttle if CPU usage exceeds this percent (default: 90) */
  maxCpuPercent: number;
}

// ---------------------------------------------------------------------------
// Dynamic agent definitions -- stored per-project in .pro0/agents/
// ---------------------------------------------------------------------------

export interface DynamicAgentDefinition {
  /** Unique agent id (e.g., "agent-abc123") */
  id: string;
  /** Human-readable name (e.g., "Auth API Coder") */
  name: string;
  /** References a key in TeamConfig.categories */
  category: string;
  /** Override the category's default model */
  model?: string;
  /** Override the category's default temperature */
  temperature?: number;
  /** Full system prompt for this agent */
  prompt: string;
  /** Tool permissions override */
  tools?: Record<string, boolean>;
  /** Link to the parent coordination task */
  parentTaskId?: string;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last modified */
  modifiedAt?: string;
  /** Whether this agent is currently active */
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Template agents (evolved from old "specialists")
// ---------------------------------------------------------------------------

export interface TemplateConfig extends AgentConfig {
  enabled: boolean;
  scope?: string;
  /** Category this template belongs to */
  category?: string;
}

export type TemplatesConfig = Record<string, TemplateConfig>;

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export interface QmdSkillConfig {
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

export interface DeepthinkSkillConfig {
  enabled: boolean;
  defaultMode: 'full' | 'quick' | 'auto';
  maxIterations: number;
  subAgentModel: string;
  timeout?: number;
}

export interface SkillsConfig {
  auto_load?: boolean;
  disabled?: string[];
  qmd?: QmdSkillConfig;
  deepthink?: DeepthinkSkillConfig;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export interface VerificationConfig {
  run_tests_after_completion?: boolean;
  test_command?: string;
  allow_partial_success?: boolean;
  regression_check?: boolean;
}

// ---------------------------------------------------------------------------
// Root config
// ---------------------------------------------------------------------------

export interface Pro0Config {
  proManager: ManagerConfig;
  team: TeamConfig;
  templates: TemplatesConfig;
  skills?: SkillsConfig;
  verification?: VerificationConfig;
}

// ---------------------------------------------------------------------------
// Partial config types for deep merge
// ---------------------------------------------------------------------------

export type PartialPro0Config = {
  proManager?: Partial<ManagerConfig>;
  team?: Partial<TeamConfig> & {
    categories?: Record<string, Partial<AgentCategory>>;
    resourceLimits?: Partial<ResourceLimits>;
  };
  templates?: Partial<TemplatesConfig>;
  skills?: Partial<SkillsConfig>;
  verification?: Partial<VerificationConfig>;

  // Legacy keys (auto-migrated)
  proPlanner?: Record<string, unknown>;
  specialists?: Record<string, unknown>;
  background_tasks?: Record<string, unknown>;
};
