import { NextResponse } from "next/server";
import { z } from "zod";
import { serverSupabase } from "@/lib/supabase/server";

const Sub = z.object({ subscription: z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }), tz: z.string().max(60).optional() });

export async function POST(req: Request) {
  const sb = await serverSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Sub.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });
  const { endpoint, keys } = parsed.data.subscription;
  const { error } = await sb.from("push_subscriptions").upsert(
    { user_id: auth.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // keep her time zone current for scheduling
  if (parsed.data.tz) {
    const { data: p } = await sb.from("profiles").select("notify").eq("id", auth.user.id).maybeSingle();
    if (p) await sb.from("profiles").update({ notify: { ...(p.notify ?? {}), tz: parsed.data.tz } }).eq("id", auth.user.id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const sb = await serverSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
