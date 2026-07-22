# Task 2 review package
## FILE: shared\src\research.js
```
const JVIT_SERVICES = `# JV-ITææ¡ˆă‚µăƒ¼ăƒ“ă‚¹ä¸€è¦§

## ææ¡ˆă§ăă‚‹æ¥­å‹™
- ITæ¥­å‹™æ”¹å–„
- æ¥­å‹™ă‚·ă‚¹ăƒ†ăƒ é–‹ç™º
- Webă‚·ă‚¹ăƒ†ăƒ é–‹ç™º
- æ—¢å­˜ă‚·ă‚¹ăƒ†ăƒ æ”¹ä¿®
- Google Workspaceæ´»ç”¨æ”¯æ´
- Slacké€£æºă€æ¥­å‹™è‡ªå‹•åŒ–
- AIæ´»ç”¨æ”¯æ´
- ăƒ‡ăƒ¼ă‚¿æ•´ç†ă€ăƒ¬ăƒăƒ¼ăƒˆè‡ªå‹•åŒ–
- ă‚½ăƒ•ăƒˆă‚¦ă‚§ă‚¢é–‹ç™ºă®ăƒ©ăƒœä½“åˆ¶

## å¾—æ„ăªç›¸è«‡
- æ‰‹ä½œæ¥­ă‚’æ¸›ă‚‰ă—ăŸă„
- ă‚¹ăƒ—ăƒ¬ăƒƒăƒ‰ă‚·ăƒ¼ăƒˆé‹ç”¨ă‚’æ•´ç†ă—ăŸă„
- ç¤¾å†…ă‚·ă‚¹ăƒ†ăƒ ă‚’ä½œă‚ăŸă„
- æ—¢å­˜æ¥­å‹™ă‚’AIă§å¹ç‡åŒ–ă—ăŸă„
- å–¶æ¥­ă‚„ăƒăƒƒă‚¯ă‚ªăƒ•ă‚£ă‚¹ă®å®å‹ä½œæ¥­ă‚’è‡ªå‹•åŒ–ă—ăŸă„

## ææ¡ˆæ™‚ă®æ³¨æ„
- ç›¸æ‰‹ä¼æ¥­ă®å…¬é–‹æƒ…å ±ă ă‘ă§æ–­å®ă—ăªă„
- åˆå›ă¯èª²é¡Œç¢ºèªă‚’ä¸­å¿ƒă«ă™ă‚‹
- æ¼ă—å£²ă‚ă§ă¯ăªăă€æ¥­å‹™æ•´ç†ă®ç›¸è«‡ă¨ă—ă¦ææ¡ˆă™ă‚‹`;

export function parseJsonLoose(text) {
  const cleaned = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export function buildResearchPrompt(card, { enableGoogleSearch = true } = {}) {
  const researchInstruction = enableGoogleSearch
    ? "Googleæ¤œç´¢ă§ä¼ç¤¾ă®å…¬å¼ă‚µă‚¤ăƒˆă€gBizINFOç­‰ă®å…¬ç„æƒ…å ±ă€ä¿¡é ¼ă§ăă‚‹ăƒ‹ăƒ¥ăƒ¼ă‚¹ă‚’ç¢ºèªă—ă€"
    : "Googleæ¤œç´¢ă¯åˆ©ç”¨ă§ăă¾ă›ă‚“ă€‚ăƒ¢ăƒ‡ăƒ«ăŒç¢ºå®Ÿă«ææ¡ă—ă¦ă„ă‚‹æƒ…å ±ă¨ååˆºOCRæƒ…å ±ă ă‘ă‚’ä½¿ă„ă€";

  return `ă‚ăªăŸă¯æ—¥æœ¬ä¼æ¥­å‘ă‘B2Bå–¶æ¥­ăƒªă‚µăƒ¼ăƒă®å°‚é–€å®¶ă§ă™ă€‚
${researchInstruction}
ååˆºă®ä¼ç¤¾ă‚’ç‰¹å®ă—ă¦JV-ITă®ææ¡ˆä»®èª¬ă¨å•†è«‡ăƒ¡ăƒ¼ăƒ«ä¸‹æ›¸ăă‚’ä½œæˆă—ă¦ăă ă•ă„ă€‚

## ååˆºOCRæƒ…å ±
- æ°å: ${card.name || ""}
- ä¼ç¤¾å: ${card.company || ""}
- éƒ¨ç½²: ${card.department || ""}
- å½¹è·: ${card.title || ""}
- ăƒ¡ăƒ¼ăƒ«: ${card.email || ""}
- ååˆºè¨˜è¼‰URL: ${card.companyUrl || ""}

