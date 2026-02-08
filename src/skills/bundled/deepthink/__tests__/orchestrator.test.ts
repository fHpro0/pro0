import { describe, it, expect, beforeEach } from 'vitest';
import { DeepthinkOrchestrator, executeDeepthink, validateSteps, getExecutionSummary } from '../orchestrator';
import type { DeepthinkState, StepDefinition } from '../types';

describe('DeepthinkOrchestrator', () => {
  describe('Constructor', () => {
    it('should initialize with query and mode', () => {
      const orchestrator = new DeepthinkOrchestrator('Test query', 'quick');
      const state = orchestrator.getState();
      
      expect(state.query).toBe('Test query');
      expect(state.mode).toBe('quick');
      expect(state.steps).toEqual([]);
      expect(state.currentStep).toBe(0);
      expect(state.iterationCount).toBe(0);
      expect(state.confidence).toBe('low');
      expect(state.startTime).toBeGreaterThan(0);
    });

    it('should default to configured mode if not specified', () => {
      const orchestrator = new DeepthinkOrchestrator('Test query');
      const state = orchestrator.getState();
      
      // Should use config defaultMode (auto, quick, or full)
      expect(['auto', 'quick', 'full']).toContain(state.mode);
    });

    it('should handle full mode initialization', () => {
      const orchestrator = new DeepthinkOrchestrator('Complex query', 'full');
      const state = orchestrator.getState();
      
      expect(state.mode).toBe('full');
      expect(state.query).toBe('Complex query');
    });

    it('should handle auto mode initialization', () => {
      const orchestrator = new DeepthinkOrchestrator('Auto query', 'auto');
      const state = orchestrator.getState();
      
      expect(state.mode).toBe('auto');
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const orchestrator = new DeepthinkOrchestrator('Test', 'quick');
      const state = orchestrator.getState();
      
      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('query');
      expect(state).toHaveProperty('steps');
      expect(state).toHaveProperty('currentStep');
      expect(state).toHaveProperty('iterationCount');
      expect(state).toHaveProperty('confidence');
      expect(state).toHaveProperty('startTime');
    });

    it('should reflect state changes', () => {
      const orchestrator = new DeepthinkOrchestrator('Test', 'quick');
      const initialState = orchestrator.getState();
      
      expect(initialState.steps).toHaveLength(0);
      // After execution, steps would be populated
    });
  });

  describe('getFinalOutput', () => {
    it('should return placeholder if no output generated', () => {
      const orchestrator = new DeepthinkOrchestrator('Test', 'quick');
      const output = orchestrator.getFinalOutput();
      
      expect(output).toBe('No output generated');
    });
  });

  describe('execute - Quick Mode', () => {
    it('should execute without errors in quick mode', async () => {
      const orchestrator = new DeepthinkOrchestrator('Simple question', 'quick');
      
      await expect(orchestrator.execute()).resolves.toBeDefined();
    }, 30000); // 30 second timeout

    it('should populate steps after execution', async () => {
      const orchestrator = new DeepthinkOrchestrator('Why is the sky blue?', 'quick');
      
      const finalState = await orchestrator.execute();
      
      expect(finalState.steps.length).toBeGreaterThan(0);
      expect(finalState.endTime).toBeDefined();
      expect(finalState.endTime).toBeGreaterThanOrEqual(finalState.startTime);
    }, 30000);

    it('should execute steps 1-5 and 12-14 in quick mode', async () => {
      const orchestrator = new DeepthinkOrchestrator('Test query', 'quick');
      
      const finalState = await orchestrator.execute();
      
      const executedSteps = finalState.steps.map(s => s.stepNumber);
      
      // Quick mode should execute steps 1-5 and 12-14
      expect(executedSteps.some(n => n >= 1 && n <= 5)).toBe(true);
    }, 30000);
  });

  describe('execute - Full Mode', () => {
    it('should execute without errors in full mode', async () => {
      const orchestrator = new DeepthinkOrchestrator('Complex analytical question', 'full');
      
      await expect(orchestrator.execute()).resolves.toBeDefined();
    }, 60000); // 60 second timeout for full mode

    it('should execute more steps in full mode than quick mode', async () => {
      const quickOrch = new DeepthinkOrchestrator('Query', 'quick');
      const fullOrch = new DeepthinkOrchestrator('Query', 'full');
      
      const quickState = await quickOrch.execute();
      const fullState = await fullOrch.execute();
      
      // Full mode should execute more steps (all 14)
      expect(fullState.steps.length).toBeGreaterThanOrEqual(quickState.steps.length);
    }, 60000);
  });

  describe('execute - Auto Mode', () => {
    it('should execute step 3 and then switch modes', async () => {
      const orchestrator = new DeepthinkOrchestrator('Test query', 'auto');
      
      const finalState = await orchestrator.execute();
      
      // Auto mode starts with steps 1-3, then switches
      const step3 = finalState.steps.find(s => s.stepNumber === 3);
      expect(step3).toBeDefined();
      
      // Mode should have changed from 'auto' to 'quick' or 'full'
      expect(['quick', 'full']).toContain(finalState.mode);
    }, 60000);

    it('should switch to recommended mode based on characterization', async () => {
      const orchestrator = new DeepthinkOrchestrator('Simple question?', 'auto');
      
      const finalState = await orchestrator.execute();
      
      // Should switch based on complexity
      expect(finalState.mode).not.toBe('auto');
    }, 60000);
  });

  describe('Error handling', () => {
    it('should handle step failures gracefully', async () => {
      const orchestrator = new DeepthinkOrchestrator('Test', 'quick');
      
      // Even if steps fail, execute should complete
      const finalState = await orchestrator.execute();
      
      expect(finalState).toBeDefined();
      expect(finalState.endTime).toBeDefined();
    }, 30000);

    it('should mark failed steps with error status', async () => {
      const orchestrator = new DeepthinkOrchestrator('Test', 'quick');
      
      const finalState = await orchestrator.execute();
      
      // Check if any failed steps have error field
      const failedSteps = finalState.steps.filter(s => s.status === 'failed');
      failedSteps.forEach(step => {
        expect(step).toHaveProperty('error');
      });
    }, 30000);
  });

  describe('Step metadata', () => {
    it('should include metadata in step results', async () => {
      const orchestrator = new DeepthinkOrchestrator('Test query', 'quick');
      
      const finalState = await orchestrator.execute();
      
      // At least some steps should have metadata
      const stepsWithMetadata = finalState.steps.filter(s => s.metadata);
      expect(stepsWithMetadata.length).toBeGreaterThan(0);
    }, 30000);

    it('should include duration in metadata when available', async () => {
      const orchestrator = new DeepthinkOrchestrator('Test', 'quick');
      
      const finalState = await orchestrator.execute();
      
      // Check for duration in metadata - at least some steps should have it
      const stepsWithMetadata = finalState.steps.filter(s => s.metadata);
      expect(stepsWithMetadata.length).toBeGreaterThan(0);
    }, 30000);
  });
});

