"use client";
// App frame: auth check, onboarding gate, bottom tabs (exercise-first) and the floating coach.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getOnboarding } from "@/lib/data";
import { supabase } from "@/lib/supabase/client";
import { CoachSheet } from "./CoachSheet";
import { cx, Spinner } from "./ui";

const NAV = [
  { href: "/home", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/program", label: "Plan", icon: "M8 3v4M16 3v4M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" },
  { href: "/exercises", label: "Library", icon: "M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12" },
  { href: "/me", label: "Progress", icon: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
];

type CoachCtx = { open: (prefill?: string) => void; planVersion: number; bumpPlan: () => void };
const Ctx = createContext<CoachCtx>({ open: () => {}, planVersion: 0, bumpPlan: () => {} });
/** Open the coach from anywhere; planVersion changes when a coach proposal is applied (pages reload their plan). */
export const useCoach = () => useContext(Ctx);

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | undefined>();
  const [planVersion, setPlanVersion] = useState(0);
  const onboarding = path.startsWith("/onboarding");

  useEffect(() => {
    const sb = supabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace(`/login?next=${encodeURIComponent(path)}`); return; }
      // Gate: the app opens only after the coach-led onboarding is complete.
      const { completedAt } = await getOnboarding();
      // (the layout persists across this redirect, so mark ready either way)
      if (!completedAt && !path.startsWith("/onboarding")) router.replace("/onboarding");
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") router.replace("/login"); });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useCallback((p?: string) => { setPrefill(p); setCoachOpen(true); }, []);
  const bumpPlan = useCallback(() => setPlanVersion((v) => v + 1), []);
  const focus = path.startsWith("/workout/") || path.startsWith("/retest");
  const showChrome = ready && !onboarding && !focus;

  return (
    <Ctx.Provider value={{ open, planVersion, bumpPlan }}>
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
        <main className={cx("flex-1 px-4", onboarding || focus ? "pt-0 pb-6" : "pt-[max(20px,env(safe-area-inset-top))] pb-32")}>
          {ready ? children : <Spinner />}
        </main>

        {showChrome && (
          <>
            <button type="button" onClick={() => open()} aria-label="Talk to Coach Maya"
              className="fixed right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-accent pl-2 pr-4 font-semibold text-accent-ink shadow-lg shadow-black/15 active:scale-95"
              style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-lg font-black">M</span>
              Coach
            </button>
            <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
              <div className="mx-auto grid max-w-xl grid-cols-4">
                {NAV.map((n) => {
                  const active = path === n.href || path.startsWith(n.href + "/");
                  return (
                    <Link key={n.href} href={n.href} className={cx("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-accent" : "text-muted")}>
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
                      {n.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </>
        )}
        {ready && !onboarding && <CoachSheet open={coachOpen} prefill={prefill} onClose={() => setCoachOpen(false)} onApplied={bumpPlan} />}
      </div>
    </Ctx.Provider>
  );
}
