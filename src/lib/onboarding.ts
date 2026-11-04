// Walks Coach Maya's question graph (coach-skill/content/questions.json) and turns answers into an Intake.
import { GYM_EQUIPMENT, type EquipKey } from "./science/patterns";
import type { Intake } from "./science/types";
import { QUESTIONS, type Question, type When } from "./coach/skill";

/** inferred: pre-filled by Maya from her free text (she can change it). interpreted: the text already read by the AI. */
export type Answer = { value?: unknown; text?: string; skipped?: boolean; at?: string; inferred?: boolean; interpreted?: string };
export type Stage = Question["stage"];
export type Answers = Record<string, Answer>;

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]);

export function matches(when: When | undefined, answers: Answers): boolean {
  if (!when) return true;
  const v = answers[when.q]?.value;
  if (v === undefined) return false;
  if ("eq" in when) return v === when.eq;
  if (when.in) return when.in.includes(v);
  if ("includes" in when) return asArray(v).includes(when.includes);
  if ("anyExcept" in when) return asArray(v).some((x) => x !== when.anyExcept);
  if (when.gte !== undefined) return Number(v) >= when.gte;
  return true;
}

/** Questions to ask, in order, given the answers so far (branches open as she answers). */
export function visibleQuestions(answers: Answers, stages?: Stage[]): Question[] {
  return QUESTIONS.filter((q) => (!stages || stages.includes(q.stage)) && matches(q.when, answers));
}

/** "Later" questions still waiting for an answer, in the coach skill's priority order. */
export function pendingLater(answers: Answers): Question[] {
  return visibleQuestions(answers, ["later"]).filter((q) => q.kind !== "info" && !answers[q.id]);
}

export function isAnswered(q: Question, a: Answer | undefined): boolean {
  if (q.kind === "info") return true;
  if (!a) return !q.required && !!q.optional;
  if (a.text && a.text.trim()) return true;
  if (q.kind === "multi") return asArray(a.value).length > 0;
  return a.value !== undefined && a.value !== "";
}

export function canContinue(q: Question, a: Answer | undefined): boolean {
  if (q.kind === "info" || q.optional) return true;
  if (q.kind === "number" && a?.value !== undefined) {
    const n = Number(a.value);
    return Number.isFinite(n) && (q.min === undefined || n >= q.min) && (q.max === undefined || n <= q.max);
  }
  if (q.required) {
    // required fields need a structured value (free text alone can't set age, goal…), except text questions
    if (q.kind === "text") return !!(a?.text || a?.value);
    return q.kind === "multi" ? asArray(a?.value).length > 0 : a?.value !== undefined && a?.value !== "";
  }
  return true; // not required: options are optional, free text is optional
}

/** First name, trimmed and capitalised ("  gaurav\n" → "Gaurav"). */
export function firstName(answers: Answers): string {
  const n = String(answers.name?.value ?? answers.name?.text ?? "").trim().split(/\s+/)[0] ?? "";
  return n ? n[0].toUpperCase() + n.slice(1) : "";
}

export function fill(template: string, answers: Answers): string {
  return template
    .replace(/\{name\}/g, firstName(answers) || "there")
    .replace(/\{answer:([a-z_]+)\}/g, (_, id) => String(answers[id]?.value ?? ""));
}

/** The coach's reaction to an answer (shown on the next screen), from the question's `react` map. */
export function reaction(q: Question, a: Answer | undefined): string | null {
  if (!q.react || !a) return null;
  const vals = asArray(a.value);
  for (const [key, line] of Object.entries(q.react)) {
    if (key.startsWith("any_except:")) { const x = key.slice(11); if (vals.some((v) => String(v) !== x)) return line; }
    else if (key.startsWith("gte:")) { if (Number(a.value) >= Number(key.slice(4))) return line; }
    else if (vals.map(String).includes(key)) return line;
  }
  return null;
}

const DEFAULTS: Intake = {
  name: "", age: 30, sex: "female", heightCm: 160, weightKg: 60, parq: {}, pregnancy: "no", injuries: "", painAreas: [],
  trainingAge: 0, currentDaysPerWeek: 0, currentActivities: [], dailySteps: "3to6k", jobActivity: "sedentary",
  primaryGoal: "general", secondaryGoal: "", goalNote: "", daysPerWeek: 3, preferredDays: [], sessionMinutes: 45,
  location: "home", equipment: [], sleepHours: 7, sleepQuality: 3, stress: 3, energy: 3, dietPattern: "vegetarian",
  mealsPerDay: 3, proteinPalms: 2, vegServings: 2, fruitServings: 1, waterLiters: 2, sugaryDrinksPerWeek: 2,
  alcoholPerWeek: 0, friedOrPackagedPerWeek: 3, lateEating: false, supplements: [],
};

export function answersToIntake(answers: Answers, followups: Intake["followups"] = []): Intake {
  const intake: Intake = { ...DEFAULTS, extras: {}, notes: {}, followups };
  const rec = intake as unknown as Record<string, unknown>;
  for (const q of visibleQuestions(answers)) {
    const a = answers[q.id];
    if (!a) continue;
    if (a.text?.trim()) intake.notes![q.id] = a.text.trim();
    let v = a.value;
    if (q.kind === "text") v = a.text?.trim() || a.value;
    if (v === undefined) continue;
    if (q.kind === "multi") v = asArray(v).filter((x) => x !== "none");
    if (q.id === "parq") v = Object.fromEntries((v as string[]).map((k) => [k, true]));
    if (q.field) rec[q.field] = q.kind === "number" ? Number(v) : v;
    else intake.extras![q.id] = v;
  }
  // gym means a full gym; "both" adds gym kit to whatever is at home
  if (intake.location !== "home") intake.equipment = [...new Set<EquipKey>([...intake.equipment, ...GYM_EQUIPMENT])];
  if (intake.waistCm === undefined) delete intake.waistCm;
  return intake;
}

/** Value of an answer for rule matching (curation): option values plus nothing else. */
export function answerValues(answers: Answers, q: string): string[] {
  return asArray(answers[q]?.value).map(String);
}
