# Task 5 re-review
## FILE: slack-bot\index.js
```
import "dotenv/config";
import bolt from "@slack/bolt";
import {
  processBusinessCard,
  formatProcessingError,
  createResearchAI,
  logToGas,
} from "@bcm/shared";

const { App } = bolt;

const {
  SLACK_BOT_TOKEN,
  SLACK_APP_TOKEN,
  SLACK_CHANNEL_ID,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_RESEARCH_MODEL,
  ENABLE_GOOGLE_SEARCH,
  GAS_WEBAPP_URL,
} = process.env;

if (!SLACK_BOT_TOKEN) throw new Error("Missing SLACK_BOT_TOKEN in .env");
if (!SLACK_APP_TOKEN) throw new Error("Missing SLACK_APP_TOKEN in .env");
if (!SLACK_CHANNEL_ID) throw new Error("Missing SLACK_CHANNEL_ID in .env");
if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY in .env");
if (!GAS_WEBAPP_URL) throw new Error("Missing GAS_WEBAPP_URL in .env");

const modelId = GEMINI_MODEL || "gemini-3.1-flash-lite";
const researchModelId = GEMINI_RESEARCH_MODEL || modelId;
const enableGoogleSearch =
  String(ENABLE_GOOGLE_SEARCH).toLowerCase() === "true";
const researchAI = createResearchAI(GEMINI_API_KEY);

const app = new App({
  token: SLACK_BOT_TOKEN,
  appToken: SLACK_APP_TOKEN,
  socketMode: true,
});

app.message(async ({ message, client }) => {
  // MVP: chá»‰ xá»­ lĂ½ message thÆ°á»ng (khĂ´ng pháº£i bot/edit/thread updates), Ä‘Ăºng channel
  if (message.subtype === "bot_message" || message.bot_id) return;
  if (message.channel !== SLACK_CHANNEL_ID) return;

  const files = message.files || [];
  const images = files.filter((f) =>
    String(f.mimetype || "").startsWith("image/")
  );
  if (images.length === 0) return;

  let sourceUrl = "";
  try {
    const permalink = await client.chat.getPermalink({
      channel: message.channel,
      message_ts: message.ts,
    });
    sourceUrl = permalink?.permalink || "";
  } catch {
    // permalink lĂ  optional, bá» qua náº¿u lá»—i
  }

  // MVP: xá»­ lĂ½ tá»«ng file má»™t
  for (const file of images) {
    let workingTs = "";
    let currentSourceKey = "";
    let currentRow = "";

    try {
      currentSourceKey = `slack-${message.channel}-${message.ts}-${file.id}`;

      const posted = await client.chat.postMessage({
        channel: message.channel,
        thread_ts: message.ts,
        text: `Äang lÆ°u áº£nh danh thiáº¿p (${file.name || "image"})...`,
      });
      workingTs = posted.ts;

      const downloadUrl = file.url_private_download || file.url_private;
      const imgRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });
      if (!imgRes.ok)
        throw new Error(`Failed to download image: ${imgRes.status}`);
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let ocrStarted = false;

      await processBusinessCard({
        buffer,
        mimeType: file.mimetype,
        originalName: file.name || "business-card",
        source: "slack",
        sourceKey: currentSourceKey,
        sourceUrl,
        gasWebAppUrl: GAS_WEBAPP_URL,
        geminiApiKey: GEMINI_API_KEY,
        ocrModelId: modelId,
        researchModelId,
        researchAI,
        enableGoogleSearch,
        onProgress: async (phase, ctx) => {
          switch (phase) {
            case "ocr":
              ocrStarted = true;
              await client.chat.update({
                channel: message.channel,
                ts: workingTs,
                text: `đŸ§  ÄĂ£ lÆ°u áº£nh. Äang xá»­ lĂ½ OCR (${
                  file.name || "image"
                })...`,
              });
              break;

            case "duplicate":
              currentRow = ctx?.row || "";
              await client.chat.update({
                channel: message.channel,
                ts: workingTs,
                text: ocrStarted
                  ? `â„¹ï¸ áº¢nh nĂ y Ä‘Ă£ Ä‘Æ°á»£c xá»­ lĂ½ trÆ°á»›c Ä‘Ă³ (row ${ctx?.row}). KhĂ´ng táº¡o báº£n ghi trĂ¹ng.`
                  : `â„¹ï¸ áº¢nh nĂ y Ä‘Ă£ Ä‘Æ°á»£c xá»­ lĂ½ trÆ°á»›c Ä‘Ă³ (row ${ctx?.row}). KhĂ´ng gá»i Gemini vĂ  khĂ´ng táº¡o báº£n ghi trĂ¹ng.`,
              });
              break;

            case "research":
              currentRow = ctx?.row || "";
              await client.chat.update({
                channel: message.channel,
                ts: workingTs,
                text: `đŸ” ÄĂ£ lÆ°u OCR: ${ctx?.company} / ${ctx?.name}\nÄang Ä‘iá»u tra cĂ´ng ty vĂ  soáº¡n Ä‘á» xuáº¥t...`,
              });
              break;

            case "done":
              currentRow = ctx?.row || "";
              await client.chat.update({
                channel: message.channel,
                ts: workingTs,
                text: `âœ… HoĂ n táº¥t: ${ctx?.company} / ${ctx?.name}\n- row: ${
                  ctx?.row
                }\n- file: ${
                  ctx?.companyFileName
                }\n- research/proposal/email: Ä‘Ă£ ghi${
                  enableGoogleSearch ? "" : " (chÆ°a xĂ¡c minh báº±ng Web Search)"
                }`,
              });
              break;

            default:
              break;
          }
        },
      });
    } catch (err) {
      console.error("Slack bot handler error:", err);
      // logToGas swallows errors internally; no rethrow
      await logToGas(GAS_WEBAPP_URL, {
        source: "slack",
        sourceKey: currentSourceKey,
        sourceUrl,
        step: "error",
        status: "error",
        row: currentRow,
        message: String(err?.message || err).slice(0, 1000),
      });
      const userMessage = formatProcessingError(err, {
        imageSaved: err?.imageSaved,
        cardSaved: err?.cardSaved,
      });
      try {
        if (workingTs) {
          await client.chat.update({
            channel: message.channel,
            ts: workingTs,
            text: userMessage,
          });
        } else {
          await client.chat.postMessage({
            channel: message.channel,
            thread_ts: message.ts,
            text: userMessage,
          });
        }
      } catch {}
    }
  }
});

(async () => {
  await app.start();
  console.log("Slack bot ready (Socket Mode)");
})();

```
## FILE: slack-bot\.env.example
```
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
## FILE: slack-bot\package.json
```
{
  "name": "businesscard-slack-bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Slack bot (Socket Mode): business card OCR via Gemini -> save to Google via GAS",
  "scripts": {
    "start": "node index.js",
    "test": "npm --prefix ../shared test"
  },
  "dependencies": {
    "@bcm/shared": "file:../shared",
    "@slack/bolt": "~4.7.3",
    "dotenv": "^16.4.7"
  }
}

```

