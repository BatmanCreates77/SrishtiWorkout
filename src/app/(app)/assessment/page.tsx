"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Timer } from "@/components/Timer";
import { Button, Card, Chips, cx, LinkButton, Notice, NumberInput, PageTitle, Spinner } from "@/components/ui";
import { getLatestIntake, saveAssessment } from "@/lib/data";
import { analyse, parqFlagged } from "@/lib/science/analysis";
import { TEST_PROTOCOLS, type TestProtocol } from "@/lib/science/tests";
import type { Intake, TestResults } from "@/lib/science/types";

const DRAFT_KEY = "ogc-test-draft";

export default function AssessmentPage() {
  const router = useRouter();
  const [intake, setIntake] = useState<Intake | null | undefined>(undefined);
  const [r, setR] = useState<TestResults>({});
  const [open, setOpen] = useState<string | null>("restingHr");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getLatestIntake().then((i) => {
      setIntake(i);
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) setR(JSON.parse(draft));
        else if (i?.waistCm) setR({ waist: i.waistCm });
      } catch { /* ignore */ }
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(r)); } catch { /* ignore */ }
  }, [r]);

  if (intake === undefined) return <Spinner />;
  if (!intake) return (
    <div><PageTitle title="Fitness tests" /><Notice>Please complete the questionnaire first.</Notice><div className="mt-4"><LinkButton href="/onboarding">Start questionnaire</LinkButton></div></div>
  );

  const flagged = parqFlagged(intake);
  const done = (k: TestProtocol["key"]) => r[k] !== undefined;
  const count = TEST_PROTOCOLS.filter((t) => done(t.key)).length;
  const upd = (patch: Partial<TestResults>) => setR((p) => ({ ...p, ...patch }));

  async function finish() {
    if (count < 3) { setErr("Complete at least 3 tests for a meaningful analysis (more is better)."); return; }
    setSaving(true); setErr("");
    try {
      const analysis = analyse(intake!, r);
      await saveAssessment(r, analysis);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      router.push("/report");
    } catch (e) { setErr((e as Error).message); setSaving(false); }
  }

  return (
    <div>
      <PageTitle title="Fitness tests" sub="Simple, validated field tests you can do at home in about 30–40 minutes. Do them on a rested day, warm up for 5 minutes first, and rest 2–3 minutes between tests." />
      {flagged && <div className="mb-4"><Notice>Because of your health-screen answers, skip the tests marked <b>vigorous</b> until a doctor has cleared you. The others are fine.</Notice></div>}
      <div className="mb-4 text-sm font-medium text-muted">{count} of {TEST_PROTOCOLS.length} recorded</div>

      <div className="space-y-3">
        {TEST_PROTOCOLS.map((t) => (
          <Card key={t.key} className={cx("p-0", done(t.key) && "border-good")}>
            <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(open === t.key ? null : t.key)}>
              <div className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", done(t.key) ? "bg-good text-white" : "bg-surface-2 text-muted")}>{done(t.key) ? "✓" : ""}</div>
              <div className="flex-1">
                <div className="font-semibold">{t.title} {t.vigorous && <span className="ml-1 rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-warn">vigorous</span>}</div>
                <div className="text-xs text-muted">{t.measures}</div>
              </div>
              <span className="text-muted">{open === t.key ? "−" : "+"}</span>
            </button>
            {open === t.key && (
              <div className="space-y-4 border-t border-line p-4">
                <div className="text-xs text-muted">You need: {t.equipment}</div>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm">{t.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                {t.safety && <Notice>{t.safety}</Notice>}
                {t.timerSec && t.key !== "balance" ? <Timer seconds={t.timerSec} metronomeBpm={t.metronomeBpm} /> : null}
                {["plank", "deadHang"].includes(t.key) && <Timer onStop={(s) => upd({ [t.key]: s } as Partial<TestResults>)} />}
                <TestInput t={t} r={r} upd={upd} />
                {done(t.key) && (
                  <button className="text-xs text-muted underline" onClick={() => setR((p) => { const n = { ...p }; delete n[t.key]; return n; })}>Clear result</button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {err && <div className="mt-4"><Notice>{err}</Notice></div>}
      <div className="sticky bottom-20 mt-6">
        <Button full onClick={finish} disabled={saving}>{saving ? "Analysing…" : `Analyse my results (${count})`}</Button>
      </div>
    </div>
  );
}

function TestInput({ t, r, upd }: { t: TestProtocol; r: TestResults; upd: (p: Partial<TestResults>) => void }) {
  switch (t.key) {
    case "restingHr": return <NumberInput value={r.restingHr} onChange={(v) => upd({ restingHr: v })} suffix="bpm" placeholder="e.g. 72" />;
    case "pushups": return (
      <div className="space-y-3">
        <Chips options={[{ value: "knee", label: "Knee push-ups" }, { value: "full", label: "Full push-ups" }]} value={r.pushups?.variant ?? "knee"} onChange={(v) => upd({ pushups: { reps: r.pushups?.reps ?? 0, variant: v as "knee" | "full" } })} />
        <NumberInput value={r.pushups?.reps} onChange={(v) => upd({ pushups: v === undefined ? undefined : { reps: v, variant: r.pushups?.variant ?? "knee" } })} suffix="reps" />
      </div>
    );
    case "plank": return <NumberInput value={r.plank} onChange={(v) => upd({ plank: v })} suffix="seconds" />;
    case "squat60": return (
      <div className="space-y-3">
        <NumberInput value={r.squat60?.reps} onChange={(v) => upd({ squat60: v === undefined ? undefined : { reps: v, faults: r.squat60?.faults ?? [] } })} suffix="reps" />
        <div className="text-sm font-semibold">What did you notice? (optional)</div>
        <Chips multi options={[{ value: "knees_cave", label: "Knees caved in" }, { value: "heels_lift", label: "Heels lifted" }, { value: "forward_lean", label: "Leaned far forward" }, { value: "pain", label: "Pain" }]}
          value={r.squat60?.faults ?? []} onChange={(v) => upd({ squat60: { reps: r.squat60?.reps ?? 0, faults: v as string[] } })} />
      </div>
    );
    case "stepTest": return <NumberInput value={r.stepTest} onChange={(v) => upd({ stepTest: v })} suffix="bpm (1-min recovery)" />;
    case "rockport": return (
      <div className="grid grid-cols-3 gap-2">
        <NumberInput value={r.rockport?.minutes} onChange={(v) => upd({ rockport: { minutes: v ?? 0, seconds: r.rockport?.seconds ?? 0, hr: r.rockport?.hr ?? 0 } })} suffix="min" />
        <NumberInput value={r.rockport?.seconds} onChange={(v) => upd({ rockport: { minutes: r.rockport?.minutes ?? 0, seconds: v ?? 0, hr: r.rockport?.hr ?? 0 } })} suffix="sec" />
        <NumberInput value={r.rockport?.hr} onChange={(v) => upd({ rockport: { minutes: r.rockport?.minutes ?? 0, seconds: r.rockport?.seconds ?? 0, hr: v ?? 0 } })} suffix="bpm" />
      </div>
    );
    case "sitReach": return <NumberInput value={r.sitReach} onChange={(v) => upd({ sitReach: v })} suffix="cm (− if short of toes)" />;
    case "balance": return (
      <div className="space-y-3"><Timer seconds={45} onStop={(s) => upd({ balance: Math.min(45, s) })} /><NumberInput value={r.balance} onChange={(v) => upd({ balance: v })} suffix="seconds (weaker leg)" /></div>
    );
    case "waist": return <NumberInput value={r.waist} onChange={(v) => upd({ waist: v })} step={0.5} suffix="cm" />;
    case "deadHang": return <NumberInput value={r.deadHang} onChange={(v) => upd({ deadHang: v })} suffix="seconds" />;
  }
}
