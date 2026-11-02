"use client";
import { useEffect, useState } from "react";
import { Button, Card, LinkButton, PageTitle, ScoreBar, Spinner } from "@/components/ui";
import { getLatestIntake, listAssessments, type AssessmentRow } from "@/lib/data";
import type { Intake } from "@/lib/science/types";
import { supabase } from "@/lib/supabase/client";

export default function MePage() {
  const [intake, setIntake] = useState<Intake | null | undefined>();
  const [hist, setHist] = useState<AssessmentRow[]>([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    Promise.all([getLatestIntake(), listAssessments(), supabase().auth.getUser()]).then(([i, h, u]) => { setIntake(i); setHist(h); setEmail(u.data.user?.email ?? ""); });
  }, []);
  if (intake === undefined) return <Spinner />;

  const first = hist[0]?.analysis;
  const last = hist[hist.length - 1]?.analysis;

  return (
    <div className="space-y-5">
      <PageTitle title={intake?.name || "Me"} sub={email} />
      {intake && (
        <Card>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div><div className="text-lg font-bold">{intake.age}</div><div className="text-xs text-muted">years</div></div>
            <div><div className="text-lg font-bold">{intake.heightCm}</div><div className="text-xs text-muted">cm</div></div>
            <div><div className="text-lg font-bold">{intake.weightKg}</div><div className="text-xs text-muted">kg</div></div>
          </div>
        </Card>
      )}

      {hist.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Progress {hist.length > 1 ? `(${hist.length} assessments)` : ""}</h2>
          <div className="space-y-3">
            {Object.entries(last!.domains).map(([d, v]) => {
              const before = first?.domains[d as keyof typeof first.domains];
              return (
                <div key={d}>
                  <div className="mb-1 flex justify-between text-sm capitalize"><span>{d === "bodyComp" ? "body composition" : d}</span>
                    <span className="font-semibold tabular-nums">{hist.length > 1 && before !== undefined && before !== v ? <span className="mr-1 text-xs text-muted">{before} →</span> : null}{v}</span></div>
                  <ScoreBar score={v} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-2">
        <LinkButton href="/report" variant="ghost">View latest report</LinkButton>
        <LinkButton href="/assessment" variant="ghost">Retest fitness</LinkButton>
        <LinkButton href="/onboarding" variant="ghost">Update questionnaire (goals, equipment, diet)</LinkButton>
        <Button variant="ghost" onClick={() => supabase().auth.signOut()}>Sign out</Button>
      </div>
      <p className="text-center text-xs text-muted">Exercise data: openGym catalogue (ExerciseDB text, MIT). Not medical advice.</p>
    </div>
  );
}
