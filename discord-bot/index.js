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

    // MVP: xử lý từng attachment một
    for (const attachment of message.attachments.values()) {
      currentRow = "";
      const url = attachment.url;
      const contentType = attachment.contentType || mimeTypeFromUrl(url);
      currentSourceKey = `discord-${message.id}-${attachment.id}`;

      workingMsg = await message.reply(
        `Đang lưu ảnh danh thiếp (${attachment.name || "image"})...`
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
                `🧠 Đã lưu ảnh. Đang xử lý OCR (${attachment.name || "image"})...`
              );
              break;

            case "duplicate":
              currentRow = ctx?.row || "";
              await workingMsg.edit(
                ocrStarted
                  ? `ℹ️ Ảnh này đã được xử lý trước đó (row ${ctx?.row}). Không tạo bản ghi trùng.`
                  : `ℹ️ Ảnh này đã được xử lý trước đó (row ${ctx?.row}). Không gọi Gemini và không tạo bản ghi trùng.`
              );
              break;

            case "research":
              currentRow = ctx?.row || "";
              await workingMsg.edit(
                `🔎 Đã lưu OCR: ${ctx?.company} / ${ctx?.name}\nĐang điều tra công ty và soạn đề xuất...`
              );
              break;

            case "done":
              currentRow = ctx?.row || "";
              await workingMsg.edit(
                `✅ Hoàn tất: ${ctx?.company} / ${ctx?.name}\n- row: ${
                  ctx?.row
                }\n- file: ${
                  ctx?.companyFileName
                }\n- research/proposal/email: đã ghi${
                  enableGoogleSearch ? "" : " (chưa xác minh bằng Web Search)"
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
