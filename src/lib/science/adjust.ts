import { EQUIPMENT_OPTIONS, type EquipKey } from "./patterns";
import { generateProgram } from "./program";
import { toISODate } from "./schedule";
import type { Analysis, Intake, Program } from "./types";

export const ADJUST_ACTIONS = [
  "deload_now", "ease_off", "push_harder", "restart_today", "change_days", "change_session_length", "change_equipment",
] as const;
export type AdjustAction = (typeof ADJUST_ACTIONS)[number];

export type AdjustParams = {
  days_per_week?: number;
  preferred_days?: number[];
  session_minutes?: number;
  equipment?: string[];
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
  let next = { ...intake };
  let intakeChanged = false;
  let startDate = today;
  let plan: Program;
  let summary: string;

  switch (action) {
    case "deload_now": {
      const base = generateProgram(next, analysis, { intensityOffset: offset });
      plan = { ...base, weeks: relabel([base.weeks[3], base.weeks[0], base.weeks[1], base.weeks[2]]) };
      summary = "Starting today with a deload week (fewer sets, easy effort), then a fresh 3-week build.";
      break;
    }
    case "ease_off": {
      const o = Math.max(-1, offset - 1);
      plan = generateProgram(next, analysis, { intensityOffset: o });
      startDate = current?.start_date ?? today;
      summary = o === offset ? "Already at the easiest intensity. Kept the plan as is." : "Eased off: one set fewer and one more rep in reserve on every exercise.";
      break;
    }
    case "push_harder": {
      const o = Math.min(1, offset + 1);
      plan = generateProgram(next, analysis, { intensityOffset: o });
      startDate = current?.start_date ?? today;
      summary = o === offset ? "Already at the highest intensity for this block. Next step is a retest and a new block." : "Pushed harder: an extra set on main lifts and one fewer rep in reserve.";
      break;
    }
    case "restart_today": {
      plan = generateProgram(next, analysis, { intensityOffset: Math.min(0, offset) });
      summary = "Fresh start: week 1 begins today.";
      break;
    }
    case "change_days": {
      const d = Math.min(6, Math.max(2, Math.round(params.days_per_week ?? intake.daysPerWeek)));
      const pref = (params.preferred_days ?? []).filter((x) => x >= 0 && x <= 6);
      next = { ...next, daysPerWeek: d, preferredDays: pref.length === d ? pref : [] };
      intakeChanged = true;
      plan = generateProgram(next, analysis, { intensityOffset: offset });
      summary = `Plan rebuilt for ${d} days per week (${plan.split}), starting today.`;
      break;
    }
    case "change_session_length": {
      const m = Math.min(120, Math.max(20, Math.round(params.session_minutes ?? intake.sessionMinutes)));
      next = { ...next, sessionMinutes: m };
      intakeChanged = true;
      plan = generateProgram(next, analysis, { intensityOffset: offset });
      startDate = current?.start_date ?? today;
      summary = `Sessions resized to about ${m} minutes.`;
      break;
    }
    case "change_equipment": {
      const valid = new Set(EQUIPMENT_OPTIONS.map((e) => e.key));
      const eq = (params.equipment ?? []).filter((e): e is EquipKey => valid.has(e as EquipKey));
      next = { ...next, equipment: eq };
      intakeChanged = true;
      plan = generateProgram(next, analysis, { intensityOffset: offset });
      startDate = current?.start_date ?? today;
      summary = `Exercises re-selected for your equipment: ${["bodyweight", ...eq].join(", ")}.`;
      break;
    }
  }
  return { intake: next, intakeChanged, plan, startDate, summary };
}
