# Task 2 Report: Move research modules + OCR + GAS client into `shared`

**Status:** DONE  
**Date:** 2026-07-22  
**Commits:** none (per instructions)

## Summary

Moved research helpers, research client, OCR pipeline, and GAS HTTP client from `discord-bot` into `@bcm/shared`. Research tests were ported with updated import paths. Discord bot was not modified (Task 4).

## TDD Flow

1. Copied `research.js`, `research-client.js`, and `research.test.js` from discord-bot into `shared`.
2. Created `ocr.js` and `gas-client.js` per brief interfaces.
3. Updated `shared/src/index.js` to export all new modules.
4. Ran `npm test` in `shared` — **PASS** (18/18 tests).

## Files Created

| File | Description |
|------|-------------|
| `shared/src/research.js` | Copy from `discord-bot/src/research.js` — `parseJsonLoose`, `buildResearchPrompt`, `extractGroundingSources`, `mergeGroundingSources` |
| `shared/src/research-client.js` | Copy from `discord-bot/src/research-client.js` — `researchCompany` with retry + Google Search config |
| `shared/src/ocr.js` | Extracted from `discord-bot/index.js` — `OCR_PROMPT`, `mimeTypeFromUrl`, `runOcrFromBuffer` (parameterized `apiKey`/`modelId`/`source`) |
| `shared/src/gas-client.js` | New — `postToGas(gasWebAppUrl, payload)`, `logToGas(gasWebAppUrl, event)` using `createLogPayload` from image-storage |
| `shared/test/research.test.js` | Ported from discord-bot with imports `../src/research.js` and `../src/research-client.js` |

## Files Modified

| File | Change |
|------|--------|
| `shared/src/index.js` | Added exports for research, research-client, ocr, gas-client |

## Interfaces Produced

- `runOcrFromBuffer({ apiKey, modelId, buffer, mimeType, source, sourceUrl })` → card payload with `status: "未確認"`
- `postToGas(gasWebAppUrl, payload)` → parsed GAS JSON (throws on non-JSON or `!data.ok`)
- `logToGas(gasWebAppUrl, event)` → swallows errors, warns to console
- `researchCompany({ ai, modelId, card, enableGoogleSearch })` — unchanged signature from discord-bot
- Re-exports: `OCR_PROMPT`, `mimeTypeFromUrl`, all research helpers

## Test Results

```
# tests 18
# pass 18
# fail 0
```

Breakdown:
- errors: 3 tests (unchanged from Task 1)
- image-storage: 9 tests (unchanged from Task 1)
- research: 6 tests (ported from discord-bot)

## Self-Review

| Check | Result |
|-------|--------|
| research.js / research-client.js match discord-bot copies | ✅ |
| OCR prompt and mimeTypeFromUrl match discord-bot/index.js | ✅ |
| runOcrFromBuffer accepts explicit apiKey/modelId/source (not env-bound) | ✅ |
| postToGas takes gasWebAppUrl as first arg (not env-bound) | ✅ |
| logToGas uses createLogPayload (requires source in event) | ✅ |
| index.js exports all modules | ✅ |
| Discord bot untouched | ✅ |
| Task 1 tests still pass (no regression on source allowlist) | ✅ |
| package.json unchanged (Gemini deps already present) | ✅ |

## Concerns

1. **No unit tests for ocr.js or gas-client.js:** Brief only specified porting research tests. OCR and GAS client will be covered indirectly when discord-bot/slack-bot wire up in Tasks 4–5. Consider adding mocked fetch/Gemini tests in a follow-up if desired.
2. **logToGas requires `source` in event:** Callers must pass `source: "discord"|"slack"` via `createLogPayload` contract — discord-bot currently omits source in some `logToGas` calls; Task 4 must add it when wiring to shared.
3. **Dual Gemini SDKs:** OCR uses `@google/generative-ai`; research uses `@google/genai` — same split as discord-bot, intentional until unified.

## Next Steps (out of scope)

- Task 4: Update discord-bot to import from `@bcm/shared` and pass `source`/`gasWebAppUrl`/`apiKey` explicitly.
- Task 5: Wire slack-bot to same shared pipeline.
