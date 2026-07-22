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
    company: "テスト株式会社",
    companyUrl: "https://example.jp",
    name: "山田 太郎",
    department: "DX推進部",
    title: "部長",
    email: "taro@example.jp",
  });

  assert.match(prompt, /テスト株式会社/);
  assert.match(prompt, /https:\/\/example\.jp/);
  assert.match(prompt, /Google Workspace活用支援/);
  assert.match(prompt, /公開情報だけで断定しない/);
  assert.match(prompt, /JSON以外は一切出力しない/);
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
    card: { company: "テスト株式会社" },
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
    card: { company: "テスト株式会社" },
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
      card: { company: "テスト株式会社" },
    }),
    /RESOURCE_EXHAUSTED/
  );
  assert.equal(attempts, 1);
});