## JV-ITă®ă‚µăƒ¼ăƒ“ă‚¹
${JVIT_SERVICES}

## å³å®ˆäº‹é …
- å…¬é–‹æƒ…å ±ă ă‘ă§æ–­å®ă—ăªă„ă€‚äº‹å®Ÿă¨ä»®èª¬ă‚’æ˜ç¢ºă«åˆ†ă‘ă‚‹ă€‚
- æ¤œç´¢ă§ăăªă„å ´åˆă€æœ€æ–°æ€§ă‚’ç¢ºèªă§ăăªă„æƒ…å ±ă¯ç©ºæ–‡å­—ă«ă—ă€èª¿æŸ»ăƒ¡ăƒ¢ă«ă€ŒWebæ¤œç´¢æœªå®Ÿæ–½ă€ă¨æ›¸ăă€‚
- å…¬å¼ă‚µă‚¤ăƒˆăƒ»å…¬ç„DBă‚’å„ªå…ˆă—ă€å€¤ă”ă¨ă«å‡ºå…¸URLă‚’ä»˜ă‘ă‚‹ă€‚
- ç¢ºèªă§ăăªă„å€¤ă¯ç©ºæ–‡å­—ă«ă™ă‚‹ă€‚æ¨æ¸¬å€¤ă‚’ä¼ç¤¾æƒ…å ±ă®äº‹å®Ÿă¨ă—ă¦æ›¸ă‹ăªă„ă€‚
- ææ¡ˆä»®èª¬ă¯JV-ITă‚µăƒ¼ăƒ“ă‚¹ä¸€è¦§ă«ă‚ă‚‹å†…å®¹ă ă‘ă‚’æ ¹æ‹ ă«ă™ă‚‹ă€‚
- ăƒ¡ăƒ¼ăƒ«ă¯æ¼ă—å£²ă‚ă«ă›ăă€èª²é¡Œç¢ºèªă¨æƒ…å ±äº¤æ›ă‚’ç›®ç„ă«ă™ă‚‹ă€‚
- JSONä»¥å¤–ă¯ä¸€åˆ‡å‡ºå›ă—ăªă„ă€‚

æ¬¡ă®JSONæ§‹é€ ă®ă¿ă‚’è¿”ă—ă¦ăă ă•ă„:
{
  "companyIdentificationConfidence": "é«˜|ä¸­|ä½",
  "companyInfo": {
    "èª¿æŸ»æ—¥": "",
    "ä¼ç¤¾ç‰¹å®ä¿¡é ¼åº¦": "é«˜|ä¸­|ä½",
    "ååˆºè¨˜è¼‰ä¼ç¤¾å": "",
    "æ­£å¼ä¼ç¤¾å": "",
    "ä¼ç¤¾åă‚«ăƒăƒ»è‹±å­—å": "",
    "æ³•äººç•ªå·": "",
    "å…¬å¼ă‚µă‚¤ăƒˆURL": "",
    "å•ă„åˆă‚ă›URL": "",
    "ăƒ¡ăƒ¼ăƒ«ăƒ‰ăƒ¡ă‚¤ăƒ³": "",
    "æœ¬ç¤¾æ‰€åœ¨åœ°": "",
    "æ‹ ç‚¹ăƒ»æ”¯åº—": "",
    "ä»£è¡¨è€…": "",
    "è¨­ç«‹ăƒ»å‰µæ¥­": "",
    "è³‡æœ¬é‡‘": "",
    "å¾“æ¥­å“¡æ•°": "",
    "æ¥­ç¨®": "",
    "äº‹æ¥­æ¦‚è¦": "",
    "ä¸»ăªă‚µăƒ¼ăƒ“ă‚¹ăƒ»è£½å“": "",
    "ä¸»ăªé¡§å®¢ăƒ»å¯¾è±¡å¸‚å ´": "",
    "ä¼ç¤¾ă®ç‰¹å¾´ăƒ»å¼·ă¿": "",
    "æœ€è¿‘ă®ăƒ‹ăƒ¥ăƒ¼ă‚¹ăƒ»ăƒˆăƒ”ăƒƒă‚¯": "",
    "ITăƒ»DXé–¢é€£ă®å…¬é–‹æƒ…å ±": "",
    "ååˆºäººç‰©ă¨ă®æ¥ç‚¹": ""
  },
  "companyInfoEvidence": {
    "æ­£å¼ä¼ç¤¾å": {"sourceUrl": "", "confidence": "é«˜|ä¸­|ä½", "memo": ""}
  },
  "researchNotes": [""],
  "proposal": {
    "ä¼ç¤¾ă®ç‰¹å¾´": "",
    "æƒ³å®èª²é¡Œï¼ˆä»®èª¬ăƒ»æœªç¢ºèªï¼‰": "",
    "JV-ITăŒææ¡ˆă§ăăă†ăªå†…å®¹": "",
    "ææ¡ˆç†ç”±": "",
    "åˆå›å•†è«‡ă§ç¢ºèªă™ă‚‹è³ªå•": "",
    "å„ªå…ˆåº¦": ""
  },
  "emailDraft": {
    "subject": "",
    "body": "",
    "preSendChecks": [""]
  },
  "sources": [
    {"title": "", "url": "", "memo": ""}
  ]
}`;
}

export function extractGroundingSources(response) {
  const chunks =
    response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const sources = [];

  for (const chunk of chunks) {
    const url = chunk?.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({
      title: chunk.web.title || url,
      url,
    });
  }

  return sources;
}

export function mergeGroundingSources(research, groundingSources) {
  const existing = Array.isArray(research.sources) ? research.sources : [];
  const byUrl = new Map();

  for (const source of [...existing, ...groundingSources]) {
    if (!source?.url || byUrl.has(source.url)) continue;
    byUrl.set(source.url, {
      title: source.title || source.url,
      url: source.url,
      memo: source.memo || "",
    });
  }

  return { ...research, sources: [...byUrl.values()] };
}

```
## FILE: shared\src\research-client.js
```
import {
  buildResearchPrompt,
  extractGroundingSources,
  mergeGroundingSources,
  parseJsonLoose,
} from "./research.js";
import { isTransientGeminiError } from "./errors.js";

async function withRetry(operation, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (!isTransientGeminiError(err) || attempt === maxAttempts) throw err;

      const waitMs = attempt * 3000;
      console.warn(
        `Gemini research busy (${attempt}/${maxAttempts}). Retry in ${
          waitMs / 1000
        }s...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export async function researchCompany({
  ai,
  modelId,
  card,
  enableGoogleSearch = true,
}) {
  const config = enableGoogleSearch
    ? { tools: [{ googleSearch: {} }] }
    : {};

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: modelId,
      contents: buildResearchPrompt(card, { enableGoogleSearch }),
      config,
    })
  );

  const research = parseJsonLoose(response.text);
  return mergeGroundingSources(
    research,
    extractGroundingSources(response)
  );
}

