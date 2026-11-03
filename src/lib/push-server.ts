import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

function configure() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("Push isn't configured (VAPID keys missing).");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://projectamazon-phi.vercel.app", pub, priv);
}

/** Send to every device of the signed-in user; drops subscriptions the push service says are gone. */
export async function sendToUser(sb: SupabaseClient, payload: PushPayload) {
  configure();
  const { data: subs } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "normal" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("push failed", code, (e as Error).message);
    }
  }
  return sent;
}
