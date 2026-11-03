import type { Sex, TestResults, TestScore } from "./types";

// Score helpers ------------------------------------------------------------

const RATING = ["", "Needs work", "Fair", "Good", "Very good", "Excellent"];

function band(age: number, bands: number[]): number {
  // bands = upper age bounds; returns index
  const i = bands.findIndex((b) => age <= b);
  return i === -1 ? bands.length : i;
}

/** thresholds descending "higher is better": [t5, t4, t3, t2] -> value >= t5 → 5 ... */
function higherBetter(v: number, t: [number, number, number, number]): number {
  if (v >= t[0]) return 5;
  if (v >= t[1]) return 4;
  if (v >= t[2]) return 3;
  if (v >= t[3]) return 2;
  return 1;
}
/** "lower is better": [t5, t4, t3, t2] upper bounds */
function lowerBetter(v: number, t: [number, number, number, number]): number {
  if (v <= t[0]) return 5;
  if (v <= t[1]) return 4;
  if (v <= t[2]) return 3;
  if (v <= t[3]) return 2;
  return 1;
}

// CSEP push-up norms (women: knee; men: full). Thresholds for excellent, very good, good, fair.
const PUSHUP_F: [number, number, number, number][] = [
  [30, 21, 15, 10], [27, 20, 13, 8], [24, 15, 11, 5], [21, 11, 7, 2], [17, 12, 5, 2],
];
const PUSHUP_M: [number, number, number, number][] = [
  [36, 29, 22, 17], [30, 22, 17, 12], [25, 17, 13, 10], [21, 13, 10, 7], [18, 11, 8, 5],
];

// 1-minute squat (upper bound of categories): excellent, good, above average, average
const SQUAT_F: [number, number, number, number][] = [
  [44, 37, 33, 29], [40, 33, 29, 25], [34, 27, 23, 18], [28, 22, 18, 13], [25, 18, 13, 10], [24, 17, 14, 11],
];
const SQUAT_M: [number, number, number, number][] = [
  [50, 44, 39, 35], [46, 40, 35, 31], [42, 35, 30, 27], [37, 29, 25, 22], [33, 28, 24, 21], [29, 24, 20, 18],
];

// YMCA step test recovery HR, upper bounds: excellent, good, above average, average
const STEP_F: [number, number, number, number][] = [
  [85, 98, 108, 117], [88, 99, 111, 119], [90, 103, 110, 118], [94, 104, 115, 120], [95, 104, 112, 118], [90, 102, 116, 122],
];
const STEP_M: [number, number, number, number][] = [
  [79, 89, 98, 105], [81, 89, 98, 106], [83, 96, 103, 111], [87, 99, 107, 114], [86, 98, 106, 113], [88, 98, 105, 113],
];

// VO2max (ml/kg/min) lower bounds for superior, excellent, good, fair (Cooper Institute approx.)
const VO2_F: [number, number, number, number][] = [
  [44, 40, 36, 31], [42, 38, 34, 29], [40, 36, 32, 27], [37, 32, 29, 24], [33, 30, 26, 22],
];
const VO2_M: [number, number, number, number][] = [
  [51, 46, 42, 38], [49, 44, 40, 36], [47, 42, 38, 34], [44, 39, 35, 31], [41, 36, 32, 28],
];

export function rockportVo2(
  weightKg: number, age: number, sex: Sex, minutes: number, seconds: number, hr: number,
): number {
  const lb = weightKg * 2.20462;
  const t = minutes + seconds / 60;
  const v = 132.853 - 0.0769 * lb - 0.3877 * age + 6.315 * (sex === "male" ? 1 : 0) - 3.2649 * t - 0.1565 * hr;
  return Math.round(v * 10) / 10;
}

