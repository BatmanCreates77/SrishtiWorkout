import curated from "@/data/curated-exercises.json";
import { skill } from "@/lib/coach/skill";
import { BRISK_WALK_ID, PATTERNS, WARMUP_IDS, type Candidate, type EquipKey, type Pattern, type Tag } from "./patterns";
import type { Analysis, CardioPlan, Constraints, Goal, Intake, Prescription, Program, Session, TrialPlan } from "./types";

export type Ex = { id: string; name: string; equipment: string; target: string; bodyPart: string; instructions: string[]; description?: string; hold?: boolean; category: string; secondaryMuscles: string[] };

const CATALOG = curated as unknown as Record<string, Ex>;

export function getExercise(id: string): Ex | undefined {
  return CATALOG[id];
}

export function titleCase(s: string) {
  return s.replace(/\s*\((male|female)\)/gi, "").replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

// ---------------------------------------------------------------------------
type GoalCfg = { mainSets: number; mainReps: string; accSets: number; accReps: string; rir: number; mainRest: number; accRest: number };
const GOALS = skill.programming.goals as Record<Goal, GoalCfg>;

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
  PU: { title: "Push", focus: "Chest · Shoulders · Triceps", slots: [{ p: "hpush", role: "main" }, { p: "vpush", role: "main" }, { p: "hpush", role: "acc", v: 1 }, { p: "shoulders", role: "acc" }, { p: "triceps", role: "acc" }, { p: "core", role: "acc" }] },
  PL: { title: "Pull", focus: "Back · Biceps · Core", slots: [{ p: "vpull", role: "main" }, { p: "hpull", role: "main" }, { p: "hpull", role: "acc", v: 1 }, { p: "biceps", role: "acc" }, { p: "core_rot", role: "acc" }, { p: "carry", role: "acc" }] },
  LG: { title: "Legs", focus: "Squat · Hinge · Glutes", slots: [{ p: "squat", role: "main" }, { p: "hinge", role: "main" }, { p: "lunge", role: "acc" }, { p: "glute", role: "acc" }, { p: "calves", role: "acc" }, { p: "core", role: "acc" }] },
  PU2: { title: "Push B", focus: "Shoulders · Chest · Triceps", slots: [{ p: "vpush", role: "main", v: 1 }, { p: "hpush", role: "main", v: 1 }, { p: "shoulders", role: "acc", v: 1 }, { p: "triceps", role: "acc", v: 1 }, { p: "core_rot", role: "acc" }] },
  PL2: { title: "Pull B", focus: "Rows · Pull-downs · Biceps", slots: [{ p: "hpull", role: "main", v: 1 }, { p: "vpull", role: "main", v: 1 }, { p: "biceps", role: "acc", v: 1 }, { p: "shoulders", role: "acc", v: 1 }, { p: "core", role: "acc", v: 1 }] },
  LG2: { title: "Legs B", focus: "Hinge · Single-leg · Glutes", slots: [{ p: "hinge", role: "main", v: 1 }, { p: "lunge", role: "main", v: 1 }, { p: "squat", role: "acc", v: 1 }, { p: "glute", role: "acc", v: 1 }, { p: "calves", role: "acc" }] },
  CH: { title: "Chest & Triceps", focus: "Pressing · Triceps", slots: [{ p: "hpush", role: "main" }, { p: "hpush", role: "main", v: 1 }, { p: "triceps", role: "acc" }, { p: "triceps", role: "acc", v: 1 }, { p: "core", role: "acc" }] },
  BK: { title: "Back & Biceps", focus: "Pulling · Biceps", slots: [{ p: "vpull", role: "main" }, { p: "hpull", role: "main" }, { p: "hpull", role: "acc", v: 1 }, { p: "biceps", role: "acc" }, { p: "biceps", role: "acc", v: 1 }] },
  SH: { title: "Shoulders & Core", focus: "Overhead · Delts · Core", slots: [{ p: "vpush", role: "main" }, { p: "shoulders", role: "acc" }, { p: "shoulders", role: "acc", v: 1 }, { p: "core", role: "acc" }, { p: "core_rot", role: "acc" }, { p: "carry", role: "acc" }] },
  GL: { title: "Glutes & Arms", focus: "Glutes · Arms", slots: [{ p: "hinge", role: "main", v: 1 }, { p: "glute", role: "acc" }, { p: "glute", role: "acc", v: 1 }, { p: "biceps", role: "acc" }, { p: "triceps", role: "acc" }] },
};

