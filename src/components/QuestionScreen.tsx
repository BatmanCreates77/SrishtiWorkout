"use client";
// One coach question per screen: speech bubble, tappable options, and always a free-text answer.
import { useEffect, useRef } from "react";
import type { Question } from "@/lib/coach/skill";
import type { Answer } from "@/lib/onboarding";
import { CoachBubble } from "./CoachBubble";
import { cx, MiniMarkdown } from "./ui";

const optBtn = "min-h-12 rounded-2xl border px-4 py-3 text-left text-[15px] font-medium transition active:scale-[0.98]";

export function QuestionScreen({
  q, text, answer, onChange, onNext, reactionLine,
}: {
  q: Question; text: string; answer: Answer | undefined; onChange: (a: Answer) => void; onNext: () => void; reactionLine?: string | null;
}) {
  const value = answer?.value;
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (nextTimer.current) clearTimeout(nextTimer.current); }, []);

  const pickSingle = (v: Option["value"]) => {
    onChange({ ...answer, value: v });
    // tap-to-advance, unless she has started typing her own answer
    if (!answer?.text?.trim()) { nextTimer.current = setTimeout(onNext, 280); }
  };
  const toggleMulti = (v: Option["value"], exclusive?: boolean) => {
    const cur = Array.isArray(value) ? (value as unknown[]) : [];
    const exclusiveVals = (q.options ?? []).filter((o) => o.exclusive).map((o) => o.value);
    let next: unknown[];
    if (cur.includes(v)) next = cur.filter((x) => x !== v);
    else if (exclusive) next = [v];
    else next = [...cur.filter((x) => !exclusiveVals.includes(x as never)), v];
    onChange({ ...answer, value: next });
  };

  return (
    <div className="space-y-5">
      {reactionLine && <CoachBubble className="opacity-90"><span className="text-[15px]">{reactionLine}</span></CoachBubble>}
      <CoachBubble><MiniMarkdown text={text} /></CoachBubble>

      {q.kind === "single" && (
        <div className="grid gap-2.5">
          {q.options!.map((o) => (
            <button key={String(o.value)} type="button" onClick={() => pickSingle(o.value)}
              className={cx(optBtn, value === o.value ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface")}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {q.kind === "multi" && (
        <div className="flex flex-wrap gap-2.5">
          {q.options!.map((o) => {
            const on = Array.isArray(value) && (value as unknown[]).includes(o.value);
            return (
              <button key={String(o.value)} type="button" onClick={() => toggleMulti(o.value, o.exclusive)} aria-pressed={on}
                className={cx("min-h-11 rounded-full border px-4 py-2 text-[15px] font-medium", on ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface")}>
                {on ? "✓ " : ""}{o.label}
              </button>
            );
          })}
        </div>
      )}

      {q.kind === "number" && (
        <div className="flex items-center gap-3">
          <input id={`q-${q.id}`} type="number" inputMode="decimal" step={q.step ?? 1} min={q.min} max={q.max} autoFocus
            className="w-full rounded-2xl border border-line bg-surface px-4 py-4 text-3xl font-bold tabular-nums outline-none focus:border-accent"
            value={value === undefined ? "" : String(value)}
            onChange={(e) => onChange({ ...answer, value: e.target.value === "" ? undefined : Number(e.target.value) })}
            onKeyDown={(e) => { if (e.key === "Enter") onNext(); }} />
          {q.unit && <span className="shrink-0 text-lg text-muted">{q.unit}</span>}
        </div>
      )}

      {(q.kind === "scale" || q.kind === "scale10") && (
        <div>
          <div className={cx("grid gap-2", q.kind === "scale" ? "grid-cols-5" : "grid-cols-6")}>
            {(q.kind === "scale" ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((n) => (
              <button key={n} type="button" onClick={() => pickSingle(n)}
                className={cx("h-12 rounded-xl border text-base font-semibold", value === n ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface")}>{n}</button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted"><span>{q.low ?? (q.kind === "scale10" ? "No pain" : "Low")}</span><span>{q.high ?? (q.kind === "scale10" ? "Worst" : "High")}</span></div>
        </div>
      )}

      {q.kind === "text" && (
        <textarea id={`q-${q.id}`} rows={3} autoFocus={q.required}
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-[16px] outline-none focus:border-accent"
          placeholder="Type your answer…" value={answer?.text ?? ""} onChange={(e) => onChange({ ...answer, text: e.target.value })} />
      )}

      {q.kind !== "info" && q.kind !== "text" && (
        <div>
          <label htmlFor={`free-${q.id}`} className="mb-1.5 block text-xs font-medium text-muted">Or tell me in your own words (optional)</label>
          <textarea id={`free-${q.id}`} rows={2}
            className="w-full rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent focus:border-solid"
            placeholder="Anything you'd like me to know…" value={answer?.text ?? ""} onChange={(e) => onChange({ ...answer, text: e.target.value })} />
        </div>
      )}
    </div>
  );
}

type Option = NonNullable<Question["options"]>[number];
