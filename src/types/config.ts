/**
 * PRO0 Configuration Type Definitions
 */

export interface Pro0Config {
  proPlanner: AgentConfig;
  proExecutor: ExecutorConfig;
  specialists: SpecialistsConfig;
  skills?: SkillsConfig;
  verification?: VerificationConfig;
}

export interface AgentConfig {
  model: string;
  temperature?: number;
  top_p?: number;
}

export interface ExecutorConfig extends AgentConfig {
  max_retry_on_test_failure?: number;
  ralph_loop?: RalphLoopConfig;
}

export interface RalphLoopConfig {
  enabled?: boolean;
  max_iterations?: number;
  auto_review?: boolean;
}

export interface SpecialistConfig extends AgentConfig {
  enabled: boolean;
}

export interface SpecialistsConfig {
  styling: SpecialistConfig;
  security: SpecialistConfig;
  testing: SpecialistConfig;
  docs: SpecialistConfig;
  research: SpecialistConfig;
  'self-review'?: SpecialistConfig;
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

/**
 * Partial config types for deep merge
 */
export type PartialPro0Config = {
  proPlanner?: Partial<AgentConfig>;
  proExecutor?: Partial<ExecutorConfig>;
  specialists?: Partial<SpecialistsConfig>;
  skills?: Partial<SkillsConfig>;
  verification?: Partial<VerificationConfig>;
};
