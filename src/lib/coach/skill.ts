// Typed access to Coach Maya's skill, compiled from coach-skill/content by scripts/build-data.mjs.
import data from "@/data/coach-skill.json";

export type Option = { value: string | number | boolean; label: string; exclusive?: boolean };
export type When = { q: string; eq?: unknown; in?: unknown[]; includes?: unknown; anyExcept?: unknown; gte?: number };
export type Question = {
  id: string; section: string; kind: "info" | "text" | "number" | "single" | "multi" | "scale" | "scale10";
  coach: string; field?: string; options?: Option[]; unit?: string; min?: number; max?: number; step?: number;
  required?: boolean; optional?: boolean; probe?: boolean; when?: When; react?: Record<string, string>;
  low?: string; high?: string;
};
export type Trial = {
  id: string; pattern: string; title: string; exerciseId: string; easier: string; harder: string;
  measure: "reps" | "seconds"; timerSec?: number; stopwatch?: boolean; perSide?: boolean;
  protocol: string; cues: string[]; formFlags: { value: string; label: string }[];
  score: { min: number; tier: number }[]; painTags: string[]; asTest?: "squat60" | "pushups" | "plank";
};
export type HealthTest = {
  key: "restingHr" | "stepTest" | "sitReach" | "balance" | "waist"; title: string; measures: string; equipment: string;
  steps: string[]; unit: string; timerSec?: number; stopwatch?: boolean; metronomeBpm?: number; vigorous?: boolean; safety?: string;
};
export type CurationRule = {
  q: string; value?: unknown; anyExcept?: unknown; excludeTags?: string[]; excludeIds?: string[]; emphasis?: string;
  cardioStyle?: "short" | "intervals" | "walks"; sessionStyle?: "circuit" | "straight"; mobilityExtra?: boolean; why: string;
};
type GoalCfg = { mainSets: number; mainReps: string; accSets: number; accReps: string; rir: number; mainRest: number; accRest: number };

type Skill = {
  questions: { sections: { id: string; title: string }[]; questions: Question[] };
  trials: { intro: string; trials: Trial[]; feelOptions: { value: string; label: string; hint: string }[] };
  healthTests: { intro: string; tests: HealthTest[] };
  curation: { rules: CurationRule[] };
  programming: {
    goals: Record<string, GoalCfg>;
    exercisesByMinutes: { max: number; count: number }[];
    defaultWeekdays: Record<string, number[]>;
    mesocycle: { week: number; label: string; mainSetsDelta?: number; rirDelta?: number; deload?: boolean }[];
  };
  demoIds: string[];
};

export const skill = data as unknown as Skill;
export const SECTIONS = skill.questions.sections;
export const QUESTIONS = skill.questions.questions;
export const TRIALS = skill.trials.trials;
export const HEALTH_TESTS = skill.healthTests.tests;
const demo = new Set(skill.demoIds);
export const hasDemo = (id: string) => demo.has(id);
