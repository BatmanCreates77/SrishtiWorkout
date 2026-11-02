import curated from "@/data/curated-exercises.json";
import { CUSTOM_EXERCISES, PATTERNS, type Candidate, type EquipKey, type Pattern } from "./patterns";
import type { Analysis, CardioPlan, Goal, Intake, Prescription, Program, Session } from "./types";

type Ex = { id: string; name: string; equipment: string; target: string; bodyPart: string; instructions: string[]; hold?: boolean; category: string; secondaryMuscles: string[] };

const CATALOG: Record<string, Ex> = {
  ...(curated as unknown as Record<string, Ex>),
  ...Object.fromEntries(CUSTOM_EXERCISES.map((e) => [e.id, e as Ex])),
};

export function getExercise(id: string): Ex | undefined {
  return CATALOG[id];
}

export function titleCase(s: string) {
  return s.replace(/\s*\((male|female)\)/gi, "").replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

// ---------------------------------------------------------------------------
type GoalCfg = { mainSets: number; mainReps: string; accSets: number; accReps: string; rir: number; mainRest: number; accRest: number };
const GOALS: Record<Goal, GoalCfg> = {
  strength: { mainSets: 4, mainReps: "4-6", accSets: 3, accReps: "8-10", rir: 2, mainRest: 150, accRest: 90 },
  muscle: { mainSets: 3, mainReps: "8-12", accSets: 3, accReps: "10-15", rir: 2, mainRest: 90, accRest: 60 },
  fat_loss: { mainSets: 3, mainReps: "10-12", accSets: 3, accReps: "12-15", rir: 2, mainRest: 60, accRest: 45 },
  endurance: { mainSets: 3, mainReps: "12-15", accSets: 2, accReps: "15-20", rir: 3, mainRest: 45, accRest: 30 },
  general: { mainSets: 3, mainReps: "8-12", accSets: 2, accReps: "10-15", rir: 2, mainRest: 75, accRest: 60 },
  mobility: { mainSets: 2, mainReps: "10-12", accSets: 2, accReps: "12-15", rir: 3, mainRest: 60, accRest: 45 },
};

type Slot = { p: Pattern; role: "main" | "acc"; v?: number };
const T: Record<string, { title: string; focus: string; slots: Slot[] }> = {
  FA: { title: "Full Body A", focus: "Squat · Push · Pull", slots: [{ p: "squat", role: "main" }, { p: "hpush", role: "main" }, { p: "hpull", role: "main" }, { p: "hinge", role: "acc" }, { p: "core", role: "acc" }, { p: "glute", role: "acc" }, { p: "calves", role: "acc" }] },
  FB: { title: "Full Body B", focus: "Hinge · Overhead · Pull-down", slots: [{ p: "hinge", role: "main" }, { p: "vpull", role: "main" }, { p: "vpush", role: "main" }, { p: "lunge", role: "acc" }, { p: "core_rot", role: "acc" }, { p: "carry", role: "acc" }, { p: "biceps", role: "acc" }] },
  FC: { title: "Full Body C", focus: "Single-leg · Push · Row", slots: [{ p: "lunge", role: "main" }, { p: "hpush", role: "main", v: 1 }, { p: "hpull", role: "main", v: 1 }, { p: "glute", role: "acc", v: 1 }, { p: "core", role: "acc", v: 1 }, { p: "shoulders", role: "acc" }, { p: "triceps", role: "acc" }] },
  UA: { title: "Upper A", focus: "Chest · Back · Arms", slots: [{ p: "hpush", role: "main" }, { p: "hpull", role: "main" }, { p: "vpush", role: "acc" }, { p: "vpull", role: "acc" }, { p: "shoulders", role: "acc" }, { p: "biceps", role: "acc" }, { p: "triceps", role: "acc" }] },
  LA: { title: "Lower A", focus: "Squat focus · Glutes", slots: [{ p: "squat", role: "main" }, { p: "hinge", role: "main" }, { p: "lunge", role: "acc" }, { p: "glute", role: "acc" }, { p: "core", role: "acc" }, { p: "calves", role: "acc" }] },
  UB: { title: "Upper B", focus: "Shoulders · Back · Core", slots: [{ p: "vpush", role: "main", v: 1 }, { p: "vpull", role: "main", v: 1 }, { p: "hpush", role: "acc", v: 1 }, { p: "hpull", role: "acc", v: 1 }, { p: "core_rot", role: "acc" }, { p: "shoulders", role: "acc", v: 1 }, { p: "biceps", role: "acc", v: 1 }] },
  LB: { title: "Lower B", focus: "Hinge focus · Single-leg", slots: [{ p: "hinge", role: "main", v: 1 }, { p: "lunge", role: "main", v: 1 }, { p: "squat", role: "acc", v: 1 }, { p: "glute", role: "acc", v: 1 }, { p: "carry", role: "acc" }, { p: "core", role: "acc", v: 1 }] },
  CD: { title: "Conditioning & Core", focus: "Intervals · Core · Mobility", slots: [{ p: "core", role: "acc" }, { p: "core_rot", role: "acc" }, { p: "glute", role: "acc" }, { p: "carry", role: "acc" }] },
};

const SPLITS: Record<number, { name: string; days: string[] }> = {
  2: { name: "Full body ×2", days: ["FA", "FB"] },
  3: { name: "Full body ×3", days: ["FA", "FB", "FC"] },
  4: { name: "Upper / Lower", days: ["UA", "LA", "UB", "LB"] },
  5: { name: "Upper / Lower + Conditioning", days: ["UA", "LA", "CD", "UB", "LB"] },
  6: { name: "Upper / Lower + Conditioning", days: ["UA", "LA", "CD", "UB", "LB", "CD"] },
};

export const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6],
};

