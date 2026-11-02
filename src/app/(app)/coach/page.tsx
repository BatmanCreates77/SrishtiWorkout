"use client";
import { useEffect, useRef, useState } from "react";
import { Button, cx, inputCls, MiniMarkdown, Notice } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type Msg = { id: string; role: "user" | "model" | "event"; content: string; meta?: { programChanged?: boolean } | null };

const SUGGESTIONS = [
  "I missed a few workouts this week",
  "I want to push harder",
  "I'm short on time this week",
  "I got new equipment",
  "What should I eat after a workout?",
  "Explain my test results",
];

export default function CoachPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    const { data } = await supabase().from("chat_messages").select("id, role, content, meta").order("created_at", { ascending: true }).limit(200);
    setMsgs((data as Msg[]) ?? []);
  }

  async function call(body: { message?: string; checkin?: boolean }) {
    setThinking(true); setErr("");
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      if (!json.skipped) await loadHistory();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setThinking(false);
    }
  }

  useEffect(() => {
    loadHistory().then(() => call({ checkin: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  async function send(m: string) {
    const msg = m.trim();
    if (!msg || thinking) return;
    setText("");
    setMsgs((p) => [...p, { id: `tmp-${Date.now()}`, role: "user", content: msg }]);
    await call({ message: msg });
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <header className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-accent text-lg font-bold text-accent-ink">M</div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Coach Maya</h1>
          <p className="text-xs text-muted">Evidence-based coach · knows your tests, plan and logs</p>
        </div>
      </header>

      <div className="flex-1 space-y-3">
        {msgs.length === 0 && !thinking && (
          <div className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">Ask anything about your training, recovery or nutrition. I can also adjust your plan when life gets busy.</div>
        )}
        {msgs.filter((m) => m.role !== "event").map((m) => (
          <div key={m.id} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed", m.role === "user" ? "rounded-br-md bg-accent text-accent-ink" : "rounded-bl-md border border-line bg-surface")}>
              {m.role === "model" ? <MiniMarkdown text={m.content} /> : m.content}
              {m.meta?.programChanged && <div className="mt-2 text-xs font-semibold text-good">✓ Program updated. See the Plan tab.</div>}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
            <span className="inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
          </div></div>
        )}
        {err && <Notice>{err}</Notice>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-16 -mx-4 mt-4 bg-bg/95 px-4 pb-3 pt-2 backdrop-blur">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={thinking} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-xs">{s}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
          <input className={inputCls} placeholder="Message your coach…" value={text} onChange={(e) => setText(e.target.value)} />
          <Button disabled={thinking || !text.trim()}>Send</Button>
        </form>
      </div>
    </div>
  );
}
