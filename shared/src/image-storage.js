import { createHash } from "node:crypto";

const ALLOWED_SOURCES = new Set(["discord", "slack"]);

function requireSource(source) {
  const s = String(source || "").trim();
  if (!s) throw new Error("source is required");
  if (!ALLOWED_SOURCES.has(s)) {
    throw new Error(`Invalid source: ${s}. Must be "discord" or "slack"`);
  }
  return s;
}

export function createStoreImagePayload({
  buffer,
  mimeType,
  originalName,
  sourceKey,
  sourceUrl,
  source,
}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Image buffer is empty");
  }
  if (!String(mimeType || "").startsWith("image/")) {
    throw new Error(`Unsupported attachment type: ${mimeType || "unknown"}`);
  }

  const src = requireSource(source);

  return {
    action: "storeImage",
    image: {
      base64: buffer.toString("base64"),
      mimeType,
      originalName: originalName || "business-card",
      sourceKey,
      source: src,
      sourceUrl: sourceUrl || "",
      contentHash: createHash("sha256").update(buffer).digest("hex"),
    },
  };
}

export function applyImageRefs(card, refs) {
  return {
    ...card,
    imgOrgId: refs.originalFileId || "",
    imgOrgUrl: refs.originalFileUrl || "",
    imgDoneId: refs.importedFileId || "",
    imgDoneUrl: refs.importedFileUrl || "",
  };
}

export function isDuplicateImageResult(result) {
  return result?.duplicate === true && Boolean(result.row);
}

export function createLogPayload({
  sourceKey,
  sourceUrl,
  step,
  status,
  row,
  message,
  source,
}) {
  return {
    action: "logEvent",
    source: requireSource(source),
    sourceKey,
    sourceUrl: sourceUrl || "",
    step,
    status,
    row: row || "",
    message: message || "",
  };
}
