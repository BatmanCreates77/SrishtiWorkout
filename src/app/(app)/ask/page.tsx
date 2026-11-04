"use client";
// Maya's "later" questions, one at a time (opened from the Today card or a notification).
// Every answer updates her profile so the coach sees it; probing questions can get one AI follow-up.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CoachBubble } from "@/components/CoachBubble";
import { QuestionScreen } from "@/components/QuestionScreen";
import { Button, Spinner } from "@/components/ui";
import { getOnboarding, saveIntake, saveLaterAnswer, saveOnboarding, type OnboardingState } from "@/lib/data";
import { answersToIntake, canContinue, fill, pendingLater, reaction, type Answer } from "@/lib/onboarding";
import type { Question } from "@/lib/coach/skill";
import { applyInterpretation, interpretAnswer } from "@/lib/interpret";

export default function AskPage() {
  const router = useRouter();
  const [st, setSt] = useState<OnboardingState | null>(null);
  const [answer, setAnswer] = useState<Answer>({});
  const [saving, setSaving] = useState(false);
  const [react, setReact] = useState<string | null>(null);
  const [fu, setFu] = useState<{ ask: string; options: string[]; section: string } | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => { getOnboarding().then(({ state }) => setSt(state)); }, []);
  if (!st) return <Spinner />;

  const wanted = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") : null;
  const pending = pendingLater(st.answers);
  const q: Question | undefined = pending.find((x) => x.id === wanted) ?? pending[0];

  async function save(skip = false) {
    if (!q) return;
    setSaving(true);
    let s: OnboardingState;
    let note: string | null = null;
    if (!skip && answer.text?.trim() && st) {
      // Maya reads her words: refines this answer and fills in other open questions they already answer
      const merged = { ...st.answers, [q.id]: { ...answer, at: new Date().toISOString() } };
      const r = await interpretAnswer(q.id, merged);
      s = { ...st, answers: applyInterpretation(merged, q.id, r), followups: r?.keep ? [...st.followups, { section: q.section, ask: `In her own words: ${fill(q.coach, st.answers).slice(0, 90)}`, answer: r.keep }] : st.followups };
      await saveOnboarding(s);
      note = r?.note ?? null;
    } else s = await saveLaterAnswer(q.id, skip ? { skipped: true } : answer);
    await saveIntake(answersToIntake(s.answers, s.followups)).catch(() => {});
    setReact(skip ? null : note ?? reaction(q, answer));
    // one tailored follow-up for probing questions or free-text answers
    if (!skip && (q.probe || answer.text?.trim())) {
      const res = await fetch("/api/coach/followup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: q.section, qa: [{ q: fill(q.coach, s.answers), a: [Array.isArray(answer.value) ? answer.value.join(", ") : answer.value, answer.text].filter(Boolean).join(" | ") }], asked: s.followups.map((f) => f.ask) }),
      }).catch(() => null);
      const j = res?.ok ? await res.json() : null;
      if (j?.ask) setFu({ ask: j.ask, options: j.options ?? [], section: q.section });
    }
    setSt(s); setAnswer({}); setCount((c) => c + 1); setSaving(false);
    window.scrollTo(0, 0);
  }

  async function saveFollowUp(skip = false) {
    if (!fu || !st) return;
    const text = [answer.value, answer.text?.trim()].filter(Boolean).join(" | ");
    const next = skip || !text ? st : { ...st, followups: [...st.followups, { section: fu.section, ask: fu.ask, answer: text }] };
    if (next !== st) { await saveOnboarding(next); await saveIntake(answersToIntake(next.answers, next.followups)).catch(() => {}); }
    setSt(next); setFu(null); setAnswer({});
  }

  const footer = (primary: { label: string; onClick: () => void; disabled?: boolean }, secondary?: { label: string; onClick: () => void }) => (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex max-w-xl gap-2">
        {secondary && <Button variant="ghost" onClick={secondary.onClick} disabled={saving}>{secondary.label}</Button>}
        <Button full className="min-h-13" onClick={primary.onClick} disabled={primary.disabled || saving}>{primary.label}</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-32 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Link href="/home" className="text-sm text-muted">✕ Close</Link>
        {pending.length > 0 && <span className="text-xs text-muted">{pending.length} left · answer as many as you like</span>}
      </div>
      {react && <CoachBubble>{react}</CoachBubble>}
      {fu ? (
        <>
          <QuestionScreen q={{ id: "fu", section: fu.section, stage: "later", kind: fu.options.length ? "single" : "text", coach: fu.ask, options: fu.options.map((o) => ({ value: o, label: o })) }}
            text={fu.ask} answer={answer} onChange={setAnswer} onNext={() => {}} />
          {footer({ label: "Save", onClick: () => saveFollowUp(), disabled: !answer.value && !answer.text?.trim() }, { label: "Skip", onClick: () => saveFollowUp(true) })}
        </>
      ) : q ? (
        <>
          <QuestionScreen key={q.id} q={q} text={fill(q.coach, st.answers)} answer={answer} onChange={setAnswer} onNext={() => {}} />
          {footer({ label: saving ? (answer.text?.trim() ? "Maya is reading…" : "Saving…") : "Save", onClick: () => save(), disabled: !(answer.text?.trim() || (Array.isArray(answer.value) ? answer.value.length : answer.value !== undefined)) || !canContinue({ ...q, required: false }, answer) }, { label: "Skip", onClick: () => save(true) })}
        </>
      ) : (
        <>
          <CoachBubble>{count ? "Thank you! That's everything for now. I'll use it to keep tuning your plan." : "No questions right now. I'll ask when there's something new."}</CoachBubble>
          {footer({ label: "Back to Today", onClick: () => router.push("/home") })}
        </>
      )}
    </div>
  );
}
