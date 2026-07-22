# Task 1 Report: Scaffold `shared` and parameterize `source` in image-storage

**Status:** DONE  
**Date:** 2026-07-22  
**Commits:** none (no git repo)

## Summary

Created the `@bcm/shared` package with `errors.js` (unchanged copy) and `image-storage.js` (parameterized `source`). Discord bot was not modified.

## TDD Flow

1. Created `shared/package.json` and test files.
2. Ran `npm test` — **FAIL** (ERR_MODULE_NOT_FOUND for missing `src/` modules).
3. Implemented `shared/src/errors.js`, `shared/src/image-storage.js`, `shared/src/index.js`.
4. Ran `npm install` + `npm test` — **PASS** (9/9 tests).

## Files Created

| File | Description |
|------|-------------|
| `shared/package.json` | Package config per brief (`@bcm/shared`, ESM, node --test) |
| `shared/src/errors.js` | Copy from `discord-bot/src/errors.js` (unchanged) |
| `shared/src/image-storage.js` | Copy + `requireSource(source)` on `createStoreImagePayload` and `createLogPayload` |
| `shared/src/index.js` | Re-exports errors + image-storage |
| `shared/test/errors.test.js` | Copy from discord-bot with import path `../src/errors.js` |
| `shared/test/image-storage.test.js` | Ported discord tests with `source: "discord"` + new source-required/slack tests |

## Interfaces Produced

- `createStoreImagePayload({ buffer, mimeType, originalName, sourceKey, sourceUrl, source })` — `source` required
- `createLogPayload({ sourceKey, sourceUrl, step, status, row, message, source })` — `source` required
- `requireSource` throws `"source is required"` when missing/blank

## Test Results

```
# tests 9
# pass 9
# fail 0
```

Tests cover:
- errors: quota exhaustion, transient 503, formatProcessingError stages
- image-storage: source required, slack source, discord payload encoding, applyImageRefs, createLogPayload, isDuplicateImageResult

## Self-Review

| Check | Result |
|-------|--------|
| Brief package.json matches exactly | ✅ |
| errors.js unchanged from discord-bot | ✅ |
| `source` required in both payload creators | ✅ |
| Discord bot untouched | ✅ |
| TDD: failing tests before implementation | ✅ |
| All tests pass after install | ✅ |

## Concerns

1. **Unused dependencies:** `@google/genai` and `@google/generative-ai` are declared per brief but not imported yet — expected for upcoming pipeline modules.
2. **No test for `createLogPayload` missing source:** Brief only specified `createStoreImagePayload requires source` test; `createLogPayload` uses the same `requireSource` helper but lacks an explicit omit-source test. Low risk — same helper.

## Next Steps (out of scope)

- Task 2+: Wire discord-bot to consume `@bcm/shared` instead of local copies.
- Add `createLogPayload requires source` test when tightening coverage.

---

## Review Fix: requireSource allowlist (2026-07-22)

**Finding:** `requireSource()` accepted any non-empty string; must only allow `"discord"` or `"slack"` (exact).

**Changes:**
- `shared/src/image-storage.js` — `requireSource` validates against allowlist; throws `Invalid source: … Must be "discord" or "slack"` for other values
- `shared/test/image-storage.test.js` — added tests: invalid source for `createStoreImagePayload`, missing/invalid source for `createLogPayload`

**Command:**
```
cd shared && npm test
```

**Output:**
```
# tests 12
# pass 12
# fail 0
```

**Status:** FIXED — all 12 tests pass (was 9/9 before fix).
