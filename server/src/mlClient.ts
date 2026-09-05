import type { MlAnalyzeResult } from "./types.js";

/**
 * Calls the Python FastAPI service for lightweight NLP metadata.
 * Failures are non-fatal for chat; callers can ignore errors.
 */
function mlFetchSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(8000);
  }
  return undefined;
}

export async function analyzeText(
  mlBaseUrl: string,
  text: string
): Promise<MlAnalyzeResult | null> {
  const url = `${mlBaseUrl.replace(/\/$/, "")}/ml/analyze`;
  try {
    const signal = mlFetchSignal();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as MlAnalyzeResult;
  } catch {
    return null;
  }
}
