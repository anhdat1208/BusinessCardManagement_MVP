# Slack Bot + Shared Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared business-card pipeline from the Discord bot, keep Discord working unchanged for users, then add a Slack Socket Mode bot that uploads an image in a designated channel and runs the same pipeline.

**Architecture:** Create `shared/` (`@bcm/shared`) with OCR, GAS client, research, image-storage, and `processBusinessCard`. Thin adapters in `discord-bot/` and `slack-bot/` only listen for images and report progress. Each bot has its own `.env`.

**Tech Stack:** Node.js ESM, `discord.js`, `@slack/bolt` (Socket Mode), `@google/generative-ai` + `@google/genai`, existing GAS web app webhook.

**Spec:** `docs/superpowers/specs/2026-07-22-slack-bot-shared-pipeline-design.md`

## Global Constraints

- Never paste or commit Discord / Slack / Gemini tokens; `.env.example` uses placeholders only.
- Do not change GAS Apps Script unless required; no New version deploy needed for adapter-only work.
- `ENABLE_GOOGLE_SEARCH` default remains `false`.
- Slack listens only on `SLACK_CHANNEL_ID` for messages with image files (Discord-equivalent UX).
- Project currently has **no `.git` repo** — skip all `git commit` steps unless the user initializes git later.
- Prefer Vietnamese user-facing status strings matching current Discord copy.
- Keep existing unit tests green after every shared/Discord task.

---

## File map

| Path | Responsibility |
|------|----------------|
| `shared/package.json` | Package `@bcm/shared`, `"type": "module"`, deps for Gemini + tests |
| `shared/src/errors.js` | Move from discord-bot |
| `shared/src/image-storage.js` | Move; require `source` param |
| `shared/src/research.js` | Move from discord-bot |
| `shared/src/research-client.js` | Move from discord-bot |
| `shared/src/ocr.js` | OCR prompt + `runOcrFromBuffer` |
| `shared/src/gas-client.js` | `postToGas`, `logToGas` |
| `shared/src/process-card.js` | Full orchestrator + progress events |
| `shared/src/index.js` | Public exports |
| `shared/test/*.test.js` | Moved/updated unit tests |
| `discord-bot/index.js` | Thin Discord adapter |
| `discord-bot/package.json` | Depend on `file:../shared` |
| `discord-bot/test/` | Remove or re-export — tests live in shared |
| `slack-bot/package.json` | Bolt + shared |
| `slack-bot/index.js` | Slack Socket Mode adapter |
| `slack-bot/.env.example` | Placeholders for Slack + Gemini + GAS |

---

### Task 1: Scaffold `shared` and parameterize `source` in image-storage

**Files:**
- Create: `shared/package.json`
- Create: `shared/src/errors.js` (copy from `discord-bot/src/errors.js`)
- Create: `shared/src/image-storage.js` (copy + add `source`)
- Create: `shared/test/errors.test.js` (copy from `discord-bot/test/errors.test.js`, fix imports)
- Create: `shared/test/image-storage.test.js` (updated for `source`)
- Create: `shared/src/index.js` (export errors + image-storage for now)

**Interfaces:**
- Consumes: existing discord-bot modules
- Produces:
  - `createStoreImagePayload({ buffer, mimeType, originalName, sourceKey, sourceUrl, source })`
  - `createLogPayload({ sourceKey, sourceUrl, step, status, row, message, source })`
  - `source` required string (`"discord"` | `"slack"`)

- [ ] **Step 1: Create `shared/package.json`**

```json
{
  "name": "@bcm/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "@google/genai": "^2.12.0",
    "@google/generative-ai": "^0.24.1"
  }
}
```

- [ ] **Step 2: Write failing image-storage test that requires `source`**

In `shared/test/image-storage.test.js`, assert both discord and slack sources, and that omitting `source` throws:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  createLogPayload,
  createStoreImagePayload,
} from "../src/image-storage.js";

test("createStoreImagePayload requires source", () => {
  assert.throws(
    () =>
      createStoreImagePayload({
        buffer: Buffer.from("x"),
        mimeType: "image/jpeg",
        originalName: "a.jpg",
        sourceKey: "k",
        sourceUrl: "",
      }),
    /source/
  );
});