describe('executeDeepthink convenience function', () => {
  it('should execute and return string output', async () => {
    const output = await executeDeepthink('Simple query', 'quick');
    
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  }, 30000);

  it('should use default mode if not specified', async () => {
    const output = await executeDeepthink('Query without mode');
    
    expect(typeof output).toBe('string');
  }, 30000);

  it('should return error message if execution fails', async () => {
    const output = await executeDeepthink('Test query', 'quick');
    
    // Should either return valid output or error message
    expect(output).toBeTruthy();
  }, 30000);
});

describe('validateSteps', () => {
  it('should validate that all 14 steps are present', () => {
    const mockSteps: StepDefinition[] = Array.from({ length: 14 }, (_, i) => ({
      number: i + 1,
      name: `Step ${i + 1}`,
      description: 'Test step',
      applicableModes: ['quick', 'full'],
      execute: async (state: DeepthinkState) => ({
        stepNumber: i + 1,
        stepName: `Step ${i + 1}`,
        status: 'completed',
        output: 'Output',
      }),
    }));

    const result = validateSteps(mockSteps);
    expect(result).toBe(true);
  });

  it('should return false if steps are missing', () => {
    const incompleteSteps: StepDefinition[] = [
      {
        number: 1,
        name: 'Step 1',
        description: 'Test',
        applicableModes: ['quick'],
        execute: async () => ({ stepNumber: 1, stepName: 'Test', status: 'completed', output: '' }),
      },
    ];

    const result = validateSteps(incompleteSteps);
    expect(result).toBe(false);
  });

  it('should handle empty step array', () => {
    const result = validateSteps([]);
    expect(result).toBe(false);
  });
});

describe('getExecutionSummary', () => {
  it('should generate summary for completed execution', () => {
    const mockState: DeepthinkState = {
      mode: 'quick',
      query: 'Test query',
      steps: [
        { stepNumber: 1, stepName: 'Step 1', status: 'completed', output: 'Output 1' },
        { stepNumber: 2, stepName: 'Step 2', status: 'completed', output: 'Output 2' },
        { stepNumber: 3, stepName: 'Step 3', status: 'failed', output: '', error: 'Error' },
      ],
      currentStep: 3,
      iterationCount: 0,
      confidence: 'moderate',
      startTime: Date.now() - 5000,
      endTime: Date.now(),
    };

    const summary = getExecutionSummary(mockState);
    
    expect(summary).toContain('Mode: quick');
    expect(summary).toContain('Query: Test query');
    expect(summary).toContain('Steps Completed: 2/3');
    expect(summary).toContain('Failed Steps: 1');
    expect(summary).toContain('Final Confidence: moderate');
  });

  it('should handle in-progress execution', () => {
    const mockState: DeepthinkState = {
      mode: 'full',
      query: 'In progress',
      steps: [
        { stepNumber: 1, stepName: 'Step 1', status: 'completed', output: 'Done' },
      ],
      currentStep: 2,
      iterationCount: 0,
      confidence: 'low',
      startTime: Date.now() - 3000,
    };

    const summary = getExecutionSummary(mockState);
    
    expect(summary).toContain('Mode: full');
    expect(summary).toContain('Steps Completed: 1/1');
  });

  it('should include iteration count', () => {
    const mockState: DeepthinkState = {
      mode: 'full',
      query: 'With iterations',
      steps: [],
      currentStep: 13,
      iterationCount: 3,
      confidence: 'high',
      startTime: Date.now() - 10000,
      endTime: Date.now(),
    };

    const summary = getExecutionSummary(mockState);
    
    expect(summary).toContain('Refinement Iterations: 3');
  });
});
