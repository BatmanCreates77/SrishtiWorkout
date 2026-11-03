"use client";
// Reminder time, which notifications, quiet hours, and turning notifications on for this device.
// Used in onboarding (last step) and in Settings.
import { useEffect, useState } from "react";
import { enablePush, isIOS, pushStatus, sendTest, type NotifyPrefs, type PushStatus } from "@/lib/push";
import { Button, cx, Notice } from "./ui";

const TYPES: { key: keyof NotifyPrefs["types"]; label: string; hint: string }[] = [
  { key: "workout", label: "Workout reminders", hint: "On training days at your reminder time" },
  { key: "questions", label: "Maya has a question", hint: "A quick question every few days so she can tune your plan" },
  { key: "missed", label: "Missed-session check-in", hint: "If you miss 2 sessions, Maya offers to adjust your week" },
  { key: "recap", label: "Weekly recap", hint: "Sunday evening: your week and what's next" },
];

export function NotifySetup({ prefs, onChange }: { prefs: NotifyPrefs; onChange: (p: NotifyPrefs) => void }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { pushStatus().then(setStatus).catch(() => setStatus("unsupported")); }, []);

  async function turnOn() {
    setBusy(true); setMsg("");
    try { setStatus(await enablePush()); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setMsg("");
    try { await sendTest(); setMsg("Sent! It should appear in a few seconds."); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface p-4">
        <label htmlFor="reminder-time" className="mb-1.5 block text-sm font-semibold">Reminder time</label>
        <input id="reminder-time" type="time" value={prefs.reminderTime} onChange={(e) => onChange({ ...prefs, reminderTime: e.target.value || "18:00" })}
          className="w-full rounded-2xl border border-line bg-bg px-4 py-3 text-2xl font-bold tabular-nums outline-none focus:border-accent" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quiet-start" className="mb-1 block text-xs font-medium text-muted">Quiet from</label>
            <input id="quiet-start" type="time" value={prefs.quietStart} onChange={(e) => onChange({ ...prefs, quietStart: e.target.value })} className="w-full rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
          </div>
          <div>
            <label htmlFor="quiet-end" className="mb-1 block text-xs font-medium text-muted">Quiet until</label>
            <input id="quiet-end" type="time" value={prefs.quietEnd} onChange={(e) => onChange({ ...prefs, quietEnd: e.target.value })} className="w-full rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Time zone: {prefs.tz}</p>
      </div>

      <div className="divide-y divide-line rounded-2xl bg-surface">
        {TYPES.map((t) => (
          <label key={t.key} className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{t.label}</span><span className="block text-xs text-muted">{t.hint}</span></span>
            <input type="checkbox" checked={prefs.types[t.key]} onChange={(e) => onChange({ ...prefs, types: { ...prefs.types, [t.key]: e.target.checked } })}
              className="h-6 w-6 shrink-0 accent-[var(--accent)]" />
          </label>
        ))}
      </div>

      <div className="rounded-2xl bg-surface p-4">
        <div className="mb-2 text-sm font-semibold">Notifications on this device</div>
        {status === "on" && (
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-good">✓ Turned on</span>
            <Button variant="ghost" onClick={test} disabled={busy}>Send a test</Button>
          </div>
        )}
        {status === "off" && <Button full onClick={turnOn} disabled={busy}>{busy ? "Turning on…" : "Turn on notifications"}</Button>}
        {status === "needs-install" && (
          <div className="space-y-2 text-[15px]">
            <p>On iPhone, notifications work once the app is on your Home Screen:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Tap the <b>Share</b> button <span aria-hidden>⬆︎</span> in Safari&apos;s toolbar.</li>
              <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
              <li>Open <b>Srishti Workout</b> from your Home Screen, unlock with the password, and come back here (Settings) to turn notifications on.</li>
            </ol>
            {!isIOS() && <p className="text-xs text-muted">(On other phones, open the app in Chrome and choose Install app.)</p>}
          </div>
        )}
        {status === "denied" && <Notice>Notifications are blocked for this app. On iPhone: Settings → Notifications → Srishti Workout → Allow Notifications. Then come back and refresh.</Notice>}
        {status === "unsupported" && <Notice>This browser can&apos;t show notifications. On iPhone, add the app to your Home Screen from Safari (iOS 16.4 or later).</Notice>}
        {status === null && <div className="h-12 animate-pulse rounded-xl bg-surface-2" />}
        {msg && <p className={cx("mt-2 text-sm", msg.startsWith("Sent") ? "text-good" : "text-warn")}>{msg}</p>}
      </div>
    </div>
  );
}
