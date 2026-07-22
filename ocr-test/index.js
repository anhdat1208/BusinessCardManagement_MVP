import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
  console.error("Missing GEMINI_API_KEY. Copy .env.example → .env and paste your key.");
  process.exit(1);
}

const GAS_WEBAPP_URL = process.env.GAS_WEBAPP_URL;
if (!GAS_WEBAPP_URL) {
  console.error("Missing GAS_WEBAPP_URL in .env");
  process.exit(1);
}

// Default: sample JPG in project. Override: node index.js path/to/image.jpg
const defaultImage = path.resolve(
  __dirname,
  "../01_BusinessCardImages/org/IMG_0067.JPG"
);
const imagePath = path.resolve(process.argv[2] || defaultImage);

if (!fs.existsSync(imagePath)) {
  console.error("Image not found:", imagePath);
  process.exit(1);
}

const OCR_PROMPT = `あなたは名刺OCRの専門家です。
この名刺画像から情報を抽出し、以下のJSON形式のみで出力してください。
説明文やMarkdownは不要です。JSON以外は一切出力しないでください。

不明な項目は空文字 "" にしてください。
推測で埋めないでください。

{
  "name": "",
  "company": "",
  "department": "",
  "title": "",
  "email": "",
  "phone": "",
  "mobile": "",
  "address": "",
  "companyUrl": "",
  "ocrConf": "高|中|低",
  "memo": ""
}

ルール:
- name: 氏名（姓名の順、名刺表記のまま）
- company: 会社名
- department: 部署
- title: 役職
- email: メールアドレス
- phone: 会社電話（あれば）
- mobile: 携帯電話（あれば）
- address: 住所
- companyUrl: 名刺に記載のURL
- ocrConf: 読み取り全体の信頼度（高/中/低）
- memo: 読み取りが不確かな点があれば簡潔に`;

function mimeTypeFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function parseJsonLoose(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function postToGas(payload) {
  const res = await fetch(GAS_WEBAPP_URL, {
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

  if (!res.ok || !data.ok) {
    throw new Error(`GAS error: ${JSON.stringify(data)}`);
  }
  return data;
}

async function callGeminiWithRetry(model, parts, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await model.generateContent(parts);
    } catch (err) {
      const msg = String(err?.message || err);
      const retryable =
        msg.includes("503") ||
        msg.includes("429") ||
        msg.includes("high demand") ||
        msg.includes("UNAVAILABLE");

      if (!retryable || attempt === maxAttempts) throw err;

      const waitMs = attempt * 3000;
      console.warn(
        `Gemini busy (${attempt}/${maxAttempts}). Retry in ${waitMs / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

async function main() {
  const genAI = new GoogleGenerativeAI(API_KEY);
  // Gemini 3 Flash — same family as AI Studio playground
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const imageBytes = fs.readFileSync(imagePath);
  const base64 = imageBytes.toString("base64");

  console.log("Image:", imagePath);
  console.log("Calling Gemini...");

  const result = await callGeminiWithRetry(model, [
    { text: OCR_PROMPT },
    {
      inlineData: {
        mimeType: mimeTypeFromExt(imagePath),
        data: base64,
      },
    },
  ]);

  const text = result.response.text();
  console.log("\n--- Raw response ---\n");
  console.log(text);

  try {
    const json = parseJsonLoose(text);
    console.log("\n--- Parsed JSON ---\n");
    console.log(JSON.stringify(json, null, 2));
  
    const payload = {
      source: "Discord",
      sourceUrl: "",
      handler: "",
      ...json,
      status: "未確認",
      memo: json.memo || "",
    };
  
    console.log("\nPosting to GAS...");
    const gasResult = await postToGas(payload);
    console.log("\n--- GAS result ---\n");
    console.log(JSON.stringify(gasResult, null, 2));
  } catch (err) {
    console.error("\nCould not parse/send JSON:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("OCR failed:", err.message || err);
  process.exit(1);
});
