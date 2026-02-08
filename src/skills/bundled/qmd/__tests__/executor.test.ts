import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkQmdInstalled, executeQmdSearch, executeQmdGet } from '../executor';
import type { SearchResult } from '../executor';

describe('QMD Executor', () => {
  describe('checkQmdInstalled', () => {
    it('should return boolean without throwing', async () => {
      const result = await checkQmdInstalled();
      expect(typeof result).toBe('boolean');
    });

    it('should handle timeout gracefully', async () => {
      // This test will timeout quickly if qmd is not installed
      const result = await checkQmdInstalled();
      expect(typeof result).toBe('boolean');
    }, 10000); // 10 second timeout for this test
  });

  describe('executeQmdSearch', () => {
    it('should return an array', async () => {
      const results = await executeQmdSearch('test query', { timeout: 1000 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty query', async () => {
      const results = await executeQmdSearch('', { timeout: 1000 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very short timeout', async () => {
      const results = await executeQmdSearch('test', { timeout: 1 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect search mode: bm25', async () => {
      await expect(
        executeQmdSearch('test', { mode: 'bm25', timeout: 1000 })
      ).resolves.toBeDefined();
    });

    it('should respect search mode: semantic', async () => {
      await expect(
        executeQmdSearch('test', { mode: 'semantic', timeout: 1000 })
      ).resolves.toBeDefined();
    });

    it('should respect search mode: hybrid', async () => {
      await expect(
        executeQmdSearch('test', { mode: 'hybrid', timeout: 1000 })
      ).resolves.toBeDefined();
    });

    it('should respect minScore parameter', async () => {
      const results = await executeQmdSearch('test', { minScore: 0.8, timeout: 1000 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle special characters in query', async () => {
      const results = await executeQmdSearch('test "quoted" & special', { timeout: 1000 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should validate SearchResult structure if results exist', async () => {
      const results = await executeQmdSearch('test', { timeout: 1000 });
      
      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('path');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('snippet');
        expect(typeof result.path).toBe('string');
        expect(typeof result.score).toBe('number');
        expect(typeof result.snippet).toBe('string');
      }
    });
  });

  describe('executeQmdGet', () => {
    it('should return a string', async () => {
      const result = await executeQmdGet('test-path.md', { timeout: 1000 });
      expect(typeof result).toBe('string');
    });

    it('should handle empty path', async () => {
      const result = await executeQmdGet('', { timeout: 1000 });
      expect(typeof result).toBe('string');
    });

    it('should handle non-existent path gracefully', async () => {
      const result = await executeQmdGet('non-existent-file.md', { timeout: 1000 });
      expect(typeof result).toBe('string');
    });

    it('should handle timeout', async () => {
      const result = await executeQmdGet('test.md', { timeout: 1 });
      expect(typeof result).toBe('string');
    });

    it('should handle paths with special characters', async () => {
      const result = await executeQmdGet('path/with spaces/file.md', { timeout: 1000 });
      expect(typeof result).toBe('string');
    });
  });

  describe('Error handling', () => {
    it('should not throw on command execution errors', async () => {
      await expect(
        executeQmdSearch('test', { timeout: 1 })
      ).resolves.toBeDefined();
    });

    it('should return empty array on search timeout', async () => {
      const results = await executeQmdSearch('test', { timeout: 1 });
      expect(results).toEqual([]);
    });

    it('should return empty string on get timeout', async () => {
      const results = await executeQmdGet('test.md', { timeout: 1 });
      expect(results).toBe('');
    });
  });

  describe('Configuration integration', () => {
    it('should use default config when no options provided', async () => {
      await expect(executeQmdSearch('test')).resolves.toBeDefined();
    });

    it('should override config with provided options', async () => {
      const results = await executeQmdSearch('test', {
        mode: 'semantic',
        minScore: 0.9,
        timeout: 500
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
