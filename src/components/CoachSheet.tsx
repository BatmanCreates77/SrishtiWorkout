"use client";
// Coach Maya as a bottom sheet over any tab: check-ins, questions, and plan-change proposals.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CoachAvatar } from "./CoachBubble";
import { ProposalCard } from "./ProposalCard";
import { Button, cx, inputCls, MiniMarkdown, Notice } from "./ui";

type Msg = { id: string; role: "user" | "model" | "event"; content: string; meta?: { proposals?: string[] } | null };

const SUGGESTIONS = [
  "I missed a few workouts",
  "Make it easier this week",
  "I want to push harder",
  "I'm short on time",
  "Swap an exercise I don't like",
  "What should I eat after training?",
];

export function CoachSheet({ open, prefill, onClose, onApplied }: { open: boolean; prefill?: string; onClose: () => void; onApplied: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [err, setErr] = useState("");
  const checkedIn = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase().from("chat_messages").select("id, role, content, meta").order("created_at", { ascending: true }).limit(200);
    setMsgs((data as Msg[]) ?? []);
  }
  async function call(body: { message?: string; checkin?: boolean }) {
    setThinking(true); setErr("");
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Something went wrong");
      if (!j.skipped) await load();
    } catch (e) { setErr((e as Error).message); } finally { setThinking(false); }
  }

  useEffect(() => {
    if (!open) return;
    load().then(() => { if (!checkedIn.current) { checkedIn.current = true; call({ checkin: true }); } });
    if (prefill) setText(prefill);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  function send(m: string) {
    const msg = m.trim();
    if (!msg || thinking) return;
    setText("");
    setMsgs((p) => [...p, { id: `tmp-${Date.now()}`, role: "user", content: msg }]);
    call({ message: msg });
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div role="dialog" aria-label="Coach Maya" onClick={(e) => e.stopPropagation()}
        className="mx-auto flex h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl bg-bg shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <CoachAvatar />
          <div className="flex-1"><div className="font-bold">Coach Maya</div><div className="text-xs text-muted">Adjusts your plan when life happens</div></div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-lg">✕</button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {msgs.filter((m) => m.role !== "event").map((m) => (
            <div key={m.id} className="space-y-2">
              <div className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed", m.role === "user" ? "rounded-br-md bg-accent text-accent-ink" : "rounded-bl-md border border-line bg-surface")}>
                  {m.role === "model" ? <MiniMarkdown text={m.content} /> : m.content}
                </div>
              </div>
              {m.meta?.proposals?.map((id) => <ProposalCard key={id} id={id} onApplied={onApplied} />)}
            </div>
          ))}
          {thinking && <div className="flex"><div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3"><span className="inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></div></div>}
          {err && <Notice>{err}</Notice>}
          <div ref={endRef} />
        </div>
        <div className="border-t border-line px-4 pt-2" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)} disabled={thinking} className="min-h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-xs">{s}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
            <input id="coach-input" className={inputCls} placeholder="Message Maya…" value={text} onChange={(e) => setText(e.target.value)} />
            <Button disabled={thinking || !text.trim()}>Send</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
