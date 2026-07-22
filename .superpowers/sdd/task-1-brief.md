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
    originalName: "ååˆº.jpg",
    sourceKey: "slack-C1-123.456-F1",
    sourceUrl: "https://slack.com/archives/C1/p123",
    source: "slack",
  });
  assert.equal(payload.image.source, "slack");
});
```

Also port the existing discord assertions from `discord-bot/test/image-storage.test.js`, adding `source: "discord"` to every call.

- [ ] **Step 3: Run test â€” expect FAIL**

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

- [ ] **Step 6: Commit** â€” skip (no git repo).

---