test("createStoreImagePayload accepts slack source", () => {
  const payload = createStoreImagePayload({
    buffer: Buffer.from("card-image"),
    mimeType: "image/jpeg",
    originalName: "名刺.jpg",
    sourceKey: "slack-C1-123.456-F1",
    sourceUrl: "https://slack.com/archives/C1/p123",
    source: "slack",
  });
  assert.equal(payload.image.source, "slack");
});
```

Also port the existing discord assertions from `discord-bot/test/image-storage.test.js`, adding `source: "discord"` to every call.

- [ ] **Step 3: Run test — expect FAIL**

Run: `cd shared; npm test`

Expected: FAIL (module missing or `source` still hardcoded / not required)

- [ ] **Step 4: Implement `shared/src/image-storage.js`**

Copy logic from `discord-bot/src/image-storage.js`. Changes:

```js
function requireSource(source) {
  const s = String(source || "").trim();
  if (!s) throw new Error("source is required");
  return s;
}

export function createStoreImagePayload({
  buffer,
  mimeType,
  originalName,
  sourceKey,
  sourceUrl,
  source,
}) {
  // ... existing buffer/mime checks ...
  const src = requireSource(source);
  return {
    action: "storeImage",
    image: {
      // ...
      source: src,
      // ...
    },
  };
}

export function createLogPayload({
  sourceKey,
  sourceUrl,
  step,
  status,
  row,
  message,
  source,
}) {
  return {
    action: "logEvent",
    source: requireSource(source),
    // ...
  };
}
```

Copy `errors.js` unchanged. Export from `shared/src/index.js`. Copy `errors.test.js` with import path `../src/errors.js`.

- [ ] **Step 5: Install deps and pass tests**

Run:

```powershell
cd C:\Users\DAT\Downloads\Compressed\BusinessCardManagement_MVP\shared
npm install
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit** — skip (no git repo).

---

### Task 2: Move research modules + OCR + GAS client into `shared`

**Files:**
- Create: `shared/src/research.js` (copy)
- Create: `shared/src/research-client.js` (copy)
- Create: `shared/src/ocr.js`
- Create: `shared/src/gas-client.js`
- Create: `shared/test/research.test.js` (copy, fix imports)
- Modify: `shared/src/index.js` (export new modules)
- Modify: `shared/package.json` if needed (already has Gemini deps)

**Interfaces:**
- Consumes: `errors.js`, `research.js` helpers
- Produces:
  - `runOcrFromBuffer({ apiKey, modelId, buffer, mimeType, source, sourceUrl }) → cardPayload`
  - `postToGas(gasWebAppUrl, payload) → data`
  - `logToGas(gasWebAppUrl, event)` where `event` includes `source`
  - `researchCompany({ ai, modelId, card, enableGoogleSearch })` (unchanged signature)

- [ ] **Step 1: Copy research files and research tests; update imports to `../src/...`**

- [ ] **Step 2: Add `shared/src/ocr.js`**

Extract from `discord-bot/index.js`:

```js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isTransientGeminiError } from "./errors.js";
import { parseJsonLoose } from "./research.js";

export const OCR_PROMPT = `...same Japanese prompt as discord-bot/index.js...`;

export function mimeTypeFromUrl(url) { /* same */ }

async function callGeminiWithRetry(model, parts, maxAttempts = 4) { /* same */ }

export async function runOcrFromBuffer({
  apiKey,
  modelId,
  buffer,
  mimeType,
  source,
  sourceUrl,
}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });
  const base64 = buffer.toString("base64");
  const result = await callGeminiWithRetry(model, [
    { text: OCR_PROMPT },
    { inlineData: { mimeType, data: base64 } },
  ]);
  const json = parseJsonLoose(result.response.text());
  return {
    source,
    sourceUrl: sourceUrl || "",
    handler: "",
    ...json,
    status: "未確認",
    memo: json.memo || "",
  };
}
```

- [ ] **Step 3: Add `shared/src/gas-client.js`**

```js
import { createLogPayload } from "./image-storage.js";

export async function postToGas(gasWebAppUrl, payload) {
  const res = await fetch(gasWebAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`GAS response is not JSON: ${text}`);
  }
  if (!res.ok || !data.ok) throw new Error(`GAS error: ${JSON.stringify(data)}`);
  return data;
}

export async function logToGas(gasWebAppUrl, event) {
  try {
    await postToGas(gasWebAppUrl, createLogPayload(event));
  } catch (err) {
    console.warn("Could not write processing log:", err?.message || err);
  }
}
```

