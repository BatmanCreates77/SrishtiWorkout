// Turns onboarding answers + movement-trial results into plan constraints and tiers,
// using the coach skill's rules (coach-skill/content/curation.json, trials.json).
import { skill, TRIALS } from "@/lib/coach/skill";
import { answerValues, type Answers } from "@/lib/onboarding";
import type { Constraints, TrialPlan, TrialResult } from "./types";

export function constraintsFrom(answers: Answers): Constraints {
  const out: Constraints = { excludeIds: [], excludeTags: [], emphasis: [], why: [] };
  for (const r of skill.curation.rules) {
    const vals = answerValues(answers, r.q);
    const hit = "anyExcept" in r ? vals.some((v) => v !== String(r.anyExcept)) : vals.includes(String(r.value));
    if (!hit) continue;
    out.excludeTags.push(...(r.excludeTags ?? []));
    out.excludeIds.push(...(r.excludeIds ?? []));
    if (r.emphasis) out.emphasis.push(r.emphasis);
    if (r.cardioStyle) out.cardioStyle = r.cardioStyle;
    if (r.sessionStyle) out.sessionStyle = r.sessionStyle;
    if (r.mobilityExtra) out.mobilityExtra = true;
    if (!out.why.includes(r.why)) out.why.push(r.why);
  }
  out.excludeTags = [...new Set(out.excludeTags)];
  out.excludeIds = [...new Set(out.excludeIds)];
  out.emphasis = [...new Set(out.emphasis)];
  return out;
}

/** Tier from a trial's rubric: the highest tier whose `min` the result reaches, adjusted by feel/variant/pain. */
export function trialTier(result: TrialResult): number {
  const t = TRIALS.find((x) => x.id === result.id);
  if (!t) return 2;
  if (result.pain || result.feel === "couldnt") return 1;
  let tier = 1;
  for (const s of t.score) if (result.value >= s.min) tier = s.tier;
  if (result.variant === "easier") tier = 1;
  if (result.variant === "harder") tier = Math.max(tier, result.value >= (t.score[1]?.min ?? 0) ? 3 : 2);
  if (result.feel === "hard") tier = Math.min(tier, 2);
  if (result.feel === "easy" && result.variant !== "easier") tier = Math.max(tier, 2);
  return tier;
}

export function scoreTrials(results: TrialResult[]): TrialPlan & { painTags: string[] } {
  const plan: TrialPlan & { painTags: string[] } = { patternTiers: {}, preferred: {}, repCaps: {}, flags: [], why: [], painTags: [] };
  for (const r of results) {
    const t = TRIALS.find((x) => x.id === r.id);
    if (!t) continue;
    const tier = trialTier(r);
    plan.patternTiers[t.pattern] = tier;
    // Lock in the variant she did only when it was a regression: strong users get normal, loaded picks.
    if (!r.pain && (r.variant === "easier" || tier === 1)) plan.preferred[t.pattern] = r.feel === "couldnt" ? t.easier : r.exerciseId;
    if (r.pain) {
      plan.painTags.push(...t.painTags);
      plan.flags.push(`${t.title}: you felt pain, so I've removed similar movements for now. If it persists, see a physio.`);
    }
    // a low trial result caps her starting reps so the first sessions are achievable
    if (t.measure === "reps" && r.value > 0 && r.value < (t.score[1]?.min ?? 0)) {
      const top = Math.max(4, Math.round(r.value * (t.perSide ? 1 : 0.7)));
      plan.repCaps[t.pattern] = `${Math.max(3, top - 2)}-${top}`;
    }
    const name = t.title.toLowerCase();
    if (r.feel === "couldnt") plan.why.push(`The ${name} was tough today, so you'll start with an easier version and build up.`);
    else if (tier === 3) plan.why.push(`You crushed the ${name} (${r.value}${t.measure === "seconds" ? "s" : " reps"}), so you get a harder progression.`);
  }
  plan.painTags = [...new Set(plan.painTags)];
  return plan;
}
