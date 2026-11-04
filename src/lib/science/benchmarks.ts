// Where a movement-check result sits against published norms (or coach benchmarks where no norm exists),
// and what to aim for given age, sex and training experience. Used on the trial screens and the results screen.
import { TRIALS } from "@/lib/coach/skill";
import type { Answers } from "@/lib/onboarding";
import { PUSHUP_F, PUSHUP_M, SQUAT_F, SQUAT_M } from "./tests";
import type { TrialResult } from "./types";

export const RATINGS = ["", "Needs work", "Fair", "Good", "Very good", "Excellent"] as const;
/** lower bounds of Fair, Good, Very good, Excellent */
type Bounds = [number, number, number, number];

export type Benchmark = {
  trialId: string; title: string; unit: string; who: string;
  source: string; sourceKind: "norm" | "benchmark";
  bounds: Bounds; targetRating: number; targetText: string; typicalText: string;
};

type Profile = { age: number; sex: "female" | "male"; trainingAge: number; fitness: string };

export function profileOf(a: Answers): Profile {
  const age = Number(a.age?.value) || 30;
  return {
    age, sex: a.sex?.value === "male" ? "male" : "female",
    trainingAge: Number(a.training_age?.value ?? 0) || 0, fitness: String(a.fitness_level?.value ?? ""),
  };
}

const idx = (age: number, uppers: number[]) => { const i = uppers.findIndex((u) => age <= u); return i === -1 ? uppers.length : i; };
const fromTable = (row: [number, number, number, number]): Bounds => [row[3], row[2], row[1], row[0]];
const scale = (b: Bounds, f: number): Bounds => b.map((x) => Math.max(1, Math.round(x * f))) as Bounds;
const ageFactor = (age: number) => (age <= 39 ? 1 : age <= 49 ? 0.9 : age <= 59 ? 0.8 : 0.7);

function bandLabel(age: number, uppers: number[]): string {
  const i = idx(age, uppers);
  const lo = i === 0 ? null : uppers[i - 1] + 1;
  const hi = uppers[i];
  return lo === null ? `under ${hi + 1}` : hi === undefined ? `${lo}+` : `${lo}–${hi}`;
}

/** Target by experience: new → Good, 6m–2y → Very good, 2y+ → Excellent; "very fit" adds one level. */
export function targetRating(p: Profile): number {
  const base = [3, 3, 4, 5][Math.min(3, Math.max(0, p.trainingAge))];
  return Math.min(5, base + (p.fitness === "very_fit" ? 1 : 0));
}

function rangeText(b: Bounds, rating: number): string {
  if (rating <= 1) return `under ${b[0]}`;
  const lo = b[rating - 2];
  return rating >= 5 ? `${lo}+` : `${lo}–${b[rating - 1] - 1}`;
}

export function benchmarkFor(trialId: string, variant: TrialResult["variant"], answers: Answers): Benchmark | null {
  const t = TRIALS.find((x) => x.id === trialId);
  if (!t) return null;
  const p = profileOf(answers);
  const people = p.sex === "male" ? "men" : "women";
  let bounds: Bounds; let who: string; let source: string; let kind: Benchmark["sourceKind"] = "norm";
  let unit = t.measure === "seconds" ? "sec" : t.perSide ? "reps per leg" : "reps";

  switch (trialId) {
    case "push": {
      const ups = [29, 39, 49, 59];
      bounds = fromTable((p.sex === "male" ? PUSHUP_M : PUSHUP_F)[idx(p.age, ups)]);
      // CSEP norms: women on knees, men full. Convert to the version actually done.
      const knee = variant === "easier";
      if (p.sex === "female" && !knee) bounds = scale(bounds, 1 / 1.6);
      if (p.sex === "male" && knee) bounds = scale(bounds, 1.6);
      unit = knee ? "knee push-ups" : "push-ups";
      who = `${people} ${bandLabel(p.age, ups)}`; source = "CSEP push-up norms";
      break;
    }
    case "squat": {
      const ups = [25, 35, 45, 55, 65];
      bounds = fromTable((p.sex === "male" ? SQUAT_M : SQUAT_F)[idx(p.age, ups)]);
      who = `${people} ${bandLabel(p.age, ups)}`; source = "YMCA 1-minute squat norms";
      break;
    }
    case "plank":
      bounds = [30, 60, 90, 120]; who = "adults"; source = "Common fitness-testing ranges (not age-specific)";
      break;
    case "hinge":
      bounds = scale([15, 22, 30, 38], ageFactor(p.age)); kind = "benchmark";
      who = `${people} ${bandLabel(p.age, [39, 49, 59])}`; source = "Coach benchmark (no published norm for this test)";
      break;
    case "lunge":
      bounds = scale([8, 11, 14, 17], ageFactor(p.age)); kind = "benchmark";
      who = `${people} ${bandLabel(p.age, [39, 49, 59])}`; source = "Coach benchmark (no published norm for this test)";
      break;
    case "row":
      bounds = scale([12, 16, 20, 25], ageFactor(p.age) * (p.sex === "female" ? 0.9 : 1)); kind = "benchmark";
      who = `${people} ${bandLabel(p.age, [39, 49, 59])}`; source = "Coach benchmark (no published norm for this test)";
      break;
    default:
      return null;
  }
  const tr = targetRating(p);
  return {
    trialId, title: t.title, unit, who, source, sourceKind: kind, bounds,
    targetRating: tr, targetText: rangeText(bounds, tr), typicalText: rangeText(bounds, 3),
  };
}

