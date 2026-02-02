/**
 * Skill indexing system for efficient skill discovery
 * Reduces token usage by loading only metadata upfront
 */

import type { Skill, SkillManifest } from './loader.js';

export interface SkillIndexEntry {
  name: string;
  description: string;
  tags: string[];
  source: 'global' | 'project';
}

export interface SkillIndex {
  entries: SkillIndexEntry[];
  totalSkills: number;
}

/**
 * Create lightweight skill index from full skill objects
 * Extracts only essential metadata for token-efficient discovery
 */
export function createSkillIndex(skills: Skill[]): SkillIndex {
  const entries: SkillIndexEntry[] = skills.map(skill => ({
    name: skill.name,
    description: skill.manifest.description || 'No description',
    tags: extractTags(skill),
    source: skill.path.includes('.opencode') ? 'project' : 'global'
  }));

  return {
    entries,
    totalSkills: skills.length
  };
}

/**
 * Extract tags from skill manifest for searchability
 */
function extractTags(skill: Skill): string[] {
  const tags: string[] = [];
  
  // Extract from skill name (e.g., "git-master" -> ["git", "master"])
  tags.push(...skill.name.split(/[-_]/));
  
  // Extract keywords from description
  const desc = skill.manifest.description || '';
  const keywords = desc.toLowerCase().match(/\b(test|git|ui|ux|frontend|backend|security|auth|api|database|css|style)\b/g);
  if (keywords) {
    tags.push(...keywords);
  }
  
  // Deduplicate
  return [...new Set(tags)];
}

/**
 * Search skill index by query string or tags
 */
export function searchSkills(index: SkillIndex, query: string): SkillIndexEntry[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  return index.entries
    .map(entry => ({
      entry,
      score: calculateRelevanceScore(entry, queryWords)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry)
    .slice(0, 10); // Top 10 results
}

/**
 * Calculate relevance score for ranking
 */
function calculateRelevanceScore(entry: SkillIndexEntry, queryWords: string[]): number {
  let score = 0;
  
  for (const word of queryWords) {
    // Exact name match = highest score
    if (entry.name.toLowerCase().includes(word)) {
      score += 10;
    }
    
    // Description match = medium score
    if (entry.description.toLowerCase().includes(word)) {
      score += 5;
    }
    
    // Tag match = lower score
    if (entry.tags.some(tag => tag.includes(word))) {
      score += 3;
    }
  }
  
  return score;
}

/**
 * Format skill index for agent prompt (token-efficient)
 */
export function formatSkillIndexForPrompt(index: SkillIndex, limit: number = 15): string {
  const lines: string[] = [
    '## Available Skills',
    '',
    `Total: ${index.totalSkills} skills available. Showing top ${Math.min(limit, index.entries.length)}:`,
    ''
  ];
  
  // Group by source
  const globalSkills = index.entries.filter(e => e.source === 'global').slice(0, limit);
  const projectSkills = index.entries.filter(e => e.source === 'project').slice(0, limit);
  
  if (globalSkills.length > 0) {
    lines.push('**Global Skills:**');
    for (const skill of globalSkills) {
      lines.push(`- \`${skill.name}\`: ${skill.description}`);
    }
    lines.push('');
  }
  
  if (projectSkills.length > 0) {
    lines.push('**Project Skills:**');
    for (const skill of projectSkills) {
      lines.push(`- \`${skill.name}\`: ${skill.description}`);
    }
    lines.push('');
  }
  
  lines.push('**Usage:**');
  lines.push('```typescript');
  lines.push('// Load specific skills for a task');
  lines.push('delegate_task(');
  lines.push('  category="quick",');
  lines.push('  load_skills=["git-master", "coding-standards"],');
  lines.push('  prompt="..."');
  lines.push(')');
  lines.push('```');
  lines.push('');
  lines.push('Use `searchSkills(query)` to find relevant skills for your task.');
  
  return lines.join('\n');
}

/**
 * Get full skill content by name (lazy loading)
 */
export function getSkillByName(skills: Skill[], name: string): Skill | undefined {
  return skills.find(s => s.name === name);
}
