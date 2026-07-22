# Task 5 Report: Scaffold Slack bot (Socket Mode) using shared pipeline

## Status
Done.

## What was created
- `slack-bot/package.json` — deps: `@bcm/shared` (file:../shared), `@slack/bolt` (installed 4.7.3, latest stable, `^4.2.0` range), `dotenv`.
- `slack-bot/.env.example` — placeholders only for `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_CHANNEL_ID`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_RESEARCH_MODEL`, `ENABLE_GOOGLE_SEARCH`, `GAS_WEBAPP_URL`.
- `slack-bot/.gitignore` — `node_modules/`, `.env`, `*.log`.
- `slack-bot/index.js` — Bolt `App` in Socket Mode (`token`/`appToken`/`socketMode: true`). Listens on `app.message`, filters bot messages, channel via `SLACK_CHANNEL_ID`, image files by `mimetype`. Downloads via `url_private_download`/`url_private` with `Authorization: Bearer <SLACK_BOT_TOKEN>`. Calls `processBusinessCard` with `source: "slack"`, `sourceKey: slack-${channel}-${ts}-${file.id}`, optional permalink as `sourceUrl`. Posts progress messages in-thread and edits via `chat.update` for phases `ocr`/`duplicate`/`research`/`done`, mirroring Discord's Vietnamese UX strings. Catches errors, logs via `logToGas`, shows `formatProcessingError` message.

## How to run
```powershell
cd slack-bot
copy .env.example .env   # fill real tokens locally, never commit
npm start
```
Invite bot to the channel, upload an image; expect sheet/Drive/company file with `source=slack`.

## Concerns
- No `.env` created/read — real tokens never touched, per constraints.
- `npm install` succeeded (128 packages, 0 vulnerabilities); `node --check` passed.
- Verified init logic end-to-end (env validation → Bolt startup → Socket Mode auth call) using dummy env vars; got expected `invalid_auth` from Slack API, confirming code path works without a live/valid connection.
- Bolt v4 `chat.getPermalink`/`chat.update`/`chat.postMessage` APIs used are stable across v3/v4; no deprecated APIs used.

## Report path
`.superpowers/sdd/task-5-report.md`

## Review fixes (2026-07-22)
- **GEMINI model defaults**: `index.js` fallback and `.env.example` now use `gemini-3.1-flash-lite` for `GEMINI_MODEL` and `GEMINI_RESEARCH_MODEL` (matches plan brief).
- **@slack/bolt pinned**: `package.json` dependency changed from `^4.2.0` to `~4.7.3` (installed version 4.7.3); `package-lock.json` root range updated to match.
- **logToGas catch**: No extra try/catch added; comment added noting shared `logToGas` swallows errors and never rethrows.
- **Verification**: `node --check index.js` passed.