- [ ] **Step 4: Export everything from `shared/src/index.js`**

```js
export * from "./errors.js";
export * from "./image-storage.js";
export * from "./research.js";
export * from "./research-client.js";
export * from "./ocr.js";
export * from "./gas-client.js";
```

- [ ] **Step 5: Run `npm test` in `shared`**

Expected: PASS (errors, image-storage, research).

- [ ] **Step 6: Commit** — skip.

---

### Task 3: Add `processBusinessCard` orchestrator + unit test with mocks

**Files:**
- Create: `shared/src/process-card.js`
- Create: `shared/test/process-card.test.js`
- Modify: `shared/src/index.js` — export `processBusinessCard`

**Interfaces:**
- Consumes: `postToGas`, `logToGas`, `createStoreImagePayload`, `applyImageRefs`, `isDuplicateImageResult`, `runOcrFromBuffer`, `researchCompany`
- Produces:

```js
/**
 * @param {object} opts
 * @param {Buffer} opts.buffer
 * @param {string} opts.mimeType
 * @param {string} [opts.originalName]
 * @param {"discord"|"slack"} opts.source
 * @param {string} opts.sourceKey
 * @param {string} [opts.sourceUrl]
 * @param {string} opts.gasWebAppUrl
 * @param {string} opts.geminiApiKey
 * @param {string} opts.ocrModelId
 * @param {string} opts.researchModelId
 * @param {import("@google/genai").GoogleGenAI} opts.researchAI
 * @param {boolean} opts.enableGoogleSearch
 * @param {(phase: string, ctx: object) => void | Promise<void>} [opts.onProgress]
 * @param {object} [opts.deps] // optional injection for tests
 * @returns {Promise<{ duplicate?: boolean, row?: string|number, company?: string, name?: string, companyFileName?: string, imageSaved: boolean, cardSaved: boolean }>}
 */
export async function processBusinessCard(opts)
```

Progress phases (exact strings): `"received"`, `"saving_image"`, `"duplicate"`, `"ocr"`, `"research"`, `"done"`.

- [ ] **Step 1: Write failing test with injected deps**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { processBusinessCard } from "../src/process-card.js";

