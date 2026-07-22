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
  - `runOcrFromBuffer({ apiKey, modelId, buffer, mimeType, source, sourceUrl }) â†’ cardPayload`
  - `postToGas(gasWebAppUrl, payload) â†’ data`
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
    status: "æœªç¢ºèª",
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

- [ ] **Step 6: Commit** â€” skip.

---

