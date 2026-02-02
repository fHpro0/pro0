import {
  loadConfig,
  PLANNER_PROMPT,
  EXECUTOR_PROMPT,
  getSpecialistPrompt,
  ENV_SAFETY_WARNING,
  savePlan,
  loadPlan,
  runTests,
} from './index';

async function exampleUsage() {
  console.log('=== PRO0 Example Usage ===\n');

  console.log('1. Loading configuration...');
  const config = loadConfig(process.cwd());
  console.log(`   Planner model: ${config.proPlanner.model}`);
  console.log(`   Executor model: ${config.proExecutor.model}`);
  console.log(`   Specialists enabled: ${Object.entries(config.specialists)
    .filter(([_, s]) => s.enabled)
    .map(([name]) => name)
    .join(', ')}\n`);

  console.log('2. Planner Prompt:');
  console.log(PLANNER_PROMPT.substring(0, 200) + '...\n');

  console.log('3. Executor Prompt:');
  console.log(EXECUTOR_PROMPT.substring(0, 200) + '...\n');

  console.log('4. Security Specialist Prompt:');
  const securityPrompt = getSpecialistPrompt('security');
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
  console.log(`   Max retries: ${config.proExecutor.max_retry_on_test_failure}\n`);

  console.log('8. .env Safety Warning (appears in every agent prompt):');
  console.log(ENV_SAFETY_WARNING);

  console.log('✅ Example complete!');
}

exampleUsage().catch(console.error);
