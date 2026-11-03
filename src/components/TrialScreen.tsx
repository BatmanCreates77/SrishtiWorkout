"use client";
// One movement trial (fitness test) from the coach skill: demo, cues, timer, result, feel, form, pain.
import { skill, type Trial } from "@/lib/coach/skill";
import { getExercise, titleCase } from "@/lib/science/program";
import type { TrialResult } from "@/lib/science/types";
import { CoachBubble } from "./CoachBubble";
import { ExerciseMedia } from "./ExerciseMedia";
import { Timer } from "./Timer";
import { cx } from "./ui";

export function emptyTrial(t: Trial): TrialResult {
  return { id: t.id, exerciseId: t.exerciseId, variant: "base", value: NaN, feel: "right", formFlags: [], pain: false };
}

export function trialComplete(r: TrialResult | undefined) {
  return !!r && (r.feel === "couldnt" || Number.isFinite(r.value));
}

export function TrialScreen({ t, r, onChange }: { t: Trial; r: TrialResult; onChange: (r: TrialResult) => void }) {
  const ex = getExercise(r.exerciseId);
  const set = (patch: Partial<TrialResult>) => onChange({ ...r, ...patch });
  const variantId = (v: TrialResult["variant"]) => (v === "easier" ? t.easier : v === "harder" ? t.harder : t.exerciseId);
  const switchTo = (v: TrialResult["variant"]) => onChange({ ...r, variant: v, exerciseId: variantId(v), value: NaN, feel: "right", pain: false });
  const unit = t.measure === "seconds" ? "seconds" : t.perSide ? "reps per leg" : "reps";
  const struggling = r.feel === "couldnt" || r.pain;

  return (
    <div className="space-y-5">
      <ExerciseMedia id={r.exerciseId} alt={ex?.name ?? t.title} />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">{t.title} check{r.variant !== "base" ? ` · ${r.variant} version` : ""}</div>
        <h2 className="text-2xl font-bold">{titleCase(ex?.name ?? t.title)}</h2>
        <p className="mt-1 text-[15px]">{t.protocol}</p>
      </div>
      <ul className="grid gap-1.5 text-[15px]">
        {t.cues.map((c) => <li key={c} className="flex gap-2"><span className="text-accent">•</span>{c}</li>)}
      </ul>

      <div className="flex gap-2">
        {r.variant !== "easier" && t.easier !== t.exerciseId && <button type="button" onClick={() => switchTo("easier")} className="min-h-10 rounded-full border border-line px-3 text-sm">Show an easier version</button>}
        {r.variant !== "harder" && <button type="button" onClick={() => switchTo("harder")} className="min-h-10 rounded-full border border-line px-3 text-sm">Too easy? Harder version</button>}
        {r.variant !== "base" && <button type="button" onClick={() => switchTo("base")} className="min-h-10 rounded-full border border-line px-3 text-sm">Back to standard</button>}
      </div>

      {t.stopwatch ? <Timer onStop={(s) => set({ value: s })} /> : t.timerSec ? <Timer seconds={t.timerSec} /> : null}

      <div>
        <label htmlFor={`trial-${t.id}`} className="mb-1.5 block text-sm font-semibold">Your result</label>
        <div className="flex items-center gap-3">
          <input id={`trial-${t.id}`} type="number" inputMode="numeric" min={0}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-3xl font-bold tabular-nums outline-none focus:border-accent"
            value={Number.isFinite(r.value) ? r.value : ""} onChange={(e) => set({ value: e.target.value === "" ? NaN : Number(e.target.value) })} />
          <span className="shrink-0 text-muted">{unit}</span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-sm font-semibold">How did it feel?</div>
        <div className="grid grid-cols-2 gap-2">
          {skill.trials.feelOptions.map((f) => (
            <button key={f.value} type="button" onClick={() => set({ feel: f.value as TrialResult["feel"] })}
              className={cx("min-h-14 rounded-2xl border px-3 py-2 text-left", r.feel === f.value ? "border-accent bg-accent-soft" : "border-line bg-surface")}>
              <div className={cx("text-[15px] font-semibold", r.feel === f.value && "text-accent")}>{f.label}</div>
              <div className="text-xs text-muted">{f.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {struggling && r.variant !== "easier" && t.easier !== t.exerciseId && (
        <CoachBubble>
          <span className="text-[15px]">No problem at all. That&apos;s exactly why we test. Let&apos;s try the easier version so I know where to start you.</span>
          <button type="button" onClick={() => switchTo("easier")} className="mt-2 block rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">Show me the easier one</button>
        </CoachBubble>
      )}

      <div>
        <div className="mb-1.5 text-sm font-semibold">Anything you noticed? <span className="font-normal text-muted">(optional)</span></div>
        <div className="flex flex-wrap gap-2">
          {t.formFlags.map((f) => {
            const on = r.formFlags.includes(f.value);
            return <button key={f.value} type="button" aria-pressed={on} onClick={() => set({ formFlags: on ? r.formFlags.filter((x) => x !== f.value) : [...r.formFlags, f.value] })}
              className={cx("min-h-10 rounded-full border px-3.5 text-sm", on ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface")}>{f.label}</button>;
          })}
          <button type="button" aria-pressed={r.pain} onClick={() => set({ pain: !r.pain })}
            className={cx("min-h-10 rounded-full border px-3.5 text-sm", r.pain ? "border-warn bg-warn-soft text-warn" : "border-line bg-surface")}>It hurt</button>
        </div>
      </div>

      <div>
        <label htmlFor={`trial-note-${t.id}`} className="mb-1.5 block text-xs font-medium text-muted">Tell me more in your own words (optional)</label>
        <textarea id={`trial-note-${t.id}`} rows={2} className="w-full rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent"
          placeholder="e.g. my left knee felt wobbly" value={r.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
      </div>
    </div>
  );
}
