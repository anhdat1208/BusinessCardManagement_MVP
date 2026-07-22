import { GoogleGenAI } from "@google/genai";

/**
 * @param {string} apiKey
 * @returns {import("@google/genai").GoogleGenAI}
 */
export function createResearchAI(apiKey) {
  return new GoogleGenAI({ apiKey });
}
