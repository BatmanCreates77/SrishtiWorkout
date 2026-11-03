"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NotifySetup } from "@/components/NotifySetup";
import { cx, Spinner } from "@/components/ui";
import { getNotifyPrefs, saveNotifyPrefs } from "@/lib/data";
import { DEFAULT_PREFS, disablePush, pushStatus, type NotifyPrefs } from "@/lib/push";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ href, onClick, label, hint, danger }: { href?: string; onClick?: () => void; label: string; hint?: string; danger?: boolean }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className={cx("block text-[15px] font-semibold", danger && "text-warn")}>{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </>
  );
  const cls = "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left";
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <Link href={href!} className={cls}>{inner}</Link>;
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotifyPrefs | null>(null);
  const [saved, setSaved] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    getNotifyPrefs().then((p) => setPrefs(p ? { ...DEFAULT_PREFS, ...p, types: { ...DEFAULT_PREFS.types, ...p.types } } : DEFAULT_PREFS));
    pushStatus().then((s) => setPushOn(s === "on")).catch(() => {});
  }, []);

  function change(p: NotifyPrefs) {
    setPrefs(p); setSaved(false);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => saveNotifyPrefs(p).then(() => setSaved(true)).catch(() => {}), 500);
  }

  async function stopPush() {
    if (!confirm("Stop notifications on this device?")) return;
    await disablePush().catch(() => {});
    window.location.reload();
  }

  function logout() {
    if (!confirm("Log out on this device? You'll need the password to get back in.")) return;
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- route handler clears the cookies
    window.location.href = "/unlock?lock=1";
  }

  if (!prefs) return <Spinner />;
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <h1 className="text-[26px] font-bold leading-tight">Settings</h1>
        <span className="pb-1 text-xs text-good" aria-live="polite">{saved ? "Saved" : ""}</span>
      </header>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <Section title="Notifications" hint="Reminder time, quiet hours and what Maya can send you. Changes save automatically.">
          <NotifySetup prefs={prefs} onChange={change} />
        </Section>

        <div className="space-y-8">
          <Section title="Coach">
            <div className="divide-y divide-line rounded-2xl bg-surface">
              <Row href="/ask" label="Answer Maya's questions" hint="The ones she saved for later" />
              <Row href="/retest" label="Redo the movement check" hint="Re-test and update your plan" />
              <Row href="/me" label="Update my answers" hint="Goals, injuries, schedule, equipment" />
            </div>
          </Section>

          <Section title="Account">
            <div className="divide-y divide-line rounded-2xl bg-surface">
              {pushOn && <Row onClick={stopPush} label="Stop notifications on this device" />}
              <Row onClick={logout} label="Log out" hint="Locks this device until the password is entered again" danger />
            </div>
          </Section>

          <Section title="About">
            <p className="text-sm text-muted">
              Exercise data from openGym (AGPL-3.0). Demo photos from free-exercise-db (public domain). Coach Maya runs on Gemma.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
