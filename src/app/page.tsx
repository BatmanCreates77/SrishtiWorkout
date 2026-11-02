"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

const FEATURES = [
  { t: "Coach-grade intake", d: "Health screen (PAR-Q+), training history, goals, recovery and an honest diet snapshot." },
  { t: "Real fitness tests", d: "10 validated field tests with guided timers: push-ups, plank, squat, step test, VO2max walk and more." },
  { t: "Scored against norms", d: "Your results rated against published age/sex norms, plus a nutrition analysis with protein and calorie targets." },
  { t: "A plan built for you", d: "4-week periodised program matched to your level, goal, schedule and equipment, with a deload built in." },
  { t: "AI coach that checks in", d: "Coach Maya knows your plan and logs, notices missed days and adjusts your program when life happens." },
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
      <p className="mt-4 text-lg text-muted">OpenGym Coach assesses where you are, builds a science-based plan for where you want to go, and coaches you every day in between.</p>
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
