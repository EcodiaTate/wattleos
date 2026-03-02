---
name: tsc-check
description: Run TypeScript type-check and ESLint for WattleOS with correct memory settings. Use after making code changes to verify no type errors were introduced. Always use this instead of bare npx tsc.
user-invocable: false
---

# WattleOS TypeScript Check

Run the following command from `d:\.code\wattleos`:

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit && NODE_OPTIONS="--max-old-space-size=4096" npx next lint
```

## Why these flags
- `--max-old-space-size=8192` is required for tsc — the project has 94+ action files and 30+ migrations worth of generated types; bare `npx tsc` runs out of heap
- `--noEmit` — type-check only, no output files
- `next lint` uses 4096 (sufficient for ESLint)

## Interpreting results

**Zero output after both commands = clean.**

Common errors to watch for:

| Error pattern | Fix |
|---------------|-----|
| `Property 'errors' does not exist on type ZodError` | Use `.issues[0]` not `.errors[0]` |
| `Type 'undefined' is not assignable to type 'null'` | Use `|| null` not `|| undefined` |
| `Property 'CONFLICT' does not exist on ErrorCodes` | Use `ErrorCodes.ALREADY_EXISTS` |
| `Property 'QUERY_FAILED' does not exist on ErrorCodes` | Use `ErrorCodes.DATABASE_ERROR` |
| `Type '...' is not assignable — Supabase join` | Join returns array, use `result[0]` not direct cast |
| Errors in `sick-bay`, `sensitive-periods`, `three-period-lessons`, `daily-care` | Pre-existing, ignore unless you touched those files |

## If type check passes but build fails
Only run a full build if investigating server/client boundary or build-specific bugs:
```bash
NODE_OPTIONS="--max-old-space-size=8192" npx next build
```
