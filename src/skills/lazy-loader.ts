/**
 * Lazy skill loading mechanism
 * Loads full skill content only when explicitly requested
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Skill, SkillManifest } from './loader.js';

export interface LazySkillCache {
  [skillName: string]: {
    content: string;
    loadedAt: number;
  };
}

const skillCache: LazySkillCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load full skill content on-demand
 * Caches results to avoid repeated file reads
 */
export function loadSkillContent(skill: Skill, force: boolean = false): string {
  const cached = skillCache[skill.name];
  
  // Return from cache if fresh
  if (!force && cached && (Date.now() - cached.loadedAt < CACHE_TTL)) {
    return cached.content;
  }
  
  // Load prompts from disk
  const prompts: string[] = [];
  
  if (skill.manifest.prompts) {
    for (const promptFile of skill.manifest.prompts) {
      const promptPath = join(skill.path, promptFile);
      
      if (!existsSync(promptPath)) {
        console.warn(`[LazyLoader] Skill prompt not found: ${promptPath}`);
        continue;
      }
      
      try {
        const content = readFileSync(promptPath, 'utf-8');
        prompts.push(content);
      } catch (err) {
        console.warn(`[LazyLoader] Failed to read ${promptPath}:`, err);
      }
    }
  }
  
  const fullContent = prompts.join('\n\n---\n\n');
  
  // Cache for reuse
  skillCache[skill.name] = {
    content: fullContent,
    loadedAt: Date.now()
  };
  
  return fullContent;
}

/**
 * Load multiple skills in batch
 */
export function loadSkillsBatch(skills: Skill[]): Map<string, string> {
  const results = new Map<string, string>();
  
  for (const skill of skills) {
    const content = loadSkillContent(skill);
    results.set(skill.name, content);
  }
  
  return results;
}

/**
 * Clear skill cache (useful for testing or manual refresh)
 */
export function clearSkillCache(skillName?: string): void {
  if (skillName) {
    delete skillCache[skillName];
  } else {
    // Clear all
    for (const key in skillCache) {
      delete skillCache[key];
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { totalCached: number; skills: string[] } {
  const skills = Object.keys(skillCache);
  return {
    totalCached: skills.length,
    skills
  };
}

/**
 * Preload commonly used skills for faster access
 */
export function preloadCommonSkills(allSkills: Skill[], commonSkillNames: string[]): void {
  const commonSkills = allSkills.filter(s => commonSkillNames.includes(s.name));
  
  for (const skill of commonSkills) {
    loadSkillContent(skill);
  }
  
  console.log(`[LazyLoader] Preloaded ${commonSkills.length} common skills`);
}

/**
 * Format lazy loading info for agent prompt
 */
export function formatLazyLoadingInfo(): string {
  const stats = getCacheStats();
  
  return [
    '## Skill Loading',
    '',
    'Skills are loaded lazily to optimize token usage:',
    '',
    '**Current Cache:**',
    `- Cached skills: ${stats.totalCached}`,
    stats.skills.length > 0 ? `- Skills: ${stats.skills.join(', ')}` : '',
    '',
    '**Usage:**',
    '```typescript',
    '// Specify skills to load for a task',
    'delegate_task(',
    '  category="quick",',
    '  load_skills=["git-master", "coding-standards"],  // Only these are loaded',
    '  prompt="Fix the merge conflict in src/app.ts"',
    ')',
    '```',
    '',
    '**Benefits:**',
    '- Only load skills you actually use',
    '- Reduces system prompt size by 80-90%',
    '- Faster agent initialization',
    '- More tokens available for actual work'
  ].filter(Boolean).join('\n');
}
