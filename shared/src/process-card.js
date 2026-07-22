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
    if (!onProgress) return;
    try {
      await onProgress(phase, ctx);
    } catch (err) {
      console.warn(
        `onProgress(${phase}) failed:`,
        err?.message || err
      );
    }
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
        "GAS chưa trả companyFileId. Hãy cập nhật và deploy lại Code.gs."
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
