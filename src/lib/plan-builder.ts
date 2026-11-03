// One entry point from onboarding to a curated plan: answers + movement trial + health tests -> program.
import { answersToIntake, answerValues, type Answers } from "./onboarding";
import { analyse } from "./science/analysis";
import { constraintsFrom, scoreTrials } from "./science/curate";
import { generateProgram } from "./science/program";
import type { Analysis, Constraints, Intake, Program, TestResults, TrialResult } from "./science/types";

/** The movement trial doubles as three validated fitness tests (squat, push-up, plank). */
export function trialsToTests(trials: TrialResult[]): TestResults {
  const out: TestResults = {};
  for (const t of trials) {
    if (t.id === "squat") out.squat60 = { reps: t.variant === "easier" ? Math.round(t.value * 0.7) : t.value, faults: [...t.formFlags, ...(t.pain ? ["pain"] : [])] };
    if (t.id === "push") out.pushups = t.variant === "harder" ? { reps: t.value, variant: "full" } : { reps: t.variant === "easier" ? Math.round(t.value / 3) : t.value, variant: "knee" };
    if (t.id === "plank") out.plank = t.variant === "easier" ? Math.min(t.value, 20) : t.formFlags.includes("on_knees") ? Math.round(t.value * 0.6) : t.value;
  }
  return out;
}

export type Built = { intake: Intake; results: TestResults; analysis: Analysis; constraints: Constraints; program: Program };

export function buildFromOnboarding(answers: Answers, trials: TrialResult[], health: TestResults, followups: Intake["followups"] = []): Built {
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
  const program = generateProgram(intake, analysis, { trial: trialPlan, constraints });
  return { intake, results, analysis, constraints, program };
}
