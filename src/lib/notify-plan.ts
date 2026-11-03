// Decides which notification (if any) to send right now. Pure: no I/O, so it's easy to test.
import { fill, pendingLater, type Answers } from "./onboarding";
import type { NotifyPrefs } from "./push";
import { adherence, nextSession, schedule, type LogRow } from "./science/schedule";
import type { Program } from "./science/types";

export type Kind = "workout" | "question" | "missed" | "recap";
export type SentLog = { kind: Kind; day: string }; // day = her local YYYY-MM-DD
export type Decision = { kind: Kind; day: string; title: string; body: string; url: string; tag: string } | null;

/** Her local wall-clock time as a Date whose local fields match (server runs in UTC). */
export function localNow(tz: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now).map((p) => [p.type, p.value]));
  const d = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return { date: d, day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: d.getDay() };
}

const mins = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function decide(input: {
  prefs: NotifyPrefs; program: { plan: Program; start_date: string } | null; logs: LogRow[]; answers: Answers;
  sent: SentLog[]; now?: Date; name?: string;
}): Decision {
  const { prefs, program, logs, answers, sent } = input;
  const t = localNow(prefs.tz || "Asia/Kolkata", input.now);
  const q0 = mins(prefs.quietStart), q1 = mins(prefs.quietEnd);
  const quiet = q0 > q1 ? t.minutes >= q0 || t.minutes < q1 : t.minutes >= q0 && t.minutes < q1;
  if (quiet || t.minutes < mins(prefs.reminderTime)) return null;
  const sentToday = (k: Kind) => sent.some((s) => s.kind === k && s.day === t.day);
  const lastSent = (k: Kind) => sent.filter((s) => s.kind === k).map((s) => s.day).sort().pop();
  const anyToday = sent.some((s) => s.day === t.day);
  const name = input.name ? `, ${input.name}` : "";

  if (program) {
    const sched = schedule(program.plan, program.start_date, logs, t.date);
    const today = sched.find((s) => s.status === "today");
    // 1. Workout day
    if (prefs.types.workout && today && !sentToday("workout")) {
      return { kind: "workout", day: t.day, tag: "workout", url: `/workout/${today.key}`,
        title: `${today.title} is ready 💪`, body: `${today.focus} · about ${today.estMinutes} min. Tap to start${name}.` };
    }
    // 2. Missed sessions (at most every 5 days)
    const adh = adherence(sched, 14, t.date);
    const lm = lastSent("missed");
    if (prefs.types.missed && adh.missed >= 2 && !anyToday && (!lm || daysBetween(lm, t.day) >= 5)) {
      return { kind: "missed", day: t.day, tag: "missed", url: "/home?coach=missed",
        title: "Life got busy? No stress", body: `You've missed ${adh.missed} sessions lately. Want me to adjust your week to fit?` };
    }
    // 3. Weekly recap on Sunday
    if (prefs.types.recap && t.weekday === 0 && !sentToday("recap") && !anyToday) {
      const week = adherence(sched, 7, t.date);
      const nxt = nextSession(sched);
      return { kind: "recap", day: t.day, tag: "recap", url: "/program",
        title: "Your week in review",
        body: week.done === 0
          ? `A quiet week, and that's okay. Fresh start tomorrow${nxt ? ` with ${nxt.title}` : ""}. Want me to lighten the plan?`
          : `${week.done} of ${week.due} sessions done this week.${nxt ? ` Next up: ${nxt.title}.` : ""} ${week.done >= week.due ? "Perfect week! 🎉" : "Nice work, keep it rolling!"}` };
    }
  }
  // 4. One pending question, every 2 days, not on a day that already got a notification
  const pending = pendingLater(answers);
  const lq = lastSent("question");
  if (prefs.types.questions && pending.length && !anyToday && (!lq || daysBetween(lq, t.day) >= 2)) {
    const q = pending[0];
    const text = fill(q.coach, answers);
    return { kind: "question", day: t.day, tag: "question", url: `/ask?q=${q.id}`,
      title: "Maya has a quick question", body: text.length > 120 ? text.slice(0, 117) + "…" : text };
  }
  return null;
}
