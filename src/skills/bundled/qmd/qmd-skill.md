# QMD Skill

Local search engine for Markdown notes, docs, and knowledge bases. Use this skill when you need to search or retrieve content from a local markdown collection.

## When to use QMD

- The user asks to search notes, docs, or a knowledge base on disk
- The user wants to find related markdown content
- The user wants to retrieve a specific markdown document by path
- The user references qmd explicitly

## How to call QMD

Use the executor helpers exposed by this skill:

- `executeQmdSearch(query, options)` for search
- `executeQmdGet(path, options)` to retrieve a document
- `checkQmdInstalled()` to verify availability before running

### Search modes

- `bm25` (default): fast keyword search
- `semantic`: slower, semantic similarity
- `hybrid`: slowest, combined relevance

When in doubt, default to `bm25`. Use `semantic` only when keyword search fails. Use `hybrid` only if the user asks for highest-quality matching and accepts slow runtimes.

## Example usage

```typescript
const installed = await checkQmdInstalled();
if (!installed) {
  console.error('qmd is not installed. Ask user to install it.');
}

const results = await executeQmdSearch('deployment checklist', {
  mode: 'bm25',
  minScore: 0.3,
  timeout: 20000,
});

if (results.length > 0) {
  const doc = await executeQmdGet(results[0].path);
}
```

```typescript
const semanticResults = await executeQmdSearch('incident response playbook', {
  mode: 'semantic',
  minScore: 0.25,
});
```

## Error handling

- If `qmd` is not installed or not in PATH, log a clear message and return empty results
- If the command times out, return empty results and advise the user to try `bm25` or increase timeout
- If JSON parsing fails, return empty results and log the parse error

## Notes

QMD searches local files that were indexed into collections. It is not a code search tool. If the user wants to search source code, use code search instead.
