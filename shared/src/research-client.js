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
