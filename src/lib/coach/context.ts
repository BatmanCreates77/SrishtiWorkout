import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adherence, currentWeek, daysSinceLastWorkout, nextSession, schedule, toISODate, type LogRow } from "@/lib/science/schedule";
import type { Analysis, Intake, LogEntry, Program } from "@/lib/science/types";

export type CoachState = {
  userId: string;
  intake: Intake | null;
  analysis: Analysis | null;
  program: { id: string; plan: Program; start_date: string } | null;
  programLogs: LogRow[];
  recentLogs: (LogRow & { program_id: string })[];
};

export async function loadState(sb: SupabaseClient, userId: string): Promise<CoachState> {
  const since = new Date(Date.now() - 28 * 86400000).toISOString();
  const [i, a, p, r] = await Promise.all([
    sb.from("intakes").select("data").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("assessments").select("analysis").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("programs").select("id, plan, start_date").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("workout_logs").select("program_id, session_key, status, performed_at, session_rpe, notes, entries").gte("performed_at", since).order("performed_at", { ascending: false }),
  ]);
  const program = (p.data as CoachState["program"]) ?? null;
  const recentLogs = (r.data as CoachState["recentLogs"]) ?? [];
  return {
    userId,
    intake: (i.data?.data as Intake) ?? null,
    analysis: (a.data?.analysis as Analysis) ?? null,
    program,
    programLogs: program ? recentLogs.filter((l) => l.program_id === program.id) : [],
    recentLogs,
  };
}

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function adherenceFacts(s: CoachState) {
  if (!s.program) return null;
  const sched = schedule(s.program.plan, s.program.start_date, s.programLogs);
  const adh = adherence(sched, 14);
  const week = currentWeek(sched);
  const next = nextSession(sched);
  const sinceLast = daysSinceLastWorkout(s.recentLogs);
  const lastRpes = s.recentLogs.filter((l) => l.session_rpe).slice(0, 3).map((l) => l.session_rpe);
  return { sched, adh, week, next, sinceLast, lastRpes };
}

