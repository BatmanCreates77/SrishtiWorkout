import type { EquipKey } from "./patterns";

export type Sex = "female" | "male";
export type Goal = "fat_loss" | "muscle" | "strength" | "endurance" | "general" | "mobility";
export type DietPattern = "vegetarian" | "eggetarian" | "non_vegetarian" | "vegan" | "pescatarian";

export type Intake = {
  // basics
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  waistCm?: number;
  // screening (PAR-Q+)
  parq: Record<string, boolean>;
  pregnancy: "no" | "pregnant" | "postpartum_lt12w" | "postpartum_gt12w";
  injuries: string; // free text
  painAreas: string[];
  // activity
  trainingAge: 0 | 1 | 2 | 3;
  currentDaysPerWeek: number;
  currentActivities: string[];
  dailySteps: "lt3k" | "3to6k" | "6to9k" | "gt9k";
  jobActivity: "sedentary" | "light" | "active";
  // goals & schedule
  primaryGoal: Goal;
  secondaryGoal?: Goal | "";
  goalNote: string;
  daysPerWeek: number;
  preferredDays: number[]; // 0=Sun..6=Sat
  sessionMinutes: number;
  location: "home" | "gym" | "both";
  equipment: EquipKey[];
  // lifestyle
  sleepHours: number;
  sleepQuality: number; // 1-5
  stress: number; // 1-5
  energy: number; // 1-5
  // diet
  dietPattern: DietPattern;
  mealsPerDay: number;
  proteinPalms: number; // palm-sized protein portions per day
  vegServings: number;
  fruitServings: number;
  waterLiters: number;
  sugaryDrinksPerWeek: number;
  alcoholPerWeek: number;
  friedOrPackagedPerWeek: number;
  lateEating: boolean;
  supplements: string[];
  // everything else the coach asked (question id -> value), plus her own words per question
  extras?: Record<string, unknown>;
  notes?: Record<string, string>;
  followups?: { section: string; ask: string; answer: string }[];
};

export type Feel = "easy" | "right" | "hard" | "couldnt";
export type TrialResult = {
  id: string; // trial id, e.g. "push"
  exerciseId: string; // the variant she actually did
  variant: "base" | "easier" | "harder";
  value: number; // reps (per side for lunges) or seconds
  feel: Feel;
  formFlags: string[];
  pain: boolean;
  note?: string;
};

export type TestKey =
  | "restingHr" | "pushups" | "plank" | "squat60" | "stepTest" | "rockport"
  | "sitReach" | "balance" | "waist" | "deadHang";

export type TestResults = {
  restingHr?: number;
  pushups?: { reps: number; variant: "knee" | "full" };
  plank?: number; // seconds
  squat60?: { reps: number; faults: string[] };
  stepTest?: number; // recovery HR
  rockport?: { minutes: number; seconds: number; hr: number };
  sitReach?: number; // cm relative to toes
  balance?: number; // seconds, weaker leg
  waist?: number; // cm
  deadHang?: number; // seconds
  trials?: TrialResult[];
};

export type Domain = "cardio" | "upper" | "lower" | "core" | "mobility" | "balance" | "bodyComp";

export type TestScore = { key: TestKey; label: string; value: string; score: number; rating: string; note?: string };

export type Analysis = {
  testScores: TestScore[];
  domains: Partial<Record<Domain, number>>;
  overall: number;
  level: "beginner" | "intermediate" | "advanced";
  vo2max?: number;
  bmi: number;
  whtr?: number;
  flags: string[];
  correctives: string[];
  diet: DietAnalysis;
  summary: string[];
};

export type DietAnalysis = {
  bmr: number;
  tdee: number;
  calorieRange: [number, number];
  proteinTarget: number;
  proteinEstimate: number;
  waterTarget: number;
  score: number; // 0-100
  priorities: string[];
  proteinIdeas: string[];
};

export type Prescription = {
  exerciseId: string;
  name: string;
  pattern: string;
  sets: number;
  reps: string; // "8-12" or "30s"
  rir: number;
  restSec: number;
  hold?: boolean;
  note?: string;
  swappedFrom?: string;
};

export type Session = {
  key: string; // e.g. "w1-d1"
  title: string; // "Full Body A"
  focus: string;
  week: number;
  dayIndex: number; // index within week
  weekday: number; // 0..6
  warmup: Prescription[];
  main: Prescription[];
  finisher?: Prescription[];
  estMinutes: number;
};

export type CardioPlan = { sessionsPerWeek: number; minutes: number; type: string; detail: string; stepGoal: number };

export type Constraints = {
  excludeIds: string[];
  excludeTags: string[];
  emphasis: string[]; // patterns to add or prioritise
  cardioStyle?: "short" | "intervals" | "walks";
  sessionStyle?: "circuit" | "straight";
  mobilityExtra?: boolean;
  why: string[]; // human-readable reasons, shown in "Why this plan"
};

export type TrialPlan = {
  patternTiers: Record<string, number>; // pattern -> tier 1..3
  preferred: Record<string, string>; // pattern -> exercise id she managed in the trial
  repCaps: Record<string, string>; // pattern -> starting rep range when her trial was low
  flags: string[];
  why: string[];
};

export type Program = {
  version: 1 | 2;
  createdFor: { level: string; goal: Goal; daysPerWeek: number; sessionMinutes: number; equipment: EquipKey[] };
  constraints?: Constraints;
  trial?: TrialPlan;
  why?: string[];
  intensityOffset: number; // -1 easier, 0 normal, +1 harder
  split: string;
  weeks: Session[][];
  cardio: CardioPlan;
  principles: string[];
};

export type LogEntry = {
  exerciseId: string;
  sets: { reps?: number; weightKg?: number; seconds?: number; done: boolean }[];
  skipped?: boolean;
};
