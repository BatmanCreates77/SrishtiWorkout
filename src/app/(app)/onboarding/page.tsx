"use client";
/* eslint-disable react-hooks/refs -- stRef is only read inside event handlers collected in the `cta` object, never during render. */
// Coach-led onboarding: adaptive questions (+ AI follow-ups) → movement check → optional health checks
// → coach analysis → curated plan. Everything it asks comes from the coach skill (coach-skill/content).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CoachAvatar, CoachBubble } from "@/components/CoachBubble";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { QuestionScreen } from "@/components/QuestionScreen";
import { Timer } from "@/components/Timer";
import { emptyTrial, TrialScreen, trialComplete } from "@/components/TrialScreen";
import { Button, cx, MiniMarkdown, Notice, ScoreBar, Spinner } from "@/components/ui";
import { HEALTH_TESTS, SECTIONS, skill, TRIALS, type Question } from "@/lib/coach/skill";
import {
  activateProgram, completeOnboarding, getOnboarding, saveAssessment, saveIntake, saveOnboarding, type OnboardingState,
} from "@/lib/data";
import { answersToIntake, canContinue, fill, reaction, visibleQuestions, type Answer } from "@/lib/onboarding";
import { buildFromOnboarding, type Built } from "@/lib/plan-builder";
import { programBlocked } from "@/lib/science/analysis";
import { toISODate } from "@/lib/science/schedule";
import type { TestResults, TrialResult } from "@/lib/science/types";

