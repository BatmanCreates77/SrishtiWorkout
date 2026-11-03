// Plan changes: used by the plan screen and by the coach's proposals (always previewed as a diff first).
import { EQUIPMENT_OPTIONS, PATTERNS, type EquipKey, type Pattern, type Tag } from "./patterns";
import { allowed, generateProgram, getExercise, titleCase } from "./program";
import { addDays, parseISODate, toISODate } from "./schedule";
import type { Analysis, Intake, Program } from "./types";

export const ADJUST_ACTIONS = [
  "deload_now", "ease_off", "push_harder", "restart_today", "pause_until",
  "change_days", "change_session_length", "change_equipment", "swap_exercise",
] as const;
export type AdjustAction = (typeof ADJUST_ACTIONS)[number];

export type AdjustParams = {
  days_per_week?: number;
  preferred_days?: number[];
  session_minutes?: number;
  equipment?: string[];
  resume_date?: string; // YYYY-MM-DD
  exercise_id?: string; // swap: the exercise to replace
  replacement_id?: string; // swap: optional specific replacement
  reason?: string;
};

export type AdjustResult = { intake: Intake; intakeChanged: boolean; plan: Program; startDate: string; summary: string };

function relabel(weeks: Program["weeks"]): Program["weeks"] {
  return weeks.map((w, i) => w.map((s) => ({ ...s, week: i + 1, key: `w${i + 1}-d${s.dayIndex + 1}` })));
}

export function adjustProgram(
  intake: Intake, analysis: Analysis, current: { plan: Program; start_date: string } | null,
  action: AdjustAction, params: AdjustParams = {},
): AdjustResult {
  const today = toISODate(new Date());
  const offset = current?.plan.intensityOffset ?? 0;
  const keep = { trial: current?.plan.trial, constraints: current?.plan.constraints };
  let next = { ...intake };
  let intakeChanged = false;
  let startDate = today;
  let plan: Program;
  let summary: string;

  switch (action) {
    case "deload_now": {
      const base = generateProgram(next, analysis, { ...keep, intensityOffset: offset });
      plan = { ...base, weeks: relabel([base.weeks[3], base.weeks[0], base.weeks[1], base.weeks[2]]) };
      summary = "A lighter deload week starting today (fewer sets, easy effort), then a fresh 3-week build.";
      break;
    }
    case "ease_off": {
      const o = Math.max(-1, offset - 1);
      plan = generateProgram(next, analysis, { ...keep, intensityOffset: o });
      startDate = current?.start_date ?? today;
      summary = o === offset ? "Already at the easiest setting, so the plan stays as is." : "Scaled down: one set fewer and one more rep in reserve on every exercise.";
      break;
    }
    case "push_harder": {
      const o = Math.min(1, offset + 1);
      plan = generateProgram(next, analysis, { ...keep, intensityOffset: o });
      startDate = current?.start_date ?? today;
      summary = o === offset ? "Already at the hardest setting for this block. Next step: retest and a new block." : "Scaled up: an extra set on main lifts and one fewer rep in reserve.";
      break;
    }
    case "restart_today": {
      plan = generateProgram(next, analysis, { ...keep, intensityOffset: Math.min(0, offset) });
      summary = "Fresh start: week 1 begins today.";
      break;
    }
    case "pause_until": {
      const d = params.resume_date && /^\d{4}-\d{2}-\d{2}$/.test(params.resume_date) ? params.resume_date : toISODate(addDays(new Date(), 7));
      plan = current?.plan ?? generateProgram(next, analysis, { ...keep, intensityOffset: offset });
      startDate = d < today ? today : d;
      summary = `Plan paused. Week 1 restarts on ${parseISODate(startDate).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}.`;
      break;
    }
    case "change_days": {
      const d = Math.min(6, Math.max(2, Math.round(params.days_per_week ?? intake.daysPerWeek)));
      const pref = (params.preferred_days ?? []).map(Number).filter((x) => x >= 0 && x <= 6);
      next = { ...next, daysPerWeek: d, preferredDays: pref.length === d ? pref : [] };
      intakeChanged = true;
      plan = generateProgram(next, analysis, { ...keep, intensityOffset: offset });
      summary = `Plan rebuilt for ${d} days a week (${plan.split}), starting today.`;
      break;
    }
    case "change_session_length": {
      const m = Math.min(120, Math.max(20, Math.round(params.session_minutes ?? intake.sessionMinutes)));
      next = { ...next, sessionMinutes: m };
      intakeChanged = true;
      plan = generateProgram(next, analysis, { ...keep, intensityOffset: offset });
      startDate = current?.start_date ?? today;
      summary = `Sessions resized to about ${m} minutes.`;
      break;
    }
    case "change_equipment": {
      const valid = new Set(EQUIPMENT_OPTIONS.map((e) => e.key));
      const eq = (params.equipment ?? []).filter((e): e is EquipKey => valid.has(e as EquipKey));
      next = { ...next, equipment: eq };
      intakeChanged = true;
      plan = generateProgram(next, analysis, { ...keep, intensityOffset: offset });
      startDate = current?.start_date ?? today;
      summary = `Exercises re-picked for your equipment: ${["bodyweight", ...eq].join(", ")}.`;
      break;
    }
    case "swap_exercise": {
      if (!current || !params.exercise_id) throw new Error("swap_exercise needs the current plan and exercise_id");
      const res = swapInPlan(current.plan, intake, params.exercise_id, params.replacement_id);
      plan = res.plan;
      startDate = current.start_date;
      summary = `Swapped ${res.fromName} for ${res.toName} in every session.`;
      break;
    }
  }
  return { intake: next, intakeChanged, plan, startDate, summary };
}

