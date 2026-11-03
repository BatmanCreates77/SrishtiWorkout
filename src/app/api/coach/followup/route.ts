// Onboarding: Gemma decides whether one tailored follow-up question would help (coach-skill prompts/followups.md).
import { NextResponse } from "next/server";
import { z } from "zod";
import { gemmaConfigured, generate, textOf } from "@/lib/coach/gemma";
import { FOLLOWUP_PROMPT } from "@/lib/coach/master-prompt";
import { serverSupabase } from "@/lib/supabase/server";

export const maxDuration = 30;

const Body = z.object({
  section: z.string().max(40),
  qa: z.array(z.object({ q: z.string().max(400), a: z.string().max(800) })).max(30),
  profile: z.string().max(1500).optional(),
  asked: z.array(z.string().max(300)).max(10).optional(),
  later: z.array(z.string().max(40)).max(12).optional(),
});

function parseJson(text: string): { ask?: string | null; options?: unknown } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function POST(req: Request) {
  const sb = await serverSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!gemmaConfigured()) return NextResponse.json({ ask: null });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ask: null });
  const { section, qa, profile, asked, later } = parsed.data;

  const user = [
    `SECTION: ${section}`,
    profile ? `PROFILE SO FAR: ${profile}` : "",
    `ANSWERS IN THIS SECTION:\n${qa.map((x) => `- Q: ${x.q}\n  A: ${x.a}`).join("\n")}`,
    asked?.length ? `ALREADY ASKED AS FOLLOW-UPS (do not repeat): ${asked.join(" | ")}` : "",
    later?.length ? `LATER SECTIONS (do not ask about these): ${later.join(", ")}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const out = await generate({ system: FOLLOWUP_PROMPT, contents: [{ role: "user", parts: [{ text: user }] }], temperature: 0.4, budgetMs: 11_000, attemptMs: 9_000 });
    const j = parseJson(textOf(out));
    const ask = typeof j?.ask === "string" && j.ask.trim() ? j.ask.trim().slice(0, 220) : null;
    const options = Array.isArray(j?.options) ? (j!.options as unknown[]).map(String).map((s) => s.slice(0, 60)).filter(Boolean).slice(0, 5) : [];
    return NextResponse.json({ ask, options });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ask: null }); // never block onboarding on the AI
  }
}
