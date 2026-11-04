"use client";
// Client side of /api/coach/interpret: read her free text and turn it into answers.
import type { Answers } from "./onboarding";

export type Interpretation = { current: unknown; patches: { id: string; value: unknown }[]; note: string | null; keep: string | null };

/** True when this answer has free text the AI hasn't read yet. */
export const needsInterpret = (answers: Answers, id: string) => {
  const t = answers[id]?.text?.trim();
  return !!t && answers[id]?.interpreted !== t;
};

export async function interpretAnswer(id: string, answers: Answers, timeoutMs = 13000): Promise<Interpretation | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch("/api/coach/interpret", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal, body: JSON.stringify({ id, answers }),
    });
    return res.ok ? ((await res.json()) as Interpretation) : null;
  } catch { return null; } finally { clearTimeout(timer); }
}

/** Current answer refined by her words; later questions her words answered are pre-filled (marked inferred). */
export function applyInterpretation(answers: Answers, id: string, r: Interpretation | null): Answers {
  const a = answers[id] ?? {};
  const out: Answers = { ...answers, [id]: { ...a, interpreted: a.text?.trim(), ...(r && r.current !== null && r.current !== undefined ? { value: r.current } : {}) } };
  for (const p of r?.patches ?? []) out[p.id] = { ...(answers[p.id] ?? {}), value: p.value, inferred: true };
  return out;
}
