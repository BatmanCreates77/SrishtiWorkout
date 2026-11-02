import { scoreTests } from "./tests";
import type { Analysis, DietAnalysis, Domain, Intake, TestResults, TestScore } from "./types";

export const PARQ_QUESTIONS: { key: string; text: string }[] = [
  { key: "heart", text: "Has a doctor ever said you have a heart condition or high blood pressure?" },
  { key: "chestPain", text: "Do you feel pain in your chest at rest, during daily activities, or when you exercise?" },
  { key: "dizzy", text: "Have you lost balance because of dizziness or lost consciousness in the last 12 months?" },
  { key: "chronic", text: "Have you been diagnosed with another chronic condition (other than heart disease or high blood pressure)?" },
  { key: "meds", text: "Are you currently taking prescribed medication for a chronic condition?" },
  { key: "joint", text: "Do you have a bone, joint or soft-tissue problem that could get worse with more activity?" },
  { key: "supervised", text: "Has a doctor ever said you should only do medically supervised physical activity?" },
];

export function parqFlagged(intake: Intake): boolean {
  return Object.values(intake.parq ?? {}).some(Boolean);
}

export function programBlocked(intake: Intake): string | null {
  if (intake.pregnancy === "pregnant")
    return "You are pregnant. Training is usually encouraged in pregnancy, but it should be planned with your doctor or a pre/postnatal specialist. Talk to the coach for general guidance.";
  if (intake.pregnancy === "postpartum_lt12w")
    return "You are less than 12 weeks postpartum. Please get clearance (ideally a pelvic-floor physiotherapy check) before structured training. The coach can guide gentle walking and breathing work meanwhile.";
  return null;
}

const DOMAIN_OF: Record<TestScore["key"], Domain> = {
  restingHr: "cardio", stepTest: "cardio", rockport: "cardio",
  pushups: "upper", deadHang: "upper",
  squat60: "lower", plank: "core", sitReach: "mobility", balance: "balance", waist: "bodyComp",
};

const ACTIVITY_FACTOR = { sedentary: 1.3, light: 1.45, active: 1.6 } as const;

export function analyseDiet(intake: Intake): DietAnalysis {
  const { weightKg: w, heightCm: h, age, sex } = intake;
  const bmr = Math.round(10 * w + 6.25 * h - 5 * age + (sex === "male" ? 5 : -161));
  const trainingBump = Math.min(intake.daysPerWeek, 6) * 0.025;
  const stepBump = { lt3k: 0, "3to6k": 0.05, "6to9k": 0.1, gt9k: 0.15 }[intake.dailySteps] ?? 0;
  const tdee = Math.round(bmr * (ACTIVITY_FACTOR[intake.jobActivity] + trainingBump + stepBump));
  let calorieRange: [number, number];
  if (intake.primaryGoal === "fat_loss") calorieRange = [Math.max(bmr, Math.round(tdee * 0.8)), Math.round(tdee * 0.88)];
  else if (intake.primaryGoal === "muscle" || intake.primaryGoal === "strength") calorieRange = [tdee, Math.round(tdee * 1.08)];
  else calorieRange = [Math.round(tdee * 0.95), Math.round(tdee * 1.05)];

  const bmi = w / (h / 100) ** 2;
  // For BMI ≥ 30 base protein on a reference weight (BMI 25) to avoid overestimation.
  const refW = bmi >= 30 ? 25 * (h / 100) ** 2 : w;
  const perKg = ["fat_loss", "muscle", "strength"].includes(intake.primaryGoal) ? 1.6 : 1.2;
  const proteinTarget = Math.round(refW * perKg);
  const proteinEstimate = Math.round(intake.proteinPalms * 22);
  const waterTarget = Math.round(w * 0.035 * 10) / 10;

  const priorities: { weight: number; text: string }[] = [];
  let score = 100;
  const proteinGap = proteinTarget - proteinEstimate;
  if (proteinGap > 10) {
    score -= Math.min(30, proteinGap / 2);
    priorities.push({ weight: proteinGap, text: `Protein: you're around ${proteinEstimate} g/day vs a target of ~${proteinTarget} g. Add 1 palm-sized protein portion to ${Math.min(3, Math.ceil(proteinGap / 22))} meal(s).` });
  }
  const produce = intake.vegServings + intake.fruitServings;
  if (produce < 5) {
    score -= (5 - produce) * 4;
    priorities.push({ weight: (5 - produce) * 8, text: `Fruit & veg: ${produce} servings/day. Aim for 5+ (fibre, micronutrients, fullness). Easiest win: a vegetable side at lunch and dinner.` });
  }
  if (intake.waterLiters < waterTarget - 0.5) {
    score -= 8;
    priorities.push({ weight: 15, text: `Hydration: ~${intake.waterLiters} L/day vs ~${waterTarget} L. Keep a bottle visible; add 500 ml around workouts.` });
  }
  if (intake.sugaryDrinksPerWeek > 3) {
    score -= Math.min(15, intake.sugaryDrinksPerWeek * 2);
    priorities.push({ weight: intake.sugaryDrinksPerWeek * 4, text: `Sugary drinks: ${intake.sugaryDrinksPerWeek}/week. Swap half for sparkling water, buttermilk (chaas) or unsweetened tea.` });
  }
  if (intake.friedOrPackagedPerWeek > 4) {
    score -= Math.min(15, intake.friedOrPackagedPerWeek * 1.5);
    priorities.push({ weight: intake.friedOrPackagedPerWeek * 3, text: `Fried/packaged foods: ${intake.friedOrPackagedPerWeek}×/week. Plan 2-3 fewer by keeping protein snacks ready (roasted chana, curd, fruit).` });
  }
  if (intake.alcoholPerWeek > 7) {
    score -= 10;
    priorities.push({ weight: 25, text: `Alcohol: ${intake.alcoholPerWeek} drinks/week impairs recovery and sleep. Aim for ≤ 3–4.` });
  }
  if (intake.sleepHours < 7) {
    score -= 10;
    priorities.push({ weight: 30, text: `Sleep: ~${intake.sleepHours} h. 7–9 h improves appetite control, recovery and strength gains. Fixed wake time + no screens 30 min before bed.` });
  }
  if (intake.lateEating) {
    score -= 4;
    priorities.push({ weight: 6, text: "Late dinners: finishing your last meal 2–3 h before bed tends to improve sleep quality." });
  }

  const ideas: Record<string, string[]> = {
    vegetarian: ["Greek yogurt / hung curd (10 g per 100 g)", "Paneer (18 g per 100 g)", "Soya chunks (≈50 g per 100 g dry)", "Dal + besan chilla", "Tofu", "Whey or plant protein shake"],
    eggetarian: ["Eggs (6 g each)", "Paneer", "Greek yogurt", "Soya chunks", "Whey protein"],
    vegan: ["Tofu / tempeh", "Soya chunks", "Lentils & chickpeas", "Pea/soy protein powder", "Peanuts & seeds"],
    pescatarian: ["Fish (20 g per 100 g)", "Eggs", "Greek yogurt", "Paneer", "Lentils"],
    non_vegetarian: ["Chicken breast (31 g per 100 g)", "Eggs", "Fish", "Greek yogurt", "Paneer", "Whey protein"],
  };

  return {
    bmr, tdee, calorieRange, proteinTarget, proteinEstimate, waterTarget,
    score: Math.max(0, Math.round(score)),
    priorities: priorities.sort((a, b) => b.weight - a.weight).slice(0, 3).map((p) => p.text),
    proteinIdeas: ideas[intake.dietPattern] ?? ideas.vegetarian,
  };
}

