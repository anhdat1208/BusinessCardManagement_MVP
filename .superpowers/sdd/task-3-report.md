# Task 3 Report: `processBusinessCard` orchestrator + unit tests

## Status: Complete

All acceptance steps from `task-3-brief.md` implemented and passing.

## Files changed

- **Created** `shared/src/process-card.js` — `processBusinessCard(opts)` orchestrator.
- **Created** `shared/src/gemini.js` — `createResearchAI(apiKey)` (trivial `GoogleGenAI` factory, added per Task 3 instructions to prep for Task 4).
- **Created** `shared/test/process-card.test.js` — unit tests with fully injected `deps`.
- **Modified** `shared/src/index.js` — added `export * from "./process-card.js"` and `export * from "./gemini.js"`.

## Implementation notes

- Mirrors the existing Discord flow (`discord-bot/index.js`): received → saving_image → (duplicate check) → ocr → save card → (duplicate check) → require `companyFileId` → research → enrichCompany → done.
- `deps` object allows injecting `postToGas`, `logToGas`, `createStoreImagePayload`, `applyImageRefs`, `isDuplicateImageResult`, `runOcrFromBuffer`, `researchCompany`; defaults come from the real shared modules (`gas-client.js`, `image-storage.js`, `ocr.js`, `research-client.js`).
- Progress phases emitted via `onProgress(phase, ctx)` use the exact required strings: `"received"`, `"saving_image"`, `"duplicate"`, `"ocr"`, `"research"`, `"done"`.
- `imageSaved`/`cardSaved` booleans are tracked and attached to any thrown `Error` (`err.imageSaved`, `err.cardSaved`) before rethrowing, matching the brief and `formatProcessingError` contract used by bot adapters.
- Note: `cardSaved` is set to `true` *before* the `companyFileId` presence check, matching the current Discord bot's exact ordering (`discord-bot/index.js` lines 244–250) — this was intentional to preserve existing behavior, not a bug.
- Duplicate detection short-circuits at both the image-store stage and the card-save stage, skipping OCR/research as required.

## Test summary

`cd shared; npm test` → **21/21 passing** (12 pre-existing + 3 new `process-card` tests + others unaffected).

New tests in `process-card.test.js`:
1. Stops on duplicate image without running OCR/research (brief's exact test).
2. Full happy path: received → saving_image → ocr → research → done, verifies `row`, `company`, `name`, `companyFileName`, `imageSaved`, `cardSaved`, and that `enrichCompany` was posted.
3. Throws when `companyFileId` missing; verifies error carries `imageSaved`/`cardSaved` flags.

TDD followed: wrote brief's exact test first, confirmed it failed with `ERR_MODULE_NOT_FOUND` (module didn't exist), then implemented and reached green.

## Concerns

- None blocking. One minor judgment call: kept `cardSaved = true` before the `companyFileId` throw to exactly mirror current Discord bot behavior (see note above) — flagging in case Task 4/adapter behavior expectations differ.
- `discord-bot` and `slack-bot` were not touched, per constraints.
