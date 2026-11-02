"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, cx, LinkButton, Notice, Spinner } from "@/components/ui";
import { getLatestAssessment, getLatestIntake, type AssessmentRow } from "@/lib/data";
import { adherence, currentWeek, nextSession, toISODate, addDays } from "@/lib/science/schedule";
import type { Intake } from "@/lib/science/types";
import { useProgram } from "@/lib/useProgram";

const DAY = ["S", "M", "T", "W", "T", "F", "S"];

export default function Home() {
  const { loading, program, sched } = useProgram();
  const [intake, setIntake] = useState<Intake | null | undefined>();
  const [assess, setAssess] = useState<AssessmentRow | null>(null);
  const [justDone, setJustDone] = useState(false);

  useEffect(() => {
    Promise.all([getLatestIntake(), getLatestAssessment()]).then(([i, a]) => { setIntake(i); setAssess(a); });
    setJustDone(new URLSearchParams(window.location.search).has("done"));
  }, []);

  if (loading || intake === undefined) return <Spinner />;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const steps = [
    { done: !!intake, label: "Answer the coach's questionnaire", href: "/onboarding" },
    { done: !!assess, label: "Do your fitness tests", href: "/assessment" },
    { done: !!program, label: "Review your report & build your plan", href: "/report" },
  ];
  const setupDone = steps.every((s) => s.done);
  const next = nextSession(sched);
  const adh = adherence(sched, 14);
  const cw = currentWeek(sched);
  const today = new Date();
  const daysSinceTest = assess ? Math.floor((today.getTime() - new Date(assess.created_at).getTime()) / 86400000) : 0;

  // this-week strip (today-3 … today+3)
  const strip = Array.from({ length: 7 }, (_, i) => addDays(today, i - 3));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted">{today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-2xl font-bold">{greet}{intake?.name ? `, ${intake.name.split(" ")[0]}` : ""}</h1>
      </header>

      {justDone && <Notice tone="good">Workout logged. Great work! 💪 Consistency beats perfection.</Notice>}

      {!setupDone && (
        <Card>
          <h2 className="mb-1 font-semibold">Let&apos;s get you set up</h2>
          <p className="mb-3 text-sm text-muted">Three steps and your coach builds a plan from your real numbers.</p>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <Link key={i} href={s.href} className={cx("flex items-center gap-3 rounded-xl border p-3", s.done ? "border-transparent bg-good-soft" : "border-line hover:border-accent")}>
                <span className={cx("grid h-7 w-7 place-items-center rounded-full text-sm font-bold", s.done ? "bg-good text-white" : "bg-surface-2")}>{s.done ? "✓" : i + 1}</span>
                <span className={cx("text-sm font-medium", s.done && "text-good")}>{s.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {program && (<>
        <div className="grid grid-cols-7 gap-1.5">
          {strip.map((d) => {
            const iso = toISODate(d);
            const s = sched.find((x) => x.date === iso);
            const isToday = iso === toISODate(today);
            return (
              <div key={iso} className={cx("rounded-xl py-2 text-center", isToday ? "bg-accent text-accent-ink" : "bg-surface")}>
                <div className="text-[11px] opacity-70">{DAY[d.getDay()]}</div>
                <div className="text-sm font-bold">{d.getDate()}</div>
                <div className="mt-1 flex h-2 justify-center">
                  {s && <span className={cx("h-2 w-2 rounded-full", s.status === "done" || s.status === "partial" ? "bg-good" : s.status === "missed" ? "bg-warn" : s.status === "skipped" ? "bg-muted" : isToday ? "bg-accent-ink" : "bg-accent")} />}
                </div>
              </div>
            );
          })}
        </div>

        {next ? (
          <div className="rounded-2xl bg-ink p-4 text-bg">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{next.status === "today" ? "Today's workout" : `Next · ${new Date(next.date + "T00:00").toLocaleDateString(undefined, { weekday: "long" })}`}</div>
            <div className="mt-1 text-xl font-bold">{next.title}</div>
            <div className="text-sm opacity-80">{next.focus} · ~{next.estMinutes} min · Week {next.week}{next.week === 4 ? " (deload)" : ""}</div>
            <ul className="mt-3 space-y-0.5 text-sm opacity-90">{next.main.slice(0, 4).map((m) => <li key={m.exerciseId}>{m.name} · {m.sets}×{m.reps}</li>)}</ul>
            <Link href={`/workout/${next.key}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 font-semibold text-accent-ink">Start workout</Link>
          </div>
        ) : cw > 4 ? (
          <Notice tone="accent">Your 4-week block is complete! Retest to measure progress and get your next block. <Link className="font-semibold underline" href="/assessment">Retest</Link></Notice>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center"><div className="text-2xl font-bold">{adh.done}</div><div className="text-[11px] text-muted">done (14 d)</div></Card>
          <Card className="p-3 text-center"><div className="text-2xl font-bold">{adh.rate}%</div><div className="text-[11px] text-muted">consistency</div></Card>
          <Card className="p-3 text-center"><div className="text-2xl font-bold">{Math.min(cw, 4)}/4</div><div className="text-[11px] text-muted">week of block</div></Card>
        </div>

        {adh.missed >= 2 && <Notice>You&apos;ve missed {adh.missed} sessions recently. No stress. <Link href="/coach" className="font-semibold underline">Talk to your coach</Link> and we&apos;ll adjust the plan to fit your life.</Notice>}
        {daysSinceTest >= 42 && <Notice tone="accent">It&apos;s been {daysSinceTest} days since your last fitness test. Time to retest and see your progress! <Link href="/assessment" className="font-semibold underline">Retest</Link></Notice>}
        <Card>
          <div className="text-sm font-semibold">Cardio this week</div>
          <p className="text-sm text-muted">{program.plan.cardio.sessionsPerWeek} × {program.plan.cardio.minutes} min {program.plan.cardio.type.toLowerCase()} · {program.plan.cardio.stepGoal.toLocaleString()} steps/day</p>
        </Card>
      </>)}

      <LinkButton href="/coach" variant="soft" full>💬 Check in with Coach Maya</LinkButton>
    </div>
  );
}