type FollowUp = { section: string; ask: string; options: string[] };
const MAX_FOLLOWUPS = 2;
const STAGES = [
  { id: "questions", label: "Get to know you" },
  { id: "trials", label: "Movement check" },
  { id: "plan", label: "Your plan" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [st, setSt] = useState<OnboardingState | null>(null);
  const [qid, setQid] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [fuAnswer, setFuAnswer] = useState<Answer>({});
  const [thinking, setThinking] = useState(false);
  const [lastReaction, setLastReaction] = useState<string | null>(null);
  const [built, setBuilt] = useState<Built | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const stRef = useRef<OnboardingState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load + resume
  useEffect(() => {
    getOnboarding().then(({ state, completedAt }) => {
      if (completedAt) { router.replace("/home"); return; }
      const s = { stage: "questions" as const, ...state };
      stRef.current = s; setSt(s);
      const vis = visibleQuestions(s.answers);
      setQid(vis.find((q) => q.id === (state as { qid?: string }).qid)?.id ?? vis[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((patch: Partial<OnboardingState> & { qid?: string }) => {
    const next = { ...stRef.current!, ...patch };
    stRef.current = next; setSt(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveOnboarding(next).catch(() => {}), 400);
  }, []);

  // rebuild the plan when resuming on the analysis/plan screens
  const resumeStage = st?.stage;
  useEffect(() => {
    if ((resumeStage === "analysis" || resumeStage === "plan") && !built && stRef.current) {
      const s = stRef.current;
      try { setBuilt(buildFromOnboarding(s.answers, s.trials, s.health, s.followups)); } catch (e) { setErr((e as Error).message); }
    }
  }, [resumeStage, built]);

  if (!st || !qid) return <Spinner />;
  const stage = st.stage ?? "questions";
  const visible = visibleQuestions(st.answers);
  const q = visible.find((x) => x.id === qid) ?? visible[0];
  const qPos = visible.indexOf(q);
  const sectionIdx = SECTIONS.findIndex((s) => s.id === q.section);

  // ---- question flow ----------------------------------------------------------
  const setAnswer = (a: Answer) => update({ answers: { ...stRef.current!.answers, [q.id]: a } });

  async function maybeFollowUp(section: string): Promise<FollowUp | null> {
    const s = stRef.current!;
    const count = s.followupCount?.[section] ?? 0;
    if (count >= MAX_FOLLOWUPS) return null;
    const qs = visibleQuestions(s.answers).filter((x) => x.section === section && x.kind !== "info");
    const hasFree = qs.some((x) => s.answers[x.id]?.text?.trim());
    if (!qs.some((x) => x.probe) && !hasFree) return null;
    const label = (x: Question) => {
      const a = s.answers[x.id];
      if (!a) return "(skipped)";
      const opt = (v: unknown) => x.options?.find((o) => o.value === v)?.label ?? String(v);
      const vals = Array.isArray(a.value) ? a.value.map(opt).join(", ") : a.value !== undefined ? opt(a.value) : "";
      return [vals, a.text?.trim()].filter(Boolean).join(" | ") || "(no answer)";
    };
    const intake = answersToIntake(s.answers);
    try {
      setThinking(true);
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 12000);
      const res = await fetch("/api/coach/followup", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
        body: JSON.stringify({
          section,
          qa: [...qs.map((x) => ({ q: fill(x.coach, s.answers), a: label(x) })),
            ...s.followups.filter((f) => f.section === section).map((f) => ({ q: f.ask, a: f.answer }))],
          profile: `${intake.name || "user"}, ${intake.age}y ${intake.sex}, goal ${intake.primaryGoal}, pain: ${intake.painAreas.join("/") || "none"}`,
          asked: s.followups.map((f) => f.ask),
          later: SECTIONS.slice(SECTIONS.findIndex((x) => x.id === section) + 1).map((x) => ({ schedule: "training days, session length, location, equipment", preferences: "likes, dislikes, workout style", recovery: "sleep, stress, energy, cycle", nutrition: "diet, protein, water", goals: "goals", experience: "training experience" } as Record<string, string>)[x.id] ?? x.title),
        }),
      });
      clearTimeout(t);
      const j = await res.json();
      return j.ask ? { section, ask: j.ask, options: j.options ?? [] } : null;
    } catch { return null; } finally { setThinking(false); }
  }

  async function next() {
    const s = stRef.current!;
    const cur = visibleQuestions(s.answers).find((x) => x.id === qid)!;
    if (!canContinue(cur, s.answers[cur.id])) return;
    const vis = visibleQuestions(s.answers);
    const nq = vis[vis.indexOf(cur) + 1];
    setLastReaction(reaction(cur, s.answers[cur.id]));
    // end of a section → maybe one tailored follow-up from the coach
    if (!nq || nq.section !== cur.section) {
      const fu = await maybeFollowUp(cur.section);
      if (fu) { setFollowUp(fu); setFuAnswer({}); return; }
    }
    if (nq) { setQid(nq.id); update({ qid: nq.id }); window.scrollTo(0, 0); }
    else { update({ stage: "trial-intro" }); window.scrollTo(0, 0); }
  }

  async function answerFollowUp() {
    if (!followUp) return;
    const ans = [fuAnswer.value, fuAnswer.text?.trim()].filter(Boolean).join(" | ");
    if (!ans) return;
    const s = stRef.current!;
    const counts = { ...(s.followupCount ?? {}), [followUp.section]: (s.followupCount?.[followUp.section] ?? 0) + 1 };
    update({ followups: [...s.followups, { section: followUp.section, ask: followUp.ask, answer: ans }], followupCount: counts });
    setLastReaction(null);
    const fu = await maybeFollowUp(followUp.section);
    if (fu) { setFollowUp(fu); setFuAnswer({}); return; }
    setFollowUp(null);
    const vis = visibleQuestions(stRef.current!.answers);
    const nq = vis[vis.indexOf(vis.find((x) => x.id === qid)!) + 1];
    if (nq) { setQid(nq.id); update({ qid: nq.id }); } else update({ stage: "trial-intro" });
    window.scrollTo(0, 0);
  }

  function back() {
    if (followUp) { setFollowUp(null); return; }
    if (stage === "trial-intro") { update({ stage: "questions" }); return; }
    if (stage === "trials") {
      const i = st!.trialIndex ?? 0;
      update(i > 0 ? { trialIndex: i - 1 } : { stage: "trial-intro" }); return;
    }
    if (stage === "health") { update({ stage: "trials", trialIndex: TRIALS.length - 1 }); return; }
    if (stage === "analysis" || stage === "plan") { update({ stage: "health" }); return; }
    if (qPos > 0) { setLastReaction(null); setQid(visible[qPos - 1].id); update({ qid: visible[qPos - 1].id }); }
  }

  // ---- trials --------------------------------------------------------------------
  const trialIdx = st.trialIndex ?? 0;
  const trial = TRIALS[trialIdx];
  const trialResult: TrialResult = st.trials.find((r) => r.id === trial?.id) ?? (trial ? emptyTrial(trial) : (undefined as never));
  const setTrial = (r: TrialResult) => update({ trials: [...stRef.current!.trials.filter((x) => x.id !== r.id), r] });

  // ---- analysis + plan ---------------------------------------------------------------
  async function buildPlan() {
    setBusy(true); setErr("");
    try {
      const s = stRef.current!;
      const b = buildFromOnboarding(s.answers, s.trials, s.health, s.followups);
      setBuilt(b);
      update({ stage: "analysis" });
      window.scrollTo(0, 0);
      if (!s.summary) {
        const res = await fetch("/api/coach/analysis", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intake: b.intake, analysis: b.analysis, trials: s.trials, program: { split: b.program.split, why: b.program.why, weeks: [b.program.weeks[0]] } }),
        }).catch(() => null);
        const j = res?.ok ? await res.json() : null;
        update({ summary: j?.summary ?? "" });
      }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function startTraining() {
    if (!built) return;
    setBusy(true); setErr("");
    try {
      await saveIntake(built.intake);
      await saveAssessment(built.results, built.analysis);
      await activateProgram(built.program, toISODate(new Date()), "onboarding");
      await completeOnboarding();
      router.replace("/home?welcome=1");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  const stageIdx = stage === "questions" ? 0 : stage === "trial-intro" || stage === "trials" || stage === "health" ? 1 : 2;
  const progress = stage === "questions" ? (sectionIdx + 1) / SECTIONS.length
    : stage === "trial-intro" ? 0.05 : stage === "trials" ? (trialIdx + 1) / (TRIALS.length + 1) : stage === "health" ? 0.95 : 1;

  // ---- footer button for each stage --------------------------------------------------------
  let cta: { label: string; onClick: () => void; disabled?: boolean; secondary?: { label: string; onClick: () => void } } | null = null;
  if (followUp) cta = { label: "Continue", onClick: answerFollowUp, disabled: !fuAnswer.value && !fuAnswer.text?.trim(), secondary: { label: "Skip", onClick: () => { setFuAnswer({ text: "(skipped)" }); setFollowUp(null); const vis = visibleQuestions(st.answers); const nq = vis[vis.indexOf(q) + 1]; if (nq) { setQid(nq.id); update({ qid: nq.id }); } else update({ stage: "trial-intro" }); } } };
  else if (stage === "questions") cta = q.kind === "single" || q.kind === "scale" || q.kind === "scale10"
    ? (st.answers[q.id]?.text?.trim() ? { label: "Continue", onClick: next, disabled: !canContinue(q, st.answers[q.id]) } : !q.required && st.answers[q.id]?.value === undefined ? { label: "Skip", onClick: next } : null)
    : { label: q.kind === "info" ? "Let's start" : st.answers[q.id] || !q.optional ? "Continue" : "Skip", onClick: next, disabled: !canContinue(q, st.answers[q.id]) };
  else if (stage === "trial-intro") cta = { label: "I'm warmed up, let's go", onClick: () => update({ stage: "trials", trialIndex: 0 }) };
  else if (stage === "trials") cta = {
    label: trialIdx < TRIALS.length - 1 ? "Next exercise" : "Done with the movement check",
    disabled: !trialComplete(trialResult),
    onClick: () => { if (!st.trials.find((x) => x.id === trialResult.id)) setTrial(trialResult); update(trialIdx < TRIALS.length - 1 ? { trialIndex: trialIdx + 1 } : { stage: "health" }); window.scrollTo(0, 0); },
  };
  else if (stage === "health") cta = { label: busy ? "Building your plan…" : "See my results", onClick: buildPlan, disabled: busy };
  else if (stage === "analysis") cta = { label: "Show me my plan", onClick: () => { update({ stage: "plan" }); window.scrollTo(0, 0); } };
  else if (stage === "plan") cta = { label: busy ? "Saving…" : "Start training", onClick: startTraining, disabled: busy || !!(built && programBlocked(built.intake)) };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* top bar */}
      <div className="sticky top-0 z-10 -mx-4 bg-bg/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={back} aria-label="Back" className={cx("grid h-10 w-10 place-items-center rounded-full border border-line", stage === "questions" && qPos === 0 && !followUp && "invisible")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs font-medium text-muted">
              <span>{STAGES[stageIdx].label}</span>
              <span>{stage === "questions" ? SECTIONS[sectionIdx]?.title : stage === "trials" ? `${trialIdx + 1} of ${TRIALS.length}` : ""}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {STAGES.map((s, i) => (
                <div key={s.id} className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: i < stageIdx ? "100%" : i === stageIdx ? `${Math.max(6, progress * 100)}%` : "0%" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 pb-36 pt-2">
        {thinking && <div className="flex items-center gap-3 py-6"><CoachAvatar /><span className="text-muted">Maya is thinking about your answers…</span></div>}

        {!thinking && followUp && (
          <QuestionScreen
            q={{ id: "followup", section: followUp.section, kind: followUp.options.length ? "single" : "text", coach: followUp.ask, options: followUp.options.map((o) => ({ value: o, label: o })) }}
            text={followUp.ask} answer={fuAnswer} onChange={setFuAnswer} onNext={() => {}} />
        )}

        {!thinking && !followUp && stage === "questions" && (
          <QuestionScreen key={q.id} q={q} text={fill(q.coach, st.answers)} answer={st.answers[q.id]} onChange={setAnswer} onNext={next} reactionLine={lastReaction} />
        )}

        {stage === "trial-intro" && (
          <div className="space-y-5">
            <CoachBubble><MiniMarkdown text={skill.trials.intro} /></CoachBubble>
            <div className="grid grid-cols-3 gap-2">
              {TRIALS.map((t) => (
                <div key={t.id} className="text-center">
                  <ExerciseMedia id={t.exerciseId} alt={t.title} size="md" />
                  <div className="mt-1 text-xs font-medium">{t.title}</div>
                </div>
              ))}
            </div>
            <Notice tone="accent">You&apos;ll need a chair, a towel and a door, and about 10 minutes. Stop anything that causes sharp pain.</Notice>
          </div>
        )}

        {stage === "trials" && trial && <TrialScreen key={trial.id} t={trial} r={trialResult} onChange={setTrial} />}

        {stage === "health" && <HealthChecks health={st.health} onChange={(h) => update({ health: h })} />}

        {(stage === "analysis" || stage === "plan") && !built && <Spinner />}
        {stage === "analysis" && built && <AnalysisView built={built} summary={st.summary} />}
        {stage === "plan" && built && <PlanReveal built={built} />}
        {err && <div className="mt-4"><Notice>{err}</Notice></div>}
      </div>

      {cta && !thinking && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex max-w-xl gap-2">
            {cta.secondary && <Button variant="ghost" onClick={cta.secondary.onClick}>{cta.secondary.label}</Button>}
            <Button full onClick={cta.onClick} disabled={cta.disabled} className="min-h-13 text-base">{cta.label}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthChecks({ health, onChange }: { health: TestResults; onChange: (h: TestResults) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <CoachBubble>{skill.healthTests.intro}</CoachBubble>
      {HEALTH_TESTS.map((t) => {
        const v = health[t.key] as number | undefined;
        return (
          <div key={t.key} className={cx("rounded-2xl border bg-surface", v !== undefined ? "border-good" : "border-line")}>
            <button type="button" className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === t.key ? null : t.key)}>
              <span className={cx("grid h-7 w-7 place-items-center rounded-full text-xs font-bold", v !== undefined ? "bg-good text-white" : "bg-surface-2 text-muted")}>{v !== undefined ? "✓" : ""}</span>
              <span className="flex-1"><span className="block font-semibold">{t.title}</span><span className="text-xs text-muted">{t.measures}</span></span>
              <span className="text-muted">{open === t.key ? "−" : "+"}</span>
            </button>
            {open === t.key && (
              <div className="space-y-3 border-t border-line px-4 py-4">
                <div className="text-xs text-muted">You need: {t.equipment}</div>
                <ol className="list-decimal space-y-1 pl-5 text-[15px]">{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                {t.safety && <Notice>{t.safety}</Notice>}
                {t.stopwatch ? <Timer seconds={t.timerSec} onStop={(s) => onChange({ ...health, [t.key]: s })} /> : t.timerSec ? <Timer seconds={t.timerSec} metronomeBpm={t.metronomeBpm} /> : null}
                <div className="flex items-center gap-3">
                  <input id={`health-${t.key}`} type="number" inputMode="decimal" className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-2xl font-bold outline-none focus:border-accent"
                    value={v ?? ""} onChange={(e) => onChange({ ...health, [t.key]: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  <span className="shrink-0 text-sm text-muted">{t.unit}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-center text-sm text-muted">All optional. Skip straight to your results if you like.</p>
    </div>
  );
}

function AnalysisView({ built, summary }: { built: Built; summary?: string }) {
  const an = built.analysis;
  const names: Record<string, string> = { cardio: "Cardio", upper: "Upper body", lower: "Lower body", core: "Core", mobility: "Flexibility", balance: "Balance", bodyComp: "Body composition" };
  return (
    <div className="space-y-5">
      <CoachBubble sub={summary === undefined ? "Writing your personal summary…" : undefined}>
        {summary ? <MiniMarkdown text={summary} /> : <span>Here&apos;s what I learned about you, {built.intake.name.split(" ")[0] || "friend"}. {an.summary.join(" ")}</span>}
      </CoachBubble>
      <div className="rounded-3xl bg-accent-soft p-5">
        <div className="text-sm font-semibold text-accent">Starting level</div>
        <div className="mt-1 flex items-end gap-2"><span className="text-4xl font-black capitalize">{an.level}</span><span className="pb-1 text-muted">· {an.overall}/5</span></div>
      </div>
      {an.flags.map((f) => <Notice key={f}>{f}</Notice>)}
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        {Object.entries(an.domains).map(([d, v]) => (
          <div key={d}><div className="mb-1 flex justify-between text-sm"><span>{names[d] ?? d}</span><span className="font-semibold tabular-nums">{v}/5</span></div><ScoreBar score={v} /></div>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-2 font-semibold">Nutrition targets</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 p-2"><div className="font-bold">{an.diet.calorieRange[0]}–{an.diet.calorieRange[1]}</div><div className="text-[11px] text-muted">kcal/day</div></div>
          <div className="rounded-xl bg-surface-2 p-2"><div className="font-bold">{an.diet.proteinTarget} g</div><div className="text-[11px] text-muted">protein</div></div>
          <div className="rounded-xl bg-surface-2 p-2"><div className="font-bold">{an.diet.waterTarget} L</div><div className="text-[11px] text-muted">water</div></div>
        </div>
        {an.diet.priorities[0] && <p className="mt-3 text-sm">{an.diet.priorities[0]}</p>}
      </div>
    </div>
  );
}

function PlanReveal({ built }: { built: Built }) {
  const p = built.program;
  const blocked = programBlocked(built.intake);
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="space-y-5">
      <CoachBubble>Here&apos;s your first 4-week block: <b>{p.split}</b>, {p.createdFor.daysPerWeek} days a week. Week 4 is a lighter deload.</CoachBubble>
      {blocked && <Notice>{blocked}</Notice>}
      <div className="space-y-3">
        {p.weeks[0].map((s) => (
          <div key={s.key} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between"><div className="text-lg font-bold">{s.title}</div><div className="text-sm text-muted">{DAY[s.weekday]} · ~{s.estMinutes} min</div></div>
            <div className="mt-3 grid gap-2">
              {s.main.map((m) => (
                <div key={m.exerciseId} className="flex items-center gap-3">
                  <ExerciseMedia id={m.exerciseId} alt={m.name} size="sm" />
                  <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-medium">{m.name}</div><div className="text-xs text-muted">{m.sets} × {m.reps}</div></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="mb-2 font-semibold">Why this plan fits you</div>
        <ul className="space-y-1.5 text-sm">{(p.why ?? []).map((w) => <li key={w} className="flex gap-2"><span className="text-accent">✓</span><span>{w}</span></li>)}</ul>
      </div>
      <p className="text-center text-sm text-muted">You can always ask Maya to change anything later.</p>
    </div>
  );
}
