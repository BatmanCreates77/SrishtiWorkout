"use client";
// Retest: re-run the movement check, then rebuild the next block from her (kept) answers and new results.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CoachBubble } from "@/components/CoachBubble";
import { emptyTrial, TrialScreen, trialComplete } from "@/components/TrialScreen";
import { Button, Notice, Spinner } from "@/components/ui";
import { TRIALS } from "@/lib/coach/skill";
import { activateProgram, getActiveProgram, getOnboarding, saveAssessment, saveIntake, type OnboardingState } from "@/lib/data";
import { buildFromOnboarding } from "@/lib/plan-builder";
import { diffPlans } from "@/lib/science/adjust";
import { toISODate } from "@/lib/science/schedule";
import type { TrialResult } from "@/lib/science/types";

export default function RetestPage() {
  const router = useRouter();
  const [ob, setOb] = useState<OnboardingState | null>(null);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { getOnboarding().then(({ state }) => setOb(state)); }, []);
  if (!ob) return <Spinner />;
  const t = TRIALS[i];
  const r = results.find((x) => x.id === t.id) ?? emptyTrial(t);
  const set = (x: TrialResult) => setResults((p) => [...p.filter((y) => y.id !== x.id), x]);

  async function finish(lastR: TrialResult) {
    setBusy(true); setErr("");
    try {
      const merged = [...results.filter((x) => x.id !== lastR.id), lastR];
      const all = TRIALS.map((tr) => merged.find((x) => x.id === tr.id) ?? emptyTrial(tr));
      const b = buildFromOnboarding(ob!.answers, all, ob!.health, ob!.followups);
      const cur = await getActiveProgram();
      await saveIntake(b.intake);
      await saveAssessment(b.results, b.analysis);
      const start = toISODate(new Date());
      await activateProgram(b.program, start, "retest", diffPlans(cur, { plan: b.program, start_date: start }));
      router.replace("/me");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  return (
    <div className="pb-32 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/me" className="text-sm text-muted">✕ Cancel</Link>
        <span className="text-sm font-medium text-muted">{i + 1} of {TRIALS.length}</span>
      </div>
      {i === 0 && <CoachBubble className="mb-5">Let&apos;s see how far you&apos;ve come! Same 6 moves as last time. Warm up first.</CoachBubble>}
      <TrialScreen key={t.id} t={t} r={r} onChange={set} />
      {err && <div className="mt-4"><Notice>{err}</Notice></div>}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-xl gap-2">
          {i > 0 && <Button variant="ghost" onClick={() => setI(i - 1)}>Back</Button>}
          {i < TRIALS.length - 1
            ? <Button full className="min-h-13" disabled={!trialComplete(r)} onClick={() => { if (!results.find((x) => x.id === r.id)) set(r); setI(i + 1); window.scrollTo(0, 0); }}>Next</Button>
            : <Button full className="min-h-13" disabled={!trialComplete(r) || busy} onClick={() => finish(r)}>{busy ? "Building your next block…" : "Build my next block"}</Button>}
        </div>
      </div>
    </div>
  );
}