export function rate(v: number, b: Bounds): number {
  if (!Number.isFinite(v)) return 1;
  let r = 1;
  b.forEach((x, i) => { if (v >= x) r = i + 2; });
  return r;
}

/** 0..1 position on a 5-segment bar (each rating = 1/5 of the width). */
export function barPosition(v: number, b: Bounds): number {
  if (!Number.isFinite(v) || v <= 0) return 0.01;
  const edges = [0, ...b, b[3] * 1.35];
  for (let i = 0; i < 5; i++) {
    if (v < edges[i + 1] || i === 4) return Math.min(0.99, (i + Math.min(1, (v - edges[i]) / Math.max(1, edges[i + 1] - edges[i]))) / 5);
  }
  return 0.99;
}

export type TrialEval = { bench: Benchmark; value: number; rating: number; pos: number; met: boolean; note?: string };

export function evaluateTrial(r: TrialResult, answers: Answers): TrialEval | null {
  const bench = benchmarkFor(r.id, r.variant, answers);
  if (!bench) return null;
  const value = r.feel === "couldnt" ? 0 : r.value;
  let rating = rate(value, bench.bounds);
  let note: string | undefined;
  // norms are for the standard version (push-ups already converted)
  if (r.variant === "easier" && r.id !== "push") { rating = Math.min(rating, 2); note = "done on the easier version"; }
  if (r.variant === "harder") note = "done on the harder version";
  if (r.pain) note = "you felt pain, so we'll go easy here";
  return { bench, value, rating, pos: barPosition(value, bench.bounds), met: rating >= bench.targetRating, note };
}

export type ResultsSummary = {
  evals: TrialEval[]; avg: number; overall: string; metCount: number;
  strongest?: TrialEval; weakest?: TrialEval; expectation: string;
};

export function summarize(trials: TrialResult[], answers: Answers): ResultsSummary {
  const evals = TRIALS.map((t) => trials.find((r) => r.id === t.id)).filter(Boolean)
    .map((r) => evaluateTrial(r!, answers)).filter((e): e is TrialEval => !!e);
  const avg = evals.length ? evals.reduce((s, e) => s + e.rating, 0) / evals.length : 0;
  const overall = RATINGS[Math.max(1, Math.floor(avg + 0.25))]; // round up only from x.75
  const metCount = evals.filter((e) => e.met).length;
  const sorted = [...evals].sort((a, b) => (b.rating - b.bench.targetRating) - (a.rating - a.bench.targetRating));
  const p = profileOf(answers);
  const target = RATINGS[targetRating(p)];
  const exp = ["new to strength training", "fairly new to strength training", "6 months to 2 years into training", "2+ years into training"][p.trainingAge] ?? "";
  const expectation = metCount === evals.length
    ? `For someone ${exp}, the research-based target is ${target} on most of these. You hit it on all of them. We'll push for the next level.`
    : `For someone ${exp}, the target is ${target} on most of these. You're there on ${metCount} of ${evals.length}, so the rest is where your plan will focus.`;
  return { evals, avg, overall, metCount, strongest: sorted[0], weakest: sorted[sorted.length - 1], expectation };
}