export function buildContext(s: CoachState): string {
  const now = new Date();
  const lines: string[] = [`TODAY: ${toISODate(now)} (${DAY[now.getDay()]})`];
  const it = s.intake;
  if (!it) {
    lines.push("STATUS: The user has NOT completed the intake questionnaire yet. Encourage her to start it (Profile → Questionnaire).");
    return lines.join("\n");
  }
  lines.push(
    `PROFILE: ${it.name}, ${it.age}y, ${it.sex}, ${it.heightCm} cm, ${it.weightKg} kg${it.waistCm ? `, waist ${it.waistCm} cm` : ""}.`,
    `GOALS: primary=${it.primaryGoal}${it.secondaryGoal ? `, secondary=${it.secondaryGoal}` : ""}. Note: ${it.goalNote || "-"}`,
    `TRAINING: training age ${["none", "<6 months", "6-24 months", ">2 years"][it.trainingAge]}, currently ${it.currentDaysPerWeek} days/wk (${it.currentActivities.join(", ") || "none"}), steps ${it.dailySteps}, job ${it.jobActivity}.`,
    `SCHEDULE: ${it.daysPerWeek} days/wk on ${it.preferredDays.map((d) => DAY[d]).join("/") || "flexible days"}, ${it.sessionMinutes} min, location ${it.location}. Equipment: ${["bodyweight", ...it.equipment].join(", ")}.`,
    `HEALTH: PAR-Q flags: ${Object.entries(it.parq).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}. Pregnancy: ${it.pregnancy}. Injuries: ${it.injuries || "none"}. Pain areas: ${it.painAreas.join(", ") || "none"}.`,
    `LIFESTYLE: sleep ${it.sleepHours} h (quality ${it.sleepQuality}/5), stress ${it.stress}/5, energy ${it.energy}/5.`,
    `DIET: ${it.dietPattern}, ${it.mealsPerDay} meals, ~${it.proteinPalms} palm protein portions/day, veg ${it.vegServings}, fruit ${it.fruitServings}, water ${it.waterLiters} L, sugary drinks ${it.sugaryDrinksPerWeek}/wk, alcohol ${it.alcoholPerWeek}/wk, fried/packaged ${it.friedOrPackagedPerWeek}/wk.`,
  );
  const an = s.analysis;
  if (!an) lines.push("ASSESSMENT: not done yet. Encourage her to do the fitness tests.");
  else {
    lines.push(
      `ASSESSMENT: level ${an.level}, overall ${an.overall}/5. Domains: ${Object.entries(an.domains).map(([k, v]) => `${k} ${v}`).join(", ")}.`,
      `TEST RESULTS: ${an.testScores.map((t) => `${t.label} ${t.value} (${t.score}/5)`).join("; ")}.`,
      an.vo2max ? `VO2max est: ${an.vo2max}` : "",
      `FLAGS: ${an.flags.join(" | ") || "none"}`,
      `CORRECTIVES: ${an.correctives.join(" | ") || "none"}`,
      `NUTRITION TARGETS: ~${an.diet.calorieRange[0]}-${an.diet.calorieRange[1]} kcal, protein ~${an.diet.proteinTarget} g (current est ${an.diet.proteinEstimate} g), water ${an.diet.waterTarget} L. Priorities: ${an.diet.priorities.join(" | ")}`,
    );
  }
  const f = adherenceFacts(s);
  if (!s.program || !f) lines.push("PROGRAM: none active yet.");
  else {
    const plan = s.program.plan;
    lines.push(
      `PROGRAM: ${plan.split}, ${plan.createdFor.daysPerWeek} days/wk, started ${s.program.start_date}, intensity offset ${plan.intensityOffset}. Current week ${f.week > 4 ? "block finished (offer retest or next block)" : `${f.week} of 4${f.week === 4 ? " (deload)" : ""}`}.`,
      `CARDIO: ${plan.cardio.sessionsPerWeek}×${plan.cardio.minutes} min ${plan.cardio.type}; step goal ${plan.cardio.stepGoal}.`,
      `ADHERENCE (14 days): ${f.adh.done}/${f.adh.due} done, ${f.adh.skipped} skipped, ${f.adh.missed} missed (${f.adh.rate}%). Days since last workout: ${f.sinceLast ?? "never trained in app"}.`,
      f.next ? `NEXT SESSION: ${f.next.title} on ${f.next.date} (${f.next.main.map((m) => `${m.name} ${m.sets}×${m.reps}`).join(", ")}).` : "NEXT SESSION: none scheduled.",
    );
    const recent = s.recentLogs.slice(0, 6).map((l) => {
      const entries = (l.entries as LogEntry[] | undefined) ?? [];
      const skippedEx = entries.filter((e) => e.skipped).length;
      return `${l.performed_at.slice(0, 10)} ${l.session_key} ${l.status}${l.session_rpe ? ` RPE ${l.session_rpe}` : ""}${skippedEx ? `, skipped ${skippedEx} exercises` : ""}${l.notes ? `, note: "${l.notes}"` : ""}`;
    });
    lines.push(`RECENT LOGS: ${recent.join(" | ") || "none"}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function checkinFacts(s: CoachState): string {
  const f = adherenceFacts(s);
  if (!s.intake) return "User opened the coach. No questionnaire yet.";
  if (!s.analysis) return "User opened the coach. Questionnaire done, fitness tests not done yet.";
  if (!f) return "User opened the coach. Assessment done but no program activated yet.";
  const bits = [`Adherence last 14 days: ${f.adh.done}/${f.adh.due} done, ${f.adh.missed} missed, ${f.adh.skipped} skipped.`];
  if (f.sinceLast !== null) bits.push(`Days since last workout: ${f.sinceLast}.`);
  if (f.lastRpes.length) bits.push(`Recent session RPEs: ${f.lastRpes.join(", ")}.`);
  if (f.next) bits.push(`Next: ${f.next.title} on ${f.next.date}.`);
  if (f.week > 4) bits.push("The 4-week block is complete.");
  return bits.join(" ");
}
