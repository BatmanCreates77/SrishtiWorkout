"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCoach } from "@/components/AppShell";
import { CoachBubble } from "@/components/CoachBubble";
import { PendingQuestionCard } from "@/components/PendingQuestionCard";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { cx, Spinner } from "@/components/ui";
import { getLatestIntake } from "@/lib/data";
import { addDays, adherence, currentWeek, nextSession, toISODate } from "@/lib/science/schedule";
import { useProgram } from "@/lib/useProgram";

const DAY = ["S", "M", "T", "W", "T", "F", "S"];

export default function Today() {
  const { loading, program, sched } = useProgram();
  const coach = useCoach();
  const [name, setName] = useState("");
  const [flag, setFlag] = useState<"welcome" | "done" | null>(null);

  useEffect(() => {
    getLatestIntake().then((i) => setName(i?.name?.split(" ")[0] ?? ""));
    const q = new URLSearchParams(window.location.search);
    setFlag(q.has("welcome") ? "welcome" : q.has("done") ? "done" : null);
    if (q.get("coach") === "missed") coach.open("I missed a few workouts");
    // run once on open (deep link from a notification)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Spinner />;
  const today = new Date();
  const todayIso = toISODate(today);
  const hour = today.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  if (!program) {
    return (
      <div className="space-y-4 pt-4">
        <h1 className="text-2xl font-bold">{greet}{name ? `, ${name}` : ""}</h1>
        <CoachBubble>You don&apos;t have an active plan right now. Tap <b>Coach</b> and I&apos;ll set one up with you.</CoachBubble>
      </div>
    );
  }

  const next = nextSession(sched);
  const isToday = next?.date === todayIso;
  const adh = adherence(sched, 14);
  const cw = currentWeek(sched);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(today, i - 3));

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-[26px] font-bold leading-tight">{greet}{name ? `, ${name}` : ""}</h1>
        </div>
      </header>
      <PendingQuestionCard />

      {flag === "welcome" && <CoachBubble>Your plan is ready! Start whenever you like. I&apos;m one tap away if anything needs changing.</CoachBubble>}
      {flag === "done" && <CoachBubble>Workout logged. Great work! 💪 Consistency beats perfection.</CoachBubble>}

      <div className="grid grid-cols-7 gap-1.5">
        {strip.map((d) => {
          const iso = toISODate(d);
          const s = sched.find((x) => x.date === iso);
          const now = iso === todayIso;
          return (
            <div key={iso} className={cx("rounded-2xl py-2 text-center", now ? "bg-accent text-accent-ink" : "bg-surface")}>
              <div className="text-[11px] opacity-70">{DAY[d.getDay()]}</div>
              <div className="text-base font-bold">{d.getDate()}</div>
              <div className="mt-1 flex h-2 justify-center">
                {s && <span className={cx("h-2 w-2 rounded-full", s.status === "done" || s.status === "partial" ? "bg-good" : s.status === "missed" ? "bg-warn" : s.status === "skipped" ? "bg-muted" : now ? "bg-accent-ink" : "bg-accent")} />}
              </div>
            </div>
          );
        })}
      </div>

      {next ? (
        <div className="overflow-hidden rounded-3xl bg-ink text-bg">
          <div className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {isToday ? "Today's workout" : `Rest day · next on ${new Date(next.date + "T00:00").toLocaleDateString(undefined, { weekday: "long" })}`}
            </div>
            <div className="mt-1 text-2xl font-bold">{next.title}</div>
            <div className="text-sm opacity-80">{next.focus} · ~{next.estMinutes} min · Week {next.week}{next.week === 4 ? " (deload)" : ""}</div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {next.main.slice(0, 4).map((m) => (
                <div key={m.exerciseId} className="min-w-0">
                  <ExerciseMedia id={m.exerciseId} alt={m.name} size="md" className="!aspect-square !rounded-xl" />
                  <div className="mt-1 truncate text-[11px] opacity-80">{m.name}</div>
                </div>
              ))}
            </div>
            <Link href={`/workout/${next.key}`} className="mt-5 flex min-h-13 w-full items-center justify-center rounded-2xl bg-accent px-4 text-base font-semibold text-accent-ink">
              {isToday ? "Start workout" : "Do it today instead"}
            </Link>
          </div>
        </div>
      ) : cw > 4 ? (
        <CoachBubble>
          Block complete! 🎉 Let&apos;s re-check how you move and build your next block.
          <Link href="/me" className="mt-2 block font-semibold text-accent underline">Redo the movement check</Link>
        </CoachBubble>
      ) : null}

      {adh.missed >= 2 && (
        <CoachBubble>
          You&apos;ve missed {adh.missed} sessions lately. No stress, life happens. Want me to adjust the plan?
          <button type="button" onClick={() => coach.open("I missed a few workouts")} className="mt-2 block rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">Talk to Maya</button>
        </CoachBubble>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[[adh.done, "done (14 days)"], [`${adh.rate}%`, "consistency"], [`${Math.min(cw, 4)}/4`, "week of block"]].map(([v, l]) => (
          <div key={String(l)} className="rounded-2xl bg-surface p-3 text-center"><div className="text-2xl font-bold tabular-nums">{v}</div><div className="text-[11px] text-muted">{l}</div></div>
        ))}
      </div>

      <div className="rounded-2xl bg-surface p-4">
        <div className="text-sm font-semibold">Cardio this week</div>
        <p className="text-sm text-muted">{program.plan.cardio.sessionsPerWeek} × {program.plan.cardio.minutes} min {program.plan.cardio.type.toLowerCase()} · {program.plan.cardio.stepGoal.toLocaleString()} steps a day</p>
      </div>
    </div>
  );
}
