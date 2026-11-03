"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, inputCls, Label, Notice } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "warn" | "good"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = supabase();
    const next = new URLSearchParams(window.location.search).get("next") || "/home";
    if (mode === "in") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ tone: "warn", text: error.message });
      else router.replace(next.startsWith("/") ? next : "/home");
    } else {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/home` },
      });
      if (error) setMsg({ tone: "warn", text: error.message });
      else if (data.session) router.replace("/onboarding");
      else setMsg({ tone: "good", text: "Check your inbox to confirm your email, then sign in." });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-xl font-black text-accent-ink">O</div>
        <h1 className="text-2xl font-bold">Srishti Workout</h1>
        <p className="mt-1 text-sm text-muted">Your science-based training partner</p>
      </div>
      <Card>
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
          {(["in", "up"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-lg py-2 ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}>
              {m === "in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div><Label>Your name</Label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div><Label>Email</Label><input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><input className={inputCls} type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <Button full disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
      </Card>
    </div>
  );
}
