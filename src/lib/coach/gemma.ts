import "server-only";

export type Part =
  | { text: string; thought?: boolean }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };
export type Content = { role: "user" | "model"; parts: Part[] };

export type FunctionDecl = { name: string; description: string; parameters: Record<string, unknown> };

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function gemmaConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generate(opts: {
  system: string;
  contents: Content[];
  tools?: FunctionDecl[];
  temperature?: number;
}): Promise<Content> {
  const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      maxOutputTokens: 1200,
      // "minimal" keeps replies fast and stops reasoning text leaking into the answer.
      thinkingConfig: { thinkingLevel: process.env.GEMMA_THINKING || "minimal" },
    },
  };
  if (opts.tools?.length) body.tools = [{ functionDeclarations: opts.tools }];

  // The hosted Gemma endpoints return occasional transient 5xx/429s: retry with backoff,
  // and on the last attempt fall back to the other Gemma 4 model.
  const fallback = model === "gemma-4-26b-a4b-it" ? "gemma-4-31b-it" : "gemma-4-26b-a4b-it";
  const attempts = [model, model, model, fallback];
  let res: Response | undefined;
  let lastErr = "";
  for (let i = 0; i < attempts.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 400 * 2 ** (i - 1)));
    try {
      res = await fetch(`${BASE}/${attempts[i]}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(40_000),
      });
    } catch (e) {
      lastErr = (e as Error).message;
      res = undefined;
      continue;
    }
    if (res.ok) break;
    lastErr = `${res.status}: ${(await res.text()).slice(0, 300)}`;
    if (res.status !== 429 && res.status < 500) break; // client errors won't fix themselves
  }
  if (!res?.ok) throw new Error(`Gemma API ${lastErr}`);
  const json = await res.json();
  const content = json?.candidates?.[0]?.content as Content | undefined;
  if (!content?.parts) return { role: "model", parts: [{ text: "Sorry, I couldn't think of a reply just now. Try again?" }] };
  return { role: "model", parts: content.parts };
}

export function textOf(c: Content) {
  return c.parts
    .filter((p): p is { text: string; thought?: boolean } => "text" in p && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}

/** Merge consecutive same-role turns (the API expects alternation). */
export function normalise(contents: Content[]): Content[] {
  const out: Content[] = [];
  for (const c of contents) {
    const last = out[out.length - 1];
    if (last && last.role === c.role) last.parts.push(...c.parts);
    else out.push({ role: c.role, parts: [...c.parts] });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}
