// One entry point from onboarding to a curated plan: answers + movement trial + health tests -> program.
import { answersToIntake, answerValues, type Answers } from "./onboarding";
import { analyse } from "./science/analysis";
import { constraintsFrom, scoreTrials } from "./science/curate";
import { generateProgram, recommendSplit, SPLITS, type SplitKey } from "./science/program";
import type { Analysis, Constraints, Intake, Program, TestResults, TrialResult } from "./science/types";

/** The movement trial doubles as three validated fitness tests (squat, push-up, plank). */
export function trialsToTests(trials: TrialResult[]): TestResults {
  const out: TestResults = {};
  for (const t of trials) {
    if (t.id === "squat") out.squat60 = { reps: t.variant === "easier" ? Math.round(t.value * 0.7) : t.value, faults: [...t.formFlags, ...(t.pain ? ["pain"] : [])] };
    // base = full push-up, easier = knee, harder = decline (counted as full)
    if (t.id === "push") out.pushups = t.variant === "easier" ? { reps: t.value, variant: "knee" } : { reps: t.value, variant: "full" };
    if (t.id === "plank") out.plank = t.variant === "easier" ? Math.min(t.value, 20) : t.formFlags.includes("on_knees") ? Math.round(t.value * 0.6) : t.value;
  }
  return out;
}

export type Built = { intake: Intake; results: TestResults; analysis: Analysis; constraints: Constraints; program: Program };

/** Her "how hard do you want it" answer → intensity offset for the generator. */
export function intensityFrom(answers: Answers): number {
  const v = answers.intensity_pref?.value;
  return v === "gentle" ? -1 : v === "challenging" ? 1 : 0;
}

export function buildFromOnboarding(answers: Answers, trials: TrialResult[], health: TestResults, followups: Intake["followups"] = [], splitKey?: SplitKey): Built {
  const intake = answersToIntake(answers, followups);
  const results: TestResults = { ...health, ...trialsToTests(trials), trials };
  if (intake.waistCm && !results.waist) results.waist = intake.waistCm;
  const analysis = analyse(intake, results);
  const trialPlan = scoreTrials(trials);
  const constraints = constraintsFrom(answers);
  constraints.excludeTags = [...new Set([...constraints.excludeTags, ...trialPlan.painTags])];
  if (trialPlan.painTags.length) constraints.why.push("You felt pain in the movement check, so I removed similar movements for now.");
  // free-text pain notes always keep things conservative
  if (answerValues(answers, "pain").some((v) => v !== "none") && Number(answers.pain_level?.value ?? 0) >= 6) {
    constraints.excludeTags = [...new Set([...constraints.excludeTags, "jump", "impact"])];
  }
  const program = generateProgram(intake, analysis, { trial: trialPlan, constraints, splitKey, intensityOffset: intensityFrom(answers) });
  return { intake, results, analysis, constraints, program };
}

export type PlanOption = { key: SplitKey; name: string; blurb: string; best: string; recommended: boolean; built: Built };

/** Up to 3 plan styles for her days per week, Coach Maya's recommendation first. */
export function planOptions(answers: Answers, trials: TrialResult[], health: TestResults, followups: Intake["followups"] = []): PlanOption[] {
  const base = buildFromOnboarding(answers, trials, health, followups);
  const days = base.program.createdFor.daysPerWeek;
  const rec = recommendSplit(days, base.analysis.level);
  const keys = (Object.keys(SPLITS) as SplitKey[]).filter((k) => SPLITS[k].days[days]);
  let ordered = [rec, ...keys.filter((k) => k !== rec)];
  // experienced lifters with 4+ days get the classic body-part split as one of the three
  if (days >= 4 && base.analysis.level !== "beginner" && rec !== "body_part") ordered = [...ordered.filter((k) => k !== "body_part").slice(0, 2), "body_part"];
  else ordered = ordered.filter((k) => k !== "body_part" || base.analysis.level !== "beginner");
  ordered = ordered.slice(0, 3);
  return ordered.map((k) => ({
    key: k, name: SPLITS[k].name, blurb: SPLITS[k].blurb, best: SPLITS[k].best, recommended: k === rec,
    built: k === base.program.splitKey ? base : buildFromOnboarding(answers, trials, health, followups, k),
  }));
}
