"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Timer } from "@/components/Timer";
import { Button, Card, cx, inputCls, Notice, Spinner } from "@/components/ui";
import { saveLog } from "@/lib/data";
import { getExercise } from "@/lib/science/program";
import type { LogEntry, Prescription } from "@/lib/science/types";
import { useProgram } from "@/lib/useProgram";

type SetRow = LogEntry["sets"][number];

export default function WorkoutPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const { loading, program, sched, logs } = useProgram();
  const session = sched.find((s) => s.key === key);
  const existing = logs.find((l) => l.session_key === key);
  const [entries, setEntries] = useState<Record<string, LogEntry>>({});
  const [rpe, setRpe] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [rest, setRest] = useState<{ sec: number; id: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const all: Prescription[] = useMemo(() => (session ? [...session.main, ...(session.finisher ?? [])] : []), [session]);

  useEffect(() => {
    if (!session) return;
    const prev = (existing?.entries as LogEntry[] | undefined) ?? [];
    const init: Record<string, LogEntry> = {};
    for (const p of all) {
      const e = prev.find((x) => x.exerciseId === p.exerciseId);
      init[p.exerciseId] = e ?? { exerciseId: p.exerciseId, sets: Array.from({ length: p.sets }, () => ({ done: false })) };
    }
    setEntries(init);
    setRpe(existing?.session_rpe ?? undefined);
    setNotes(existing?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.key, existing?.session_key]);

  // last performance per exercise from earlier logs
  const lastPerf = useMemo(() => {
    const map: Record<string, string> = {};
    const sorted = [...logs].filter((l) => l.session_key !== key).sort((a, b) => a.performed_at.localeCompare(b.performed_at));
    for (const l of sorted) for (const e of (l.entries as LogEntry[]) ?? []) {
      const done = e.sets.filter((s) => s.done);
      if (!done.length) continue;
      const best = done.map((s) => `${s.reps ?? "-"}${s.weightKg ? `×${s.weightKg}kg` : ""}`).join(", ");
      map[e.exerciseId] = best;
    }
    return map;
  }, [logs, key]);

  if (loading) return <Spinner />;
  if (!program || !session) return <div><Notice>Session not found.</Notice><Link className="mt-4 block underline" href="/program">Back to plan</Link></div>;

  const updSet = (id: string, i: number, patch: Partial<SetRow>) =>
    setEntries((p) => ({ ...p, [id]: { ...p[id], sets: p[id].sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) } }));

  const totalSets = all.reduce((n, p) => n + (entries[p.exerciseId]?.skipped ? 0 : p.sets), 0);
  const doneSets = Object.values(entries).reduce((n, e) => n + (e.skipped ? 0 : e.sets.filter((s) => s.done).length), 0);

  async function finish(status: "done" | "skipped") {
    setSaving(true); setErr("");
    try {
      const st = status === "skipped" ? "skipped" : doneSets >= totalSets * 0.8 ? "done" : "partial";
      await saveLog(program!.id, {
        session_key: session!.key, status: st, performed_at: new Date().toISOString(),
        session_rpe: status === "skipped" ? null : rpe ?? null, notes: notes || null, entries: Object.values(entries),
      });
      router.push(status === "skipped" ? "/coach" : "/home?done=1");
    } catch (e) { setErr((e as Error).message); setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/program" className="text-sm text-muted">← Plan</Link>
        <span className="text-sm font-medium tabular-nums text-muted">{doneSets}/{totalSets} sets</span>
      </div>
      <div>
        <div className="text-xs text-muted">Week {session.week}{session.week === 4 ? " · Deload" : ""} · {new Date(session.date + "T00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</div>
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <p className="text-sm text-muted">{session.focus} · ~{session.estMinutes} min</p>
      </div>
      {existing && <Notice tone="good">Logged as <b>{existing.status}</b>. You can edit and save again.</Notice>}

      <Card>
        <h2 className="mb-2 font-semibold">Warm-up (5–8 min)</h2>
        <p className="mb-2 text-sm text-muted">3–5 min easy cardio (marching, skipping, cycling), then:</p>
        <ul className="space-y-1 text-sm">{session.warmup.map((w) => <li key={w.exerciseId}><ExerciseName id={w.exerciseId} name={w.name} /> <span className="text-muted">· {w.reps}</span></li>)}</ul>
        <p className="mt-2 text-xs text-muted">Before your first main lift, do 1–2 lighter ramp-up sets.</p>
      </Card>

      {all.map((p) => {
        const e = entries[p.exerciseId];
        if (!e) return null;
        return (
          <Card key={p.exerciseId} className={cx(e.skipped && "opacity-60")}>
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-accent">{p.pattern === "cardio" ? "Finisher" : p.note ? "Main lift" : "Accessory"}</div>
                <ExerciseName id={p.exerciseId} name={p.name} big />
                <div className="text-sm text-muted">{p.sets} × {p.reps} · RIR {p.rir} · rest {p.restSec}s</div>
                {lastPerf[p.exerciseId] && <div className="text-xs text-muted">Last time: {lastPerf[p.exerciseId]}</div>}
              </div>
              <button className="shrink-0 text-xs text-muted underline" onClick={() => setEntries((x) => ({ ...x, [p.exerciseId]: { ...e, skipped: !e.skipped } }))}>{e.skipped ? "Undo skip" : "Skip"}</button>
            </div>
            {!e.skipped && (
              <div className="mt-3 space-y-2">
                {e.sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-sm font-semibold text-muted">{i + 1}</span>
                    {p.hold ? (
                      <input type="number" inputMode="numeric" placeholder="sec" className={cx(inputCls, "py-2")} value={s.seconds ?? ""} onChange={(ev) => updSet(p.exerciseId, i, { seconds: ev.target.value ? Number(ev.target.value) : undefined })} />
                    ) : (<>
                      <input type="number" inputMode="numeric" placeholder="reps" className={cx(inputCls, "py-2")} value={s.reps ?? ""} onChange={(ev) => updSet(p.exerciseId, i, { reps: ev.target.value ? Number(ev.target.value) : undefined })} />
                      <input type="number" inputMode="decimal" step={0.5} placeholder="kg" className={cx(inputCls, "py-2")} value={s.weightKg ?? ""} onChange={(ev) => updSet(p.exerciseId, i, { weightKg: ev.target.value ? Number(ev.target.value) : undefined })} />
                    </>)}
                    <button
                      onClick={() => { const nd = !s.done; updSet(p.exerciseId, i, { done: nd }); if (nd && p.restSec) setRest({ sec: p.restSec, id: Date.now() }); }}
                      className={cx("grid h-10 w-12 shrink-0 place-items-center rounded-xl border text-lg font-bold", s.done ? "border-good bg-good text-white" : "border-line bg-surface text-muted")}
                      aria-label="Mark set done">✓</button>
                  </div>
                ))}
                {p.note && <p className="text-xs text-muted">{p.note}</p>}
              </div>
            )}
          </Card>
        );
      })}

      <Card>
        <h2 className="mb-2 font-semibold">How hard was today overall?</h2>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setRpe(n)} className={cx("rounded-lg border py-2 text-sm font-semibold", rpe === n ? "border-accent bg-accent text-accent-ink" : "border-line")}>{n}</button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted"><span>Very easy</span><span>Max effort</span></div>
        <textarea className={cx(inputCls, "mt-3")} rows={2} placeholder="Notes for your coach (energy, pain, period symptoms, what felt good)…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Card>

      {err && <Notice>{err}</Notice>}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => finish("skipped")} disabled={saving}>Skip session</Button>
        <Button full onClick={() => finish("done")} disabled={saving}>{saving ? "Saving…" : "Finish workout"}</Button>
      </div>

      {rest && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 shadow-lg" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <span className="text-sm font-semibold">Rest</span>
            <AutoTimer key={rest.id} sec={rest.sec} onDone={() => setRest(null)} />
            <button className="text-sm text-muted underline" onClick={() => setRest(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AutoTimer({ sec, onDone }: { sec: number; onDone: () => void }) {
  return <Timer seconds={sec} compact autoStart onStop={() => setTimeout(onDone, 1500)} />;
}

function ExerciseName({ id, name, big }: { id: string; name: string; big?: boolean }) {
  const [open, setOpen] = useState(false);
  const ex = getExercise(id);
  return (
    <span>
      <button onClick={() => setOpen(!open)} className={cx("text-left font-semibold underline decoration-line decoration-dotted underline-offset-4", big && "text-lg")}>{name}</button>
      {open && ex && (
        <span className="mt-2 block rounded-xl bg-surface-2 p-3 text-sm font-normal">
          <span className="mb-1 block text-xs text-muted">Targets {ex.target}{ex.secondaryMuscles?.length ? ` · ${ex.secondaryMuscles.join(", ")}` : ""}</span>
          <ol className="list-decimal space-y-1 pl-5">{ex.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </span>
      )}
    </span>
  );
}
