import { describe, it, expect, beforeEach } from 'vitest';
import { step01 } from '../steps/01-context-clarification';
import { step03 } from '../steps/03-characterization';
import { step05 } from '../steps/05-planning';
import type { DeepthinkState } from '../types';

describe('Deepthink Steps', () => {
  let mockState: DeepthinkState;

  beforeEach(() => {
    mockState = {
      mode: 'auto',
      query: 'Why did the Roman Empire fall?',
      steps: [],
      currentStep: 0,
      iterationCount: 0,
      confidence: 'low',
      startTime: Date.now(),
    };
  });

  describe('Step 1: Context Clarification', () => {
    it('should execute and return completed result', async () => {
      const result = await step01.execute(mockState);
      
      expect(result.stepNumber).toBe(1);
      expect(result.stepName).toBe('Context Clarification');
      expect(result.status).toBe('completed');
      expect(result.output).toBeTruthy();
      expect(result.output.length).toBeGreaterThan(0);
    });

    it('should extract keywords from query', async () => {
      const result = await step01.execute(mockState);
      
      expect(result.output).toContain('roman');
      expect(result.output).toContain('empire');
      expect(result.output).toContain('fall');
    });

    it('should include query analysis in output', async () => {
      const result = await step01.execute(mockState);
      
      expect(result.output).toContain('Query Analysis');
      expect(result.output).toContain('Original query');
      expect(result.output).toContain(mockState.query);
    });

    it('should detect ambiguities in short queries', async () => {
      const shortState = { ...mockState, query: 'Why?' };
      const result = await step01.execute(shortState);
      
      expect(result.output).toContain('Ambiguities');
    });

    it('should include metadata with duration', async () => {
      const result = await step01.execute(mockState);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty query gracefully', async () => {
      const emptyState = { ...mockState, query: '' };
      const result = await step01.execute(emptyState);
      
      expect(result.status).toBe('completed');
      expect(result.output).toBeTruthy();
    });

    it('should identify question type', async () => {
      const questionState = { ...mockState, query: 'What is TypeScript?' };
      const result = await step01.execute(questionState);
      
      expect(result.output).toBeTruthy();
    });

    it('should handle very long queries', async () => {
      const longQuery = 'Why did ' + 'the Roman Empire fall and '.repeat(20) + 'what happened?';
      const longState = { ...mockState, query: longQuery };
      const result = await step01.execute(longState);
      
      expect(result.status).toBe('completed');
    });
  });

  describe('Step 3: Characterization', () => {
    it('should execute and return completed result', async () => {
      const result = await step03.execute(mockState);
      
      expect(result.stepNumber).toBe(3);
      expect(result.stepName).toBe('Characterization');
      expect(result.status).toBe('completed');
      expect(result.output).toBeTruthy();
    });

    it('should include characterization metadata', async () => {
      const result = await step03.execute(mockState);
      
      expect(result.metadata?.characterization).toBeDefined();
      expect(result.metadata?.characterization.complexity).toMatch(/simple|moderate|complex/);
      expect(result.metadata?.characterization.recommendedMode).toMatch(/quick|full/);
    });

    it('should assess complexity correctly for simple queries', async () => {
      const simpleState = { ...mockState, query: 'What is TypeScript?' };
      const result = await step03.execute(simpleState);
      
      const characterization = result.metadata?.characterization;
      expect(characterization?.complexity).toBe('simple');
      expect(characterization?.recommendedMode).toBe('quick');
    });

    it('should assess complexity correctly for complex queries', async () => {
      const complexQuery = 'Analyze the database and frontend API security performance over time';
      const complexState = { ...mockState, query: complexQuery };
      const result = await step03.execute(complexState);
      
      const characterization = result.metadata?.characterization;
      expect(['moderate', 'complex']).toContain(characterization?.complexity);
    });

    it('should detect multi-domain factors', async () => {
      const multiDomainQuery = 'How do database and frontend API work together?';
      const multiDomainState = { ...mockState, query: multiDomainQuery };
      const result = await step03.execute(multiDomainState);
      
      const factors = result.metadata?.characterization.factors;
      expect(factors?.multiDomain).toBe(true);
    });

    it('should detect historical context factors', async () => {
      const historicalQuery = 'What is the evolution of JavaScript over time?';
      const historicalState = { ...mockState, query: historicalQuery };
      const result = await step03.execute(historicalState);
      
      const factors = result.metadata?.characterization.factors;
      expect(factors?.historicalContext).toBe(true);
    });

    it('should detect numerical analysis factors', async () => {
      const numericalQuery = 'Calculate and optimize the performance of 1000 requests';
      const numericalState = { ...mockState, query: numericalQuery };
      const result = await step03.execute(numericalState);
      
      const factors = result.metadata?.characterization.factors;
      expect(factors?.numericalAnalysis).toBe(true);
    });

    it('should detect conflicting views factors', async () => {
      const conflictingQuery = 'What are the pros and cons of React versus Vue?';
      const conflictingState = { ...mockState, query: conflictingQuery };
      const result = await step03.execute(conflictingState);
      
      const factors = result.metadata?.characterization.factors;
      expect(factors?.conflictingViews).toBe(true);
    });

    it('should provide reasoning for complexity assessment', async () => {
      const result = await step03.execute(mockState);
      
      expect(result.output).toContain('Complexity Assessment');
      expect(result.output).toContain('Recommended Mode');
      expect(result.output).toContain('Reasoning');
    });

    it('should include factors in output', async () => {
      const result = await step03.execute(mockState);
      
      expect(result.output).toContain('Factors');
    });
  });

  describe('Step 5: Planning', () => {
    it('should execute and return completed result', async () => {
      const result = await step05.execute(mockState);
      
      expect(result.stepNumber).toBe(5);
      expect(result.stepName).toBe('Planning');
      expect(result.status).toBe('completed');
      expect(result.output).toBeTruthy();
    });

    it('should include plan metadata', async () => {
      const result = await step05.execute(mockState);
      
      expect(result.metadata?.plan).toBeDefined();
      expect(result.metadata?.plan.approach).toBeDefined();
      expect(Array.isArray(result.metadata?.plan.keySteps)).toBe(true);
      expect(Array.isArray(result.metadata?.plan.potentialChallenges)).toBe(true);
      expect(Array.isArray(result.metadata?.plan.successCriteria)).toBe(true);
    });

    it('should have key steps in plan', async () => {
      const result = await step05.execute(mockState);
      
      const plan = result.metadata?.plan;
      expect(plan?.keySteps.length).toBeGreaterThan(0);
      expect(plan?.keySteps[0]).toBeTruthy();
    });

    it('should identify potential challenges', async () => {
      const result = await step05.execute(mockState);
      
      const plan = result.metadata?.plan;
      expect(plan?.potentialChallenges.length).toBeGreaterThan(0);
    });

    it('should define success criteria', async () => {
      const result = await step05.execute(mockState);
      
      const plan = result.metadata?.plan;
      expect(plan?.successCriteria.length).toBeGreaterThan(0);
    });

    it('should adapt plan for implementation queries', async () => {
      const implementQuery = 'Implement a user authentication system';
      const implementState = { ...mockState, query: implementQuery };
      const result = await step05.execute(implementState);
      
      const plan = result.metadata?.plan;
      expect(plan?.keySteps.some(step => step.toLowerCase().includes('implement'))).toBe(true);
    });

    it('should include approach in output', async () => {
      const result = await step05.execute(mockState);
      
      expect(result.output).toContain('Execution Plan');
      expect(result.output).toContain('Approach');
    });

    it('should include all plan sections in output', async () => {
      const result = await step05.execute(mockState);
      
      expect(result.output).toContain('Key Steps');
      expect(result.output).toContain('Challenges');
      expect(result.output).toContain('Success Criteria');
    });

    it('should format output with proper indentation', async () => {
      const result = await step05.execute(mockState);
      
      // Check for numbered list formatting
      expect(result.output).toMatch(/\d+\./);
    });
  });

  describe('Step metadata consistency', () => {
    it('all steps should include duration in metadata', async () => {
      const steps = [step01, step03, step05];
      
      for (const step of steps) {
        const result = await step.execute(mockState);
        expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('all steps should have correct step numbers', async () => {
      const step1 = await step01.execute(mockState);
      const step3 = await step03.execute(mockState);
      const step5 = await step05.execute(mockState);
      
      expect(step1.stepNumber).toBe(1);
      expect(step3.stepNumber).toBe(3);
      expect(step5.stepNumber).toBe(5);
    });

    it('all steps should have status "completed" on success', async () => {
      const steps = [step01, step03, step05];
      
      for (const step of steps) {
        const result = await step.execute(mockState);
        expect(result.status).toBe('completed');
      }
    });
  });

  describe('Error handling in steps', () => {
    it('steps should handle malformed state gracefully', async () => {
      const malformedState = {
        ...mockState,
        query: null as any,
      };
      
      // Steps should handle null query without crashing
      await expect(step01.execute(malformedState)).resolves.toBeDefined();
    });
  });

  describe('Step definition metadata', () => {
    it('step01 should have correct metadata', () => {
      expect(step01.number).toBe(1);
      expect(step01.name).toBe('Context Clarification');
      expect(step01.description).toBeTruthy();
      expect(Array.isArray(step01.applicableModes)).toBe(true);
      expect(typeof step01.execute).toBe('function');
    });

    it('step03 should have correct metadata', () => {
      expect(step03.number).toBe(3);
      expect(step03.name).toBe('Characterization');
      expect(step03.description).toBeTruthy();
      expect(Array.isArray(step03.applicableModes)).toBe(true);
    });

    it('step05 should have correct metadata', () => {
      expect(step05.number).toBe(5);
      expect(step05.name).toBe('Planning');
      expect(step05.description).toBeTruthy();
      expect(Array.isArray(step05.applicableModes)).toBe(true);
    });

    it('all steps should be applicable to at least one mode', () => {
      const steps = [step01, step03, step05];
      
      for (const step of steps) {
        expect(step.applicableModes.length).toBeGreaterThan(0);
      }
    });
  });
});
