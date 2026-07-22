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

Use a current Bolt v3/v4 if install resolves newer â€” pin whatever `npm install @slack/bolt` installs that supports Socket Mode; prefer latest stable with `socketMode: true` + `appToken`.

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

User copies `.env.example` â†’ `.env`, fills tokens locally, then:

```powershell
cd slack-bot
npm start
```

Invite bot to channel; upload image.  
Expected: sheet/Drive/company file with `source=slack`.

- [ ] **Step 6: Commit** â€” skip.

---

