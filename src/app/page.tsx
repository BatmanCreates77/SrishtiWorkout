"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

const FEATURES = [
  { t: "Maya gets to know you", d: "A friendly coach asks about your goals, health, schedule, equipment and food, one question at a time, in your own words." },
  { t: "A quick movement check", d: "Six simple exercises show where you're starting. Struggled with one? Maya swaps in an easier version on the spot." },
  { t: "A plan curated for you", d: "4 weeks of workouts built around your answers and your results, including injuries, likes and dislikes." },
  { t: "Just open and train", d: "Today's workout, step by step with demos, timers and last time's numbers." },
  { t: "Maya adjusts when life happens", d: "Missed a few days? Feeling strong? Tell Maya and approve the change in one tap." },
];

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    supabase().auth.getUser().then(({ data }) => { if (data.user) router.replace("/home"); });
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-xl font-black text-accent-ink">O</div>
      <h1 className="text-4xl font-black leading-tight tracking-tight">Train smarter,<br />with a coach in your pocket.</h1>
      <p className="mt-4 text-lg text-muted">Srishti Workout assesses where you are, builds a science-based plan for where you want to go, and coaches you every day in between.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/login" className="rounded-xl bg-accent px-6 py-3 font-semibold text-accent-ink">Get started</Link>
      </div>
      <div className="mt-12 space-y-4">
        {FEATURES.map((f, i) => (
          <div key={i} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">{i + 1}</div>
            <div><div className="font-semibold">{f.t}</div><div className="text-sm text-muted">{f.d}</div></div>
          </div>
        ))}
      </div>
      <p className="mt-10 text-xs text-muted">For general fitness guidance only. Not medical advice. Consult a professional if you have health conditions.</p>
    </div>
  );
}
