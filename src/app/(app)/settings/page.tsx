"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NotifySetup } from "@/components/NotifySetup";
import { Spinner } from "@/components/ui";
import { getNotifyPrefs, saveNotifyPrefs } from "@/lib/data";
import { DEFAULT_PREFS, type NotifyPrefs } from "@/lib/push";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotifyPrefs | null>(null);
  const [saved, setSaved] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { getNotifyPrefs().then((p) => setPrefs(p ? { ...DEFAULT_PREFS, ...p, types: { ...DEFAULT_PREFS.types, ...p.types } } : DEFAULT_PREFS)); }, []);

  function change(p: NotifyPrefs) {
    setPrefs(p); setSaved(false);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => saveNotifyPrefs(p).then(() => setSaved(true)).catch(() => {}), 500);
  }

  if (!prefs) return <Spinner />;
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold leading-tight">Settings</h1>
          <p className="text-sm text-muted">Notifications and reminders</p>
        </div>
        <span className="pb-1 text-xs text-good">{saved ? "Saved" : ""}</span>
      </header>
      <NotifySetup prefs={prefs} onChange={change} />
      <div className="grid gap-2">
        <Link href="/ask" className="flex min-h-12 items-center justify-center rounded-2xl border border-line font-semibold">Answer Maya&apos;s pending questions</Link>
        <a href="/unlock?lock=1" className="flex min-h-12 items-center justify-center rounded-2xl border border-line font-semibold">Lock this device</a>
      </div>
    </div>
  );
}
