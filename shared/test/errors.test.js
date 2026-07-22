import assert from "node:assert/strict";
import test from "node:test";

import {
  formatProcessingError,
  isQuotaExhausted,
  isTransientGeminiError,
} from "../src/errors.js";

const quotaError = new Error(
  "429 RESOURCE_EXHAUSTED: You exceeded your current quota"
);

test("quota exhaustion is not considered transient", () => {
  assert.equal(isQuotaExhausted(quotaError), true);
  assert.equal(isTransientGeminiError(quotaError), false);
});

test("503 high demand remains retryable", () => {
  const error = new Error("503 UNAVAILABLE: model is experiencing high demand");
  assert.equal(isTransientGeminiError(error), true);
});

test("quota message reflects which persistence stage completed", () => {
  assert.match(
    formatProcessingError(quotaError, { imageSaved: true, cardSaved: true }),
    /OCR đã được lưu/
  );
  assert.match(
    formatProcessingError(quotaError, {
      imageSaved: true,
      cardSaved: false,
    }),
    /Ảnh gốc đã được lưu/
  );
  assert.match(
    formatProcessingError(quotaError, {
      imageSaved: false,
      cardSaved: false,
    }),
    /ảnh chưa được lưu/i
  );
});
