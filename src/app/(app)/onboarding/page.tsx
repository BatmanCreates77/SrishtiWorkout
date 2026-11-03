"use client";
/* eslint-disable react-hooks/refs -- stRef is only read inside event handlers collected in the `cta` object, never during render. */
// Coach-led onboarding, kept short: essentials → movement check → quick debrief (goals, schedule, kit)
// → pick one of 3 plan styles → notification setup. Everything else is asked later, one question at a time.
// All questions come from the coach skill (coach-skill/content/questions.json, by `stage`).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CoachAvatar, CoachBubble } from "@/components/CoachBubble";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { NotifySetup } from "@/components/NotifySetup";
import { QuestionScreen } from "@/components/QuestionScreen";
import { emptyTrial, TrialScreen, trialComplete } from "@/components/TrialScreen";
import { Button, cx, MiniMarkdown, Notice, Spinner } from "@/components/ui";
import { skill, TRIALS, type Question } from "@/lib/coach/skill";
import {
  activateProgram, completeOnboarding, getOnboarding, saveAssessment, saveIntake, saveNotifyPrefs, saveOnboarding, type OnboardingState,
} from "@/lib/data";
import { answersToIntake, canContinue, fill, reaction, visibleQuestions, type Answer, type Stage } from "@/lib/onboarding";
import { planOptions, type PlanOption } from "@/lib/plan-builder";
import { DEFAULT_PREFS, type NotifyPrefs } from "@/lib/push";
import { programBlocked } from "@/lib/science/analysis";
import { toISODate } from "@/lib/science/schedule";
import type { TrialResult } from "@/lib/science/types";
import { supabase } from "@/lib/supabase/client";

