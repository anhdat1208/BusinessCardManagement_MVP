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
