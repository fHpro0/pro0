import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  Pro0Config,
  PartialPro0Config,
  TeamConfig,
  TemplatesConfig,
} from '../types/config.js';

const CONFIG_FILENAME = 'pro0.json';
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'opencode');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, CONFIG_FILENAME);

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Pro0Config = {
  proManager: {
    model: 'github-copilot/claude-sonnet-4-5',
    temperature: 0.3,
    max_retry_on_test_failure: 3,
    coding_allowed: false,
    mandatory_todos: true,
    planning: {
      require_approval: true,
      auto_prd: true,
      prd_directory: '.pro0/prds',
    },
    ralph_loop: {
      enabled: true,
      max_iterations: 5,
      auto_review: true,
      continuation: {
        enabled: true,
        ask_user_at_max: true,
        default_extension: 5,
      },
    },
  },

  team: {
    maxParallel: 3,
    maxTotal: 10,
    resourceAware: true,
    resourceLimits: {
      maxMemoryPercent: 80,
      maxCpuPercent: 90,
    },
    categories: {
      coding: {
        name: 'Coding',
        description: 'Implementation, refactoring, bug fixes',
        defaultModel: 'github-copilot/claude-sonnet-4-5',
        defaultTemperature: 0.3,
        defaultTools: { write: true, edit: true, bash: true },
      },
      review: {
        name: 'Review & QA',
        description: 'Code review, testing, security auditing',
        defaultModel: 'github-copilot/claude-sonnet-4-5',
        defaultTemperature: 0.2,
        defaultTools: { write: true, edit: true, bash: true },
      },
      research: {
        name: 'Research & Analysis',
        description: 'Documentation reading, web research, codebase exploration',
        defaultModel: 'github-copilot/claude-haiku-4-5',
        defaultTemperature: 0.4,
        defaultTools: { write: false, edit: false, bash: false },
      },
      ops: {
        name: 'Operations',
        description: 'CI/CD, deployment, infrastructure',
        defaultModel: 'github-copilot/gpt-5.2',
        defaultTemperature: 0.3,
        defaultTools: { write: true, edit: true, bash: true },
      },
      design: {
        name: 'Design & UI',
        description: 'UI/UX design, styling, layouts, animations',
        defaultModel: 'github-copilot/gemini-3-pro-preview',
        defaultTemperature: 0.7,
        defaultTools: { write: true, edit: true, bash: true },
      },
    },
  },

  templates: {
    designer: {
      enabled: true,
      model: 'github-copilot/gemini-3-pro-preview',
      temperature: 0.7,
      scope: 'frontend-components',
      category: 'design',
    },
    'frontend-coder': {
      enabled: true,
      model: 'github-copilot/gpt-5.2-codex',
      temperature: 0.3,
      category: 'coding',
    },
    'backend-coder': {
      enabled: true,
      model: 'github-copilot/gpt-5.2-codex',
      temperature: 0.3,
      category: 'coding',
    },
    'database-coder': {
      enabled: true,
      model: 'github-copilot/claude-sonnet-4-5',
      temperature: 0.2,
      category: 'coding',
    },
    'api-coder': {
      enabled: true,
      model: 'github-copilot/claude-sonnet-4-5',
      temperature: 0.3,
      category: 'coding',
    },
    tester: {
      enabled: true,
      model: 'github-copilot/claude-sonnet-4-5',
      temperature: 0.3,
      category: 'review',
    },
    'security-auditor': {
      enabled: true,
      model: 'github-copilot/claude-sonnet-4-5',
      temperature: 0.2,
      category: 'review',
    },
    'devops-engineer': {
      enabled: true,
      model: 'github-copilot/gpt-5.2',
      temperature: 0.3,
      category: 'ops',
    },
    'documentation-writer': {
      enabled: true,
      model: 'github-copilot/gpt-5.2',
      temperature: 0.5,
      category: 'research',
    },
    'document-viewer': {
      enabled: true,
      model: 'github-copilot/gemini-3-flash-preview',
      temperature: 0.3,
      category: 'research',
    },
    researcher: {
      enabled: true,
      model: 'github-copilot/claude-haiku-4-5',
      temperature: 0.4,
      category: 'research',
    },
    'self-review': {
      enabled: true,
      model: 'github-copilot/gpt-5.2-codex',
      temperature: 0.75,
      category: 'review',
    },
  },

  skills: {
    auto_load: true,
    disabled: [],
    qmd: {
      enabled: true,
      searchMode: 'bm25',
      minScore: 0.3,
      timeout: 30000,
      mcp: {
        enabled: false,
        command: '',
        args: [],
      },
    },
    deepthink: {
      enabled: true,
      defaultMode: 'auto',
      maxIterations: 5,
      subAgentModel: 'github-copilot/claude-sonnet-4-5',
    },
  },

  verification: {
    run_tests_after_completion: true,
    test_command: 'npm test',
    allow_partial_success: false,
    regression_check: true,
  },
};

