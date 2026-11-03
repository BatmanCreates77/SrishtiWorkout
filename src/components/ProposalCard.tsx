"use client";
// A plan change the coach prepared. Nothing changes until she taps Apply; Undo restores the previous version.
import { useEffect, useState } from "react";
import { applyProposal, dismissProposal, getActiveProgram, getProposal, undoProgram, type Proposal } from "@/lib/data";
import { Button, cx } from "./ui";

export function ProposalCard({ id, onApplied }: { id: string; onApplied?: () => void }) {
  const [p, setP] = useState<Proposal | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [undone, setUndone] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { getProposal(id).then(setP); }, [id]);
  if (p === undefined) return <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />;
  if (!p) return null;

  async function apply() {
    setBusy(true); setErr("");
    try {
      await applyProposal(p!);
      setP({ ...p!, status: "applied" }); onApplied?.();
    } catch {
      setErr("Couldn't apply that change. Check your connection and try again.");
    } finally { setBusy(false); }
  }
  async function dismiss() { await dismissProposal(p!.id); setP({ ...p!, status: "dismissed" }); }
  async function undo() {
    setBusy(true);
    const cur = await getActiveProgram();
    if (cur && (await undoProgram(cur))) { setUndone(true); onApplied?.(); }
    setBusy(false);
  }

  return (
    <div className={cx("rounded-2xl border p-4", p.status === "applied" ? "border-good bg-good-soft" : "border-accent bg-surface")}>
      <div className="text-xs font-semibold uppercase tracking-wide text-accent">Plan change</div>
      <div className="mt-1 font-semibold">{p.summary}</div>
      <ul className="mt-2 space-y-1 text-sm">{p.diff.map((d) => <li key={d} className="flex gap-2"><span className="text-muted">→</span><span>{d}</span></li>)}</ul>
      {p.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Button onClick={apply} disabled={busy} className="flex-1">{busy ? "Applying…" : "Apply to my plan"}</Button>
          <Button variant="ghost" onClick={dismiss} disabled={busy}>Not now</Button>
        </div>
      )}
      {p.status === "applied" && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-good">{undone ? "Undone: back to your previous plan" : "✓ Applied. Today and Plan are updated"}</span>
          {!undone && <button type="button" onClick={undo} disabled={busy} className="min-h-10 px-2 font-semibold underline">Undo</button>}
        </div>
      )}
      {err && <div className="mt-2 text-sm text-warn">{err}</div>}
      {p.status === "dismissed" && <div className="mt-2 text-sm text-muted">Kept your current plan.</div>}
    </div>
  );
}
