// Onboarding: Coach Maya's personal summary of her answers, movement check and plan (prompts/analysis.md).
import { NextResponse } from "next/server";
import { z } from "zod";
import { extraLines } from "@/lib/coach/context";
import { gemmaConfigured, generate, textOf } from "@/lib/coach/gemma";
import { ANALYSIS_PROMPT } from "@/lib/coach/master-prompt";
import { serverSupabase } from "@/lib/supabase/server";
import type { Analysis, Intake, Program, TrialResult } from "@/lib/science/types";

export const maxDuration = 45;

const Body = z.object({ intake: z.any(), analysis: z.any(), trials: z.array(z.any()).max(10), program: z.any() });

export async function POST(req: Request) {
  const sb = await serverSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!gemmaConfigured()) return NextResponse.json({ summary: null });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ summary: null });
  const it = parsed.data.intake as Intake;
  const an = parsed.data.analysis as Analysis;
  const trials = parsed.data.trials as TrialResult[];
  const plan = parsed.data.program as Program;

  const ctx = [
    `PROFILE: ${it.name}, ${it.age}y, ${it.sex}. Goal: ${it.primaryGoal}${it.secondaryGoal ? ` + ${it.secondaryGoal}` : ""}. ${it.daysPerWeek} days x ${it.sessionMinutes} min at ${it.location}. Equipment: ${["bodyweight", ...(it.equipment ?? [])].join(", ")}.`,
    `HEALTH: pain ${it.painAreas?.join(", ") || "none"}; PAR-Q flags ${Object.keys(it.parq ?? {}).join(", ") || "none"}; pregnancy ${it.pregnancy}.`,
    `DIET: ${it.dietPattern}; protein ~${an.diet?.proteinEstimate} g vs target ${an.diet?.proteinTarget} g; top priorities: ${(an.diet?.priorities ?? []).join(" | ")}`,
    ...extraLines(it),
    `MOVEMENT CHECK: ${trials.map((t) => `${t.id}: ${t.value}${t.id === "plank" ? "s" : " reps"} (${t.variant} variant, felt ${t.feel}${t.pain ? ", PAIN" : ""}${t.formFlags.length ? `, form: ${t.formFlags.join("/")}` : ""})`).join("; ")}`,
    `SCORES: level ${an.level}, overall ${an.overall}/5; ${(an.testScores ?? []).map((s) => `${s.label} ${s.value} (${s.rating})`).join("; ")}`,
    `FLAGS: ${(an.flags ?? []).join(" | ") || "none"}`,
    `PLAN: ${plan.split}. Week 1: ${plan.weeks?.[0]?.map((s) => `${s.title}: ${s.main.map((m) => m.name).join(", ")}`).join(" / ")}`,
    `WHY THIS PLAN: ${(plan.why ?? []).join(" | ")}`,
  ].join("\n");

  try {
    const out = await generate({ system: `${ANALYSIS_PROMPT}\n\n# CONTEXT\n${ctx}`, contents: [{ role: "user", parts: [{ text: "Write my summary." }] }], temperature: 0.6, budgetMs: 42_000, attemptMs: 25_000 });
    return NextResponse.json({ summary: textOf(out) || null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ summary: null });
  }
}
