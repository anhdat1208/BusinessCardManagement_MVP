### Task 4: Rewire Discord bot to use `@bcm/shared`

**Files:**
- Modify: `discord-bot/package.json` â€” add `"@bcm/shared": "file:../shared"`, remove direct Gemini deps only if unused (Discord may still not need them if all in shared)
- Modify: `discord-bot/index.js` â€” thin adapter
- Delete or leave stub: `discord-bot/src/*` after switch (prefer delete once imports work)
- Delete: `discord-bot/test/*` after shared tests cover them OR change tests to import `@bcm/shared` â€” prefer delete and rely on `shared/test`

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

Prefer **re-export helper from shared** in `gas-client`/`process-card` neighbors â€” add `shared/src/gemini.js`:

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

- [ ] **Step 6: Commit** â€” skip.

---

