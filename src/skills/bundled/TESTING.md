# QMD & Deepthink Skills - Test Suite

This directory contains comprehensive unit tests for the QMD and Deepthink skills.

## Test Structure

```
src/skills/bundled/
├── qmd/__tests__/
│   ├── detector.test.ts    # QMD trigger detection tests
│   └── executor.test.ts    # QMD execution & CLI interaction tests
└── deepthink/__tests__/
    ├── detector.test.ts     # Deepthink trigger detection tests
    ├── types.test.ts        # TypeScript type validation tests
    ├── orchestrator.test.ts # Orchestration & workflow tests
    └── steps.test.ts        # Individual step implementation tests
```

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Coverage Targets

- **QMD Skill**: 80%+ coverage
  - Detector: Pattern matching, edge cases
  - Executor: CLI interaction, error handling, timeout handling
  
- **Deepthink Skill**: 75%+ coverage
  - Detector: Complexity analysis, mode recommendation
  - Types: TypeScript type safety
  - Orchestrator: Workflow execution, mode switching
  - Steps: Individual step logic, metadata generation

## Test Categories

### QMD Tests (56 tests)
- ✅ Basic trigger patterns (14 tests)
- ✅ Case sensitivity (4 tests)
- ✅ Non-triggering queries (7 tests)
- ✅ Edge cases (6 tests)
- ✅ Partial pattern matches (4 tests)
- ✅ Executor functionality (16 tests)
- ✅ Error handling (5 tests)

### Deepthink Tests (187 tests)
- ✅ Simple queries (5 tests)
- ✅ Analytical queries (8 tests)
- ✅ Multi-part questions (4 tests)
- ✅ Comparative analysis (5 tests)
- ✅ Historical/contextual (5 tests)
- ✅ Causal reasoning (7 tests)
- ✅ Multiple perspectives (5 tests)
- ✅ Research/investigation (5 tests)
- ✅ Complex domains (6 tests)
- ✅ Query analysis (9 tests)
- ✅ Explicit requests (8 tests)
- ✅ Type validation (50+ tests)
- ✅ Orchestrator (30+ tests)
- ✅ Step implementations (35+ tests)

## Test Framework

**Vitest** - Modern, fast, ESM-native test framework
- Fast execution with smart parallelization
- TypeScript support out of the box
- Compatible with ESM modules
- Built-in coverage reporting
- Watch mode for development

## Writing New Tests

### Example Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../my-module';

describe('MyModule', () => {
  describe('myFunction', () => {
    it('should handle basic input', () => {
      const result = myFunction('input');
      expect(result).toBe('expected output');
    });

    it('should handle edge cases', () => {
      expect(myFunction('')).toBe('');
      expect(myFunction(null)).toBeNull();
    });
  });
});
```

### Test Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive names**: Use "should" statements
3. **Edge cases**: Test empty, null, large inputs
4. **Error handling**: Verify graceful failures
5. **Isolation**: Each test should be independent
6. **Mocking**: Mock external dependencies (file system, network)

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks (optional)
- Pull requests
- Main branch pushes

## Coverage Report

After running `npm run test:coverage`, view the report:
- **Terminal**: Summary in console
- **HTML**: Open `coverage/index.html` in browser
- **LCOV**: Machine-readable format in `coverage/lcov.info`

## Troubleshooting

### Tests timing out
Increase timeout in test file:
```typescript
it('slow test', async () => {
  // test code
}, 60000); // 60 second timeout
```

### QMD tests failing
- Ensure `qmd` CLI is installed and in PATH
- Tests gracefully handle missing `qmd` (return empty results)

### Deepthink tests failing
- Check that all step files are present
- Verify config file exists and is valid

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Run tests: `npm test`
3. ✅ Check coverage: `npm run test:coverage`
4. 📋 Add integration tests (optional)
5. 📋 Add E2E tests for full workflows (optional)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Coverage Reporting](https://vitest.dev/guide/coverage.html)