const DOMAIN_FOR: Partial<Record<Pattern, "lower" | "upper" | "core" | "cardio" | "mobility">> = {
  squat: "lower", hinge: "lower", lunge: "lower", glute: "lower", calves: "lower",
  hpush: "upper", vpush: "upper", hpull: "upper", vpull: "upper", biceps: "upper", triceps: "upper", shoulders: "upper",
  core: "core", core_rot: "core", carry: "core", cardio: "cardio", mobility: "mobility",
};

function targetTier(score: number | undefined, level: Analysis["level"]): number {
  let t = score === undefined ? (level === "beginner" ? 1 : 2) : score <= 2 ? 1 : score < 4 ? 2 : 3;
  if (level === "beginner") t = Math.min(t, 2);
  return t;
}

const LOADABLE: EquipKey[] = ["dumbbell", "kettlebell", "barbell", "cable", "machine", "smith", "trap_bar", "band"];

function pick(p: Pattern, equip: Set<EquipKey>, tier: number, variant: number, avoid: Set<string>, role: "main" | "acc" = "acc"): Candidate | undefined {
  const usable = PATTERNS[p].filter((c) => c.needs.every((n) => equip.has(n)));
  if (!usable.length) return undefined;
  const scored = usable
    .map((c) => {
      const loaded = c.needs.some((n) => LOADABLE.includes(n));
      // External load can be set light, so a standard loaded movement suits a beginner too.
      const eff = loaded && c.tier === 2 ? Math.min(2, tier) : c.tier;
      const s = (eff <= tier ? 10 - (tier - eff) * 3 : -8 * (eff - tier))
        + (loaded ? (role === "main" ? 4 : 2) : 0)
        + (c.needs.includes("band") && equip.size > 3 ? -1 : 0)
        - (avoid.has(c.id) ? 6 : 0);
      return { c, s };
    })
    .sort((a, b) => b.s - a.s);
  const best = scored[0].s;
  const top = scored.filter((x) => x.s >= best - 3);
  return top[variant % top.length].c;
}

function repsFor(ex: Ex, role: "main" | "acc", cfg: GoalCfg, p: Pattern): string {
  if (ex.hold) return role === "main" ? "30-45s" : "20-40s";
  if (p === "carry") return "30-40s";
  if (p === "core" || p === "core_rot") return ex.name.includes("bird") || ex.name.includes("dead bug") ? "8-10 / side" : "10-15";
  return role === "main" ? cfg.mainReps : cfg.accReps;
}

export function maxExercises(minutes: number) {
  return minutes <= 30 ? 4 : minutes <= 45 ? 5 : minutes <= 60 ? 6 : 7;
}

