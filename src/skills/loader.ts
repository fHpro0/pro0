import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Skill {
  name: string;
  path: string;
  manifest: SkillManifest;
}

export interface SkillManifest {
  name: string;
  version: string;
  description?: string;
  prompts?: string[];
}

const GLOBAL_SKILLS_DIR = path.join(os.homedir(), '.config', 'opencode', 'skills');

function scanSkillsDirectory(dir: string): Skill[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const skills: Skill[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillPath = path.join(dir, entry.name);
    const manifestPath = path.join(skillPath, 'skill.json');

    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest: SkillManifest = JSON.parse(manifestContent);

      skills.push({
        name: manifest.name || entry.name,
        path: skillPath,
        manifest,
      });
    } catch (error) {
      console.warn(`Warning: Failed to load skill manifest at ${manifestPath}:`, error);
    }
  }

  return skills;
}

export function loadSkills(projectRoot?: string, disabledSkills: string[] = []): Skill[] {
  const globalSkills = scanSkillsDirectory(GLOBAL_SKILLS_DIR);

  let projectSkills: Skill[] = [];
  if (projectRoot) {
    const projectSkillsDir = path.join(projectRoot, '.opencode', 'skills');
    projectSkills = scanSkillsDirectory(projectSkillsDir);
  }

  const allSkills = [...globalSkills, ...projectSkills];

  const enabledSkills = allSkills.filter((skill) => !disabledSkills.includes(skill.name));

  return enabledSkills;
}

export function getSkillPrompts(skills: Skill[]): string[] {
  const prompts: string[] = [];

  for (const skill of skills) {
    if (!skill.manifest.prompts) continue;

    for (const promptFile of skill.manifest.prompts) {
      const promptPath = path.join(skill.path, promptFile);
      if (!fs.existsSync(promptPath)) {
        console.warn(`Warning: Skill prompt file not found: ${promptPath}`);
        continue;
      }

      try {
        const promptContent = fs.readFileSync(promptPath, 'utf-8');
        prompts.push(promptContent);
      } catch (error) {
        console.warn(`Warning: Failed to read skill prompt at ${promptPath}:`, error);
      }
    }
  }

  return prompts;
}
