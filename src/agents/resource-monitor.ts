/**
 * Resource Monitor
 *
 * Lightweight system resource monitoring for agent throttling.
 * Uses Node.js os module -- no external dependencies.
 */

import * as os from 'os';
import type { TeamConfig, ResourceLimits } from '../types/config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResourceUsage {
  /** Memory usage as a percentage (0-100) */
  memoryPercent: number;
  /** CPU usage as a percentage (0-100) -- averaged across cores */
  cpuPercent: number;
  /** Free memory in MB */
  freeMemoryMB: number;
  /** Total memory in MB */
  totalMemoryMB: number;
  /** Number of CPU cores */
  cpuCores: number;
}

export interface ThrottleDecision {
  /** Whether agent spawning should be throttled */
  shouldThrottle: boolean;
  /** Reason for throttling (if throttled) */
  reason?: string;
  /** Recommended effective maxParallel given current resources */
  effectiveMaxParallel: number;
}

// ---------------------------------------------------------------------------
// CPU usage tracking
// ---------------------------------------------------------------------------

let lastCpuInfo: os.CpuInfo[] | null = null;

/**
 * Calculate CPU usage between two snapshots.
 * First call returns 0 (no baseline).
 */
function calculateCpuPercent(): number {
  const cpus = os.cpus();

  if (!lastCpuInfo) {
    lastCpuInfo = cpus;
    return 0; // no baseline yet
  }

  let totalIdle = 0;
  let totalTick = 0;

  for (let i = 0; i < cpus.length; i++) {
    const cpu = cpus[i];
    const prev = lastCpuInfo[i];
    if (!prev) continue;

    const idle = cpu.times.idle - prev.times.idle;
    const total =
      cpu.times.user - prev.times.user +
      cpu.times.nice - prev.times.nice +
      cpu.times.sys - prev.times.sys +
      cpu.times.irq - prev.times.irq +
      idle;

    totalIdle += idle;
    totalTick += total;
  }

  lastCpuInfo = cpus;

  if (totalTick === 0) return 0;
  return Math.round(((totalTick - totalIdle) / totalTick) * 100);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get current system resource usage.
 */
export function getResourceUsage(): ResourceUsage {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    memoryPercent: Math.round((usedMem / totalMem) * 100),
    cpuPercent: calculateCpuPercent(),
    freeMemoryMB: Math.round(freeMem / (1024 * 1024)),
    totalMemoryMB: Math.round(totalMem / (1024 * 1024)),
    cpuCores: os.cpus().length,
  };
}

/**
 * Determine if agent spawning should be throttled based on current resources.
 */
export function checkThrottle(teamConfig: TeamConfig): ThrottleDecision {
  if (!teamConfig.resourceAware) {
    return {
      shouldThrottle: false,
      effectiveMaxParallel: teamConfig.maxParallel,
    };
  }

  const usage = getResourceUsage();
  const limits: ResourceLimits = teamConfig.resourceLimits || {
    maxMemoryPercent: 80,
    maxCpuPercent: 90,
  };

  const reasons: string[] = [];
  let throttleFactor = 1.0;

  // Memory check
  if (usage.memoryPercent >= limits.maxMemoryPercent) {
    const severity = (usage.memoryPercent - limits.maxMemoryPercent) / (100 - limits.maxMemoryPercent);
    throttleFactor = Math.min(throttleFactor, Math.max(0.25, 1 - severity));
    reasons.push(
      `Memory at ${usage.memoryPercent}% (limit: ${limits.maxMemoryPercent}%)`
    );
  }

  // CPU check
  if (usage.cpuPercent >= limits.maxCpuPercent) {
    const severity = (usage.cpuPercent - limits.maxCpuPercent) / (100 - limits.maxCpuPercent);
    throttleFactor = Math.min(throttleFactor, Math.max(0.25, 1 - severity));
    reasons.push(
      `CPU at ${usage.cpuPercent}% (limit: ${limits.maxCpuPercent}%)`
    );
  }

  const effectiveMaxParallel = Math.max(
    1,
    Math.floor(teamConfig.maxParallel * throttleFactor)
  );

  return {
    shouldThrottle: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
    effectiveMaxParallel,
  };
}

/**
 * Get a human-readable resource summary.
 */
export function getResourceSummary(): string {
  const usage = getResourceUsage();
  return [
    `Memory: ${usage.memoryPercent}% (${usage.freeMemoryMB}MB free / ${usage.totalMemoryMB}MB total)`,
    `CPU: ${usage.cpuPercent}% (${usage.cpuCores} cores)`,
  ].join('\n');
}

/**
 * Reset CPU tracking baseline (useful for testing).
 */
export function resetCpuBaseline(): void {
  lastCpuInfo = null;
}
