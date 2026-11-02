"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { cx, Spinner } from "./ui";

const NAV = [
  { href: "/home", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/program", label: "Plan", icon: "M8 3v4M16 3v4M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" },
  { href: "/coach", label: "Coach", icon: "M4 5h16v11H8l-4 4V5z" },
  { href: "/exercises", label: "Exercises", icon: "M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12" },
  { href: "/me", label: "Me", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace(`/login?next=${encodeURIComponent(path)}`);
      else setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideNav = path.startsWith("/workout/");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <main className={cx("flex-1 px-4 pt-6", hideNav ? "pb-10" : "pb-28")}>{ready ? children : <Spinner />}</main>
      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="mx-auto grid max-w-2xl grid-cols-5">
            {NAV.map((n) => {
              const active = path === n.href || path.startsWith(n.href + "/");
              return (
                <Link key={n.href} href={n.href} className={cx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-accent" : "text-muted")}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