test("processBusinessCard stops on duplicate image without OCR", async () => {
  const calls = [];
  const result = await processBusinessCard({
    buffer: Buffer.from("img"),
    mimeType: "image/jpeg",
    originalName: "a.jpg",
    source: "discord",
    sourceKey: "discord-1",
    sourceUrl: "https://example.com",
    gasWebAppUrl: "https://gas.example/exec",
    geminiApiKey: "k",
    ocrModelId: "m",
    researchModelId: "m",
    researchAI: {},
    enableGoogleSearch: false,
    onProgress: (phase) => calls.push(phase),
    deps: {
      postToGas: async (_url, payload) => {
        if (payload.action === "storeImage") {
          return { ok: true, duplicate: true, row: 9 };
        }
        throw new Error(`unexpected: ${payload.action}`);
      },
      logToGas: async () => {},
      runOcrFromBuffer: async () => {
        throw new Error("OCR should not run");
      },
      researchCompany: async () => {
        throw new Error("research should not run");
      },
    },
  });

  assert.equal(result.duplicate, true);
  assert.equal(result.row, 9);
  assert.ok(calls.includes("duplicate"));
});
```

- [ ] **Step 2: Run test — expect FAIL** (`processBusinessCard` missing)

Run: `cd shared; npm test`

- [ ] **Step 3: Implement `processBusinessCard`**

Mirror current Discord flow in `discord-bot/index.js` (store → OCR → save card → research → enrich). Track `imageSaved` / `cardSaved` on the result object for adapters' `formatProcessingError`. On thrown errors after partial progress, rethrow after the caller can read flags — simplest approach: attach to error:

```js
err.imageSaved = imageSaved;
err.cardSaved = cardSaved;
throw err;
```

Use real modules as default `deps`; tests override `deps`.

Happy-path outline:

1. `onProgress("received")` + `logToGas(..., { step: "received", status: "ok", source })`
2. `onProgress("saving_image")`
3. `postToGas(storeImagePayload)` → if duplicate: `onProgress("duplicate", refs)` + return `{ duplicate: true, row, imageSaved: true, cardSaved: false }`
4. `onProgress("ocr")` → `runOcrFromBuffer` → `applyImageRefs` → set `sourceKey`
5. `postToGas(cardPayload)` → if `duplicate`: return similarly
6. Require `companyFileId` or throw (same message as Discord)
7. `onProgress("research")` → `researchCompany` → `postToGas({ action: "enrichCompany", ... })`
8. `onProgress("done", { row, company, name, companyFileName })` → return success object

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit** — skip.

---

### Task 4: Rewire Discord bot to use `@bcm/shared`

**Files:**
- Modify: `discord-bot/package.json` — add `"@bcm/shared": "file:../shared"`, remove direct Gemini deps only if unused (Discord may still not need them if all in shared)
- Modify: `discord-bot/index.js` — thin adapter
- Delete or leave stub: `discord-bot/src/*` after switch (prefer delete once imports work)
- Delete: `discord-bot/test/*` after shared tests cover them OR change tests to import `@bcm/shared` — prefer delete and rely on `shared/test`

**Interfaces:**
- Consumes: `processBusinessCard`, `formatProcessingError` from `@bcm/shared`
- Produces: Discord UX only

- [ ] **Step 1: Update `discord-bot/package.json`**

```json
{
  "name": "businesscard-discord-bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "test": "npm --prefix ../shared test"
  },
  "dependencies": {
    "@bcm/shared": "file:../shared",
    "discord.js": "^14.16.3",
    "dotenv": "^16.4.7"
  }
}
```

- [ ] **Step 2: Rewrite `discord-bot/index.js` as adapter**

Keep env validation, Discord client, channel filter. On each image attachment:

```js
import {
  processBusinessCard,
  formatProcessingError,
} from "@bcm/shared";
import { GoogleGenAI } from "@google/genai";
```

Note: `@google/genai` is a dependency of shared; for creating `researchAI` in the adapter, either:

- re-export a small `createResearchAI(apiKey)` from shared, **or**
- add `@google/genai` as a direct discord-bot dependency.

Prefer **re-export helper from shared** in `gas-client`/`process-card` neighbors — add `shared/src/gemini.js`:

```js
import { GoogleGenAI } from "@google/genai";
export function createResearchAI(apiKey) {
  return new GoogleGenAI({ apiKey });
}
```

Export it from `index.js`. Discord then:

```js
const researchAI = createResearchAI(GEMINI_API_KEY);
// ...
const result = await processBusinessCard({
  buffer,
  mimeType: contentType,
  originalName: attachment.name || "business-card",
  source: "discord",
  sourceKey: `discord-${message.id}-${attachment.id}`,
  sourceUrl: message.url,
  gasWebAppUrl: GAS_WEBAPP_URL,
  geminiApiKey: GEMINI_API_KEY,
  ocrModelId: modelId,
  researchModelId: researchModelId,
  researchAI,
  enableGoogleSearch,
  onProgress: async (phase, ctx) => {
    // map to the same Vietnamese strings currently in discord-bot/index.js
  },
});
```

Map progress phases to the existing reply/edit strings. On catch, use `formatProcessingError(err, { imageSaved: err.imageSaved, cardSaved: err.cardSaved })`.

- [ ] **Step 3: `npm install` in discord-bot; run shared tests**

```powershell
cd ...\discord-bot
npm install
npm test
```

Expected: PASS.

- [ ] **Step 4: Manual smoke (if Discord token available)**

Run: `npm start`  
Upload a card image in the Discord channel.  
Expected: same completion message as before.

- [ ] **Step 5: Remove obsolete `discord-bot/src` and `discord-bot/test` if unused**

- [ ] **Step 6: Commit** — skip.

---

### Task 5: Scaffold Slack bot (Socket Mode) using shared pipeline

**Files:**
- Create: `slack-bot/package.json`
- Create: `slack-bot/.env.example`
- Create: `slack-bot/index.js`
- Create: `slack-bot/.gitignore` with `.env` (if not inherited)

**Interfaces:**
- Consumes: same `processBusinessCard` / `formatProcessingError` / `createResearchAI`
- Env: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_CHANNEL_ID`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_RESEARCH_MODEL`, `ENABLE_GOOGLE_SEARCH`, `GAS_WEBAPP_URL`

- [ ] **Step 1: Create `slack-bot/package.json`**

```json
{
  "name": "businesscard-slack-bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@bcm/shared": "file:../shared",
    "@slack/bolt": "^2.7.0",
    "dotenv": "^16.4.7"
  }
}
```

Use a current Bolt v3/v4 if install resolves newer — pin whatever `npm install @slack/bolt` installs that supports Socket Mode; prefer latest stable with `socketMode: true` + `appToken`.

- [ ] **Step 2: Create `slack-bot/.env.example`**

```env
# SLACK (never commit real tokens)
SLACK_BOT_TOKEN=xoxb-PASTE_BOT_TOKEN
SLACK_APP_TOKEN=xapp-PASTE_APP_TOKEN
SLACK_CHANNEL_ID=C0123456789

# Gemini
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_RESEARCH_MODEL=gemini-3.1-flash-lite
ENABLE_GOOGLE_SEARCH=false

# GAS webhook (POST)
GAS_WEBAPP_URL=https://script.google.com/macros/s/PASTE_DEPLOYMENT_ID/exec
```

- [ ] **Step 3: Implement `slack-bot/index.js`**

Core behavior:

```js
import "dotenv/config";
import bolt from "@slack/bolt";
import {
  processBusinessCard,
  formatProcessingError,
  createResearchAI,
} from "@bcm/shared";

const { App } = bolt;
// validate env...

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

app.message(async ({ message, say, client }) => {
  if (message.subtype === "bot_message" || message.bot_id) return;
  if (message.channel !== process.env.SLACK_CHANNEL_ID) return;
  const files = message.files || [];
  const images = files.filter((f) => String(f.mimetype || "").startsWith("image/"));
  if (images.length === 0) return;

  for (const file of images) {
    // 1) say progress message, keep ts for updates via chat.update
    // 2) download: fetch(file.url_private_download || file.url_private, { headers: { Authorization: `Bearer ${token}` }})
    // 3) processBusinessCard({ source: "slack", sourceKey: `slack-${message.channel}-${message.ts}-${file.id}`, ...})
    // 4) update progress text like Discord
  }
});

(async () => {
  await app.start();
  console.log("Slack bot ready (Socket Mode)");
})();
```

Permalink helper (optional): `client.chat.getPermalink({ channel, message_ts })` for `sourceUrl`.

Image mime: use `file.mimetype`; skip non-images.

- [ ] **Step 4: `npm install` in slack-bot**

```powershell
cd ...\slack-bot
npm install
```

Expected: lockfile created, no errors.

- [ ] **Step 5: Document manual run for user (do not read their `.env`)**

User copies `.env.example` → `.env`, fills tokens locally, then:

```powershell
cd slack-bot
npm start
```

Invite bot to channel; upload image.  
Expected: sheet/Drive/company file with `source=slack`.

- [ ] **Step 6: Commit** — skip.

---

### Task 6: Verification checklist

**Files:** none new (verification only)

- [ ] **Step 1: Run shared unit tests**

```powershell
cd ...\shared
npm test
```

Expected: PASS.

- [ ] **Step 2: Confirm Discord adapter starts**

```powershell
cd ...\discord-bot
npm start
```

Expected: `Discord bot ready...` (stop after confirm if no live test).

- [ ] **Step 3: Confirm Slack adapter starts**

```powershell
cd ...\slack-bot
npm start
```

Expected: `Slack bot ready (Socket Mode)` when `.env` is filled.

- [ ] **Step 4: Spec coverage check (agent)**

Confirm against spec success criteria:

1. shared owns pipeline — yes via Task 3  
2. Discord UX unchanged — Task 4  
3. Slack channel + image — Task 5  
4. No secrets in examples — Task 5 `.env.example`  
5. GAS unchanged — no GAS edits  

- [ ] **Step 5: Commit** — skip.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `shared/` extract | 1–3 |
| Parameterize `source` | 1 |
| Discord rewire | 4 |
| Slack Socket Mode + channel filter + images | 5 |
| Separate `.env` / placeholders | 5 |
| Tests keep passing | 1–3, 6 |
| No 24/7 deploy / no search billing | out of scope (not in tasks) |
| GAS New version | not required |

No TBD placeholders. Signatures consistent: `processBusinessCard`, progress phase strings, `createResearchAI`.
