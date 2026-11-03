"use client";
// Web push on the browser side. On iPhone, notifications work only when the app was added to the
// Home Screen (iOS 16.4+) and opened from there.

export type NotifyPrefs = {
  reminderTime: string; // "18:00", her local time
  tz: string; // IANA zone, e.g. "Asia/Kolkata"
  types: { workout: boolean; questions: boolean; missed: boolean; recap: boolean };
  quietStart: string; // "21:30"
  quietEnd: string; // "07:00"
};

export const DEFAULT_PREFS: NotifyPrefs = {
  reminderTime: "18:00",
  tz: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Kolkata",
  types: { workout: true, questions: true, missed: true, recap: true },
  quietStart: "21:30",
  quietEnd: "07:00",
};

export const isIOS = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export type PushStatus = "on" | "off" | "denied" | "needs-install" | "unsupported";

export async function pushStatus(): Promise<PushStatus> {
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Ask permission (must be called from a tap) and register this device for notifications. */
export async function enablePush(): Promise<PushStatus> {
  const st = await pushStatus();
  if (st === "needs-install" || st === "unsupported" || st === "denied") return st;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("Notifications aren't configured on the server yet.");
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), tz: DEFAULT_PREFS.tz }),
  });
  if (!res.ok) throw new Error("Couldn't save this device for notifications.");
  return "on";
}

export async function disablePush() {
  const reg = await navigator.serviceWorker?.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}

export async function sendTest() {
  const res = await fetch("/api/push/test", { method: "POST" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Test failed");
}