export function scoreTests(
  r: TestResults, ctx: { age: number; sex: Sex; weightKg: number; heightCm: number },
): { scores: TestScore[]; vo2max?: number; whtr?: number; flags: string[]; correctives: string[] } {
  const { age, sex } = ctx;
  const f = sex === "female";
  const scores: TestScore[] = [];
  const flags: string[] = [];
  const correctives: string[] = [];
  const push = (key: TestScore["key"], label: string, value: string, score: number, note?: string) =>
    scores.push({ key, label, value, score, rating: RATING[score], note });

  if (r.restingHr) {
    const s = lowerBetter(r.restingHr, [59, 69, 79, 89]);
    if (r.restingHr >= 100) flags.push("Resting heart rate ≥100 bpm. Please check with a doctor before hard training.");
    push("restingHr", "Resting heart rate", `${r.restingHr} bpm`, s);
  }
  if (r.pushups) {
    const table = f ? PUSHUP_F : PUSHUP_M;
    const t = table[band(age, [29, 39, 49, 59])] ?? table[table.length - 1];
    // Women's norms use knee push-ups; full reps are ~1.6x harder for women. Men's norms use full.
    let reps = r.pushups.reps;
    if (f && r.pushups.variant === "full") reps = Math.round(reps * 1.6);
    if (!f && r.pushups.variant === "knee") reps = Math.round(reps / 1.6);
    push("pushups", "Push-ups", `${r.pushups.reps} (${r.pushups.variant})`, higherBetter(reps, t));
  }
  if (r.plank !== undefined) {
    push("plank", "Forearm plank", `${r.plank}s`, higherBetter(r.plank, [120, 90, 60, 30]));
  }
  if (r.squat60) {
    const table = f ? SQUAT_F : SQUAT_M;
    const t = table[band(age, [25, 35, 45, 55, 65])];
    push("squat60", "1-min squat", `${r.squat60.reps} reps`, higherBetter(r.squat60.reps, t));
    for (const fault of r.squat60.faults) {
      if (fault === "knees_cave") correctives.push("Knees caving in → glute-med work (clamshells, banded side steps) and slower squats with a knees-out cue.");
      if (fault === "heels_lift") correctives.push("Heels lifting → ankle mobility (knee-to-wall rocks) daily; squat with heels slightly raised meanwhile.");
      if (fault === "forward_lean") correctives.push("Leaning forward → goblet-style squats, hip-flexor stretch and core bracing practice.");
      if (fault === "pain") flags.push("You reported pain during squats. Keep squats pain-free (reduce depth) and get it checked if it persists.");
    }
  }
  let vo2max: number | undefined;
  if (r.rockport && r.rockport.hr && r.rockport.minutes) {
    vo2max = rockportVo2(ctx.weightKg, age, sex, r.rockport.minutes, r.rockport.seconds, r.rockport.hr);
    const t = (f ? VO2_F : VO2_M)[band(age, [29, 39, 49, 59])];
    push("rockport", "Est. VO2max (Rockport)", `${vo2max} ml/kg/min`, higherBetter(vo2max, t));
  }
  if (r.stepTest) {
    const t = (f ? STEP_F : STEP_M)[band(age, [25, 35, 45, 55, 65])];
    push("stepTest", "Step test recovery HR", `${r.stepTest} bpm`, lowerBetter(r.stepTest, t));
  }
  if (r.sitReach !== undefined) {
    const v = r.sitReach;
    const s = v >= 10 ? 5 : v >= 5 ? 4 : v >= 0 ? 3 : v > -10 ? 2 : 1;
    push("sitReach", "Sit-and-reach", `${v > 0 ? "+" : ""}${v} cm`, s);
  }
  if (r.balance !== undefined) {
    const k = age >= 60 ? 0.6 : 1;
    const s = r.balance >= 45 * k ? 5 : r.balance >= 30 * k ? 4 : r.balance >= 20 * k ? 3 : r.balance >= 10 * k ? 2 : 1;
    push("balance", "Single-leg balance", `${r.balance}s`, s);
  }
  let whtr: number | undefined;
  if (r.waist) {
    whtr = Math.round((r.waist / ctx.heightCm) * 100) / 100;
    const s = whtr < 0.4 ? 4 : whtr < 0.5 ? 5 : whtr < 0.6 ? 3 : 1;
    push("waist", "Waist-to-height ratio", whtr.toFixed(2), s, whtr >= 0.5 ? "≥0.5 is linked with higher cardiometabolic risk" : undefined);
  }
  if (r.deadHang !== undefined) {
    push("deadHang", "Dead hang", `${r.deadHang}s`, higherBetter(r.deadHang, [60, 40, 20, 10]));
  }
  return { scores, vo2max, whtr, flags, correctives };
}