export function buildCardio(intake: Intake, analysis: Analysis): CardioPlan {
  const s = analysis.domains.cardio ?? 2;
  const stepGoal = { lt3k: 5000, "3to6k": 7000, "6to9k": 9000, gt9k: 10000 }[intake.dailySteps] ?? 7000;
  if (s < 2) return { sessionsPerWeek: 3, minutes: 20, type: "Brisk walk (Zone 2)", detail: "Talk-test pace: breathing harder but able to speak in sentences (RPE 3-4/10).", stepGoal };
  if (s < 3) return { sessionsPerWeek: 3, minutes: 30, type: "Zone 2 cardio", detail: "Brisk walk, cycle or elliptical at a conversational pace (RPE 4/10).", stepGoal };
  if (s < 4) return { sessionsPerWeek: 3, minutes: 30, type: "Zone 2 + 1 interval session", detail: "2× Zone 2 sessions, 1× intervals: 6 × 1 min hard (RPE 8) / 2 min easy.", stepGoal };
  return { sessionsPerWeek: 3, minutes: 40, type: "Zone 2 + HIIT", detail: "2× 40 min Zone 2, 1× HIIT: 8 × 1 min hard / 1 min easy, or 4 × 4 min at RPE 8 with 3 min easy.", stepGoal };
}