// ---------------------------------------------------------------------------
// Global config bootstrap
// ---------------------------------------------------------------------------

export function ensureGlobalConfigExists(): void {
  if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
    return;
  }

  if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  }

  const configWithSchema = {
    $schema: 'https://raw.githubusercontent.com/fHpro0/pro0/main/pro0.schema.json',
    ...DEFAULT_CONFIG,
  };

  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(configWithSchema, null, 2));
  console.log(`[PRO0] Created global config at: ${GLOBAL_CONFIG_PATH}`);
}

// ---------------------------------------------------------------------------
// Deep merge utility
// ---------------------------------------------------------------------------

function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Legacy config migration
// ---------------------------------------------------------------------------

/**
 * Migrate v0.2 config (proPlanner + specialists + background_tasks) to v0.3
 * (proManager-only + team + templates).
 */
function migrateConfig(raw: PartialPro0Config): PartialPro0Config {
  const migrated: PartialPro0Config = { ...raw };
  let didMigrate = false;

  // Migrate proPlanner -> merge planning settings into proManager
  if (raw.proPlanner) {
    console.log('[PRO0] Migrating legacy proPlanner config into proManager.planning');
    const planner = raw.proPlanner as Record<string, any>;
    if (!migrated.proManager) migrated.proManager = {};
    if (!migrated.proManager.planning) migrated.proManager.planning = {};

    if (planner.prd_workflow) {
      migrated.proManager.planning.require_approval = planner.prd_workflow.require_approval;
      migrated.proManager.planning.auto_prd = planner.prd_workflow.enabled;
    }

    delete migrated.proPlanner;
    didMigrate = true;
  }

  // Migrate specialists -> templates
  if (raw.specialists) {
    console.log('[PRO0] Migrating legacy specialists config to templates');
    // Map old short names to new names
    const aliasMap: Record<string, string> = {
      styling: 'designer',
      security: 'security-auditor',
      testing: 'tester',
      docs: 'documentation-writer',
      research: 'researcher',
    };

    const specialists = raw.specialists as Record<string, any>;
    if (!migrated.templates) migrated.templates = {};

    for (const [key, value] of Object.entries(specialists)) {
      const resolvedKey = aliasMap[key] || key;
      (migrated.templates as any)[resolvedKey] = value;
    }

    delete migrated.specialists;
    didMigrate = true;
  }

  // Migrate background_tasks -> team limits
  if (raw.background_tasks) {
    console.log('[PRO0] Migrating legacy background_tasks config to team limits');
    const bg = raw.background_tasks as Record<string, any>;
    if (!migrated.team) migrated.team = {} as any;

    if (bg.max_concurrent_total !== undefined) {
      migrated.team!.maxParallel = bg.max_concurrent_total;
    }
    if (bg.max_concurrent_per_provider !== undefined) {
      migrated.team!.maxTotal = bg.max_concurrent_per_provider * 2;
    }

    delete migrated.background_tasks;
    didMigrate = true;
  }

  if (didMigrate) {
    console.log('[PRO0] Legacy config migrated. Consider updating your pro0.json to the new format.');
  }

  return migrated;
}

// ---------------------------------------------------------------------------
// File loading
// ---------------------------------------------------------------------------

