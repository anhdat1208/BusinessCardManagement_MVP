export function errorMessage(error) {
  return String(error?.message || error);
}

export function isQuotaExhausted(error) {
  const message = errorMessage(error);
  return (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("exceeded your current quota")
  );
}

export function isTransientGeminiError(error) {
  if (isQuotaExhausted(error)) return false;
  const message = errorMessage(error);
  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    message.includes("high demand")
  );
}

export function formatProcessingError(error, { imageSaved, cardSaved }) {
  if (isQuotaExhausted(error)) {
    if (cardSaved) {
      return "❌ OCR đã được lưu nhưng quota Gemini Research không khả dụng. Hãy kiểm tra quota hoặc bật billing rồi thử research lại.";
    }
    if (imageSaved) {
      return "❌ Ảnh gốc đã được lưu trên Drive nhưng Gemini OCR hiện không còn quota. Danh sách danh thiếp chưa được cập nhật.";
    }
    return "❌ Gemini OCR hiện không còn quota và ảnh chưa được lưu trên Drive.";
  }

  return `❌ Lỗi xử lý: ${errorMessage(error)}`;
}
