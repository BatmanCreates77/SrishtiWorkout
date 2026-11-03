"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCoach } from "@/components/AppShell";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { cx, Notice, Spinner } from "@/components/ui";
import { listProgramHistory, undoProgram, type ProgramRow } from "@/lib/data";
import { currentWeek } from "@/lib/science/schedule";
import { useProgram } from "@/lib/useProgram";

const STATUS: Record<string, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-good-soft text-good" },
  partial: { label: "Partly done", cls: "bg-good-soft text-good" },
  skipped: { label: "Skipped", cls: "bg-surface-2 text-muted" },
  missed: { label: "Missed", cls: "bg-warn-soft text-warn" },
  today: { label: "Today", cls: "bg-accent text-accent-ink" },
  upcoming: { label: "", cls: "" },
};

export default function PlanPage() {
  const { loading, program, sched } = useProgram();
  const coach = useCoach();
  const [week, setWeek] = useState<number | null>(null);
  const [history, setHistory] = useState<ProgramRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { listProgramHistory(6).then(setHistory); }, [program?.id]);
  if (loading) return <Spinner />;
  if (!program) return <Notice tone="accent">No active plan. Tap Coach and Maya will set one up with you.</Notice>;

  const plan = program.plan;
  const cw = currentWeek(sched);
  const w = week ?? Math.min(4, cw);
  const sessions = sched.filter((s) => s.week === w);
  const changes = history.filter((h) => h.changes?.lines?.length);

  async function undo() {
    setBusy(true);
    if (await undoProgram(program!)) coach.bumpPlan();
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-bold leading-tight">Your plan</h1>
        <p className="text-sm text-muted">{plan.split} · {plan.createdFor.daysPerWeek} days · ~{plan.createdFor.sessionMinutes} min · <span className="capitalize">{plan.createdFor.level}</span></p>
      </header>

      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" onClick={() => setWeek(n)}
            className={cx("min-h-14 rounded-2xl border text-sm font-semibold", n === w ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface")}>
            Week {n}
            <span className="block text-[10px] font-medium opacity-80">{n === 4 ? "deload" : n === cw ? "now" : n < cw ? "past" : ""}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sessions.map((s) => (
          <Link key={s.key} href={`/workout/${s.key}`} className="block rounded-3xl border border-line bg-surface p-4 active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted">{new Date(s.date + "T00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</div>
                <div className="text-lg font-bold">{s.title}</div>
                <div className="text-sm text-muted">{s.focus} · ~{s.estMinutes} min</div>
              </div>
              {STATUS[s.status].label && <span className={cx("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS[s.status].cls)}>{STATUS[s.status].label}</span>}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {s.main.map((m) => (
                <div key={m.exerciseId} className="w-20 shrink-0">
                  <ExerciseMedia id={m.exerciseId} alt={m.name} size="md" className="!aspect-square !rounded-xl" />
                  <div className="mt-1 line-clamp-2 text-[11px] leading-tight">{m.name}</div>
                  <div className="text-[11px] text-muted">{m.sets}×{m.reps}</div>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-3xl bg-surface p-4">
        <div className="mb-2 font-semibold">Adjust with Maya</div>
        <div className="flex flex-wrap gap-2">
          {["Make this week easier", "Push me harder", "Change my training days", "Shorter sessions this week", "I got new equipment"].map((s) => (
            <button key={s} type="button" onClick={() => coach.open(s)} className="min-h-10 rounded-full border border-line px-3.5 text-sm">{s}</button>
          ))}
        </div>
      </div>

      {plan.why?.length ? (
        <div className="rounded-3xl bg-surface-2 p-4">
          <div className="mb-2 font-semibold">Why this plan fits you</div>
          <ul className="space-y-1.5 text-sm">{plan.why.map((x) => <li key={x} className="flex gap-2"><span className="text-accent">✓</span><span>{x}</span></li>)}</ul>
        </div>
      ) : null}

      {changes.length > 0 && (
        <div className="rounded-3xl bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">Recent changes</div>
            {program.parent_id && <button type="button" onClick={undo} disabled={busy} className="min-h-9 text-sm font-semibold text-accent underline">Undo latest</button>}
          </div>
          <ul className="space-y-2 text-sm">
            {changes.map((h) => (
              <li key={h.id} className={cx("rounded-xl p-2", h.status === "active" ? "bg-accent-soft" : "")}>
                <div className="text-xs text-muted">{new Date(h.created_at).toLocaleDateString()} · {h.reason?.replace(/^coach:/, "Coach: ").replace(/_/g, " ")}</div>
                {h.changes!.lines.map((l) => <div key={l}>{l}</div>)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-3xl bg-surface p-4">
        <div className="font-semibold">Cardio & daily movement</div>
        <p className="mt-1 text-sm"><b>{plan.cardio.sessionsPerWeek} × {plan.cardio.minutes} min</b> {plan.cardio.type}</p>
        <p className="text-sm text-muted">{plan.cardio.detail}</p>
      </div>
    </div>
  );
}