export type SplitKey = "full" | "upper_lower" | "ppl" | "body_part";
type SplitDef = { name: string; blurb: string; best: string; days: Partial<Record<number, string[]>> };
export const SPLITS: Record<SplitKey, SplitDef> = {
  full: {
    name: "Full body", blurb: "Every session trains your whole body: squat, hinge, push, pull and core.",
    best: "Best for beginners and busy weeks: each muscle gets worked 2-3 times a week, and a missed day costs little.",
    days: { 2: ["FA", "FB"], 3: ["FA", "FB", "FC"], 4: ["FA", "FB", "FC", "CD"], 5: ["FA", "FB", "CD", "FC", "CD"], 6: ["FA", "FB", "FC", "FA", "FB", "FC"] },
  },
  upper_lower: {
    name: "Upper / Lower", blurb: "Alternate upper-body days and leg & glute days.",
    best: "Great at 4 days: more exercises per muscle, still each muscle twice a week.",
    days: { 2: ["UA", "LA"], 3: ["UA", "LA", "FC"], 4: ["UA", "LA", "UB", "LB"], 5: ["UA", "LA", "CD", "UB", "LB"], 6: ["UA", "LA", "CD", "UB", "LB", "CD"] },
  },
  ppl: {
    name: "Push / Pull / Legs", blurb: "One day for pushing muscles, one for pulling, one for legs.",
    best: "Popular for building muscle with 3 or 6 days a week; longer, more focused sessions.",
    days: { 3: ["PU", "PL", "LG"], 4: ["PU", "PL", "LG", "FA"], 5: ["PU", "PL", "LG", "UA", "LA"], 6: ["PU", "PL", "LG", "PU2", "PL2", "LG2"] },
  },
  body_part: {
    name: "Body-part split", blurb: "Classic 'bro split': each day focuses on one or two body parts.",
    best: "Lots of volume per muscle once a week; suits experienced lifters who enjoy focused pump sessions.",
    days: { 4: ["CH", "LG", "BK", "SH"], 5: ["CH", "BK", "LG", "SH", "GL"], 6: ["CH", "BK", "LG", "SH", "GL", "LG2"] },
  },
};

/** The split Coach Maya recommends for this person (used to rank the 3 options). */
export function recommendSplit(days: number, level: Analysis["level"]): SplitKey {
  if (level === "beginner") return days >= 4 ? "upper_lower" : "full";
  if (days <= 3) return level === "advanced" && days === 3 ? "ppl" : "full";
  if (days === 4 || days === 5) return "upper_lower";
  return "ppl";
}

export const DEFAULT_WEEKDAYS = Object.fromEntries(Object.entries(skill.programming.defaultWeekdays).map(([k, v]) => [Number(k), v])) as Record<number, number[]>;

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

type PickCtx = { equip: Set<EquipKey>; excludeIds: Set<string>; excludeTags: Set<Tag>; preferred?: string };

export function allowed(c: Candidate, ctx: PickCtx) {
  return c.needs.every((n) => ctx.equip.has(n)) && !ctx.excludeIds.has(c.id) && !(c.tags ?? []).some((t) => ctx.excludeTags.has(t));
}

function pick(p: Pattern, ctx: PickCtx, tier: number, variant: number, avoid: Set<string>, role: "main" | "acc" = "acc"): Candidate | undefined {
  const equip = ctx.equip;
  const usable = PATTERNS[p].filter((c) => allowed(c, ctx));
  if (!usable.length) return undefined;
  // The exact variant she managed in the movement trial wins for her first block.
  const pref = ctx.preferred && usable.find((c) => c.id === ctx.preferred);
  if (pref && variant === 0) return pref;
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
  return skill.programming.exercisesByMinutes.find((r) => minutes <= r.max)?.count ?? 6;
}

