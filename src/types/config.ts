/**
 * PRO0 Configuration Type Definitions
 */

export interface Pro0Config {
  proPlanner: PlannerConfig;
  proManager: ManagerConfig;
  specialists: SpecialistsConfig;
  skills?: SkillsConfig;
  verification?: VerificationConfig;
  background_tasks?: BackgroundTasksConfig;
}

export interface AgentConfig {
  model: string;
  temperature?: number;
  top_p?: number;
}

export interface PlannerConfig extends AgentConfig {
  mandatory_todos?: boolean;
  prd_workflow?: PrdWorkflowConfig;
}

export interface PrdWorkflowConfig {
  enabled?: boolean;
  require_approval?: boolean;
}

export interface ManagerConfig extends AgentConfig {
  max_retry_on_test_failure?: number;
  coding_allowed?: boolean;
  mandatory_todos?: boolean;
  ralph_loop?: RalphLoopConfig;
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

export interface SpecialistConfig extends AgentConfig {
  enabled: boolean;
  scope?: string;
}

export interface SpecialistsConfig {
  designer?: SpecialistConfig;
  'frontend-coder'?: SpecialistConfig;
  'backend-coder'?: SpecialistConfig;
  'database-coder'?: SpecialistConfig;
  'api-coder'?: SpecialistConfig;
  tester?: SpecialistConfig;
  'security-auditor'?: SpecialistConfig;
  'devops-engineer'?: SpecialistConfig;
  'documentation-writer'?: SpecialistConfig;
  'document-viewer'?: SpecialistConfig;
  researcher?: SpecialistConfig;
  'self-review'?: SpecialistConfig;
  // Legacy support (deprecated)
  styling?: SpecialistConfig;
  security?: SpecialistConfig;
  testing?: SpecialistConfig;
  docs?: SpecialistConfig;
  research?: SpecialistConfig;
}

export interface SkillsConfig {
  auto_load?: boolean;
  disabled?: string[];
}

export interface VerificationConfig {
  run_tests_after_completion?: boolean;
  test_command?: string;
  allow_partial_success?: boolean;
  regression_check?: boolean;
}

export interface BackgroundTasksConfig {
  enabled?: boolean;
  auto_parallel_threshold?: number;
  max_concurrent_per_provider?: number;
  max_concurrent_total?: number;
  cleanup_after_ms?: number;
}

/**
 * Partial config types for deep merge
 */
export type PartialPro0Config = {
  proPlanner?: Partial<PlannerConfig>;
  proManager?: Partial<ManagerConfig>;
  specialists?: Partial<SpecialistsConfig>;
  skills?: Partial<SkillsConfig>;
  verification?: Partial<VerificationConfig>;
  background_tasks?: Partial<BackgroundTasksConfig>;
};

/**
 * Legacy executor config support (deprecated)
 */
export interface ExecutorConfig extends AgentConfig {
  max_retry_on_test_failure?: number;
  ralph_loop?: RalphLoopConfig;
}
