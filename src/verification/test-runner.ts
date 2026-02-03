import { spawn } from 'child_process';
import type { Pro0Config } from '../types/config';

export interface TestResult {
  passed: boolean;
  output: string;
  exitCode: number;
  duration: number;
}

export async function runTests(config: Pro0Config, projectRoot: string): Promise<TestResult> {
  const testCommand = config.verification?.test_command || 'npm test';
  const startTime = Date.now();

  return new Promise((resolve) => {
    const [command, ...args] = testCommand.split(' ');
    const testProcess = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
    });

    let output = '';

    testProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr?.on('data', (data) => {
      output += data.toString();
    });

    testProcess.on('close', (exitCode) => {
      const duration = Date.now() - startTime;

      resolve({
        passed: exitCode === 0,
        output,
        exitCode: exitCode || 0,
        duration,
      });
    });

    testProcess.on('error', (error) => {
      const duration = Date.now() - startTime;

      resolve({
        passed: false,
        output: `Error running tests: ${error.message}\n${output}`,
        exitCode: 1,
        duration,
      });
    });
  });
}

export function analyzeTestFailures(testOutput: string): string[] {
  const failures: string[] = [];
  const failurePatterns = [
    /FAIL\s+(.+)/g,
    /Error:\s+(.+)/g,
    /AssertionError:\s+(.+)/g,
    /Expected\s+(.+?)\s+to\s+(.+)/g,
  ];

  for (const pattern of failurePatterns) {
    let match;
    while ((match = pattern.exec(testOutput)) !== null) {
      failures.push(match[0]);
    }
  }

  return failures;
}

export function shouldRetry(
  config: Pro0Config,
  attemptNumber: number,
  testResult: TestResult
): boolean {
  const maxRetries = config.proManager.max_retry_on_test_failure || 3;
  const allowPartialSuccess = config.verification?.allow_partial_success || false;

  if (testResult.passed) {
    return false;
  }

  if (allowPartialSuccess) {
    return false;
  }

  return attemptNumber < maxRetries;
}
