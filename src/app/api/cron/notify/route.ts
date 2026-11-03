// Called every 15 minutes by Supabase pg_cron (see supabase/migrations/0003_notifications.sql).
// Protected by CRON_SECRET (not the site password). Signs in as the app's account to read its data.
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { decide, type SentLog } from "@/lib/notify-plan";
import type { Answers } from "@/lib/onboarding";
import { DEFAULT_PREFS, type NotifyPrefs } from "@/lib/push";
import { sendToUser } from "@/lib/push-server";
import type { LogRow } from "@/lib/science/schedule";
import type { Program } from "@/lib/science/types";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const got = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (got.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

async function run(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const email = process.env.APP_USER_EMAIL, password = process.env.APP_USER_PASSWORD;
  if (!email || !password) return NextResponse.json({ error: "App account not configured" }, { status: 500 });

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: authErr } = await sb.auth.signInWithPassword({ email, password });
  if (authErr) return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });

  const [{ data: profile }, { data: prog }, { data: intake }, { data: sentRows }, { count: devices }] = await Promise.all([
    sb.from("profiles").select("id, notify, onboarding, onboarding_completed_at").maybeSingle(),
    sb.from("programs").select("id, plan, start_date").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("intakes").select("data").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("notification_log").select("kind, day").order("created_at", { ascending: false }).limit(60),
    sb.from("push_subscriptions").select("id", { count: "exact", head: true }),
  ]);
  if (!profile?.onboarding_completed_at || !devices) return NextResponse.json({ ok: true, skipped: !devices ? "no devices" : "onboarding not done" });

  const logs = prog ? ((await sb.from("workout_logs").select("session_key, status, performed_at, session_rpe").eq("program_id", prog.id)).data as LogRow[] ?? []) : [];
  const n = (profile.notify ?? {}) as Partial<NotifyPrefs>;
  const prefs: NotifyPrefs = { ...DEFAULT_PREFS, ...n, types: { ...DEFAULT_PREFS.types, ...(n.types ?? {}) } };
  const decision = decide({
    prefs, program: prog as { plan: Program; start_date: string } | null, logs,
    answers: ((profile.onboarding as { answers?: Answers } | null)?.answers) ?? {},
    sent: (sentRows ?? []) as SentLog[], name: (intake?.data as { name?: string } | null)?.name?.split(" ")[0],
  });
  if (!decision) return NextResponse.json({ ok: true, sent: null });

  // record first (unique per kind+day) so overlapping runs can't double-send
  const { error: logErr } = await sb.from("notification_log").insert({ user_id: profile.id, kind: decision.kind, day: decision.day });
  if (logErr) return NextResponse.json({ ok: true, sent: null, note: "already sent" });
  const sent = await sendToUser(sb, { title: decision.title, body: decision.body, url: decision.url, tag: decision.tag });
  return NextResponse.json({ ok: true, sent: decision.kind, devices: sent });
}

export const GET = run;
export const POST = run;
