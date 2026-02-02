import * as fs from 'fs';
import * as path from 'path';
import type { Pro0Config } from '../types/config';

export interface Plan {
  id: string;
  title: string;
  filePath: string;
  createdAt: Date;
  summary?: string;
  tasks?: Task[];
}

export interface Task {
  id: number;
  description: string;
  acceptanceCriteria?: string[];
  guardrails?: string[];
  completed: boolean;
}

export function ensurePlansDirectory(projectRoot: string): string {
  const plansDir = path.join(projectRoot, '.pro0', 'plans');
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }
  return plansDir;
}

export function createPlanFilename(title: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${timestamp}-${slug}.md`;
}

export function savePlan(projectRoot: string, title: string, content: string): string {
  const plansDir = ensurePlansDirectory(projectRoot);
  const filename = createPlanFilename(title);
  const filePath = path.join(plansDir, filename);

  fs.writeFileSync(filePath, content);
  console.log(`✅ Plan saved to: ${filePath}`);

  return filePath;
}

export function loadPlan(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Plan file not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf-8');
}

export function listPlans(projectRoot: string): Plan[] {
  const plansDir = path.join(projectRoot, '.pro0', 'plans');

  if (!fs.existsSync(plansDir)) {
    return [];
  }

  const files = fs.readdirSync(plansDir).filter((file) => file.endsWith('.md'));

  return files.map((file) => {
    const filePath = path.join(plansDir, file);
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

    return {
      id: file.replace('.md', ''),
      title,
      filePath,
      createdAt: stats.birthtime,
    };
  });
}

export function parseTasks(planContent: string): Task[] {
  const tasks: Task[] = [];
  const taskRegex = /^\d+\.\s+(.+?)(?:\n\s+-\s+Acceptance criteria:\s+(.+?))?(?:\n\s+-\s+Guardrails:\s+(.+?))?$/gm;

  let match;
  let taskId = 1;

  while ((match = taskRegex.exec(planContent)) !== null) {
    tasks.push({
      id: taskId++,
      description: match[1].trim(),
      acceptanceCriteria: match[2] ? [match[2].trim()] : undefined,
      guardrails: match[3] ? [match[3].trim()] : undefined,
      completed: false,
    });
  }

  return tasks;
}

export function markTaskComplete(planContent: string, taskId: number): string {
  const lines = planContent.split('\n');
  let currentTaskId = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(/^(\d+)\.\s+(.+)$/);

    if (taskMatch) {
      currentTaskId++;
      if (currentTaskId === taskId && !line.startsWith('~~')) {
        lines[i] = `~~${line}~~ ✅`;
      }
    }
  }

  return lines.join('\n');
}
