"use client";
// Focus workout: one exercise per screen, big demo, sets prefilled from last time, auto rest timer, swap.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCoach } from "@/components/AppShell";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { Timer } from "@/components/Timer";
import { Button, cx, inputCls, Notice, Spinner } from "@/components/ui";
import { activateProgram, getLatestIntake, saveLog } from "@/lib/data";
import { diffPlans, swapInPlan, swapOptions } from "@/lib/science/adjust";
import { getExercise, titleCase } from "@/lib/science/program";
import type { Intake, LogEntry, Prescription } from "@/lib/science/types";
import { useProgram } from "@/lib/useProgram";

type SetRow = LogEntry["sets"][number];

export default function WorkoutPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const coach = useCoach();
  const { loading, program, sched, logs, history, reload } = useProgram();
  const session = sched.find((s) => s.key === key);
  const existing = logs.find((l) => l.session_key === key);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [items, setItems] = useState<Prescription[]>([]);
  const [entries, setEntries] = useState<Record<string, LogEntry>>({});
  const [step, setStep] = useState(0); // 0 = warm-up, 1..n = exercises, n+1 = finish
  const [rest, setRest] = useState<{ sec: number; id: number } | null>(null);
  const [swapFor, setSwapFor] = useState<Prescription | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [rpe, setRpe] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { getLatestIntake().then(setIntake); }, []);
  useEffect(() => {
    if (!session) return;
    const list = [...session.main, ...(session.finisher ?? [])];
    const prev = (existing?.entries as LogEntry[] | undefined) ?? [];
    setItems(list);
    // keep sets already ticked in this session (e.g. after an "Always" swap creates a new plan version)
    setEntries((old) => Object.fromEntries(list.map((p) => [p.exerciseId, old[p.exerciseId] ?? prev.find((e) => e.exerciseId === p.exerciseId) ?? { exerciseId: p.exerciseId, sets: Array.from({ length: p.sets }, () => ({ done: false })) }])));
    setRpe(existing?.session_rpe ?? undefined);
    setNotes(existing?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.key, program?.id]);

  // keep the screen awake while training
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<typeof lock> } }).wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, []);

  // last performance per exercise, across plan versions
  const last = useMemo(() => {
    const map: Record<string, SetRow[]> = {};
    for (const l of history) if (l.session_key !== key || l.performed_at !== existing?.performed_at)
      for (const e of (l.entries as LogEntry[]) ?? []) if (e.sets.some((s) => s.done)) map[e.exerciseId] = e.sets.filter((s) => s.done);
    return map;
  }, [history, key, existing?.performed_at]);

  if (loading) return <Spinner />;
  if (!program || !session) return <div className="pt-6"><Notice>That session isn&apos;t in your current plan.</Notice><Link className="mt-4 block underline" href="/home">Back to Today</Link></div>;

  const n = items.length;
  const cur = step >= 1 && step <= n ? items[step - 1] : null;
  const e = cur ? entries[cur.exerciseId] : null;
  const totalSets = items.reduce((t, p) => t + (entries[p.exerciseId]?.skipped ? 0 : p.sets), 0);
  const doneSets = Object.values(entries).reduce((t, x) => t + (x.skipped ? 0 : x.sets.filter((s) => s.done).length), 0);

  const updSet = (id: string, i: number, patch: Partial<SetRow>) =>
    setEntries((p) => ({ ...p, [id]: { ...p[id], sets: p[id].sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) } }));
  const completeSet = (p: Prescription, i: number) => {
    const s = entries[p.exerciseId].sets[i];
    const prev = last[p.exerciseId]?.[i] ?? last[p.exerciseId]?.[0];
    // tapping ✓ on an empty set logs the planned / last-time values
    const fill: Partial<SetRow> = s.done ? { done: false } : {
      done: true,
      reps: s.reps ?? (p.hold ? undefined : prev?.reps ?? (Number.parseInt(p.reps, 10) || undefined)),
      seconds: s.seconds ?? (p.hold ? prev?.seconds ?? (Number.parseInt(p.reps, 10) || undefined) : undefined),
      weightKg: s.weightKg ?? prev?.weightKg,
    };
    updSet(p.exerciseId, i, fill);
    if (!s.done && p.restSec) setRest({ sec: p.restSec, id: Date.now() });
  };

  function swapHere(toId: string, everywhere: boolean) {
    if (!swapFor) return;
    const ex = getExercise(toId)!;
    const repl: Prescription = { ...swapFor, exerciseId: toId, name: titleCase(ex.name), hold: ex.hold || swapFor.hold, swappedFrom: swapFor.exerciseId };
    setItems((list) => list.map((p) => (p.exerciseId === swapFor.exerciseId ? repl : p)));
    setEntries((m) => { const c = { ...m }; delete c[swapFor.exerciseId]; c[toId] = { exerciseId: toId, sets: Array.from({ length: repl.sets }, () => ({ done: false })) }; return c; });
    if (everywhere && intake) {
      const res = swapInPlan(program!.plan, intake, swapFor.exerciseId, toId);
      activateProgram(res.plan, program!.start_date, "swap", diffPlans(program, { plan: res.plan, start_date: program!.start_date })).then(() => reload());
    }
    setSwapFor(null);
  }

  async function finish(status: "done" | "skipped") {
    setSaving(true); setErr("");
    try {
      const st = status === "skipped" ? "skipped" : doneSets >= totalSets * 0.8 ? "done" : "partial";
      await saveLog(program!.id, {
        session_key: session!.key, status: st, performed_at: new Date().toISOString(),
        session_rpe: status === "skipped" ? null : rpe ?? null, notes: notes || null, entries: Object.values(entries),
      });
      router.push(status === "skipped" ? "/home" : "/home?done=1");
      if (status === "skipped") coach.open("I had to skip today's workout");
    } catch (x) { setErr((x as Error).message); setSaving(false); }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-10 -mx-4 bg-bg/95 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Close workout" className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg">✕</Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{session.title} · Week {session.week}{session.week === 4 ? " deload" : ""}</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneSets / Math.max(1, totalSets)) * 100}%` }} /></div>
          </div>
          <span className="text-xs tabular-nums text-muted">{doneSets}/{totalSets}</span>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {["Warm-up", ...items.map((_, i) => String(i + 1)), "Finish"].map((label, i) => (
            <button key={label + i} type="button" onClick={() => { setStep(i); setShowHow(false); }}
              className={cx("min-h-8 shrink-0 rounded-full px-3 text-xs font-semibold", step === i ? "bg-accent text-accent-ink" : i >= 1 && i <= n && entries[items[i - 1]?.exerciseId]?.sets.every((s) => s.done) ? "bg-good-soft text-good" : "bg-surface-2 text-muted")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 pb-32 pt-3">
        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Warm-up</h1>
            <p className="text-[15px] text-muted">3–5 minutes of easy movement (marching, skipping, cycling), then:</p>
            {session.warmup.map((w) => (
              <div key={w.exerciseId} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
                <ExerciseMedia id={w.exerciseId} alt={w.name} size="sm" />
                <div><div className="font-semibold">{w.name}</div><div className="text-sm text-muted">{w.reps}</div></div>
              </div>
            ))}
            <p className="text-sm text-muted">Before your first main lift, do 1–2 lighter ramp-up sets.</p>
            {existing && <Notice tone="good">Already logged as <b>{existing.status}</b>. Edit and save again if you like.</Notice>}
          </div>
        )}

        {cur && e && (
          <div className="space-y-4">
            <ExerciseMedia key={cur.exerciseId} id={cur.exerciseId} alt={cur.name} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-accent">{cur.pattern === "cardio" ? "Finisher" : cur.note?.startsWith("Main") ? "Main lift" : "Exercise"} {step} of {n}</div>
                <h1 className="text-2xl font-bold leading-tight">{cur.name}</h1>
                <div className="text-sm text-muted">{getExercise(cur.exerciseId)?.target}{cur.swappedFrom ? " · swapped" : ""}</div>
              </div>
              {cur.pattern !== "cardio" && <button type="button" onClick={() => setSwapFor(cur)} className="min-h-10 shrink-0 rounded-full border border-line px-3 text-sm font-medium">⇄ Swap</button>}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-surface-2 px-3 py-1 font-semibold">{cur.sets} × {cur.reps}</span>
              <span className="rounded-full bg-surface-2 px-3 py-1">{cur.rir} reps in reserve</span>
              {cur.restSec > 0 && <span className="rounded-full bg-surface-2 px-3 py-1">rest {cur.restSec}s</span>}
            </div>
            {cur.note && <p className="text-sm text-muted">{cur.note}</p>}
            <button type="button" onClick={() => setShowHow(!showHow)} className="text-sm font-semibold text-accent">{showHow ? "Hide" : "How to do it"}</button>
            {showHow && <ol className="list-decimal space-y-1 rounded-2xl bg-surface-2 p-4 pl-8 text-[15px]">{getExercise(cur.exerciseId)?.instructions.map((s) => <li key={s}>{s}</li>)}</ol>}

            {e.skipped ? (
              <Notice>Skipped. <button type="button" className="font-semibold underline" onClick={() => setEntries((m) => ({ ...m, [cur.exerciseId]: { ...e, skipped: false } }))}>Undo</button></Notice>
            ) : (
              <div className="space-y-2">
                {e.sets.map((s, i) => {
                  const prev = last[cur.exerciseId]?.[i] ?? last[cur.exerciseId]?.[0];
                  return (
                    <div key={i} className={cx("flex items-center gap-2 rounded-2xl p-2", s.done ? "bg-good-soft" : "bg-surface")}>
                      <span className="w-7 text-center text-sm font-bold text-muted">{i + 1}</span>
                      {cur.hold ? (
                        <input type="number" inputMode="numeric" aria-label={`Set ${i + 1} seconds`} placeholder={prev?.seconds ? `${prev.seconds}s` : "sec"} className={cx(inputCls, "py-2.5")}
                          value={s.seconds ?? ""} onChange={(ev) => updSet(cur.exerciseId, i, { seconds: ev.target.value ? Number(ev.target.value) : undefined })} />
                      ) : (<>
                        <input type="number" inputMode="numeric" aria-label={`Set ${i + 1} reps`} placeholder={prev?.reps ? `${prev.reps}` : cur.reps} className={cx(inputCls, "py-2.5")}
                          value={s.reps ?? ""} onChange={(ev) => updSet(cur.exerciseId, i, { reps: ev.target.value ? Number(ev.target.value) : undefined })} />
                        <input type="number" inputMode="decimal" step={0.5} aria-label={`Set ${i + 1} kg`} placeholder={prev?.weightKg ? `${prev.weightKg} kg` : "kg"} className={cx(inputCls, "py-2.5")}
                          value={s.weightKg ?? ""} onChange={(ev) => updSet(cur.exerciseId, i, { weightKg: ev.target.value ? Number(ev.target.value) : undefined })} />
                      </>)}
                      <button type="button" aria-label={`Complete set ${i + 1}`} onClick={() => completeSet(cur, i)}
                        className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl font-bold", s.done ? "bg-good text-white" : "border border-line bg-surface text-muted")}>✓</button>
                    </div>
                  );
                })}
                {last[cur.exerciseId] && <p className="text-xs text-muted">Last time: {last[cur.exerciseId].map((s) => (cur.hold ? `${s.seconds ?? "-"}s` : `${s.reps ?? "-"}${s.weightKg ? `×${s.weightKg}kg` : ""}`)).join(", ")}</p>}
                <button type="button" className="text-sm text-muted underline" onClick={() => setEntries((m) => ({ ...m, [cur.exerciseId]: { ...e, skipped: true } }))}>Skip this exercise</button>
              </div>
            )}
          </div>
        )}

        {step === n + 1 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold">Nice work!</h1>
            <p className="text-muted">{doneSets} of {totalSets} sets done.</p>
            <div>
              <div className="mb-2 font-semibold">How hard was today overall?</div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <button key={v} type="button" onClick={() => setRpe(v)} className={cx("h-12 rounded-xl border font-semibold", rpe === v ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface")}>{v}</button>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted"><span>Very easy</span><span>Max effort</span></div>
            </div>
            <textarea id="workout-notes" rows={3} className={inputCls} placeholder="Notes for Maya: energy, pain, period symptoms, what felt good…" value={notes} onChange={(ev) => setNotes(ev.target.value)} />
            {err && <Notice>{err}</Notice>}
            <button type="button" className="text-sm text-muted underline" onClick={() => finish("skipped")} disabled={saving}>I couldn&apos;t train today: mark as skipped</button>
          </div>
        )}
      </div>

      {rest && (
        <div className="fixed inset-x-0 z-30 mx-auto max-w-xl px-4" style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-bg shadow-lg">
            <span className="text-sm font-semibold">Rest</span>
            <Timer key={rest.id} seconds={rest.sec} compact autoStart onStop={() => setTimeout(() => setRest(null), 1200)} />
            <button type="button" className="text-sm underline" onClick={() => setRest(null)}>Skip</button>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-xl gap-2">
          {step > 0 && <Button variant="ghost" onClick={() => { setStep(step - 1); setShowHow(false); window.scrollTo(0, 0); }}>Back</Button>}
          {step <= n
            ? <Button full className="min-h-13 text-base" onClick={() => { setStep(step + 1); setShowHow(false); window.scrollTo(0, 0); }}>{step === 0 ? "Start first exercise" : step === n ? "Finish" : "Next exercise"}</Button>
            : <Button full className="min-h-13 text-base" onClick={() => finish("done")} disabled={saving}>{saving ? "Saving…" : "Save workout"}</Button>}
        </div>
      </div>

      {swapFor && intake && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={() => setSwapFor(null)}>
          <div className="mx-auto max-h-[80dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-bg p-4" onClick={(ev) => ev.stopPropagation()} style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
            <div className="mb-1 text-lg font-bold">Swap {swapFor.name}</div>
            <p className="mb-3 text-sm text-muted">Same movement, fits your equipment and limits.</p>
            <div className="space-y-2">
              {swapOptions(program.plan, intake, swapFor.exerciseId).map((o) => (
                <div key={o.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
                  <ExerciseMedia id={o.id} alt={o.name} size="sm" />
                  <div className="min-w-0 flex-1"><div className="font-semibold">{o.name}</div><div className="text-xs text-muted">{["", "Easier", "Standard", "Harder"][o.tier]}</div></div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => swapHere(o.id, false)} className="min-h-9 rounded-lg bg-surface-2 px-3 text-xs font-semibold">Today</button>
                    <button type="button" onClick={() => swapHere(o.id, true)} className="min-h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-ink">Always</button>
                  </div>
                </div>
              ))}
              {swapOptions(program.plan, intake, swapFor.exerciseId).length === 0 && <Notice>No alternatives fit your equipment and limits. Ask Maya for ideas.</Notice>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
