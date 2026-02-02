import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Pro0Config, PartialPro0Config } from '../types/config';

const CONFIG_FILENAME = 'pro0.json';
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'opencode');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, CONFIG_FILENAME);

const DEFAULT_CONFIG: Pro0Config = {
  proPlanner: {
    model: 'github-copilot/claude-sonnet-4-5',
    temperature: 0.7,
  },
  proExecutor: {
    model: 'github-copilot/claude-sonnet-4-5',
    temperature: 0.3,
    max_retry_on_test_failure: 3,
    ralph_loop: {
      enabled: true,
      max_iterations: 5,
      auto_review: true,
    },
  },
  specialists: {
    styling: {
      enabled: true,
      model: 'github-copilot/gemini-2.0-flash-exp',
    },
    security: {
      enabled: true,
      model: 'github-copilot/claude-sonnet-4-5',
    },
    testing: {
      enabled: true,
      model: 'github-copilot/claude-sonnet-4-5',
    },
    docs: {
      enabled: false,
      model: 'github-copilot/gpt-4o',
    },
    research: {
      enabled: true,
      model: 'github-copilot/claude-sonnet-4-5',
    },
    'self-review': {
      enabled: true,
      model: 'github-copilot/claude-sonnet-4-5',
    },
  },
  skills: {
    auto_load: true,
    disabled: [],
  },
  verification: {
    run_tests_after_completion: true,
    test_command: 'npm test',
    allow_partial_success: false,
    regression_check: true,
  },
};

export function ensureGlobalConfigExists(): void {
  if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
    return;
  }

  if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  }

  const configWithSchema = {
    $schema: 'https://raw.githubusercontent.com/YOUR_REPO/main/pro0.schema.json',
    ...DEFAULT_CONFIG,
  };

  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(configWithSchema, null, 2));
  console.log(`✅ Created global config at: ${GLOBAL_CONFIG_PATH}`);
}

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

function loadJsonFile(filePath: string): PartialPro0Config | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse config file ${filePath}: ${error}`);
  }
}

export function loadConfig(projectRoot?: string): Pro0Config {
  ensureGlobalConfigExists();

  const globalConfig = loadJsonFile(GLOBAL_CONFIG_PATH) || {};

  let projectConfig: PartialPro0Config = {};
  if (projectRoot) {
    const projectConfigPath = path.join(projectRoot, '.opencode', CONFIG_FILENAME);
    projectConfig = loadJsonFile(projectConfigPath) || {};
  }

  // Priority: projectConfig > globalConfig > DEFAULT_CONFIG
  // deepMerge(base, override) - override wins
  let config = DEFAULT_CONFIG;
  if (Object.keys(globalConfig).length > 0) {
    config = deepMerge(DEFAULT_CONFIG, globalConfig);
  }
  if (Object.keys(projectConfig).length > 0) {
    config = deepMerge(config, projectConfig);
  }

  validateConfig(config);

  return config;
}

export function validateConfig(config: Pro0Config): void {
  if (!config.proPlanner?.model) {
    throw new Error(
      `Error: No model configured for agent 'proPlanner'. Please set 'proPlanner.model' in ${GLOBAL_CONFIG_PATH} or .opencode/${CONFIG_FILENAME}`
    );
  }

  if (!config.proExecutor?.model) {
    throw new Error(
      `Error: No model configured for agent 'proExecutor'. Please set 'proExecutor.model' in ${GLOBAL_CONFIG_PATH} or .opencode/${CONFIG_FILENAME}`
    );
  }

  const specialists = ['styling', 'security', 'testing', 'docs', 'research'] as const;
  for (const specialist of specialists) {
    const specialistConfig = config.specialists[specialist];
    if (specialistConfig.enabled && !specialistConfig.model) {
      throw new Error(
        `Error: No model configured for enabled specialist '${specialist}'. Please set 'specialists.${specialist}.model' in ${GLOBAL_CONFIG_PATH} or .opencode/${CONFIG_FILENAME}`
      );
    }
  }
}

export function getGlobalConfigPath(): string {
  return GLOBAL_CONFIG_PATH;
}

export function getProjectConfigPath(projectRoot: string): string {
  return path.join(projectRoot, '.opencode', CONFIG_FILENAME);
}
