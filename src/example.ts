import { loadConfig } from './config/loader.js';
import { savePlan, loadPlan } from './planner/plan-manager.js';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agentsDir = path.join(__dirname, 'agents');

let sharedTemplates: { securityWarning: string; todowriteTemplate: string } | null = null;

async function readAgentPrompt(fileName: string): Promise<string> {
  const fullPath = path.join(agentsDir, fileName);
  let raw = await readFile(fullPath, 'utf-8');

  // Strip frontmatter
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      raw = raw.slice(end + 4).trimStart();
    }
  }

  if (!sharedTemplates) {
    sharedTemplates = {
      securityWarning: await readFile(
        path.join(agentsDir, '_shared', 'security-warning.md'),
        'utf-8'
      ),
      todowriteTemplate: await readFile(
        path.join(agentsDir, '_shared', 'todowrite-template.md'),
        'utf-8'
      ),
    };
  }

  raw = raw.replace(/\{SECURITY_WARNING\}/g, sharedTemplates.securityWarning);

  const todowritePattern = /\{TODOWRITE_TEMPLATE\}\s*TRIGGERS:\s*([^\n]+)\s*THRESHOLD:\s*([^\n]+)/g;
  raw = raw.replace(todowritePattern, (match, triggers, threshold) => {
    return sharedTemplates!
      .todowriteTemplate.replace('{TRIGGERS}', triggers.trim())
      .replace('{THRESHOLD}', threshold.trim())
      .replace('{EXAMPLE_TASK_1}', 'Complete first task')
      .replace('{EXAMPLE_TASK_2}', 'Complete second task');
  });

  return raw;
}

async function exampleUsage() {
  console.log('=== PRO0 Example Usage ===\n');

  console.log('1. Loading configuration...');
  const config = loadConfig(process.cwd());
  console.log(`   Planner model: ${config.proPlanner.model}`);
  console.log(`   Manager model: ${config.proManager.model}`);
  console.log(`   Specialists enabled: ${Object.entries(config.specialists)
    .filter(([_, s]) => s.enabled)
    .map(([name]) => name)
    .join(', ')}\n`);

  const plannerPrompt = await readAgentPrompt('planner.md');
  const managerPrompt = await readAgentPrompt('manager.md');
  const securityPrompt = await readAgentPrompt('specialists/security-auditor.md');
  const envWarning = await readFile(path.join(agentsDir, '_shared', 'security-warning.md'), 'utf-8');

  console.log('2. Planner Prompt:');
  console.log(plannerPrompt.substring(0, 200) + '...\n');

  console.log('3. Manager Prompt:');
  console.log(managerPrompt.substring(0, 200) + '...\n');

  console.log('4. Security Auditor Prompt:');
  console.log(securityPrompt.substring(0, 200) + '...\n');

  console.log('5. Creating a sample plan...');
  const planContent = `# Add User Authentication

## Summary
- Implement JWT-based authentication
- Add login/register endpoints
- Protect existing routes

## Tasks
1. Create auth middleware
   - Acceptance criteria: Validates JWT tokens
   - Guardrails: Never store tokens in localStorage

2. Add login endpoint
   - Acceptance criteria: Returns JWT on valid credentials
   - Guardrails: Rate limit login attempts

## Verification
- Write tests for auth middleware
- Test protected routes
- Verify logout clears session
`;

  const planPath = savePlan(process.cwd(), 'Add User Authentication', planContent);
  console.log(`   Plan saved to: ${planPath}\n`);

  console.log('6. Loading the plan...');
  const loadedPlan = loadPlan(planPath);
  console.log(`   Plan loaded (${loadedPlan.length} bytes)\n`);

  console.log('7. Verification example:');
  console.log('   (Simulated - would run actual tests in production)');
  console.log(`   Test command: ${config.verification?.test_command}`);
  console.log(`   Regression check: ${config.verification?.regression_check}`);
  console.log(`   Max retries: ${config.proManager.max_retry_on_test_failure}\n`);

  console.log('8. .env Safety Warning (appears in every agent prompt):');
  console.log(envWarning);

  console.log('✅ Example complete!');
}

exampleUsage().catch(console.error);
