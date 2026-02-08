import { spawn } from 'child_process';
import { loadConfig } from '../../../config/loader.js';
import type { QmdSkillConfig } from '../../../types/config.js';

export interface SearchResult {
  path: string;
  score: number;
  snippet: string;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  error?: Error & { code?: string };
}

function getQmdConfig(): QmdSkillConfig {
  const config = loadConfig(process.cwd());
  return config.skills?.qmd ?? {
    enabled: true,
    searchMode: 'bm25',
    minScore: 0.3,
    timeout: 30000,
    mcp: {
      enabled: false,
      command: '',
      args: [],
    },
  };
}

function runQmdCommand(args: string[], timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('qmd', args, {
      stdio: 'pipe',
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode, timedOut });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode: null, timedOut, error });
    });
  });
}

function normalizeSearchResults(payload: unknown): SearchResult[] {
  const rawResults = Array.isArray(payload)
    ? payload
    : (payload as { results?: unknown[]; matches?: unknown[] })?.results ||
      (payload as { results?: unknown[]; matches?: unknown[] })?.matches ||
      [];

  if (!Array.isArray(rawResults)) {
    return [];
  }

  return rawResults
    .map((result) => {
      const item = result as Record<string, unknown>;
      const path =
        (item.path as string) ||
        (item.file as string) ||
        (item.document as string) ||
        (item.source as string) ||
        '';
      const scoreRaw = item.score as number | string | undefined;
      const score = typeof scoreRaw === 'number' ? scoreRaw : Number(scoreRaw);
      const snippet =
        (item.snippet as string) ||
        (item.excerpt as string) ||
        (item.text as string) ||
        (item.preview as string) ||
        '';

      if (!path || Number.isNaN(score)) {
        return null;
      }

      return { path, score, snippet } as SearchResult;
    })
    .filter((result): result is SearchResult => Boolean(result));
}

export async function checkQmdInstalled(): Promise<boolean> {
  const config = getQmdConfig();
  const timeoutMs = Math.min(config.timeout, 5000);
  const result = await runQmdCommand(['--version'], timeoutMs);

  if (result.timedOut) {
    console.error('[qmd] Version check timed out.');
    return false;
  }

  if (result.error?.code === 'ENOENT') {
    return false;
  }

  return result.exitCode === 0;
}

export async function executeQmdSearch(
  query: string,
  options?: { mode?: 'bm25' | 'semantic' | 'hybrid'; minScore?: number; timeout?: number }
): Promise<SearchResult[]> {
  const config = getQmdConfig();
  const mode = options?.mode || config.searchMode || 'bm25';
  const minScore = options?.minScore ?? config.minScore;
  const timeoutMs = options?.timeout ?? config.timeout;

  const args = [
    'search',
    `--mode=${mode}`,
    `--min-score=${minScore}`,
    '--format=json',
    query,
  ];

  const result = await runQmdCommand(args, timeoutMs);

  if (result.timedOut) {
    console.error('[qmd] Search timed out.');
    return [];
  }

  if (result.error?.code === 'ENOENT') {
    console.error('[qmd] qmd is not installed or not in PATH.');
    return [];
  }

  if (result.exitCode !== 0) {
    console.error(`[qmd] Search failed: ${result.stderr || result.stdout}`);
    return [];
  }

  if (!result.stdout.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(result.stdout);
    return normalizeSearchResults(parsed);
  } catch (error) {
    console.error(`[qmd] Failed to parse search output: ${String(error)}`);
    return [];
  }
}

export async function executeQmdGet(
  path: string,
  options?: { timeout?: number }
): Promise<string> {
  const config = getQmdConfig();
  const timeoutMs = options?.timeout ?? config.timeout;
  const result = await runQmdCommand(['get', path], timeoutMs);

  if (result.timedOut) {
    console.error('[qmd] Get timed out.');
    return '';
  }

  if (result.error?.code === 'ENOENT') {
    console.error('[qmd] qmd is not installed or not in PATH.');
    return '';
  }

  if (result.exitCode !== 0) {
    console.error(`[qmd] Get failed: ${result.stderr || result.stdout}`);
    return '';
  }

  return result.stdout;
}
