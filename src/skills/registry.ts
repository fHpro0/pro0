import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { qmdSkill } from './bundled/qmd/index.js';
import { deepthinkSkill } from './bundled/deepthink/index.js';
import { loadConfig } from '../config/loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SkillRegistration {
  name: string;
  version: string;
  description: string;
  detector: (query: string) => boolean;
  skillPromptPath: string;
  enabled: boolean;
}

/**
 * Get all registered skills
 */
export function getRegisteredSkills(): SkillRegistration[] {
  const config = loadConfig(process.cwd());
  const qmdEnabled = config.skills?.qmd?.enabled ?? true;
  const deepthinkEnabled = config.skills?.deepthink?.enabled ?? true;

  return [
    {
      ...qmdSkill,
      enabled: qmdEnabled,
    },
    {
      ...deepthinkSkill,
      enabled: deepthinkEnabled,
    },
  ];
}

/**
 * Check if any skill should be triggered for a query
 */
export function detectSkillForQuery(query: string): SkillRegistration | null {
  const skills = getRegisteredSkills();

  for (const skill of skills) {
    if (skill.enabled && skill.detector(query)) {
      return skill;
    }
  }

  return null;
}

/**
 * Get skill by name
 */
export function getSkill(name: string): SkillRegistration | null {
  const skills = getRegisteredSkills();
  return skills.find((skill) => skill.name === name) || null;
}

/**
 * Load skill prompt content
 */
export async function loadSkillPrompt(skillName: string): Promise<string | null> {
  const skill = getSkill(skillName);
  if (!skill) return null;

  try {
    const promptPath = path.join(__dirname, 'bundled', skillName, skill.skillPromptPath);
    return await readFile(promptPath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load skill prompt for ${skillName}:`, error);
    return null;
  }
}
