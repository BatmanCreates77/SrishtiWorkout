import type { Program, Session } from "./types";

export type LogRow = {
  id?: string;
  session_key: string;
  status: "done" | "skipped" | "partial";
  performed_at: string;
  session_rpe?: number | null;
  notes?: string | null;
  entries?: unknown;
};

export type ScheduledSession = Session & { date: string; status: "done" | "skipped" | "partial" | "missed" | "today" | "upcoming" };

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Rolling weeks anchored at the program start date. */
export function schedule(program: Program, startDate: string, logs: LogRow[], today = new Date()): ScheduledSession[] {
  const start = parseISODate(startDate);
  const startDow = start.getDay();
  const todayIso = toISODate(today);
  const byKey = new Map(logs.map((l) => [l.session_key, l]));
  const out: ScheduledSession[] = [];
  // Session i of each week goes to the i-th training weekday counted from the start date,
  // so week 1 always begins with day 1 regardless of which weekday the plan starts on.
  const weekdays = program.weeks[0]?.map((s) => s.weekday) ?? [];
  const offsets = weekdays.map((d) => (d - startDow + 7) % 7).sort((a, b) => a - b);
  for (const week of program.weeks) {
    for (const s of week) {
      const offset = (offsets[s.dayIndex] ?? 0) + (s.week - 1) * 7;
      const date = toISODate(addDays(start, offset));
      const log = byKey.get(s.key);
      let status: ScheduledSession["status"];
      if (log) status = log.status;
      else if (date < todayIso) status = "missed";
      else if (date === todayIso) status = "today";
      else status = "upcoming";
      out.push({ ...s, date, status });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.dayIndex - b.dayIndex);
}

export function adherence(sched: ScheduledSession[], days = 14, today = new Date()) {
  const from = toISODate(addDays(today, -days));
  const todayIso = toISODate(today);
  const window = sched.filter((s) => s.date >= from && s.date <= todayIso);
  const due = window.filter((s) => s.status !== "today" && s.status !== "upcoming");
  const done = due.filter((s) => s.status === "done" || s.status === "partial").length;
  const skipped = due.filter((s) => s.status === "skipped").length;
  const missed = due.filter((s) => s.status === "missed").length;
  return { due: due.length, done, skipped, missed, rate: due.length ? Math.round((done / due.length) * 100) : 100 };
}

export function currentWeek(sched: ScheduledSession[], today = new Date()) {
  const t = toISODate(today);
  const next = sched.find((s) => s.date >= t);
  return next ? next.week : 5; // 5 = block finished
}

export function nextSession(sched: ScheduledSession[]) {
  return sched.find((s) => s.status === "today") ?? sched.find((s) => s.status === "upcoming");
}

export function daysSinceLastWorkout(logs: LogRow[], today = new Date()) {
  const done = logs.filter((l) => l.status !== "skipped").map((l) => l.performed_at).sort();
  if (!done.length) return null;
  const last = new Date(done[done.length - 1]);
  return Math.floor((today.getTime() - last.getTime()) / 86400000);
}