export function analyse(intake: Intake, results: TestResults): Analysis {
  const { scores, vo2max, whtr, flags, correctives } = scoreTests(results, intake);
  const buckets: Partial<Record<Domain, number[]>> = {};
  for (const s of scores) (buckets[DOMAIN_OF[s.key]] ??= []).push(s.score);
  // within cardio, a real test (step/rockport) outweighs resting HR
  const domains: Partial<Record<Domain, number>> = {};
  for (const [d, arr] of Object.entries(buckets) as [Domain, number[]][]) {
    domains[d] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
  }
  const fitnessDomains = (["cardio", "upper", "lower", "core", "mobility", "balance"] as Domain[])
    .map((d) => domains[d]).filter((x): x is number => x !== undefined);
  const overall = fitnessDomains.length
    ? Math.round((fitnessDomains.reduce((a, b) => a + b, 0) / fitnessDomains.length) * 10) / 10
    : 2.5;

  let level: Analysis["level"] = "beginner";
  if (intake.trainingAge >= 2 && overall >= 2.5) level = "intermediate";
  if (intake.trainingAge === 3 && overall >= 4) level = "advanced";

  if (parqFlagged(intake)) flags.unshift("You answered yes to a health-screening question. Get medical clearance before vigorous training; your plan starts conservatively.");
  if (intake.painAreas.length) flags.push(`Pain reported in: ${intake.painAreas.join(", ")}. Exercises should stay pain-free (≤3/10). Tell the coach if anything hurts.`);

  const bmi = Math.round((intake.weightKg / (intake.heightCm / 100) ** 2) * 10) / 10;
  const diet = analyseDiet(intake);

  const summary: string[] = [];
  const named: Record<Domain, string> = { cardio: "Cardio fitness", upper: "Upper-body strength", lower: "Lower-body strength", core: "Core endurance", mobility: "Flexibility", balance: "Balance", bodyComp: "Body composition" };
  const sorted = Object.entries(domains).sort((a, b) => b[1] - a[1]) as [Domain, number][];
  if (sorted.length) {
    summary.push(`Strongest area: ${named[sorted[0][0]]} (${sorted[0][1]}/5).`);
    const weakest = sorted[sorted.length - 1];
    summary.push(`Biggest opportunity: ${named[weakest[0]]} (${weakest[1]}/5). Your plan puts extra emphasis here.`);
  }
  summary.push(`Overall fitness ${overall}/5 → starting as ${level}.`);
  if (vo2max) summary.push(`Estimated VO2max ${vo2max} ml/kg/min. This is one of the strongest predictors of long-term health, and it is very trainable.`);

  return { testScores: scores, domains, overall, level, vo2max, bmi, whtr, flags, correctives, diet, summary };
}
