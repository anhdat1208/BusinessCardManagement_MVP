# Design: Slack bot + shared card pipeline

Date: 2026-07-22  
Project: BusinessCardManagement_MVP  
Status: Approved for implementation planning

## Goal

Add a Slack Socket Mode bot that behaves like the existing Discord bot (upload image in a designated channel → process business card). Extract a single shared pipeline so Discord and Slack stay in sync, remain easy to maintain, and are straightforward to deploy later (one or two processes).

## Non-goals (deferred)

- 24/7 hosting / production deploy
- Tavily or Google Search billing (`ENABLE_GOOGLE_SEARCH` stays false by default)
- Changing GAS webhook behavior (beyond accepting `source: "slack"` which it already supports via generic fields)
- Single-process “run Discord + Slack together” binary (optional later; not required now)

## Decisions

| Topic | Choice |
|-------|--------|
| Architecture | `shared/` pipeline + thin Discord/Slack adapters |
| Refactor | Extract shared now; update Discord to use it; then add Slack |
| Slack trigger | Designated channel only (`SLACK_CHANNEL_ID`), message with image file(s) — same UX as Discord |
| Runtime | Two local processes (`discord-bot`, `slack-bot`), each with its own `.env` |
| Secrets in chat | Never paste Discord / Slack / Gemini tokens |

## Target layout

```
BusinessCardManagement_MVP/
  shared/                 # platform-agnostic pipeline
    package.json          # name: @bcm/shared (or plain folder with relative imports)
    src/
      errors.js
      image-storage.js
      research.js
      research-client.js
      ocr.js              # OCR prompt + Gemini OCR + parseJsonLoose
      gas-client.js       # postToGas, logToGas
      process-card.js     # end-to-end: store → OCR → save → research → enrich
  discord-bot/
    index.js              # Discord adapter only
    .env / .env.example
    package.json          # depends on shared via file:../shared
  slack-bot/
    index.js              # Slack Socket Mode adapter only
    .env / .env.example
    package.json
  gas/                    # unchanged (deploy New version only if GAS code changes)
```

Relative `file:../shared` imports are enough for MVP (no monorepo tooling required).

## Shared pipeline

### Responsibilities

Move out of `discord-bot` into `shared`:

- `errors.js`, `image-storage.js`, `research.js`, `research-client.js` (as-is, with small fixes below)
- OCR helpers currently inline in `discord-bot/index.js` (`OCR_PROMPT`, `runOcrFromBuffer`, retry wrapper, mime helpers)
- GAS HTTP helpers (`postToGas`, `logToGas`)
- One orchestrator, e.g. `processBusinessCard({ buffer, mimeType, originalName, source, sourceKey, sourceUrl, onProgress })`

### Orchestrator steps (unchanged behavior)

1. Log `received`
2. `storeImage` → Drive ORIGINAL/IMPORTED + SHA-256 dedupe
3. If duplicate → stop (no Gemini, no new sheet row)
4. OCR via Gemini → card JSON
5. POST card to GAS (名刺一覧 + company file)
6. If duplicate row → stop
7. `researchCompany` (Gemini; Google Search off unless env says otherwise)
8. `enrichCompany` on GAS
9. Report success / structured error via `onProgress` / thrown errors

### Source-awareness fix

Today `image-storage.js` hardcodes `source: "discord"` in `createStoreImagePayload` and `createLogPayload`. Shared versions **must** take `source` as a required argument (`"discord"` | `"slack"`).

### Progress callbacks

Adapters own UX text. Shared calls something like:

- `onProgress("saving_image" | "ocr" | "research" | "done" | "duplicate", ctx)`
- Errors: throw; adapter maps with existing `formatProcessingError`

## Discord adapter

- Keep current intents and `DISCORD_CHANNEL_ID` filter
- On image attachment: download bytes → call shared orchestrator
- Reply/edit messages in Vietnamese (same copy as today)
- `.env`: `DISCORD_*`, `GEMINI_*`, `ENABLE_GOOGLE_SEARCH`, `GAS_WEBAPP_URL`
- After refactor: existing tests move under `shared` or keep importing shared; Discord smoke test still works with `npm start`

## Slack adapter

### Runtime

- `@slack/bolt` with Socket Mode
- Env: `SLACK_BOT_TOKEN` (`xoxb-…`), `SLACK_APP_TOKEN` (`xapp-…`), `SLACK_CHANNEL_ID`, plus same Gemini/GAS vars as Discord
- Listen for messages in `SLACK_CHANNEL_ID` that include image files
- Ignore bot messages and non-image files
- Download file via Slack API (`files.info` / private URL + bot token)
- Post progress replies in-thread (or channel reply) with the same Vietnamese status style as Discord
- `source: "slack"`, `sourceKey` like `slack-{channel}-{ts}-{file_id}`, `sourceUrl` = Slack permalink if available

### Slack App prerequisites (already mostly done by user)

- Socket Mode on + App Token
- Bot Token Scopes (minimum for this design):
  - `channels:history` / `groups:history` (as needed for channel type)
  - `files:read`
  - `chat:write`
- App installed to workspace; bot invited to the target channel
- Channel ID in `.env`

### Out of scope for v1 Slack

- DMs, slash commands, interactive buttons
- Listening on every channel without ID filter
- Separate `file_shared` event path (message-with-file is enough to match Discord)

## Environment & deploy notes

Local:

- `discord-bot/.env` and `slack-bot/.env` are separate
- Gemini + GAS URL duplicated; platform tokens stay isolated

Later deploy (not implemented now):

- **Two services:** each gets its platform env + shared Gemini/GAS secrets — simplest isolation
- **One service:** set all env vars once and start both adapters — still fine because code shares `shared/`

Two local `.env` files do **not** force two deploy strategies; they only mirror two processes.

## Testing

- Move / keep unit tests for image-storage, errors, research under `shared` (or `discord-bot/test` importing shared) — existing tests must still pass
- Manual: Discord upload still works after refactor
- Manual: Slack upload in designated channel runs full pipeline and writes sheet/Drive with `source=slack`

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Discord regression during extract | Extract then run Discord smoke before writing Slack |
| Hardcoded `source: "discord"` | Parameterize in shared image-storage/log payloads |
| Slack file download auth | Always fetch with bot token; handle private URLs |
| Gemini free quota | Same models/env as Discord; no extra search tools |

## Success criteria

1. `shared/` owns OCR → GAS → research → enrich
2. Discord behavior unchanged from user perspective
3. Slack: upload image in configured channel → same end state as Discord (sheet row, Drive images, company file, enrich)
4. No secrets in repo docs or chat examples (placeholders only)
5. GAS redeploy only if GAS code changes (not required for adapter-only work)
