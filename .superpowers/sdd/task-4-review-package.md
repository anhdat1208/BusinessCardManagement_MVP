# Task 4 review package
## FILE: discord-bot\index.js
```
import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import {
  processBusinessCard,
  formatProcessingError,
  createResearchAI,
  logToGas,
  mimeTypeFromUrl,
} from "@bcm/shared";

const {
  DISCORD_BOT_TOKEN,
  DISCORD_CHANNEL_ID,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_RESEARCH_MODEL,
  ENABLE_GOOGLE_SEARCH,
  GAS_WEBAPP_URL,
} = process.env;

if (!DISCORD_BOT_TOKEN) throw new Error("Missing DISCORD_BOT_TOKEN in .env");
if (!DISCORD_CHANNEL_ID) throw new Error("Missing DISCORD_CHANNEL_ID in .env");
if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY in .env");
if (!GAS_WEBAPP_URL) throw new Error("Missing GAS_WEBAPP_URL in .env");

const modelId = GEMINI_MODEL || "gemini-3-flash-preview";
const researchModelId = GEMINI_RESEARCH_MODEL || modelId;
const enableGoogleSearch =
  String(ENABLE_GOOGLE_SEARCH).toLowerCase() === "true";
const researchAI = createResearchAI(GEMINI_API_KEY);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("messageCreate", async (message) => {
  let workingMsg;
  let currentSourceKey = "";
  let currentRow = "";

  try {
    if (message.author.bot) return;
    if (message.channel.id !== DISCORD_CHANNEL_ID) return;
    if (!message.attachments || message.attachments.size === 0) return;

    // MVP: xá»­ lĂ½ tá»«ng attachment má»™t
    for (const attachment of message.attachments.values()) {
      currentRow = "";
      const url = attachment.url;
      const contentType = attachment.contentType || mimeTypeFromUrl(url);
      currentSourceKey = `discord-${message.id}-${attachment.id}`;

      workingMsg = await message.reply(
        `Äang lÆ°u áº£nh danh thiáº¿p (${attachment.name || "image"})...`
      );

      // Download image bytes from Discord CDN
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let ocrStarted = false;

      await processBusinessCard({
        buffer,
        mimeType: contentType,
        originalName: attachment.name || "business-card",
        source: "discord",
        sourceKey: currentSourceKey,
        sourceUrl: message.url,
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
              await workingMsg.edit(
                `đŸ§  ÄĂ£ lÆ°u áº£nh. Äang xá»­ lĂ½ OCR (${attachment.name || "image"})...`
              );
              break;

            case "duplicate":
              currentRow = ctx?.row || "";
              await workingMsg.edit(
                ocrStarted
                  ? `â„¹ï¸ áº¢nh nĂ y Ä‘Ă£ Ä‘Æ°á»£c xá»­ lĂ½ trÆ°á»›c Ä‘Ă³ (row ${ctx?.row}). KhĂ´ng táº¡o báº£n ghi trĂ¹ng.`
                  : `â„¹ï¸ áº¢nh nĂ y Ä‘Ă£ Ä‘Æ°á»£c xá»­ lĂ½ trÆ°á»›c Ä‘Ă³ (row ${ctx?.row}). KhĂ´ng gá»i Gemini vĂ  khĂ´ng táº¡o báº£n ghi trĂ¹ng.`
              );
              break;

            case "research":
              currentRow = ctx?.row || "";
              await workingMsg.edit(
                `đŸ” ÄĂ£ lÆ°u OCR: ${ctx?.company} / ${ctx?.name}\nÄang Ä‘iá»u tra cĂ´ng ty vĂ  soáº¡n Ä‘á» xuáº¥t...`
              );
              break;

            case "done":
              currentRow = ctx?.row || "";
              await workingMsg.edit(
                `âœ… HoĂ n táº¥t: ${ctx?.company} / ${ctx?.name}\n- row: ${
                  ctx?.row
                }\n- file: ${
                  ctx?.companyFileName
                }\n- research/proposal/email: Ä‘Ă£ ghi${
                  enableGoogleSearch ? "" : " (chÆ°a xĂ¡c minh báº±ng Web Search)"
                }`
              );
              break;

            default:
              break;
          }
        },
      });
    }
  } catch (err) {
    console.error("Discord bot handler error:", err);
    await logToGas(GAS_WEBAPP_URL, {
      source: "discord",
      sourceKey: currentSourceKey,
      sourceUrl: message.url,
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
      if (workingMsg) {
        await workingMsg.edit(userMessage);
      } else {
        await message.reply(userMessage);
      }
    } catch {}
  }
});

client.once("clientReady", () => {
  console.log(`Discord bot ready. Logged in as ${client.user.tag}`);
});

client.login(DISCORD_BOT_TOKEN);

```
## FILE: discord-bot\package.json
```
{
  "name": "businesscard-discord-bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Discord bot: business card OCR via Gemini -> save to Google via GAS",
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
## FILE: shared\src\process-card.js
```
import { postToGas as defaultPostToGas, logToGas as defaultLogToGas } from "./gas-client.js";
import {
  applyImageRefs as defaultApplyImageRefs,
  createStoreImagePayload as defaultCreateStoreImagePayload,
  isDuplicateImageResult as defaultIsDuplicateImageResult,
} from "./image-storage.js";
import { runOcrFromBuffer as defaultRunOcrFromBuffer } from "./ocr.js";
import { researchCompany as defaultResearchCompany } from "./research-client.js";

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
export async function processBusinessCard(opts) {
  const {
    buffer,
    mimeType,
    originalName,
    source,
    sourceKey,
    sourceUrl,
    gasWebAppUrl,
    geminiApiKey,
    ocrModelId,
    researchModelId,
    researchAI,
    enableGoogleSearch,
    onProgress,
    deps = {},
  } = opts;

  const postToGas = deps.postToGas || defaultPostToGas;
  const logToGas = deps.logToGas || defaultLogToGas;
  const createStoreImagePayload =
    deps.createStoreImagePayload || defaultCreateStoreImagePayload;
  const applyImageRefs = deps.applyImageRefs || defaultApplyImageRefs;
  const isDuplicateImageResult =
    deps.isDuplicateImageResult || defaultIsDuplicateImageResult;
  const runOcrFromBuffer = deps.runOcrFromBuffer || defaultRunOcrFromBuffer;
  const researchCompany = deps.researchCompany || defaultResearchCompany;

  let imageSaved = false;
  let cardSaved = false;

  async function emit(phase, ctx) {
    if (onProgress) await onProgress(phase, ctx);
  }

  try {
    await emit("received");
    await logToGas(gasWebAppUrl, {
      sourceKey,
      sourceUrl,
      step: "received",
      status: "ok",
      source,
      message: originalName || "image",
    });

    await emit("saving_image");
    const imageRefs = await postToGas(
      gasWebAppUrl,
      createStoreImagePayload({
        buffer,
        mimeType,
        originalName,
        sourceKey,
        sourceUrl,
        source,
      })
    );
    imageSaved = true;

    if (isDuplicateImageResult(imageRefs)) {
      await emit("duplicate", imageRefs);
      return {
        duplicate: true,
        row: imageRefs.row,
        imageSaved: true,
        cardSaved: false,
      };
    }

    await emit("ocr");
    const ocrPayload = await runOcrFromBuffer({
      apiKey: geminiApiKey,
      modelId: ocrModelId,
      buffer,
      mimeType,
      source,
      sourceUrl,
    });
    const cardPayload = applyImageRefs(ocrPayload, imageRefs);
    cardPayload.sourceKey = sourceKey;

    const gasResult = await postToGas(gasWebAppUrl, cardPayload);

    if (gasResult.duplicate) {
      await emit("duplicate", gasResult);
      return {
        duplicate: true,
        row: gasResult.row,
        imageSaved: true,
        cardSaved: false,
      };
    }

    cardSaved = true;

    if (!gasResult.companyFileId) {
      throw new Error(
        "GAS chÆ°a tráº£ companyFileId. HĂ£y cáº­p nháº­t vĂ  deploy láº¡i Code.gs."
      );
    }

    await emit("research", { ...cardPayload, row: gasResult.row });
    const research = await researchCompany({
      ai: researchAI,
      modelId: researchModelId,
      card: cardPayload,
      enableGoogleSearch,
    });

    await postToGas(gasWebAppUrl, {
      action: "enrichCompany",
      row: gasResult.row,
      companyFileId: gasResult.companyFileId,
      source,
      sourceKey,
      sourceUrl,
      research,
    });

    const result = {
      row: gasResult.row,
      company: cardPayload.company,
      name: cardPayload.name,
      companyFileName: gasResult.companyFileName,
      imageSaved,
      cardSaved,
    };

    await emit("done", result);
    return result;
  } catch (err) {
    err.imageSaved = imageSaved;
    err.cardSaved = cardSaved;
    throw err;
  }
}

```
## DELETED_CHECK
discord-bot/src exists: False
discord-bot/test exists: False

