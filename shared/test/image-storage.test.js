import assert from "node:assert/strict";
import test from "node:test";
import {
  applyImageRefs,
  createLogPayload,
  createStoreImagePayload,
  isDuplicateImageResult,
} from "../src/image-storage.js";

test("createStoreImagePayload requires source", () => {
  assert.throws(
    () =>
      createStoreImagePayload({
        buffer: Buffer.from("x"),
        mimeType: "image/jpeg",
        originalName: "a.jpg",
        sourceKey: "k",
        sourceUrl: "",
      }),
    /source/
  );
});

test("createStoreImagePayload rejects invalid source", () => {
  assert.throws(
    () =>
      createStoreImagePayload({
        buffer: Buffer.from("x"),
        mimeType: "image/jpeg",
        originalName: "a.jpg",
        sourceKey: "k",
        sourceUrl: "",
        source: "telegram",
      }),
    /Invalid source/
  );
});

test("createStoreImagePayload accepts slack source", () => {
  const payload = createStoreImagePayload({
    buffer: Buffer.from("card-image"),
    mimeType: "image/jpeg",
    originalName: "名刺.jpg",
    sourceKey: "slack-C1-123.456-F1",
    sourceUrl: "https://slack.com/archives/C1/p123",
    source: "slack",
  });
  assert.equal(payload.image.source, "slack");
});

test("createStoreImagePayload encodes the Discord image for GAS", () => {
  const payload = createStoreImagePayload({
    buffer: Buffer.from("card-image"),
    mimeType: "image/jpeg",
    originalName: "名刺.jpg",
    sourceKey: "discord-123-456",
    sourceUrl: "https://discord.com/channels/1/2/3",
    source: "discord",
  });

  assert.deepEqual(payload, {
    action: "storeImage",
    image: {
      base64: Buffer.from("card-image").toString("base64"),
      mimeType: "image/jpeg",
      originalName: "名刺.jpg",
      sourceKey: "discord-123-456",
      source: "discord",
      sourceUrl: "https://discord.com/channels/1/2/3",
      contentHash:
        "be2494ebaecf0b51c7992211974db02ca68599d145e20802803bbb350f583cc4",
    },
  });
});

test("applyImageRefs maps GAS file references to card columns", () => {
  const card = applyImageRefs(
    { company: "テスト株式会社" },
    {
      originalFileId: "original-id",
      originalFileUrl: "https://drive/original",
      importedFileId: "imported-id",
      importedFileUrl: "https://drive/imported",
    }
  );

  assert.deepEqual(card, {
    company: "テスト株式会社",
    imgOrgId: "original-id",
    imgOrgUrl: "https://drive/original",
    imgDoneId: "imported-id",
    imgDoneUrl: "https://drive/imported",
  });
});

test("createLogPayload requires source", () => {
  assert.throws(
    () =>
      createLogPayload({
        sourceKey: "k",
        sourceUrl: "",
        step: "received",
        status: "ok",
      }),
    /source/
  );
});

test("createLogPayload rejects invalid source", () => {
  assert.throws(
    () =>
      createLogPayload({
        sourceKey: "k",
        sourceUrl: "",
        step: "received",
        status: "ok",
        source: "telegram",
      }),
    /Invalid source/
  );
});

test("createLogPayload creates a GAS processing-log event", () => {
  assert.deepEqual(
    createLogPayload({
      sourceKey: "discord-123-456",
      sourceUrl: "https://discord.com/channels/1/2/3",
      step: "received",
      status: "ok",
      row: 7,
      message: "attachment received",
      source: "discord",
    }),
    {
      action: "logEvent",
      source: "discord",
      sourceKey: "discord-123-456",
      sourceUrl: "https://discord.com/channels/1/2/3",
      step: "received",
      status: "ok",
      row: 7,
      message: "attachment received",
    }
  );
});

test("isDuplicateImageResult detects an image already registered in the list", () => {
  assert.equal(
    isDuplicateImageResult({ duplicate: true, row: 7 }),
    true
  );
  assert.equal(isDuplicateImageResult({ originalFileId: "new-id" }), false);
});
