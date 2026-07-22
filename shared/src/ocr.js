import { GoogleGenerativeAI } from "@google/generative-ai";
import { isTransientGeminiError } from "./errors.js";
import { parseJsonLoose } from "./research.js";

export const OCR_PROMPT = `あなたは名刺OCRの専門家です。
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

export function mimeTypeFromUrl(url) {
  const lower = url.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function callGeminiWithRetry(model, parts, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await model.generateContent(parts);
    } catch (err) {
      if (!isTransientGeminiError(err) || attempt === maxAttempts) throw err;

      const waitMs = attempt * 3000;
      console.warn(
        `Gemini busy (${attempt}/${maxAttempts}). Retry in ${waitMs / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

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
