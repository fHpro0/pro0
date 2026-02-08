import { describe, it, expect } from 'vitest';
import type {
  DeepthinkState,
  DeepthinkMode,
  ConfidenceLevel,
  StepStatus,
  StepResult,
  CharacterizationResult,
  PlanningResult,
  RefinementDecision,
  SubAgentDefinition,
  SubAgentResult,
  QualityGateResult,
  DeepthinkConfig,
  StepDefinition,
  DeepthinkSkillMetadata,
} from '../types';

describe('Deepthink Types', () => {
  describe('DeepthinkMode', () => {
    it('should allow "full" mode', () => {
      const mode: DeepthinkMode = 'full';
      expect(mode).toBe('full');
    });

    it('should allow "quick" mode', () => {
      const mode: DeepthinkMode = 'quick';
      expect(mode).toBe('quick');
    });

    it('should allow "auto" mode', () => {
      const mode: DeepthinkMode = 'auto';
      expect(mode).toBe('auto');
    });
  });

  describe('ConfidenceLevel', () => {
    it('should allow all confidence levels', () => {
      const levels: ConfidenceLevel[] = ['low', 'moderate', 'high', 'certain'];
      expect(levels).toHaveLength(4);
    });
  });

  describe('StepStatus', () => {
    it('should allow all step statuses', () => {
      const statuses: StepStatus[] = ['pending', 'in_progress', 'completed', 'skipped', 'failed'];
      expect(statuses).toHaveLength(5);
    });
  });

  describe('DeepthinkState', () => {
    it('should allow valid minimal state', () => {
      const state: DeepthinkState = {
        mode: 'auto',
        query: 'Test query',
        steps: [],
        currentStep: 1,
        iterationCount: 0,
        confidence: 'low',
        startTime: Date.now(),
      };
      
      expect(state.mode).toBe('auto');
      expect(state.query).toBe('Test query');
      expect(state.steps).toEqual([]);
      expect(state.currentStep).toBe(1);
      expect(state.iterationCount).toBe(0);
      expect(state.confidence).toBe('low');
      expect(state.startTime).toBeGreaterThan(0);
    });

    it('should allow full state with all optional fields', () => {
      const state: DeepthinkState = {
        mode: 'full',
        query: 'Complex query',
        steps: [],
        currentStep: 5,
        iterationCount: 2,
        confidence: 'moderate',
        subAgents: [],
        finalOutput: 'Final result',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
      };
      
      expect(state.subAgents).toEqual([]);
      expect(state.finalOutput).toBe('Final result');
      expect(state.endTime).toBeGreaterThan(state.startTime);
    });

    it('should allow different modes', () => {
      const quickState: DeepthinkState = {
        mode: 'quick',
        query: 'Query',
        steps: [],
        currentStep: 0,
        iterationCount: 0,
        confidence: 'low',
        startTime: Date.now(),
      };
      
      expect(quickState.mode).toBe('quick');
    });
  });

  describe('StepResult', () => {
    it('should allow valid StepResult', () => {
      const result: StepResult = {
        stepNumber: 1,
        stepName: 'Test Step',
        status: 'completed',
        output: 'Test output',
      };
      
      expect(result.stepNumber).toBe(1);
      expect(result.stepName).toBe('Test Step');
      expect(result.status).toBe('completed');
      expect(result.output).toBe('Test output');
    });

    it('should allow StepResult with metadata', () => {
      const result: StepResult = {
        stepNumber: 2,
        stepName: 'Step With Metadata',
        status: 'completed',
        output: 'Output',
        metadata: {
          duration: 1000,
          tokensUsed: 500,
          model: 'claude-3.5-sonnet',
          customField: 'custom value',
        },
      };
      
      expect(result.metadata?.duration).toBe(1000);
      expect(result.metadata?.tokensUsed).toBe(500);
      expect(result.metadata?.model).toBe('claude-3.5-sonnet');
      expect(result.metadata?.customField).toBe('custom value');
    });

    it('should allow failed StepResult with error', () => {
      const result: StepResult = {
        stepNumber: 3,
        stepName: 'Failed Step',
        status: 'failed',
        output: '',
        error: 'Something went wrong',
      };
      
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Something went wrong');
    });

    it('should allow all step statuses', () => {
      const statuses: StepStatus[] = ['pending', 'in_progress', 'completed', 'skipped', 'failed'];
      
      statuses.forEach((status) => {
        const result: StepResult = {
          stepNumber: 1,
          stepName: 'Test',
          status,
          output: 'Output',
        };
        expect(result.status).toBe(status);
      });
    });
  });

  describe('SubAgentDefinition', () => {
    it('should allow minimal SubAgentDefinition', () => {
      const agent: SubAgentDefinition = {
        id: 'agent-1',
        name: 'Research Agent',
        role: 'Research historical context',
        specialization: 'History',
        taskDescription: 'Find historical precedents',
      };
      
      expect(agent.id).toBe('agent-1');
      expect(agent.name).toBe('Research Agent');
      expect(agent.role).toBe('Research historical context');
      expect(agent.specialization).toBe('History');
      expect(agent.taskDescription).toBe('Find historical precedents');
    });

    it('should allow SubAgentDefinition with all optional fields', () => {
      const agent: SubAgentDefinition = {
        id: 'agent-2',
        name: 'Analysis Agent',
        role: 'Analyze data',
        specialization: 'Data Analysis',
        taskDescription: 'Perform statistical analysis',
        dependencies: ['agent-1'],
        model: 'claude-3-opus',
        priority: 8,
      };
      
      expect(agent.dependencies).toEqual(['agent-1']);
      expect(agent.model).toBe('claude-3-opus');
      expect(agent.priority).toBe(8);
    });
  });

  describe('SubAgentResult', () => {
    it('should allow successful SubAgentResult', () => {
      const result: SubAgentResult = {
        agentId: 'agent-1',
        agentName: 'Research Agent',
        status: 'success',
        output: 'Research findings',
        executionTime: 5000,
      };
      
      expect(result.status).toBe('success');
      expect(result.output).toBe('Research findings');
      expect(result.executionTime).toBe(5000);
    });

    it('should allow failed SubAgentResult', () => {
      const result: SubAgentResult = {
        agentId: 'agent-2',
        agentName: 'Failed Agent',
        status: 'failed',
        output: '',
        executionTime: 1000,
        error: 'Timeout exceeded',
      };
      
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Timeout exceeded');
    });
  });

  describe('QualityGateResult', () => {
    it('should allow passing QualityGateResult', () => {
      const result: QualityGateResult = {
        passed: true,
        issues: [],
        recommendations: [],
        overallScore: 95,
      };
      
      expect(result.passed).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.overallScore).toBe(95);
    });

    it('should allow failing QualityGateResult with issues', () => {
      const result: QualityGateResult = {
        passed: false,
        issues: ['Incomplete analysis', 'Missing citations'],
        recommendations: ['Add more detail', 'Include sources'],
        overallScore: 45,
      };
      
      expect(result.passed).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.recommendations).toHaveLength(2);
      expect(result.overallScore).toBe(45);
    });
  });

  describe('DeepthinkConfig', () => {
    it('should allow valid configuration', () => {
      const config: DeepthinkConfig = {
        enabled: true,
        defaultMode: 'auto',
        maxIterations: 5,
        subAgentModel: 'claude-3.5-sonnet',
      };
      
      expect(config.enabled).toBe(true);
      expect(config.defaultMode).toBe('auto');
      expect(config.maxIterations).toBe(5);
      expect(config.subAgentModel).toBe('claude-3.5-sonnet');
    });

    it('should allow configuration with timeout', () => {
      const config: DeepthinkConfig = {
        enabled: true,
        defaultMode: 'quick',
        maxIterations: 3,
        subAgentModel: 'claude-3-opus',
        timeout: 30000,
      };
      
      expect(config.timeout).toBe(30000);
    });
  });

  describe('CharacterizationResult', () => {
    it('should allow simple characterization', () => {
      const result: CharacterizationResult = {
        complexity: 'simple',
        recommendedMode: 'quick',
        reasoning: 'Query is straightforward',
        factors: {
          multiDomain: false,
          historicalContext: false,
          numericalAnalysis: false,
          conflictingViews: false,
        },
      };
      
      expect(result.complexity).toBe('simple');
      expect(result.recommendedMode).toBe('quick');
      expect(result.factors.multiDomain).toBe(false);
    });

    it('should allow complex characterization', () => {
      const result: CharacterizationResult = {
        complexity: 'complex',
        recommendedMode: 'full',
        reasoning: 'Query requires deep analysis',
        factors: {
          multiDomain: true,
          historicalContext: true,
          numericalAnalysis: true,
          conflictingViews: true,
          customFactor: true,
        },
      };
      
      expect(result.complexity).toBe('complex');
      expect(result.recommendedMode).toBe('full');
      expect(result.factors.customFactor).toBe(true);
    });

    it('should allow all complexity levels', () => {
      const levels: CharacterizationResult['complexity'][] = ['simple', 'moderate', 'complex'];
      expect(levels).toHaveLength(3);
    });
  });

  describe('PlanningResult', () => {
    it('should allow valid planning result', () => {
      const result: PlanningResult = {
        approach: 'Use incremental analysis',
        keySteps: ['Step 1', 'Step 2', 'Step 3'],
        potentialChallenges: ['Challenge 1', 'Challenge 2'],
        successCriteria: ['Criteria 1', 'Criteria 2'],
      };
      
      expect(result.approach).toBe('Use incremental analysis');
      expect(result.keySteps).toHaveLength(3);
      expect(result.potentialChallenges).toHaveLength(2);
      expect(result.successCriteria).toHaveLength(2);
    });

    it('should allow empty arrays', () => {
      const result: PlanningResult = {
        approach: 'Simple approach',
        keySteps: [],
        potentialChallenges: [],
        successCriteria: [],
      };
      
      expect(result.keySteps).toEqual([]);
      expect(result.potentialChallenges).toEqual([]);
      expect(result.successCriteria).toEqual([]);
    });
  });

  describe('RefinementDecision', () => {
    it('should allow continue refinement decision', () => {
      const decision: RefinementDecision = {
        shouldContinue: true,
        currentConfidence: 'moderate',
        issuesIdentified: ['Issue 1', 'Issue 2'],
        improvementsMade: ['Improvement 1'],
      };
      
      expect(decision.shouldContinue).toBe(true);
      expect(decision.currentConfidence).toBe('moderate');
      expect(decision.issuesIdentified).toHaveLength(2);
      expect(decision.improvementsMade).toHaveLength(1);
    });

    it('should allow stop refinement decision', () => {
      const decision: RefinementDecision = {
        shouldContinue: false,
        currentConfidence: 'certain',
        issuesIdentified: [],
        improvementsMade: ['All issues resolved'],
      };
      
      expect(decision.shouldContinue).toBe(false);
      expect(decision.currentConfidence).toBe('certain');
      expect(decision.issuesIdentified).toEqual([]);
    });
  });

  describe('StepDefinition', () => {
    it('should allow valid step definition', () => {
      const mockExecute = async (state: DeepthinkState): Promise<StepResult> => ({
        stepNumber: 1,
        stepName: 'Test Step',
        status: 'completed',
        output: 'Output',
      });

      const step: StepDefinition = {
        number: 1,
        name: 'Test Step',
        description: 'A test step',
        applicableModes: ['quick', 'full'],
        execute: mockExecute,
      };
      
      expect(step.number).toBe(1);
      expect(step.name).toBe('Test Step');
      expect(step.description).toBe('A test step');
      expect(step.applicableModes).toEqual(['quick', 'full']);
      expect(typeof step.execute).toBe('function');
    });

    it('should allow step applicable to all modes', () => {
      const mockExecute = async (state: DeepthinkState): Promise<StepResult> => ({
        stepNumber: 2,
        stepName: 'Universal Step',
        status: 'completed',
        output: 'Output',
      });

      const step: StepDefinition = {
        number: 2,
        name: 'Universal Step',
        description: 'Works in all modes',
        applicableModes: ['quick', 'full', 'auto'],
        execute: mockExecute,
      };
      
      expect(step.applicableModes).toContain('quick');
      expect(step.applicableModes).toContain('full');
      expect(step.applicableModes).toContain('auto');
    });
  });

  describe('DeepthinkSkillMetadata', () => {
    it('should allow valid skill metadata', () => {
      const metadata: DeepthinkSkillMetadata = {
        name: 'deepthink',
        version: '1.0.0',
        description: 'Deep analytical thinking',
        modes: ['quick', 'full', 'auto'],
        maxSteps: 14,
      };
      
      expect(metadata.name).toBe('deepthink');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.description).toBe('Deep analytical thinking');
      expect(metadata.modes).toHaveLength(3);
      expect(metadata.maxSteps).toBe(14);
    });
  });
});
