# Task 4 Report: Rewire Discord bot to use `@bcm/shared`

## Status: Done

## Changes
- `discord-bot/package.json`: now depends on `@bcm/shared` (`file:../shared`), `discord.js`, `dotenv`; removed direct `@google/genai`/`@google/generative-ai`; `npm test` → `npm --prefix ../shared test`.
- `discord-bot/index.js`: rewritten as thin adapter. Imports `processBusinessCard`, `formatProcessingError`, `createResearchAI`, `logToGas`, `mimeTypeFromUrl` from `@bcm/shared`. Keeps env validation, Discord client/intents, channel filter, per-attachment loop, CDN download, and all original Vietnamese reply/edit strings, mapped via `onProgress(phase, ctx)` (`ocr`, `duplicate`, `research`, `done`). Distinguishes pre-OCR vs post-OCR duplicate wording via an `ocrStarted` flag. Error path uses `err.imageSaved`/`err.cardSaved` from the thrown error plus `formatProcessingError`, and still logs an `error` step to GAS via `logToGas`.
- `discord-bot/src/*` and `discord-bot/test/*` deleted (logic + tests now live in `shared`).
- `shared/src/process-card.js`: minor enhancement — `research` phase now emits `{ ...cardPayload, row }` as ctx (was `undefined`) so consumers can render "company / name" and row without extra state; existing shared tests unaffected (verified).
- Reinstalled `discord-bot/node_modules` (fresh `package-lock.json`) confirming `@bcm/shared` resolves via the local file link.

## Test summary
- `npm test` in `discord-bot` → delegates to `shared`: **21/21 pass**, 0 fail.
- `node --check index.js`: OK. Linter: no errors in `index.js` / `process-card.js`.
- Smoke: ran `node index.js` with dummy env vars (no real secrets read/used) — resolved all `@bcm/shared` imports and reached `client.login`, failing only with Discord's expected `TokenInvalid` (proves wiring is correct end-to-end short of live credentials).
- Did not do a live Discord/Gemini/GAS smoke test (no real token used, per constraints).

## Concerns
- Card-vs-image duplicate wording relies on an `ocrStarted` closure flag since `processBusinessCard`'s `duplicate` phase ctx doesn't otherwise distinguish the two call sites — works correctly but is a bit implicit.
- The `shared/src/process-card.js` ctx enhancement for the `research` phase is a small shared-lib change made during this task (needed to preserve the "company / name" message); flagged in case it affects Task 5 (Slack bot) expectations — should be harmless/additive.

## Report path
`C:\Users\DAT\Downloads\Compressed\BusinessCardManagement_MVP\.superpowers\sdd\task-4-report.md`