export function buildCardio(intake: Intake, analysis: Analysis): CardioPlan {
  const s = analysis.domains.cardio ?? 2;
  const stepGoal = { lt3k: 5000, "3to6k": 7000, "6to9k": 9000, gt9k: 10000 }[intake.dailySteps] ?? 7000;
  if (s < 2) return { sessionsPerWeek: 3, minutes: 20, type: "Brisk walk (Zone 2)", detail: "Talk-test pace: breathing harder but able to speak in sentences (RPE 3-4/10).", stepGoal };
  if (s < 3) return { sessionsPerWeek: 3, minutes: 30, type: "Zone 2 cardio", detail: "Brisk walk, cycle or elliptical at a conversational pace (RPE 4/10).", stepGoal };
  if (s < 4) return { sessionsPerWeek: 3, minutes: 30, type: "Zone 2 + 1 interval session", detail: "2× Zone 2 sessions, 1× intervals: 6 × 1 min hard (RPE 8) / 2 min easy.", stepGoal };
  return { sessionsPerWeek: 3, minutes: 40, type: "Zone 2 + HIIT", detail: "2× 40 min Zone 2, 1× HIIT: 8 × 1 min hard / 1 min easy, or 4 × 4 min at RPE 8 with 3 min easy.", stepGoal };
}

export type ProgramOpts = { intensityOffset?: number; trial?: TrialPlan; constraints?: Constraints; splitKey?: SplitKey };

const EMPHASIS_SLOTS: Record<string, Pattern[]> = {
  glute: ["glute"], arms: ["biceps", "triceps"], hpull: ["hpull"], core: ["core"], hpush: ["hpush"], vpull: ["vpull"],
};
const UPPER_PATTERNS = new Set<Pattern>(["hpush", "vpush", "hpull", "vpull", "biceps", "triceps", "shoulders"]);
// a trial on one pattern also informs its close relatives
const TRIAL_FOR: Partial<Record<Pattern, Pattern>> = { core_rot: "core", vpush: "hpush", vpull: "hpull", glute: "hinge", triceps: "hpush" };

