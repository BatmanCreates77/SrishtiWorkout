import { NextResponse } from "next/server";
import { sendToUser } from "@/lib/push-server";
import { serverSupabase } from "@/lib/supabase/server";

export async function POST() {
  const sb = await serverSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const sent = await sendToUser(sb, { title: "Coach Maya 👋", body: "Notifications are working. I'll nudge you on workout days.", url: "/home", tag: "test" });
    return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "No device registered yet. Turn notifications on first." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
