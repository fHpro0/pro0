import { describe, it, expect } from 'vitest';
import { shouldTriggerQmd } from '../detector';

describe('QMD Detector', () => {
  describe('Basic trigger patterns', () => {
    it('should trigger for "search my notes"', () => {
      expect(shouldTriggerQmd('search my notes for authentication')).toBe(true);
    });

    it('should trigger for "search our notes"', () => {
      expect(shouldTriggerQmd('search our notes about React')).toBe(true);
    });

    it('should trigger for "search the notes"', () => {
      expect(shouldTriggerQmd('search the notes for API design')).toBe(true);
    });

    it('should trigger for "find in docs"', () => {
      expect(shouldTriggerQmd('find in docs about React hooks')).toBe(true);
    });

    it('should trigger for "find within documentation"', () => {
      expect(shouldTriggerQmd('find within documentation for TypeScript')).toBe(true);
    });

    it('should trigger for "check knowledge base"', () => {
      expect(shouldTriggerQmd('check knowledge base for API patterns')).toBe(true);
    });

    it('should trigger for "check the kb"', () => {
      expect(shouldTriggerQmd('check the kb for database migration')).toBe(true);
    });

    it('should trigger for "look up in notes"', () => {
      expect(shouldTriggerQmd('look up in notes about deployment')).toBe(true);
    });

    it('should trigger for "search local markdown"', () => {
      expect(shouldTriggerQmd('search local markdown files')).toBe(true);
    });

    it('should trigger for "search my markdown notes"', () => {
      expect(shouldTriggerQmd('search my markdown notes for testing')).toBe(true);
    });

    it('should trigger for "search markdown"', () => {
      expect(shouldTriggerQmd('search markdown for examples')).toBe(true);
    });

    it('should trigger for "qmd search"', () => {
      expect(shouldTriggerQmd('qmd search for authentication patterns')).toBe(true);
    });

    it('should trigger for "search qmd"', () => {
      expect(shouldTriggerQmd('search qmd for examples')).toBe(true);
    });

    it('should trigger for "knowledge base search"', () => {
      expect(shouldTriggerQmd('knowledge base search for API docs')).toBe(true);
    });
  });

  describe('Case sensitivity', () => {
    it('should be case-insensitive for "SEARCH MY NOTES"', () => {
      expect(shouldTriggerQmd('SEARCH MY NOTES')).toBe(true);
    });

    it('should be case-insensitive for "Search My Notes"', () => {
      expect(shouldTriggerQmd('Search My Notes')).toBe(true);
    });

    it('should be case-insensitive for "Find In Docs"', () => {
      expect(shouldTriggerQmd('Find In Docs about testing')).toBe(true);
    });

    it('should be case-insensitive for "CHECK KNOWLEDGE BASE"', () => {
      expect(shouldTriggerQmd('CHECK KNOWLEDGE BASE')).toBe(true);
    });
  });

  describe('Non-triggering queries', () => {
    it('should NOT trigger for general questions', () => {
      expect(shouldTriggerQmd('What is TypeScript?')).toBe(false);
    });

    it('should NOT trigger for implementation requests', () => {
      expect(shouldTriggerQmd('Implement user authentication')).toBe(false);
    });

    it('should NOT trigger for code review', () => {
      expect(shouldTriggerQmd('Review this pull request')).toBe(false);
    });

    it('should NOT trigger for simple explanations', () => {
      expect(shouldTriggerQmd('Explain how React hooks work')).toBe(false);
    });

    it('should NOT trigger for debugging requests', () => {
      expect(shouldTriggerQmd('Debug this error in my code')).toBe(false);
    });

    it('should NOT trigger for "search" without document context', () => {
      expect(shouldTriggerQmd('search for a solution')).toBe(false);
    });

    it('should NOT trigger for "find" without document context', () => {
      expect(shouldTriggerQmd('find a way to fix this')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should return false for empty string', () => {
      expect(shouldTriggerQmd('')).toBe(false);
    });

    it('should return false for null/undefined-like empty query', () => {
      expect(shouldTriggerQmd('')).toBe(false);
    });

    it('should handle queries with special characters', () => {
      expect(shouldTriggerQmd('search my notes for "API design"')).toBe(true);
    });

    it('should handle very long queries', () => {
      const longQuery = 'search my notes for ' + 'authentication '.repeat(100);
      expect(shouldTriggerQmd(longQuery)).toBe(true);
    });

    it('should handle queries with newlines', () => {
      expect(shouldTriggerQmd('search my notes\nfor authentication')).toBe(true);
    });

    it('should handle queries with multiple spaces', () => {
      expect(shouldTriggerQmd('search    my    notes    for testing')).toBe(true);
    });
  });

  describe('Partial pattern matches', () => {
    it('should match "search notes" without "my/our/the"', () => {
      expect(shouldTriggerQmd('search notes for examples')).toBe(true);
    });

    it('should match "find in notes"', () => {
      expect(shouldTriggerQmd('find in notes about React')).toBe(true);
    });

    it('should match "check docs"', () => {
      expect(shouldTriggerQmd('check docs for API reference')).toBe(true);
    });

    it('should match "look up docs"', () => {
      expect(shouldTriggerQmd('look up docs about testing')).toBe(true);
    });
  });
});