export function generateProgram(intake: Intake, analysis: Analysis, opts: ProgramOpts = {}): Program {
  const intensityOffset = opts.intensityOffset ?? 0;
  const trial = opts.trial;
  const cons: Constraints = opts.constraints ?? { excludeIds: [], excludeTags: [], emphasis: [], why: [] };
  const days = Math.min(6, Math.max(2, intake.daysPerWeek));
  const wanted = opts.splitKey && SPLITS[opts.splitKey]?.days[days] ? opts.splitKey : recommendSplit(days, analysis.level);
  const splitKey: SplitKey = SPLITS[wanted].days[days] ? wanted : "full";
  const split = { name: `${SPLITS[splitKey].name} ×${days}`, days: SPLITS[splitKey].days[days]! };
  const weekdays = intake.preferredDays?.length === days ? [...intake.preferredDays].sort((a, b) => a - b) : DEFAULT_WEEKDAYS[days];
  const equip = new Set<EquipKey>(["bodyweight", ...(intake.equipment ?? [])]);
  const excludeIds = new Set(cons.excludeIds);
  const excludeTags = new Set(cons.excludeTags as Tag[]);
  const cfg = { ...GOALS[intake.primaryGoal] };
  const beginner = analysis.level === "beginner";
  const cautious = Object.values(intake.parq ?? {}).some(Boolean);
  const maxEx = maxExercises(intake.sessionMinutes);
  const faults = analysis.correctives.join(" ");
  const circuit = cons.sessionStyle === "circuit";
  const ctxFor = (p: Pattern): PickCtx => ({ equip, excludeIds, excludeTags, preferred: trial?.preferred[p] });

  const tierFor = (p: Pattern) => {
    const t = trial?.patternTiers[p] ?? trial?.patternTiers[TRIAL_FOR[p] ?? ""];
    if (t !== undefined) return t;
    const dom = DOMAIN_FOR[p];
    return targetTier(dom ? analysis.domains[dom] : undefined, analysis.level);
  };

  // weakest domain gets an extra slot priority
  const weakest = (Object.entries(analysis.domains) as [string, number][])
    .filter(([d]) => d !== "bodyComp")
    .sort((a, b) => a[1] - b[1])[0]?.[0];

  const mobilityCtx: PickCtx = { equip, excludeIds, excludeTags };
  const warmupPool = [WARMUP_IDS.greatest, WARMUP_IDS.catCow];
  if (faults.includes("ankle")) warmupPool.push(WARMUP_IDS.ankle);
  if (faults.includes("hip-flexor") || intake.primaryGoal === "mobility" || weakest === "mobility" || cons.mobilityExtra) warmupPool.push(WARMUP_IDS.hipFlexor);
  const warmupIds = warmupPool.filter((id) => {
    const c = PATTERNS.mobility.find((x) => x.id === id);
    return !c || allowed(c, mobilityCtx);
  });

  const templates = split.days.map((k, i) => ({ ...T[k], key: k, idx: i }));
  const baseSessions = templates.map((t) => {
    const used = new Set<string>();
    const slots = [...t.slots];
    // her stated focus areas and milestones get a slot early in the session
    for (const e of cons.emphasis) for (const p of EMPHASIS_SLOTS[e] ?? []) {
      const lowerDay = ["LA", "LB", "LG", "LG2", "GL"].includes(t.key), upperDay = ["UA", "UB", "PU", "PL", "PU2", "PL2", "CH", "BK", "SH"].includes(t.key);
      if (t.key === "CD" && !["core", "glute"].includes(p)) continue;
      if (lowerDay && UPPER_PATTERNS.has(p)) continue;
      if (upperDay && p === "glute") continue;
      if (!slots.slice(0, maxEx).some((s) => s.p === p)) slots.splice(Math.min(3, slots.length), 0, { p, role: "acc" });
    }
    if (weakest === "core" && !slots.slice(0, maxEx).some((s) => s.p === "core")) slots.splice(3, 0, { p: "core", role: "acc" });
    if (weakest === "lower" && ["FA", "FB", "FC"].includes(t.key)) slots.splice(3, 0, { p: "glute", role: "acc", v: 1 });
    if (faults.includes("glute-med") && !slots.slice(0, maxEx).some((s) => s.p === "glute")) slots.splice(4, 0, { p: "glute", role: "acc" });
    const items: { slot: Slot; ex: Ex }[] = [];
    for (const slot of slots) {
      if (items.length >= maxEx) break;
      const c = pick(slot.p, ctxFor(slot.p), tierFor(slot.p), (slot.v ?? 0) + Math.floor(t.idx / 2), used, slot.role);
      if (!c || used.has(c.id)) continue;
      const ex = getExercise(c.id);
      if (!ex) continue;
      used.add(c.id);
      items.push({ slot, ex });
    }
    return { t, items };
  });

  const meso = skill.programming.mesocycle;
  const weeks: Session[][] = [];
  for (let w = 1; w <= 4; w++) {
    const m = meso.find((x) => x.week === w);
    const week: Session[] = baseSessions.map(({ t, items }, i) => {
      const main: Prescription[] = items.map(({ slot, ex }) => {
        let sets = slot.role === "main" ? cfg.mainSets : cfg.accSets;
        let rir = cfg.rir;
        if (beginner) { sets = Math.max(2, sets - 1); rir += 1; }
        if (cautious) rir = Math.max(rir, 3);
        sets += intensityOffset > 0 && slot.role === "main" ? 1 : intensityOffset < 0 ? -1 : 0;
        rir -= intensityOffset;
        if (slot.role === "main") sets += m?.mainSetsDelta ?? 0;
        rir += m?.rirDelta ?? 0;
        if (m?.deload) { sets = Math.max(2, Math.round(sets * 0.6)); rir = 4; }
        sets = Math.min(5, Math.max(1, sets));
        rir = Math.min(4, Math.max(1, rir));
        const cap = trial?.repCaps[slot.p];
        const reps = cap && !ex.hold ? cap : repsFor(ex, slot.role, cfg, slot.p);
        return {
          exerciseId: ex.id, name: titleCase(ex.name), pattern: slot.p, sets, reps, rir,
          restSec: circuit && slot.role === "acc" ? 15 : slot.role === "main" ? cfg.mainRest : cfg.accRest,
          hold: ex.hold || slot.p === "carry",
          note: cap ? "Starting reps come from your movement check. Add reps as it gets easier."
            : slot.role === "main" ? "Main lift: hit the top of the rep range on every set, then add a little weight next time."
            : circuit ? "Circuit: go straight to the next accessory, rest about 60 s after each round." : undefined,
        };
      });
      const warmup: Prescription[] = warmupIds.map((id) => {
        const ex = getExercise(id)!;
        return { exerciseId: id, name: titleCase(ex.name), pattern: "mobility", sets: 1, reps: ex.hold || /stretch/.test(ex.name) ? "30s / side" : "6-8 / side", rir: 4, restSec: 0, hold: ex.hold };
      });
      let finisher: Prescription[] | undefined;
      const wantsFinisher = t.key === "CD" || intake.primaryGoal === "fat_loss" || intake.primaryGoal === "endurance" || cons.cardioStyle === "intervals";
      if (wantsFinisher && !m?.deload) {
        const walksOnly = cons.cardioStyle === "walks";
        const c = walksOnly ? PATTERNS.cardio.find((x) => x.id === BRISK_WALK_ID)
          : pick("cardio", { equip, excludeIds, excludeTags }, targetTier(analysis.domains.cardio, analysis.level) + (t.key === "CD" ? 1 : 0), i, new Set([BRISK_WALK_ID]));
        const ex = c && getExercise(c.id);
        if (ex) {
          const hard = (analysis.domains.cardio ?? 2) >= 3 && !cautious && !excludeTags.has("high_heart");
          const short = cons.cardioStyle === "short";
          finisher = ex.id === BRISK_WALK_ID ? [{
            exerciseId: ex.id, name: titleCase(ex.name), pattern: "cardio", sets: 1, reps: t.key === "CD" && !short ? "20 min" : "10 min",
            rir: 3, restSec: 0, hold: true, note: "Brisk, steady walk (outdoors or incline treadmill). Builds your aerobic base.",
          }] : [{
            exerciseId: ex.id, name: titleCase(ex.name), pattern: "cardio",
            sets: short ? 4 : t.key === "CD" ? (hard ? 8 : 6) : hard ? 6 : 5, reps: hard ? "40s on / 20s off" : "30s on / 30s off",
            rir: 2, restSec: hard ? 20 : 30, hold: true,
            note: t.key === "CD" ? "Interval block: hard but controlled, RPE 7-8." : "Short finisher. Skip it if you're short on time or recovery is poor.",
          }];
        }
      }
      const work = main.reduce((acc, p) => acc + p.sets * (45 + p.restSec), 0) / 60;
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
    "Retest your movement check after 4-6 weeks to update your plan.",
  ];

  const goalWhy: Record<Goal, string> = {
    fat_loss: "Full-body strength keeps your muscle while you lose fat; short finishers add calorie burn without long cardio.",
    muscle: "Moderate reps close to failure (8-12) and more sets each week: the proven recipe for toning and muscle.",
    strength: "Lower reps on big lifts with longer rest to build strength, with accessories to stay balanced.",
    endurance: "Higher reps, shorter rest and conditioning to build stamina.",
    general: "A balanced mix of strength, cardio and mobility for health and energy.",
    mobility: "Controlled strength through full range plus mobility drills in every session.",
  };
  const why = [
    `${days} days a week, about ${intake.sessionMinutes} minutes each, ${split.name.toLowerCase()}: what you told me fits your week.`,
    goalWhy[intake.primaryGoal],
    ...(trial?.why ?? []),
    ...cons.why,
  ];

  return {
    version: 2,
    createdFor: { level: analysis.level, goal: intake.primaryGoal, daysPerWeek: days, sessionMinutes: intake.sessionMinutes, equipment: intake.equipment },
    constraints: cons,
    trial,
    splitKey,
    why,
    intensityOffset,
    split: split.name,
    weeks,
    cardio: buildCardio(intake, analysis),
    principles,
  };
}