```
## FILE: shared\src\ocr.js
```
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isTransientGeminiError } from "./errors.js";
import { parseJsonLoose } from "./research.js";

export const OCR_PROMPT = `ă‚ăªăŸă¯ååˆºOCRă®å°‚é–€å®¶ă§ă™ă€‚
ă“ă®ååˆºç”»åƒă‹ă‚‰æƒ…å ±ă‚’æ½å‡ºă—ă€ä»¥ä¸‹ă®JSONå½¢å¼ă®ă¿ă§å‡ºå›ă—ă¦ăă ă•ă„ă€‚
èª¬æ˜æ–‡ă‚„Markdownă¯ä¸è¦ă§ă™ă€‚JSONä»¥å¤–ă¯ä¸€åˆ‡å‡ºå›ă—ăªă„ă§ăă ă•ă„ă€‚

ä¸æ˜ăªé …ç›®ă¯ç©ºæ–‡å­— "" ă«ă—ă¦ăă ă•ă„ă€‚
æ¨æ¸¬ă§åŸ‹ă‚ăªă„ă§ăă ă•ă„ă€‚

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
  "ocrConf": "é«˜|ä¸­|ä½",
  "memo": ""
}

ăƒ«ăƒ¼ăƒ«:
- name: æ°åï¼ˆå§“åă®é †ă€ååˆºè¡¨è¨˜ă®ă¾ă¾ï¼‰
- company: ä¼ç¤¾å
- department: éƒ¨ç½²
- title: å½¹è·
- email: ăƒ¡ăƒ¼ăƒ«ă‚¢ăƒ‰ăƒ¬ă‚¹
- phone: ä¼ç¤¾é›»è©±ï¼ˆă‚ă‚Œă°ï¼‰
- mobile: æºå¸¯é›»è©±ï¼ˆă‚ă‚Œă°ï¼‰
- address: ä½æ‰€
- companyUrl: ååˆºă«è¨˜è¼‰ă®URL
- ocrConf: èª­ă¿å–ă‚å…¨ä½“ă®ä¿¡é ¼åº¦ï¼ˆé«˜/ä¸­/ä½ï¼‰
- memo: èª­ă¿å–ă‚ăŒä¸ç¢ºă‹ăªç‚¹ăŒă‚ă‚Œă°ç°¡æ½”ă«`;

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
    status: "æœªç¢ºèª",
    memo: json.memo || "",
  };
}