export function generateProgram(intake: Intake, analysis: Analysis, opts: { intensityOffset?: number } = {}): Program {
  const intensityOffset = opts.intensityOffset ?? 0;
  const days = Math.min(6, Math.max(2, intake.daysPerWeek));
  const split = SPLITS[days];
  const weekdays = intake.preferredDays?.length === days ? [...intake.preferredDays].sort() : DEFAULT_WEEKDAYS[days];
  const equip = new Set<EquipKey>(["bodyweight", ...(intake.equipment ?? [])]);
  const cfg = { ...GOALS[intake.primaryGoal] };
  const beginner = analysis.level === "beginner";
  const cautious = Object.values(intake.parq ?? {}).some(Boolean);
  const maxEx = maxExercises(intake.sessionMinutes);
  const faults = analysis.correctives.join(" ");

  // weakest domain gets an extra slot priority
  const weakest = (Object.entries(analysis.domains) as [string, number][])
    .filter(([d]) => d !== "bodyComp")
    .sort((a, b) => a[1] - b[1])[0]?.[0];

  const warmupIds = ["c-cat-cow", "c-worlds-greatest-stretch"];
  if (faults.includes("ankle")) warmupIds.push("c-ankle-rocks");
  if (faults.includes("hip-flexor") || intake.primaryGoal === "mobility" || weakest === "mobility") warmupIds.push("c-hip-flexor-stretch");

  const templates = split.days.map((k, i) => ({ ...T[k], key: k, idx: i }));
  const baseSessions = templates.map((t) => {
    const used = new Set<string>();
    let slots = [...t.slots];
    if (weakest === "core" && !slots.slice(0, maxEx).some((s) => s.p === "core")) slots.splice(3, 0, { p: "core", role: "acc" });
    if (weakest === "lower" && t.key.startsWith("F")) slots.splice(3, 0, { p: "glute", role: "acc", v: 1 });
    if (faults.includes("glute-med") && !slots.slice(0, maxEx).some((s) => s.p === "glute")) slots.splice(4, 0, { p: "glute", role: "acc" });
    slots = slots.slice(0, maxEx);
    const items: { slot: Slot; ex: Ex }[] = [];
    for (const slot of slots) {
      const dom = DOMAIN_FOR[slot.p];
      const tier = targetTier(dom ? analysis.domains[dom] : undefined, analysis.level);
      const c = pick(slot.p, equip, tier, (slot.v ?? 0) + Math.floor(t.idx / 2), used, slot.role);
      if (!c) continue;
      const ex = getExercise(c.id);
      if (!ex) continue;
      used.add(c.id);
      items.push({ slot, ex });
    }
    return { t, items };
  });

  const weeks: Session[][] = [];
  for (let w = 1; w <= 4; w++) {
    const week: Session[] = baseSessions.map(({ t, items }, i) => {
      const main: Prescription[] = items.map(({ slot, ex }) => {
        let sets = slot.role === "main" ? cfg.mainSets : cfg.accSets;
        let rir = cfg.rir;
        if (beginner) { sets = Math.max(2, sets - 1); rir += 1; }
        if (cautious) rir = Math.max(rir, 3);
        sets += intensityOffset > 0 && slot.role === "main" ? 1 : intensityOffset < 0 ? -1 : 0;
        rir -= intensityOffset;
        if (w === 2 && slot.role === "main") sets += 1;
        if (w === 3) rir -= 1;
        if (w === 4) { sets = Math.max(2, Math.round(sets * 0.6)); rir = 4; }
        sets = Math.min(5, Math.max(1, sets));
        rir = Math.min(4, Math.max(1, rir));
        return {
          exerciseId: ex.id, name: titleCase(ex.name), pattern: slot.p, sets,
          reps: repsFor(ex, slot.role, cfg, slot.p), rir,
          restSec: slot.role === "main" ? cfg.mainRest : cfg.accRest,
          hold: ex.hold || slot.p === "carry",
          note: slot.role === "main" ? "Main lift: hit the top of the rep range on every set, then add a little weight next time." : undefined,
        };
      });
      const warmup: Prescription[] = warmupIds.map((id) => {
        const ex = getExercise(id)!;
        return { exerciseId: id, name: titleCase(ex.name), pattern: "mobility", sets: 1, reps: ex.hold ? "30s / side" : "6-8 / side", rir: 4, restSec: 0, hold: ex.hold };
      });
      let finisher: Prescription[] | undefined;
      const wantsFinisher = t.key === "CD" || intake.primaryGoal === "fat_loss" || intake.primaryGoal === "endurance";
      if (wantsFinisher && w !== 4) {
        const c = pick("cardio", equip, targetTier(analysis.domains.cardio, analysis.level) + (t.key === "CD" ? 1 : 0), i, new Set(["c-brisk-walk"]));
        const ex = c && getExercise(c.id);
        if (ex) {
          const hard = (analysis.domains.cardio ?? 2) >= 3 && !cautious;
          finisher = ex.id === "c-brisk-walk" ? [{
            exerciseId: ex.id, name: titleCase(ex.name), pattern: "cardio", sets: 1, reps: t.key === "CD" ? "20 min" : "10 min",
            rir: 3, restSec: 0, hold: true, note: "Brisk, steady walk (or incline treadmill). Builds your aerobic base before intervals.",
          }] : [{
            exerciseId: ex.id, name: titleCase(ex.name), pattern: "cardio",
            sets: t.key === "CD" ? (hard ? 8 : 6) : hard ? 6 : 5, reps: hard ? "40s on / 20s off" : "30s on / 30s off",
            rir: 2, restSec: hard ? 20 : 30, hold: true,
            note: t.key === "CD" ? "Interval block: hard but controlled, RPE 7-8." : "Short finisher. Skip if you are short on time or recovery is poor.",
          }];
        }
      }
      const work = main.reduce((m, p) => m + p.sets * (45 + p.restSec), 0) / 60;
      return {
        key: `w${w}-d${i + 1}`, title: t.title, focus: t.focus, week: w, dayIndex: i, weekday: weekdays[i],
        warmup, main, finisher,
        estMinutes: Math.round(7 + work + (finisher ? finisher[0].sets : 0)),
      };
    });
    weeks.push(week);
  }

  const principles = [
    "RIR = reps in reserve: stop each set with that many good reps left in the tank.",
    "Double progression: once you hit the top of the rep range on all sets, add the smallest weight jump (or a harder variation).",
    "Week 2 adds a set to main lifts, week 3 pushes intensity (lower RIR), week 4 is a deload to absorb the work.",
    "Pain over 3/10 or any sharp pain = stop that exercise and tell your coach.",
    "Retest your fitness after 6-8 weeks to update your plan.",
  ];

  return {
    version: 1,
    createdFor: { level: analysis.level, goal: intake.primaryGoal, daysPerWeek: days, sessionMinutes: intake.sessionMinutes, equipment: intake.equipment },
    intensityOffset,
    split: split.name,
    weeks,
    cardio: buildCardio(intake, analysis),
    principles,
  };
}
