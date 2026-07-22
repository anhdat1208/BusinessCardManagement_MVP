# Task 3 review package
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

    await emit("research");
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
## FILE: shared\src\gemini.js
```
import { GoogleGenAI } from "@google/genai";

/**
 * @param {string} apiKey
 * @returns {import("@google/genai").GoogleGenAI}
 */
export function createResearchAI(apiKey) {
  return new GoogleGenAI({ apiKey });
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
export * from "./process-card.js";
export * from "./gemini.js";

```
## FILE: shared\test\process-card.test.js
```
import assert from "node:assert/strict";
import test from "node:test";
import { processBusinessCard } from "../src/process-card.js";

test("processBusinessCard stops on duplicate image without OCR", async () => {
  const calls = [];
  const result = await processBusinessCard({
    buffer: Buffer.from("img"),
    mimeType: "image/jpeg",
    originalName: "a.jpg",
    source: "discord",
    sourceKey: "discord-1",
    sourceUrl: "https://example.com",
    gasWebAppUrl: "https://gas.example/exec",
    geminiApiKey: "k",
    ocrModelId: "m",
    researchModelId: "m",
    researchAI: {},
    enableGoogleSearch: false,
    onProgress: (phase) => calls.push(phase),
    deps: {
      postToGas: async (_url, payload) => {
        if (payload.action === "storeImage") {
          return { ok: true, duplicate: true, row: 9 };
        }
        throw new Error(`unexpected: ${payload.action}`);
      },
      logToGas: async () => {},
      runOcrFromBuffer: async () => {
        throw new Error("OCR should not run");
      },
      researchCompany: async () => {
        throw new Error("research should not run");
      },
    },
  });

  assert.equal(result.duplicate, true);
  assert.equal(result.row, 9);
  assert.ok(calls.includes("duplicate"));
});

test("processBusinessCard runs the full happy path and attaches enrichment", async () => {
  const calls = [];
  const posted = [];
  const result = await processBusinessCard({
    buffer: Buffer.from("img"),
    mimeType: "image/jpeg",
    originalName: "a.jpg",
    source: "discord",
    sourceKey: "discord-2",
    sourceUrl: "https://example.com/2",
    gasWebAppUrl: "https://gas.example/exec",
    geminiApiKey: "k",
    ocrModelId: "m",
    researchModelId: "m",
    researchAI: {},
    enableGoogleSearch: false,
    onProgress: (phase, ctx) => calls.push(phase),
    deps: {
      postToGas: async (_url, payload) => {
        posted.push(payload);
        if (payload.action === "storeImage") {
          return {
            ok: true,
            originalFileId: "orig-id",
            originalFileUrl: "https://drive/orig",
            importedFileId: "imp-id",
            importedFileUrl: "https://drive/imp",
          };
        }
        if (payload.action === "enrichCompany") {
          return { ok: true };
        }
        return {
          ok: true,
          row: 5,
          companyFileId: "file-1",
          companyFileName: "Acme Corp",
        };
      },
      logToGas: async () => {},
      runOcrFromBuffer: async () => ({
        company: "Acme Corp",
        name: "Jane Doe",
      }),
      researchCompany: async () => ({ proposal: "..." }),
    },
  });

  assert.equal(result.row, 5);
  assert.equal(result.company, "Acme Corp");
  assert.equal(result.name, "Jane Doe");
  assert.equal(result.companyFileName, "Acme Corp");
  assert.equal(result.imageSaved, true);
  assert.equal(result.cardSaved, true);
  assert.deepEqual(calls, [
    "received",
    "saving_image",
    "ocr",
    "research",
    "done",
  ]);
  assert.ok(posted.some((p) => p.action === "enrichCompany"));
});

test("processBusinessCard throws when companyFileId is missing and attaches progress flags", async () => {
  const result = processBusinessCard({
    buffer: Buffer.from("img"),
    mimeType: "image/jpeg",
    originalName: "a.jpg",
    source: "discord",
    sourceKey: "discord-3",
    sourceUrl: "https://example.com/3",
    gasWebAppUrl: "https://gas.example/exec",
    geminiApiKey: "k",
    ocrModelId: "m",
    researchModelId: "m",
    researchAI: {},
    enableGoogleSearch: false,
    deps: {
      postToGas: async (_url, payload) => {
        if (payload.action === "storeImage") {
          return {
            ok: true,
            originalFileId: "orig-id",
            originalFileUrl: "https://drive/orig",
            importedFileId: "imp-id",
            importedFileUrl: "https://drive/imp",
          };
        }
        return { ok: true, row: 5 };
      },
      logToGas: async () => {},
      runOcrFromBuffer: async () => ({ company: "Acme Corp", name: "Jane Doe" }),
      researchCompany: async () => {
        throw new Error("research should not run");
      },
    },
  });

  await assert.rejects(result, /companyFileId/);
  try {
    await result;
    assert.fail("expected rejection");
  } catch (err) {
    assert.equal(err.imageSaved, true);
    assert.equal(err.cardSaved, true);
  }
});

```

