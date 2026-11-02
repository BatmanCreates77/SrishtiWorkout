"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, cx, LinkButton, Notice, PageTitle, Spinner } from "@/components/ui";
import { activateProgram, getLatestAssessment, getLatestIntake } from "@/lib/data";
import { adjustProgram, type AdjustAction } from "@/lib/science/adjust";
import { currentWeek } from "@/lib/science/schedule";
import { useProgram } from "@/lib/useProgram";

const STATUS: Record<string, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-good-soft text-good" },
  partial: { label: "Partial", cls: "bg-good-soft text-good" },
  skipped: { label: "Skipped", cls: "bg-surface-2 text-muted" },
  missed: { label: "Missed", cls: "bg-warn-soft text-warn" },
  today: { label: "Today", cls: "bg-accent text-accent-ink" },
  upcoming: { label: "", cls: "" },
};

export default function ProgramPage() {
  const { loading, program, sched, reload } = useProgram();
  const [week, setWeek] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const cw = currentWeek(sched);

  if (loading) return <Spinner />;
  if (!program) return (
    <div><PageTitle title="Your plan" /><Notice tone="accent">No active program yet. Complete the questionnaire and fitness tests, then build your plan from the report.</Notice>
      <div className="mt-4 flex gap-2"><LinkButton href="/onboarding" variant="ghost">Questionnaire</LinkButton><LinkButton href="/assessment" variant="ghost">Fitness tests</LinkButton><LinkButton href="/report">Report</LinkButton></div></div>
  );
  const plan = program.plan;
  const w = week ?? Math.min(4, cw);
  const sessions = sched.filter((s) => s.week === w);

  async function adjust(action: AdjustAction) {
    setBusy(action); setMsg("");
    const [intake, a] = await Promise.all([getLatestIntake(), getLatestAssessment()]);
    if (!intake || !a) { setBusy(""); return; }
    const res = adjustProgram(intake, a.analysis, program!, action);
    await activateProgram(res.plan, res.startDate, `manual:${action}`);
    setMsg(res.summary);
    setWeek(null);
    await reload();
    setBusy("");
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Your plan" sub={`${plan.split} · ${plan.createdFor.sessionMinutes} min · ${plan.createdFor.level} · started ${new Date(program.start_date + "T00:00").toLocaleDateString()}`} />
      {cw > 4 && <Notice tone="accent">Block complete! 🎉 Retest your fitness to see your progress and get your next block. <Link href="/assessment" className="font-semibold underline">Retest now</Link></Notice>}
      {msg && <Notice tone="good">{msg}</Notice>}

      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} onClick={() => setWeek(n)} className={cx("rounded-xl border py-2 text-sm font-semibold", n === w ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface")}>
            Week {n}{n === 4 && <span className="block text-[10px] font-medium opacity-80">deload</span>}{n === cw && n !== 4 && <span className="block text-[10px] font-medium opacity-80">current</span>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sessions.map((s) => (
          <Link key={s.key} href={`/workout/${s.key}`}>
            <Card className="mb-3 transition hover:border-accent">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted">{new Date(s.date + "T00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</div>
                  <div className="text-lg font-semibold">{s.title}</div>
                  <div className="text-sm text-muted">{s.focus} · ~{s.estMinutes} min</div>
                </div>
                {STATUS[s.status].label && <span className={cx("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS[s.status].cls)}>{STATUS[s.status].label}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.main.map((m) => <span key={m.exerciseId} className="rounded-lg bg-surface-2 px-2 py-1 text-xs">{m.name} <span className="text-muted">{m.sets}×{m.reps}</span></span>)}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold">Cardio & daily movement</h2>
        <p className="mt-1 text-sm"><b>{plan.cardio.sessionsPerWeek} × {plan.cardio.minutes} min</b>: {plan.cardio.type}</p>
        <p className="text-sm text-muted">{plan.cardio.detail}</p>
        <p className="mt-2 text-sm">Daily step goal: <b>{plan.cardio.stepGoal.toLocaleString()}</b></p>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">How this plan works</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">{plan.principles.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Adjust</h2>
        <p className="mb-3 text-sm text-muted">Or just tell your coach what is going on and she will suggest the right change.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" disabled={!!busy} onClick={() => adjust("ease_off")}>{busy === "ease_off" ? "…" : "Ease off"}</Button>
          <Button variant="ghost" disabled={!!busy} onClick={() => adjust("push_harder")}>{busy === "push_harder" ? "…" : "Push harder"}</Button>
          <Button variant="ghost" disabled={!!busy} onClick={() => adjust("deload_now")}>{busy === "deload_now" ? "…" : "Deload now"}</Button>
          <Button variant="ghost" disabled={!!busy} onClick={() => adjust("restart_today")}>{busy === "restart_today" ? "…" : "Restart from today"}</Button>
        </div>
      </Card>
    </div>
  );
}
