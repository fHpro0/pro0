# Contributing to PRO0

Thanks for your interest in contributing to PRO0!

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-fork-url>
   cd pro0
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Build the project**
   ```bash
   bun run build
   ```

4. **Run the example**
   ```bash
   node dist/example.js
   ```

## Project Structure

```
pro0/
├── src/
│   ├── agents/          # Agent prompt definitions
│   │   └── prompts.ts   # Planner, Executor, Specialist prompts
│   ├── config/          # Configuration system
│   │   └── loader.ts    # Deep merge, auto-creation, validation
│   ├── planner/         # Plan management
│   │   └── plan-manager.ts
│   ├── skills/          # Skill auto-loader
│   │   └── loader.ts
│   ├── types/           # TypeScript type definitions
│   │   └── config.ts
│   ├── verification/    # Test runner and verification
│   │   └── test-runner.ts
│   ├── cli.ts           # CLI commands
│   ├── index.ts         # Public API exports
│   └── example.ts       # Usage example
├── pro0.schema.json     # JSON Schema for config validation
├── PRO0_SPEC.md         # Full specification document
└── README.md            # User-facing documentation
```

## Key Design Principles

1. **Simplicity**: Only 2 core agents (Planner + Executor) + 5 specialists
2. **Strict**: No fallback models - fail fast with clear errors
3. **Hierarchical**: Global config + project overrides with deep merge
4. **Auto-discovery**: Skills are scanned from directories automatically
5. **Security**: .env protection in every agent prompt
6. **Verification**: Always run tests after execution

## Making Changes

### Adding a New Feature

1. Update the spec in `PRO0_SPEC.md` first
2. Implement the feature in the appropriate module
3. Update type definitions if needed
4. Update `README.md` with usage examples
5. Test manually with `bun run build && node dist/example.js`

### Modifying Agent Prompts

1. Edit `src/agents/prompts.ts`
2. **ALWAYS** keep the `.env` safety warning at the top
3. Rebuild and verify the prompt is exported correctly

### Changing Configuration Schema

1. Update `src/types/config.ts` types
2. Update `pro0.schema.json` JSON Schema
3. Update default config in `src/config/loader.ts`
4. Update docs in `README.md`

## Testing

Currently, PRO0 uses manual testing via the example script. To test:

```bash
bun run build
node dist/example.js
```

Verify:
- Config loading works
- Global config auto-creation works
- Deep merge behavior is correct
- Plan saving/loading works
- Prompts include .env warnings

## Code Style

- Use TypeScript strict mode
- Prefer explicit types over `any` (except in deepMerge utility)
- Keep functions focused and single-purpose
- Add brief comments only when necessary (avoid excessive docstrings)

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Build and test (`bun run build`)
5. Commit with clear message (`git commit -m "Add feature X"`)
6. Push to your fork (`git push origin feature/your-feature`)
7. Open a Pull Request

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- Design discussions
- Documentation improvements

## License

By contributing to PRO0, you agree that your contributions will be licensed under the MIT License.
