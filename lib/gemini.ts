import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export const geminiEnabled = Boolean(apiKey && apiKey.trim().length > 0);

/**
 * Ask Gemini for a plain-text completion. Returns null when no API key is
 * configured so callers can fall back to a heuristic. Never throws — network
 * or quota errors also resolve to null.
 */
export async function askGemini(
  prompt: string,
  system?: string
): Promise<string | null> {
  if (!geminiEnabled) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey as string);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: system,
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("[gemini] request failed:", err);
    return null;
  }
}

/**
 * Ask Gemini for a JSON object. Strips markdown fences and parses. Returns null
 * on any failure so callers can fall back.
 */
export async function askGeminiJSON<T>(
  prompt: string,
  system?: string
): Promise<T | null> {
  const text = await askGemini(prompt, system);
  if (!text) return null;
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
