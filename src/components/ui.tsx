"use client";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" | "soft"; full?: boolean };
const btnBase = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
const btnVariants = {
  primary: "bg-accent text-accent-ink hover:brightness-105",
  soft: "bg-accent-soft text-accent hover:brightness-95",
  ghost: "border border-line bg-surface text-ink hover:bg-surface-2",
};

export function Button({ variant = "primary", full, className, ...p }: BtnProps) {
  return <button className={cx(btnBase, btnVariants[variant], full && "w-full", className)} {...p} />;
}

export function LinkButton({ href, variant = "primary", full, className, children }: { href: string; variant?: keyof typeof btnVariants; full?: boolean; className?: string; children: ReactNode }) {
  return <Link href={href} className={cx(btnBase, btnVariants[variant], full && "w-full", className)}>{children}</Link>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-line bg-surface p-4", className)}>{children}</div>;
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1.5">
      <div className="text-sm font-semibold">{children}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

export const inputCls = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent";

export function NumberInput({ value, onChange, min, max, step, suffix, placeholder }: { value: number | undefined; onChange: (v: number | undefined) => void; min?: number; max?: number; step?: number; suffix?: string; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number" inputMode="decimal" className={inputCls} min={min} max={max} step={step ?? 1} placeholder={placeholder}
        value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
      {suffix && <span className="shrink-0 text-sm text-muted">{suffix}</span>}
    </div>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, multi }: { options: { value: T; label: string }[]; value: T | T[] | undefined; onChange: (v: T | T[]) => void; multi?: boolean }) {
  const selected = (v: T) => (multi ? (value as T[] | undefined)?.includes(v) : value === v);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)} type="button"
          onClick={() => {
            if (multi) {
              const arr = (value as T[] | undefined) ?? [];
              onChange(arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value]);
            } else onChange(o.value);
          }}
          className={cx(
            "rounded-full border px-3.5 py-2 text-sm transition",
            selected(o.value) ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-surface text-ink hover:bg-surface-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Scale({ value, onChange, low, high }: { value: number | undefined; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={cx("rounded-xl border py-2.5 text-sm font-semibold", value === n ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface")}>
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted"><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

export function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.max(4, Math.min(100, (score / max) * 100));
  const color = score >= 4 ? "bg-good" : score >= 3 ? "bg-accent" : "bg-warn";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={cx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "good" | "accent"; children: ReactNode }) {
  const cls = { warn: "bg-warn-soft text-warn", good: "bg-good-soft text-good", accent: "bg-accent-soft text-accent" }[tone];
  return <div className={cx("rounded-xl px-3.5 py-3 text-sm", cls)}>{children}</div>;
}

export function PageTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </header>
  );
}

export function Spinner() {
  return <div className="mx-auto my-16 h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent" />;
}

/** Tiny safe markdown: **bold**, bullet lists, line breaks. */
export function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part.replace(/(^|\s)\*([^*]+)\*/g, "$1$2")}</span>,
    );
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>)}
            </ul>
          );
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{inline(l.replace(/^#+\s*/, ""))}{j < lines.length - 1 && <br />}</span>)}</p>;
      })}
    </div>
  );
}
