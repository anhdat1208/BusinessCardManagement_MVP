### Task 3: Add `processBusinessCard` orchestrator + unit test with mocks

**Files:**
- Create: `shared/src/process-card.js`
- Create: `shared/test/process-card.test.js`
- Modify: `shared/src/index.js` â€” export `processBusinessCard`

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

- [ ] **Step 2: Run test â€” expect FAIL** (`processBusinessCard` missing)

Run: `cd shared; npm test`

- [ ] **Step 3: Implement `processBusinessCard`**

Mirror current Discord flow in `discord-bot/index.js` (store â†’ OCR â†’ save card â†’ research â†’ enrich). Track `imageSaved` / `cardSaved` on the result object for adapters' `formatProcessingError`. On thrown errors after partial progress, rethrow after the caller can read flags â€” simplest approach: attach to error:

```js
err.imageSaved = imageSaved;
err.cardSaved = cardSaved;
throw err;
```

Use real modules as default `deps`; tests override `deps`.

Happy-path outline:

1. `onProgress("received")` + `logToGas(..., { step: "received", status: "ok", source })`
2. `onProgress("saving_image")`
3. `postToGas(storeImagePayload)` â†’ if duplicate: `onProgress("duplicate", refs)` + return `{ duplicate: true, row, imageSaved: true, cardSaved: false }`
4. `onProgress("ocr")` â†’ `runOcrFromBuffer` â†’ `applyImageRefs` â†’ set `sourceKey`
5. `postToGas(cardPayload)` â†’ if `duplicate`: return similarly
6. Require `companyFileId` or throw (same message as Discord)
7. `onProgress("research")` â†’ `researchCompany` â†’ `postToGas({ action: "enrichCompany", ... })`
8. `onProgress("done", { row, company, name, companyFileName })` â†’ return success object

- [ ] **Step 4: Run tests â€” expect PASS**

- [ ] **Step 5: Commit** â€” skip.

---

