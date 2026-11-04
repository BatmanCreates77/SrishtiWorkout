// Turns her free text into answers: refines the current question and pre-fills later ones her words already answer.
// Prompt: coach-skill/content/prompts/interpret.md. Every value is validated against the skill's options here.
import { NextResponse } from "next/server";
import { z } from "zod";
import { QUESTIONS, type Question } from "@/lib/coach/skill";
import { gemmaConfigured, generate, textOf } from "@/lib/coach/gemma";
import { INTERPRET_PROMPT } from "@/lib/coach/master-prompt";
import { fill, visibleQuestions, type Answers } from "@/lib/onboarding";
import { serverSupabase } from "@/lib/supabase/server";

export const maxDuration = 30;

/** never auto-filled from free text: health and safety must be answered by her directly */
const SAFETY = new Set(["parq", "cleared", "pregnancy", "pelvic", "pain", "knee_triggers", "back_triggers", "shoulder_triggers", "pain_level", "injuries", "name", "age", "sex"]);

const Ans = z.object({ value: z.unknown().optional(), text: z.string().max(2000).optional(), inferred: z.boolean().optional() }).passthrough();
const Body = z.object({ id: z.string().max(40), answers: z.record(z.string().max(40), Ans) });

function describe(q: Question, answers: Answers): string {
  const opts = q.options?.length ? ` options: ${q.options.map((o) => `${JSON.stringify(o.value)}=${o.label}`).join(", ")}` : "";
  const range = q.kind === "number" ? ` (number${q.unit ? ` in ${q.unit}` : ""}${q.min !== undefined ? `, ${q.min}-${q.max}` : ""})` : q.kind === "scale" ? " (1-5)" : q.kind === "scale10" ? " (0-10)" : "";
  return `[${q.id}] ${q.kind}${range}: "${fill(q.coach, answers)}"${opts}`;
}

/** a valid value for this question, or undefined */
function validValue(q: Question, v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  const opt = (x: unknown) => q.options?.find((o) => String(o.value) === String(x))?.value;
  if (q.kind === "single") return opt(v);
  if (q.kind === "multi") {
    const arr = (Array.isArray(v) ? v : [v]).map(opt).filter((x) => x !== undefined);
    const excl = (q.options ?? []).filter((o) => o.exclusive).map((o) => o.value);
    const out = arr.length > 1 ? arr.filter((x) => !excl.includes(x as never)) : arr;
    return out.length ? [...new Set(out)] : undefined;
  }
  if (q.kind === "number" || q.kind === "scale" || q.kind === "scale10") {
    const n = Number(v);
    const [lo, hi] = q.kind === "scale" ? [1, 5] : q.kind === "scale10" ? [0, 10] : [q.min ?? -Infinity, q.max ?? Infinity];
    return Number.isFinite(n) && n >= lo && n <= hi ? (q.kind === "number" ? n : Math.round(n)) : undefined;
  }
  return undefined;
}

export async function POST(req: Request) {
  const sb = await serverSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const answers = parsed.data.answers as Answers;
  const cur = QUESTIONS.find((q) => q.id === parsed.data.id);
  const a = answers[parsed.data.id];
  if (!cur || !a?.text?.trim() || !gemmaConfigured()) return NextResponse.json({ current: null, patches: [], note: null, keep: null });

  const others = visibleQuestions(answers).filter((q) => q.id !== cur.id && q.kind !== "info" && q.kind !== "text" && !SAFETY.has(q.id));
  const status = (q: Question) => (answers[q.id]?.value === undefined ? "unanswered" : answers[q.id]?.inferred ? `pre-filled ${JSON.stringify(answers[q.id]?.value)}` : `answered ${JSON.stringify(answers[q.id]?.value)}`);
  const user = [
    `CURRENT: ${describe(cur, answers)}`,
    `She tapped: ${a.value === undefined ? "(nothing)" : JSON.stringify(a.value)}`,
    `She typed: "${a.text.trim()}"`,
    `OTHER QUESTIONS:\n${others.map((q) => `${describe(q, answers)} -> ${status(q)}`).join("\n")}`,
  ].join("\n\n");

  try {
    const out = await generate({ system: INTERPRET_PROMPT, contents: [{ role: "user", parts: [{ text: user }] }], temperature: 0.2, budgetMs: 12_000, attemptMs: 10_000 });
    const m = textOf(out).match(/\{[\s\S]*\}/);
    const j = m ? JSON.parse(m[0]) as { current?: unknown; patches?: { id?: string; value?: unknown }[]; note?: unknown; keep?: unknown } : {};
    const current = cur.kind === "text" ? undefined : validValue(cur, j.current);
    const patches: { id: string; value: unknown }[] = [];
    for (const p of Array.isArray(j.patches) ? j.patches.slice(0, 8) : []) {
      const q = others.find((x) => x.id === p?.id);
      if (!q) continue;
      // never overwrite something she answered herself
      if (answers[q.id]?.value !== undefined && !answers[q.id]?.inferred) continue;
      const v = validValue(q, p.value);
      if (v !== undefined) patches.push({ id: q.id, value: v });
    }
    const str = (x: unknown, n: number) => (typeof x === "string" && x.trim() && x.trim() !== "null" ? x.trim().slice(0, n) : null);
    return NextResponse.json({ current: current ?? null, patches, note: str(j.note, 220), keep: str(j.keep, 240) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ current: null, patches: [], note: null, keep: null }); // never block onboarding on the AI
  }
}
