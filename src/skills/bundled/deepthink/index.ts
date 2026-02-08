import { shouldTriggerDeepthink } from './detector.js';

export { DeepthinkOrchestrator, executeDeepthink } from './orchestrator.js';
export {
  shouldTriggerDeepthink,
  analyzeQuery,
  isExplicitDeepthinkRequest,
  DeepthinkDetectionResult
} from './detector.js';
export * from './types.js';

// Skill metadata for plugin registration
export const deepthinkSkill = {
  name: 'deepthink',
  version: '1.0.0',
  description: 'Deep analytical thinking with 14-step workflow',
  detector: shouldTriggerDeepthink,
  skillPromptPath: './deepthink-skill.md'
};
