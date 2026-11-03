"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ScoreBar, Spinner } from "@/components/ui";
import { TRIALS } from "@/lib/coach/skill";
import { getLatestIntake, listAssessments, reopenOnboarding, type AssessmentRow } from "@/lib/data";
import type { Intake } from "@/lib/science/types";

const DOMAIN: Record<string, string> = { cardio: "Cardio", upper: "Upper body", lower: "Lower body", core: "Core", mobility: "Flexibility", balance: "Balance", bodyComp: "Body composition" };

export default function ProgressPage() {
  const router = useRouter();
  const [intake, setIntake] = useState<Intake | null | undefined>();
  const [hist, setHist] = useState<AssessmentRow[]>([]);

  useEffect(() => {
    Promise.all([getLatestIntake(), listAssessments()]).then(([i, h]) => { setIntake(i); setHist(h); });
  }, []);
  if (intake === undefined) return <Spinner />;

  const first = hist[0], last = hist[hist.length - 1];
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-bold leading-tight">Progress</h1>
        <p className="text-sm text-muted">{intake?.name}</p>
      </header>

      {last && (
        <div className="rounded-3xl bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-semibold">Movement check</div>
            <div className="text-xs text-muted">{hist.length > 1 ? `${new Date(first.created_at).toLocaleDateString()} → ` : ""}{new Date(last.created_at).toLocaleDateString()}</div>
          </div>
          <div className="space-y-2">
            {TRIALS.map((t) => {
              const a = first?.results.trials?.find((x) => x.id === t.id);
              const b = last.results.trials?.find((x) => x.id === t.id);
              if (!b) return null;
              const unit = t.measure === "seconds" ? "s" : "";
              const delta = a && hist.length > 1 && a.exerciseId === b.exerciseId ? b.value - a.value : null;
              return (
                <div key={t.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
                  <span>{t.title}{b.variant !== "base" ? <span className="text-muted"> ({b.variant})</span> : null}</span>
                  <span className="font-semibold tabular-nums">
                    {delta !== null && delta !== 0 && <span className={delta > 0 ? "mr-2 text-good" : "mr-2 text-warn"}>{delta > 0 ? "+" : ""}{delta}{unit}</span>}
                    {b.feel === "couldnt" ? "not yet" : `${b.value}${unit}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {last && (
        <div className="space-y-3 rounded-3xl bg-surface p-4">
          <div className="font-semibold">Fitness areas · <span className="capitalize">{last.analysis.level}</span></div>
          {Object.entries(last.analysis.domains).map(([d, v]) => {
            const before = first?.analysis.domains[d as keyof typeof first.analysis.domains];
            return (
              <div key={d}>
                <div className="mb-1 flex justify-between text-sm"><span>{DOMAIN[d] ?? d}</span><span className="font-semibold tabular-nums">{hist.length > 1 && before !== undefined && before !== v ? <span className="mr-1 text-xs text-muted">{before} →</span> : null}{v}/5</span></div>
                <ScoreBar score={v} />
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-2">
        <Link href="/retest" className="flex min-h-13 items-center justify-center rounded-2xl bg-accent font-semibold text-accent-ink">Redo the movement check</Link>
        <Button variant="ghost" onClick={async () => { await reopenOnboarding(); router.replace("/onboarding"); }}>Update my answers with Maya</Button>
        <a href="/unlock?lock=1" className="flex min-h-12 items-center justify-center rounded-2xl border border-line font-semibold">Lock this device</a>
      </div>
      <p className="text-center text-[11px] text-muted">Exercise data: openGym (AGPL) · Demo photos: free-exercise-db (public domain) · Not medical advice.</p>
    </div>
  );
}
