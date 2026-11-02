"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, LinkButton, Notice, PageTitle, ScoreBar, Spinner } from "@/components/ui";
import { activateProgram, getActiveProgram, getLatestAssessment, getLatestIntake, type AssessmentRow } from "@/lib/data";
import { programBlocked } from "@/lib/science/analysis";
import { generateProgram } from "@/lib/science/program";
import { toISODate } from "@/lib/science/schedule";
import type { Domain, Intake } from "@/lib/science/types";

const DOMAIN_LABEL: Record<Domain, string> = { cardio: "Cardio fitness", upper: "Upper-body strength", lower: "Lower-body strength", core: "Core endurance", mobility: "Flexibility", balance: "Balance", bodyComp: "Body composition" };

export default function ReportPage() {
  const router = useRouter();
  const [a, setA] = useState<AssessmentRow | null | undefined>();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [hasProgram, setHasProgram] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getLatestAssessment(), getLatestIntake(), getActiveProgram()]).then(([x, i, p]) => { setA(x); setIntake(i); setHasProgram(!!p); });
  }, []);

  if (a === undefined) return <Spinner />;
  if (!a || !intake) return (
    <div><PageTitle title="Your report" /><Notice>No assessment yet.</Notice><div className="mt-4"><LinkButton href={intake ? "/assessment" : "/onboarding"}>{intake ? "Do the fitness tests" : "Start questionnaire"}</LinkButton></div></div>
  );
  const an = a.analysis;
  const blocked = programBlocked(intake);

  async function build() {
    setBusy(true);
    const plan = generateProgram(intake!, an);
    await activateProgram(plan, toISODate(new Date()), hasProgram ? "rebuilt from report" : "initial");
    router.push("/program");
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Your fitness report" sub={`Assessed ${new Date(a.created_at).toLocaleDateString()}`} />

      <Card className="bg-accent-soft border-transparent">
        <div className="text-sm font-semibold text-accent">Overall</div>
        <div className="mt-1 flex items-end gap-2"><span className="text-4xl font-black">{an.overall}</span><span className="pb-1 text-muted">/ 5</span>
          <span className="ml-auto rounded-full bg-surface px-3 py-1 text-sm font-semibold capitalize">{an.level}</span></div>
        <ul className="mt-3 space-y-1 text-sm">{an.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </Card>

      {an.flags.length > 0 && <div className="space-y-2">{an.flags.map((f, i) => <Notice key={i}>{f}</Notice>)}</div>}

      <Card>
        <h2 className="mb-3 font-semibold">Fitness domains</h2>
        <div className="space-y-3">
          {(Object.entries(an.domains) as [Domain, number][]).map(([d, v]) => (
            <div key={d}>
              <div className="mb-1 flex justify-between text-sm"><span>{DOMAIN_LABEL[d]}</span><span className="font-semibold tabular-nums">{v}/5</span></div>
              <ScoreBar score={v} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Test results</h2>
        <div className="divide-y divide-line">
          {an.testScores.map((t) => (
            <div key={t.key} className="flex items-center justify-between py-2.5 text-sm">
              <div><div className="font-medium">{t.label}</div>{t.note && <div className="text-xs text-muted">{t.note}</div>}</div>
              <div className="text-right"><div className="font-semibold tabular-nums">{t.value}</div><div className="text-xs text-muted">{t.rating}</div></div>
            </div>
          ))}
          <div className="flex justify-between py-2.5 text-sm"><span className="font-medium">BMI</span><span className="font-semibold">{an.bmi}</span></div>
        </div>
        <p className="mt-2 text-xs text-muted">Ratings use published age/sex norms (CSEP, YMCA, Cooper Institute and others). They are for tracking progress, not medical diagnosis.</p>
      </Card>

      {an.correctives.length > 0 && (
        <Card><h2 className="mb-2 font-semibold">Movement notes</h2><ul className="list-disc space-y-1 pl-5 text-sm">{an.correctives.map((c, i) => <li key={i}>{c}</li>)}</ul></Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Nutrition snapshot</h2><span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">{an.diet.score}/100</span></div>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 p-2"><div className="text-lg font-bold">{an.diet.calorieRange[0]}–{an.diet.calorieRange[1]}</div><div className="text-[11px] text-muted">kcal / day</div></div>
          <div className="rounded-xl bg-surface-2 p-2"><div className="text-lg font-bold">{an.diet.proteinTarget} g</div><div className="text-[11px] text-muted">protein target (now ~{an.diet.proteinEstimate})</div></div>
          <div className="rounded-xl bg-surface-2 p-2"><div className="text-lg font-bold">{an.diet.waterTarget} L</div><div className="text-[11px] text-muted">water</div></div>
        </div>
        <div className="text-sm font-semibold">Your top priorities</div>
        <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-sm">{an.diet.priorities.length ? an.diet.priorities.map((p, i) => <li key={i}>{p}</li>) : <li>Your habits look solid. Keep it consistent!</li>}</ol>
        <div className="mt-3 text-sm font-semibold">Protein ideas for you</div>
        <p className="text-sm text-muted">{an.diet.proteinIdeas.join(" · ")}</p>
        <p className="mt-2 text-xs text-muted">Energy estimate: Mifflin-St Jeor BMR {an.diet.bmr} kcal × activity. Treat it as a starting range and adjust by your 2–3 week weight trend.</p>
      </Card>

      {blocked ? <Notice>{blocked}</Notice> : (
        <Button full onClick={build} disabled={busy}>{busy ? "Building…" : hasProgram ? "Rebuild my program from this report" : "Build my training program"}</Button>
      )}
      <LinkButton href="/coach" variant="ghost" full>Ask the coach about my results</LinkButton>
    </div>
  );
}