/** Alternatives for an exercise: same pattern, her equipment, within her plan's exclusions. */
export function swapOptions(plan: Program, intake: Intake, exerciseId: string) {
  const pattern = findPattern(plan, exerciseId);
  if (!pattern) return [];
  const ctx = {
    equip: new Set<EquipKey>(["bodyweight", ...intake.equipment]),
    excludeIds: new Set([...(plan.constraints?.excludeIds ?? []), exerciseId]),
    excludeTags: new Set((plan.constraints?.excludeTags ?? []) as Tag[]),
  };
  return PATTERNS[pattern].filter((c) => allowed(c, ctx)).map((c) => ({ id: c.id, tier: c.tier, name: titleCase(getExercise(c.id)?.name ?? c.id) }));
}

function findPattern(plan: Program, id: string): Pattern | undefined {
  for (const w of plan.weeks) for (const s of w) for (const p of [...s.main, ...(s.finisher ?? [])]) if (p.exerciseId === id) return p.pattern as Pattern;
  return undefined;
}

export function swapInPlan(plan: Program, intake: Intake, fromId: string, toId?: string) {
  const opts = swapOptions(plan, intake, fromId);
  const to = (toId && opts.find((o) => o.id === toId)) || opts[0];
  if (!to) throw new Error("No suitable alternative for that exercise with your equipment and limits.");
  const ex = getExercise(to.id)!;
  const weeks = plan.weeks.map((w) => w.map((s) => ({
    ...s,
    main: s.main.map((p) => (p.exerciseId === fromId ? { ...p, exerciseId: to.id, name: titleCase(ex.name), hold: ex.hold || p.hold, swappedFrom: fromId } : p)),
  })));
  const constraints = plan.constraints
    ? { ...plan.constraints, excludeIds: [...new Set([...plan.constraints.excludeIds, fromId])] }
    : { excludeIds: [fromId], excludeTags: [], emphasis: [], why: [] };
  return { plan: { ...plan, weeks, constraints }, fromName: titleCase(getExercise(fromId)?.name ?? fromId), toName: titleCase(ex.name) };
}

export type PlanDiff = { lines: string[] };

/** A short, readable description of what changes between two plans (shown on proposal cards). */
export function diffPlans(before: { plan: Program; start_date: string } | null, after: { plan: Program; start_date: string }): PlanDiff {
  const lines: string[] = [];
  if (!before) return { lines: [`New plan: ${after.plan.split}`] };
  const a = before.plan, b = after.plan;
  if (a.createdFor.daysPerWeek !== b.createdFor.daysPerWeek) lines.push(`Days per week: ${a.createdFor.daysPerWeek} → ${b.createdFor.daysPerWeek}`);
  if (a.split !== b.split) lines.push(`Split: ${a.split} → ${b.split}`);
  if (a.createdFor.sessionMinutes !== b.createdFor.sessionMinutes) lines.push(`Session length: ${a.createdFor.sessionMinutes} → ${b.createdFor.sessionMinutes} min`);
  if (before.start_date !== after.start_date) lines.push(`Week 1 starts ${parseISODate(after.start_date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`);
  if (a.intensityOffset !== b.intensityOffset) lines.push(b.intensityOffset > a.intensityOffset ? "Intensity up: +1 set on main lifts, 1 fewer rep in reserve" : "Intensity down: 1 fewer set, 1 more rep in reserve");
  const names = (p: Program) => new Set(p.weeks[0].flatMap((s) => s.main.map((m) => m.name)));
  const na = names(a), nb = names(b);
  const added = [...nb].filter((n) => !na.has(n)), removed = [...na].filter((n) => !nb.has(n));
  if (removed.length) lines.push(`Out: ${removed.slice(0, 4).join(", ")}${removed.length > 4 ? ` +${removed.length - 4}` : ""}`);
  if (added.length) lines.push(`In: ${added.slice(0, 4).join(", ")}${added.length > 4 ? ` +${added.length - 4}` : ""}`);
  if (a.weeks[0][0]?.title !== b.weeks[0][0]?.title && a.split === b.split) lines.push(`Starts with: ${b.weeks[0][0]?.title}`);
  if (!lines.length) lines.push("Same exercises, refreshed schedule");
  return { lines };
}
