"use client";
// Today: Maya's next "later" question (asked after onboarding, one at a time).
import Link from "next/link";
import { useEffect, useState } from "react";
import { getOnboarding } from "@/lib/data";
import { fill, pendingLater } from "@/lib/onboarding";
import { CoachBubble } from "./CoachBubble";

export function PendingQuestionCard() {
  const [q, setQ] = useState<{ text: string; left: number } | null>(null);
  useEffect(() => {
    getOnboarding().then(({ state, completedAt }) => {
      if (!completedAt) return;
      const pending = pendingLater(state.answers);
      if (pending.length) setQ({ text: fill(pending[0].coach, state.answers), left: pending.length });
    }).catch(() => {});
  }, []);
  if (!q) return null;
  return (
    <CoachBubble>
      <span className="text-xs font-semibold uppercase tracking-wide text-accent">Quick question</span>
      <span className="mt-0.5 block text-[15px]">{q.text}</span>
      <Link href="/ask" className="mt-2 inline-flex min-h-10 items-center rounded-xl bg-accent px-3 text-sm font-semibold text-accent-ink">Answer (10 sec)</Link>
    </CoachBubble>
  );
}