function loadJsonFile(filePath: string): PartialPro0Config | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    // Strip $schema key
    delete parsed.$schema;
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse config file ${filePath}: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export function loadConfig(projectRoot?: string): Pro0Config {
  ensureGlobalConfigExists();

  let globalConfig = loadJsonFile(GLOBAL_CONFIG_PATH) || {};
  globalConfig = migrateConfig(globalConfig);

  let projectConfig: PartialPro0Config = {};
  if (projectRoot) {
    const projectConfigPath = path.join(projectRoot, '.opencode', CONFIG_FILENAME);
    const raw = loadJsonFile(projectConfigPath) || {};
    projectConfig = migrateConfig(raw);
  }

  // Priority: projectConfig > globalConfig > DEFAULT_CONFIG
  let config: Pro0Config = DEFAULT_CONFIG;
  if (Object.keys(globalConfig).length > 0) {
    config = deepMerge(DEFAULT_CONFIG, globalConfig);
  }
  if (Object.keys(projectConfig).length > 0) {
    config = deepMerge(config, projectConfig);
  }

  validateConfig(config);

  return config;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateConfig(config: Pro0Config): void {
  // Manager must have a model
  if (!config.proManager?.model) {
    throw new Error(
      `Error: No model configured for agent 'proManager'. Please set 'proManager.model' in ${GLOBAL_CONFIG_PATH} or .opencode/${CONFIG_FILENAME}`
    );
  }

  // Team config
  if (config.team) {
    if (config.team.maxParallel < 1) {
      throw new Error('Error: team.maxParallel must be at least 1');
    }
    if (config.team.maxTotal < 1) {
      throw new Error('Error: team.maxTotal must be at least 1');
    }
    if (config.team.maxParallel > config.team.maxTotal) {
      throw new Error('Error: team.maxParallel cannot exceed team.maxTotal');
    }

    // Validate categories
    for (const [key, cat] of Object.entries(config.team.categories)) {
      if (!cat.defaultModel) {
        throw new Error(`Error: No defaultModel for category '${key}'`);
      }
    }

    // Validate resource limits
    if (config.team.resourceLimits) {
      const rl = config.team.resourceLimits;
      if (rl.maxMemoryPercent < 10 || rl.maxMemoryPercent > 100) {
        throw new Error('Error: team.resourceLimits.maxMemoryPercent must be between 10 and 100');
      }
      if (rl.maxCpuPercent < 10 || rl.maxCpuPercent > 100) {
        throw new Error('Error: team.resourceLimits.maxCpuPercent must be between 10 and 100');
      }
    }
  }

  // Validate enabled templates have models
  if (config.templates) {
    for (const [key, tpl] of Object.entries(config.templates)) {
      if (tpl?.enabled && !tpl.model) {
        // Try to resolve from category
        if (tpl.category && config.team?.categories[tpl.category]) {
          // OK -- will use category default
        } else {
          throw new Error(
            `Error: No model configured for enabled template '${key}'. Set a model or assign a valid category.`
          );
        }
      }
    }
  }

  // Skills validation
  const qmdConfig = config.skills?.qmd;
  if (qmdConfig) {
    const allowedSearchModes = ['bm25', 'semantic', 'hybrid'] as const;
    if (!allowedSearchModes.includes(qmdConfig.searchMode)) {
      throw new Error(
        `Error: Invalid qmd searchMode '${qmdConfig.searchMode}'. Expected one of ${allowedSearchModes.join(', ')}`
      );
    }
    if (typeof qmdConfig.minScore !== 'number' || Number.isNaN(qmdConfig.minScore)) {
      throw new Error('Error: qmd minScore must be a number');
    }
    if (typeof qmdConfig.timeout !== 'number' || Number.isNaN(qmdConfig.timeout)) {
      throw new Error('Error: qmd timeout must be a number');
    }
  }

  const deepthinkConfig = config.skills?.deepthink;
  if (deepthinkConfig) {
    const allowedDefaultModes = ['full', 'quick', 'auto'] as const;
    if (!allowedDefaultModes.includes(deepthinkConfig.defaultMode)) {
      throw new Error(
        `Error: Invalid deepthink defaultMode '${deepthinkConfig.defaultMode}'. Expected one of ${allowedDefaultModes.join(', ')}`
      );
    }
    if (typeof deepthinkConfig.maxIterations !== 'number' || Number.isNaN(deepthinkConfig.maxIterations)) {
      throw new Error('Error: deepthink maxIterations must be a number');
    }
    if (
      deepthinkConfig.timeout !== undefined &&
      (typeof deepthinkConfig.timeout !== 'number' || Number.isNaN(deepthinkConfig.timeout))
    ) {
      throw new Error('Error: deepthink timeout must be a number');
    }
  }
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

export function getGlobalConfigPath(): string {
  return GLOBAL_CONFIG_PATH;
}

export function getProjectConfigPath(projectRoot: string): string {
  return path.join(projectRoot, '.opencode', CONFIG_FILENAME);
}

export function getProjectAgentsDir(projectRoot: string): string {
  return path.join(projectRoot, '.pro0', 'agents');
}

export function ensureProjectAgentsDir(projectRoot: string): string {
  const dir = getProjectAgentsDir(projectRoot);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