```
## FILE: shared\src\gas-client.js
```
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
## FILE: shared\src\index.js
```
export * from "./errors.js";
export * from "./image-storage.js";
export * from "./research.js";
export * from "./research-client.js";
export * from "./ocr.js";
export * from "./gas-client.js";

```
## FILE: shared\test\research.test.js
```
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResearchPrompt,
  extractGroundingSources,
  parseJsonLoose,
} from "../src/research.js";
import { researchCompany } from "../src/research-client.js";

test("parseJsonLoose parses JSON wrapped in a markdown fence", () => {
  const value = parseJsonLoose('```json\n{"company":"JV-IT"}\n```');
  assert.deepEqual(value, { company: "JV-IT" });
});

test("buildResearchPrompt includes card facts and JV-IT proposal constraints", () => {
  const prompt = buildResearchPrompt({
    company: "ăƒ†ă‚¹ăƒˆæ ªå¼ä¼ç¤¾",
    companyUrl: "https://example.jp",
    name: "å±±ç”° å¤ªéƒ",
    department: "DXæ¨é€²éƒ¨",
    title: "éƒ¨é•·",
    email: "taro@example.jp",
  });

  assert.match(prompt, /ăƒ†ă‚¹ăƒˆæ ªå¼ä¼ç¤¾/);
  assert.match(prompt, /https:\/\/example\.jp/);
  assert.match(prompt, /Google Workspaceæ´»ç”¨æ”¯æ´/);
  assert.match(prompt, /å…¬é–‹æƒ…å ±ă ă‘ă§æ–­å®ă—ăªă„/);
  assert.match(prompt, /JSONä»¥å¤–ă¯ä¸€åˆ‡å‡ºå›ă—ăªă„/);
});

test("extractGroundingSources removes duplicate and invalid web sources", () => {
  const response = {
    candidates: [
      {
        groundingMetadata: {
          groundingChunks: [
            { web: { title: "Official", uri: "https://example.jp" } },
            { web: { title: "Duplicate", uri: "https://example.jp" } },
            { web: { title: "News", uri: "https://news.example.jp/a" } },
            { text: "not a web source" },
          ],
        },
      },
    ],
  };

  assert.deepEqual(extractGroundingSources(response), [
    { title: "Official", url: "https://example.jp" },
    { title: "News", url: "https://news.example.jp/a" },
  ]);
});

test("researchCompany enables Google Search and merges grounded sources", async () => {
  let request;
  const ai = {
    models: {
      async generateContent(value) {
        request = value;
        return {
          text: '{"companyInfo":{},"sources":[]}',
          candidates: [
            {
              groundingMetadata: {
                groundingChunks: [
                  { web: { title: "Official", uri: "https://example.jp" } },
                ],
              },
            },
          ],
        };
      },
    },
  };

  const result = await researchCompany({
    ai,
    modelId: "gemini-test",
    card: { company: "ăƒ†ă‚¹ăƒˆæ ªå¼ä¼ç¤¾" },
  });

  assert.equal(request.model, "gemini-test");
  assert.deepEqual(request.config.tools, [{ googleSearch: {} }]);
  assert.deepEqual(result.sources, [
    { title: "Official", url: "https://example.jp", memo: "" },
  ]);
});

test("researchCompany can run without Google Search on free tier", async () => {
  let request;
  const ai = {
    models: {
      async generateContent(value) {
        request = value;
        return {
          text: '{"companyInfo":{},"sources":[]}',
          candidates: [],
        };
      },
    },
  };

  await researchCompany({
    ai,
    modelId: "gemini-test",
    card: { company: "ăƒ†ă‚¹ăƒˆæ ªå¼ä¼ç¤¾" },
    enableGoogleSearch: false,
  });

  assert.equal(request.config?.tools, undefined);
});

test("researchCompany does not retry an exhausted billing quota", async () => {
  let attempts = 0;
  const ai = {
    models: {
      async generateContent() {
        attempts++;
        throw new Error(
          "429 RESOURCE_EXHAUSTED: You exceeded your current quota"
        );
      },
    },
  };

  await assert.rejects(
    researchCompany({
      ai,
      modelId: "gemini-test",
      card: { company: "ăƒ†ă‚¹ăƒˆæ ªå¼ä¼ç¤¾" },
    }),
    /RESOURCE_EXHAUSTED/
  );
  assert.equal(attempts, 1);
});

```