type FollowUp = { section: string; ask: string; options: string[] };
type ObStage = NonNullable<OnboardingState["stage"]>;
const Q_STAGE: Partial<Record<ObStage, Stage>> = { questions: "essentials", debrief: "after_test" };
const MAX_FOLLOWUPS: Partial<Record<ObStage, number>> = { questions: 1, debrief: 2 };
const STEPS = [
  { label: "About you", stages: ["questions"] },
  { label: "Movement check", stages: ["trial-intro", "trials"] },
  { label: "Your plan", stages: ["debrief", "options", "notify"] },
] as const;
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function OnboardingPage() {
  const router = useRouter();
  const [st, setSt] = useState<OnboardingState | null>(null);
  const [qid, setQid] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [fuAnswer, setFuAnswer] = useState<Answer>({});
  const [thinking, setThinking] = useState(false);
  const [lastReaction, setLastReaction] = useState<string | null>(null);
  const [options, setOptions] = useState<PlanOption[] | null>(null);
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const stRef = useRef<OnboardingState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstQ = (s: OnboardingState) => {
    const qs = Q_STAGE[s.stage ?? "questions"];
    if (!qs) return null;
    const vis = visibleQuestions(s.answers, [qs]);
    return vis.find((q) => q.id === s.qid)?.id ?? vis[0]?.id ?? null;
  };

  useEffect(() => {
    Promise.all([getOnboarding(), supabase().auth.getUser()]).then(([{ state, completedAt }, { data }]) => {
      if (completedAt) { router.replace("/home"); return; }
      const legacy = ["health", "analysis", "plan"].includes(String(state.stage));
      const s: OnboardingState = { ...state, stage: legacy ? "debrief" : state.stage ?? "questions" };
      const signupName = (data.user?.user_metadata?.display_name as string | undefined)?.trim();
      if (signupName && !s.answers.name) s.answers = { ...s.answers, name: { text: signupName } };
      stRef.current = s; setSt(s); setQid(firstQ(s));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    const next = { ...stRef.current!, ...patch };
    stRef.current = next; setSt(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveOnboarding(next).catch(() => {}), 400);
  }, []);

  // plan options are computed when she reaches that step (also on resume)
  const stageNow = st?.stage;
  useEffect(() => {
    if (stageNow !== "options" && stageNow !== "notify") return;
    if (options) return;
    const s = stRef.current!;
    try {
      const opts = planOptions(s.answers, s.trials, s.health, s.followups);
      setOptions(opts);
      if (!s.summary) {
        const rec = opts[0].built;
        fetch("/api/coach/analysis", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intake: rec.intake, analysis: rec.analysis, trials: s.trials, program: { split: rec.program.split, why: rec.program.why, weeks: [rec.program.weeks[0]] } }),
        }).then((r) => (r.ok ? r.json() : null)).then((j) => update({ summary: j?.summary ?? "" })).catch(() => update({ summary: "" }));
      }
    } catch (e) { setErr((e as Error).message); }
  }, [stageNow, options, update]);

  if (!st) return <Spinner />;
  const stage: ObStage = st.stage ?? "questions";
  const qStage = Q_STAGE[stage];
  const visible = qStage ? visibleQuestions(st.answers, [qStage]) : [];
  const q = visible.find((x) => x.id === qid) ?? visible[0];
  const qPos = q ? visible.indexOf(q) : 0;

  const go = (patch: Partial<OnboardingState>) => {
    update(patch);
    const s = stRef.current!;
    setQid(firstQ(s)); setLastReaction(null); setFollowUp(null);
    window.scrollTo(0, 0);
  };
  const afterQuestions = (from: ObStage) => go(from === "questions" ? { stage: "trial-intro", qid: undefined } : { stage: "options", qid: undefined });

  // ---- questions ---------------------------------------------------------------------
  const setAnswer = (a: Answer) => update({ answers: { ...stRef.current!.answers, [q!.id]: a } });

  async function maybeFollowUp(section: string): Promise<FollowUp | null> {
    const s = stRef.current!;
    const cap = MAX_FOLLOWUPS[stage] ?? 0;
    if ((s.followupCount?.[section] ?? 0) >= cap) return null;
    const qs = visibleQuestions(s.answers, qStage ? [qStage] : undefined).filter((x) => x.section === section && x.kind !== "info");
    if (!qs.some((x) => x.probe) && !qs.some((x) => s.answers[x.id]?.text?.trim())) return null;
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
          qa: [...qs.map((x) => ({ q: fill(x.coach, s.answers), a: label(x) })), ...s.followups.filter((f) => f.section === section).map((f) => ({ q: f.ask, a: f.answer }))],
          profile: `${intake.name || "user"}, ${intake.age}y ${intake.sex}, goal ${intake.primaryGoal}, pain: ${intake.painAreas.join("/") || "none"}${s.trials.length ? `; movement check done: ${s.trials.map((r) => `${r.id} ${r.value} (${r.feel})`).join(", ")}` : ""}`,
          asked: s.followups.map((f) => f.ask),
          // topics the app asks itself, later in this flow or after onboarding: the AI must not ask them
          later: [
            ...visibleQuestions(s.answers, ["essentials", "after_test"]).filter((x) => !s.answers[x.id] && x.section !== section).map((x) => fill(x.coach, s.answers).slice(0, 38)),
            "sleep, stress, energy", "nutrition and diet", "motivation", "daily activity and job", "past injuries",
          ].slice(0, 12),
        }),
      });
      clearTimeout(t);
      const j = await res.json();
      return j.ask ? { section, ask: j.ask, options: j.options ?? [] } : null;
    } catch { return null; } finally { setThinking(false); }
  }

  async function next() {
    const s = stRef.current!;
    const vis = visibleQuestions(s.answers, [qStage!]);
    const cur = vis.find((x) => x.id === qid) ?? vis[0];
    if (!canContinue(cur, s.answers[cur.id])) return;
    const nq = vis[vis.indexOf(cur) + 1];
    setLastReaction(reaction(cur, s.answers[cur.id]));
    if (!nq || nq.section !== cur.section) {
      const fu = await maybeFollowUp(cur.section);
      if (fu) { setFollowUp(fu); setFuAnswer({}); return; }
    }
    if (nq) { setQid(nq.id); update({ qid: nq.id }); window.scrollTo(0, 0); } else afterQuestions(stage);
  }

  function continueAfterFollowUp() {
    setFollowUp(null);
    const vis = visibleQuestions(stRef.current!.answers, [qStage!]);
    const nq = vis[vis.indexOf(vis.find((x) => x.id === qid) ?? vis[0]) + 1];
    if (nq) { setQid(nq.id); update({ qid: nq.id }); window.scrollTo(0, 0); } else afterQuestions(stage);
  }

  async function answerFollowUp() {
    if (!followUp) return;
    const ans = [fuAnswer.value, fuAnswer.text?.trim()].filter(Boolean).join(" | ");
    if (!ans) return;
    const s = stRef.current!;
    update({
      followups: [...s.followups, { section: followUp.section, ask: followUp.ask, answer: ans }],
      followupCount: { ...(s.followupCount ?? {}), [followUp.section]: (s.followupCount?.[followUp.section] ?? 0) + 1 },
    });
    setLastReaction(null);
    const fu = await maybeFollowUp(followUp.section);
    if (fu) { setFollowUp(fu); setFuAnswer({}); return; }
    continueAfterFollowUp();
  }

  function back() {
    if (followUp) { setFollowUp(null); return; }
    if (qStage && qPos > 0) { setLastReaction(null); setQid(visible[qPos - 1].id); update({ qid: visible[qPos - 1].id }); return; }
    if (stage === "trial-intro") return go({ stage: "questions" });
    if (stage === "trials") { const i = st!.trialIndex ?? 0; return i > 0 ? update({ trialIndex: i - 1 }) : go({ stage: "trial-intro" }); }
    if (stage === "debrief") return go({ stage: "trials", trialIndex: TRIALS.length - 1 });
    if (stage === "options") { setOptions(null); return go({ stage: "debrief" }); }
    if (stage === "notify") return go({ stage: "options" });
  }

  // ---- movement check --------------------------------------------------------------------
  const trialIdx = st.trialIndex ?? 0;
  const trial = TRIALS[trialIdx];
  const trialResult: TrialResult = st.trials.find((r) => r.id === trial?.id) ?? emptyTrial(trial);
  const setTrial = (r: TrialResult) => update({ trials: [...stRef.current!.trials.filter((x) => x.id !== r.id), r] });

  // ---- finish ------------------------------------------------------------------------------
  const chosen = options?.find((o) => o.key === st.chosenSplit) ?? options?.[0];
  async function startTraining() {
    if (!chosen) return;
    setBusy(true); setErr("");
    try {
      const b = chosen.built;
      await saveIntake(b.intake);
      await saveAssessment(b.results, b.analysis);
      await activateProgram(b.program, toISODate(new Date()), "onboarding");
      await saveNotifyPrefs(prefs);
      await saveOnboarding({ ...stRef.current!, stage: "notify" });
      await completeOnboarding();
      router.replace("/home?welcome=1");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  // ---- layout ------------------------------------------------------------------------------
  const stepIdx = STEPS.findIndex((s) => (s.stages as readonly string[]).includes(stage));
  const progress = qStage ? (qPos + 1) / Math.max(1, visible.length) : stage === "trials" ? (trialIdx + 1) / TRIALS.length : stage === "trial-intro" ? 0.05 : stage === "options" ? 0.75 : 1;
  const subLabel = qStage ? `${qPos + 1} of ${visible.length}` : stage === "trials" ? `${trialIdx + 1} of ${TRIALS.length}` : "";

  let cta: { label: string; onClick: () => void; disabled?: boolean; secondary?: { label: string; onClick: () => void } } | null = null;
  if (followUp) cta = { label: "Continue", onClick: answerFollowUp, disabled: !fuAnswer.value && !fuAnswer.text?.trim(), secondary: { label: "Skip", onClick: continueAfterFollowUp } };
  else if (qStage && q) {
    const a = st.answers[q.id];
    const tapToGo = q.kind === "single" || q.kind === "scale" || q.kind === "scale10";
    cta = tapToGo
      ? (a?.text?.trim() ? { label: "Continue", onClick: next, disabled: !canContinue(q, a) } : !q.required && a?.value === undefined ? { label: "Skip", onClick: next } : null)
      : { label: q.kind === "info" ? "Let's start" : a || !q.optional ? "Continue" : "Skip", onClick: next, disabled: !canContinue(q, a) };
  } else if (stage === "trial-intro") cta = { label: "I'm warmed up, let's go", onClick: () => update({ stage: "trials", trialIndex: 0 }) };
  else if (stage === "trials") cta = {
    label: trialIdx < TRIALS.length - 1 ? "Next exercise" : "Done, tell me what you saw",
    disabled: !trialComplete(trialResult),
    onClick: () => {
      if (!st.trials.find((x) => x.id === trialResult.id)) setTrial(trialResult);
      if (trialIdx < TRIALS.length - 1) { update({ trialIndex: trialIdx + 1 }); window.scrollTo(0, 0); } else go({ stage: "debrief", qid: undefined });
    },
  };
  else if (stage === "options") cta = chosen ? { label: `Go with ${chosen.name}`, onClick: () => go({ stage: "notify", chosenSplit: chosen.key }), disabled: !!programBlocked(chosen.built.intake) } : null;
  else if (stage === "notify") cta = { label: busy ? "Setting up…" : "Start training", onClick: startTraining, disabled: busy };

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-10 -mx-4 bg-bg/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={back} aria-label="Back" className={cx("grid h-10 w-10 place-items-center rounded-full border border-line", stage === "questions" && qPos === 0 && !followUp && "invisible")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs font-medium text-muted"><span>{STEPS[stepIdx]?.label}</span><span>{subLabel}</span></div>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {STEPS.map((s, i) => (
                <div key={s.label} className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: i < stepIdx ? "100%" : i === stepIdx ? `${Math.max(6, progress * 100)}%` : "0%" }} />
                </div>
              ))}
            </div>
          </div>
          <Link href="/settings" aria-label="Settings" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>
          </Link>
        </div>
      </div>

      <div className="flex-1 pb-36 pt-2">
        {thinking && <div className="flex items-center gap-3 py-6"><CoachAvatar /><span className="text-muted">Maya is thinking about your answers…</span></div>}

        {!thinking && followUp && (
          <QuestionScreen
            q={{ id: "followup", section: followUp.section, stage: "later", kind: followUp.options.length ? "single" : "text", coach: followUp.ask, options: followUp.options.map((o) => ({ value: o, label: o })) }}
            text={followUp.ask} answer={fuAnswer} onChange={setFuAnswer} onNext={() => {}} />
        )}

        {!thinking && !followUp && qStage && q && (
          <>
            {stage === "debrief" && qPos === 0 && <CoachBubble className="mb-4">Great job! A few quick questions about how that felt and what you want, then I&apos;ll show you plan options.</CoachBubble>}
            <QuestionScreen key={q.id} q={q} text={fill(q.coach, st.answers)} answer={st.answers[q.id]} onChange={setAnswer} onNext={next} reactionLine={lastReaction} />
          </>
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

        {stage === "options" && (options ? (
          <div className="space-y-4">
            <CoachBubble sub={st.summary === undefined ? "Writing your summary…" : undefined}>
              {st.summary ? <MiniMarkdown text={st.summary} /> : <span>Here&apos;s what I&apos;d suggest based on your answers and movement check. My pick is marked, but choose what excites you most.</span>}
            </CoachBubble>
            {options.map((o) => {
              const sel = (st.chosenSplit ?? options[0].key) === o.key;
              const p = o.built.program;
              return (
                <button key={o.key} type="button" onClick={() => update({ chosenSplit: o.key })}
                  className={cx("block w-full rounded-3xl border-2 p-4 text-left transition", sel ? "border-accent bg-surface" : "border-line bg-surface")}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-lg font-bold">{o.name}</div>
                    {o.recommended && <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-ink">Maya&apos;s pick</span>}
                  </div>
                  <p className="mt-1 text-sm">{o.blurb}</p>
                  <p className="mt-1 text-xs text-muted">{o.best}</p>
                  <div className="mt-3 space-y-1.5">
                    {p.weeks[0].map((s) => (
                      <div key={s.key} className="flex items-center gap-2">
                        <span className="w-9 shrink-0 text-xs font-semibold text-muted">{DAY[s.weekday]}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.title}</span>
                        <div className="flex -space-x-2">{s.main.slice(0, 3).map((m) => <ExerciseMedia key={m.exerciseId} id={m.exerciseId} alt={m.name} size="sm" className="!h-9 !w-9 ring-2 ring-surface" />)}</div>
                      </div>
                    ))}
                  </div>
                  <div className={cx("mt-3 text-sm font-semibold", sel ? "text-accent" : "text-muted")}>{sel ? "✓ Selected" : "Tap to choose"}</div>
                </button>
              );
            })}
            {chosen && programBlocked(chosen.built.intake) && <Notice>{programBlocked(chosen.built.intake)}</Notice>}
          </div>
        ) : <Spinner />)}

        {stage === "notify" && (
          <div className="space-y-4">
            <CoachBubble>
              Last step! I&apos;ll nudge you on workout days, ask the odd quick question so I can keep tuning your plan, and send a weekly recap. When should reminders arrive?
            </CoachBubble>
            <NotifySetup prefs={prefs} onChange={setPrefs} />
            <p className="text-center text-xs text-muted">You can change all of this anytime under <b>Settings</b> (gear icon on the Today screen).</p>
          </div>
        )}
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
