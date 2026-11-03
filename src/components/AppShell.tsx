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
const GEAR = "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z";
const LOGOUT = "M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11";

function Icon({ d, className = "h-6 w-6" }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}
const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

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
  const [setupDone, setSetupDone] = useState(true);
  const onboarding = path.startsWith("/onboarding");

  useEffect(() => {
    const sb = supabase();
    sb.auth.getUser().then(async ({ data }) => {
      // No app session (first visit or expired): the server re-opens it behind the password gate.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- /unlock is a route handler, needs a full navigation
      if (!data.user) { window.location.href = `/unlock?session=1&next=${encodeURIComponent(path)}`; return; }
      // Gate: the app opens only after the coach-led onboarding is complete.
      const { completedAt } = await getOnboarding();
      // (the layout persists across this redirect, so mark ready either way)
      // (Settings stays reachable during setup: log out, notifications.)
      setSetupDone(!!completedAt);
      if (!completedAt && !path.startsWith("/onboarding") && !path.startsWith("/settings")) router.replace("/onboarding");
      setReady(true);
    });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full navigation to a route handler
    const { data: sub } = sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") window.location.href = "/unlock?lock=1"; });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useCallback((p?: string) => { setPrefill(p); setCoachOpen(true); }, []);
  const bumpPlan = useCallback(() => setPlanVersion((v) => v + 1), []);
  const focus = path.startsWith("/workout/") || path.startsWith("/retest") || path.startsWith("/ask");
  const showChrome = ready && !onboarding && !focus && setupDone;

  return (
    <Ctx.Provider value={{ open, planVersion, bumpPlan }}>
      <div className={cx("min-h-dvh", showChrome && "md:pl-60")}>
        {showChrome && (
          <>
            {/* Phone/tablet: slim top bar with Settings on the right */}
            <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
              <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
                <Link href="/home" className="flex items-center gap-2 font-bold">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm text-accent-ink">S</span>
                  Srishti Workout
                </Link>
                <Link href="/settings" aria-label="Settings" className={cx("grid h-11 w-11 place-items-center rounded-full border border-line", isActive(path, "/settings") ? "bg-accent text-accent-ink border-accent" : "bg-surface")}>
                  <Icon d={GEAR} className="h-5 w-5" />
                </Link>
              </div>
            </header>
            {/* Desktop: sidebar */}
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface p-4 md:flex">
              <Link href="/home" className="mb-6 flex items-center gap-2 px-2 pt-2 text-lg font-bold">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink">S</span>
                Srishti Workout
              </Link>
              <nav className="grid gap-1">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className={cx("flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium", isActive(path, n.href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2")}>
                    <Icon d={n.icon} className="h-5 w-5" />{n.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto grid gap-1 border-t border-line pt-3">
                <Link href="/settings" className={cx("flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium", isActive(path, "/settings") ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2")}>
                  <Icon d={GEAR} className="h-5 w-5" />Settings
                </Link>
                <a href="/unlock?lock=1" className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium text-muted hover:bg-surface-2">
                  <Icon d={LOGOUT} className="h-5 w-5" />Log out
                </a>
              </div>
            </aside>
          </>
        )}

        <main className={cx("mx-auto w-full max-w-xl flex-1 px-4", showChrome ? "pt-2 pb-32 md:max-w-3xl md:px-8 md:pt-8 md:pb-12" : onboarding || focus ? "pt-0 pb-6" : "pt-[max(20px,env(safe-area-inset-top))] pb-32")}>
          {ready ? children : <Spinner />}
        </main>

        {showChrome && (
          <>
            <button type="button" onClick={() => open()} aria-label="Talk to Coach Maya"
              className="fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/20 active:scale-95 md:right-8 md:bottom-8">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4V5z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" /></svg>
            </button>
            <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
              <div className="mx-auto grid max-w-xl grid-cols-4">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className={cx("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", isActive(path, n.href) ? "text-accent" : "text-muted")}>
                    <Icon d={n.icon} />{n.label}
                  </Link>
                ))}
              </div>
            </nav>
          </>
        )}
        {ready && !onboarding && setupDone && <CoachSheet open={coachOpen} prefill={prefill} onClose={() => setCoachOpen(false)} onApplied={bumpPlan} />}
      </div>
    </Ctx.Provider>
  );
}
