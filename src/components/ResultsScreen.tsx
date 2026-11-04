"use client";
// Movement-check results: each exercise against age/sex norms, with her target for her experience level.
import type { Answers } from "@/lib/onboarding";
import { firstName } from "@/lib/onboarding";
import { RATINGS, summarize, type TrialEval } from "@/lib/science/benchmarks";
import type { TrialResult } from "@/lib/science/types";
import { CoachBubble } from "./CoachBubble";
import { cx } from "./ui";

// 5 segments, Needs work → Excellent (light to strong)
const SEG = ["bg-warn/35", "bg-warn/20", "bg-accent/20", "bg-accent/45", "bg-accent/75"];

function Bar({ e }: { e: TrialEval }) {
  const t = e.bench.targetRating - 1;
  return (
    <div className="relative pt-6" aria-hidden>
      <div className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-bg" style={{ left: `${Math.min(92, Math.max(8, e.pos * 100))}%` }}>
        You {Number.isFinite(e.value) ? e.value : 0}
      </div>
      <div className="grid h-3 grid-cols-5 gap-0.5 overflow-hidden rounded-full">
        {SEG.map((c, i) => <div key={i} className={cx(c, i === t && "ring-2 ring-inset ring-good")} />)}
      </div>
      <div className="absolute top-[22px] h-5 w-0.5 -translate-x-1/2 rounded bg-ink" style={{ left: `${e.pos * 100}%` }} />
      <div className="mt-1 grid grid-cols-5 text-center text-[10px] text-muted">
        {RATINGS.slice(1).map((r, i) => <span key={r} className={cx(i === t && "font-bold text-good")}>{i === t ? "Target" : r}</span>)}
      </div>
    </div>
  );
}

export function ResultsScreen({ trials, answers }: { trials: TrialResult[]; answers: Answers }) {
  const s = summarize(trials, answers);
  const name = firstName(answers);
  return (
    <div className="space-y-4">
      <CoachBubble>
        Great work{name ? `, ${name}` : ""}! Here&apos;s how you compare with people your age and sex, and where I&apos;d expect you to be for your experience.
      </CoachBubble>

      <div className="rounded-3xl bg-ink p-5 text-bg">
        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Overall</div>
        <div className="mt-1 text-3xl font-bold">{s.overall}</div>
        <div className="mt-1 text-sm opacity-90">Target reached on {s.metCount} of {s.evals.length} exercises</div>
        <div className="mt-3 grid grid-cols-6 gap-1">
          {s.evals.map((e) => (
            <div key={e.bench.trialId} className="text-center">
              <div className="mx-auto flex h-16 w-full items-end overflow-hidden rounded-lg bg-white/10">
                <div className={cx("w-full rounded-lg", e.met ? "bg-good" : "bg-accent")} style={{ height: `${(e.rating / 5) * 100}%` }} />
              </div>
              <div className="mt-1 truncate text-[10px] opacity-80">{e.bench.title}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm opacity-90">{s.expectation}</p>
        {s.strongest && s.weakest && s.strongest !== s.weakest && (
          <p className="mt-2 text-sm opacity-90">Strongest: <b>{s.strongest.bench.title.toLowerCase()}</b>. Biggest opportunity: <b>{s.weakest.bench.title.toLowerCase()}</b>.</p>
        )}
      </div>

      {s.evals.map((e) => (
        <div key={e.bench.trialId} className="rounded-3xl bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-lg font-bold">{e.bench.title}</div>
              <div className="text-sm text-muted">{Number.isFinite(e.value) ? e.value : 0} {e.bench.unit}{e.note ? ` · ${e.note}` : ""}</div>
            </div>
            <span className={cx("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", e.met ? "bg-good-soft text-good" : "bg-accent-soft text-accent")}>{RATINGS[e.rating]}</span>
          </div>
          <div className="mt-2"><Bar e={e} /></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-bg p-2.5"><div className="text-[11px] text-muted">Typical ({e.bench.who})</div><div className="font-semibold">{e.bench.typicalText}</div></div>
            <div className="rounded-xl bg-bg p-2.5"><div className="text-[11px] text-muted">Your target ({RATINGS[e.bench.targetRating]})</div><div className="font-semibold text-good">{e.bench.targetText}</div></div>
          </div>
          <div className="mt-2 text-[11px] text-muted">{e.bench.source}</div>
        </div>
      ))}

      <p className="px-1 text-xs text-muted">
        Norms are population averages for tracking progress, not a diagnosis. Your plan starts where you are today and builds towards your targets.
      </p>
    </div>
  );
}
