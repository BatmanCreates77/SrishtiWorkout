import { NextResponse } from "next/server";
import { z } from "zod";
import { buildContext, checkinFacts, loadState, type CoachState } from "@/lib/coach/context";
import { generate, gemmaConfigured, normalise, textOf, type Content, type FunctionDecl } from "@/lib/coach/gemma";
import { MASTER_PROMPT } from "@/lib/coach/master-prompt";
import { ADJUST_ACTIONS, adjustProgram, type AdjustAction } from "@/lib/science/adjust";
import { EQUIPMENT_OPTIONS } from "@/lib/science/patterns";
import { serverSupabase } from "@/lib/supabase/server";

export const maxDuration = 60;

const Body = z.object({ message: z.string().max(4000).optional(), checkin: z.boolean().optional() });

const TOOLS: FunctionDecl[] = [
  {
    name: "adjust_program",
    description:
      "Change the user's active training program. Use only after the user agreed. Actions: deload_now (start a deload week today), ease_off (less volume/intensity), push_harder (more volume/intensity), restart_today (restart week 1 from today after a break), change_days (new days per week), change_session_length (new minutes per session), change_equipment (new equipment list).",
    parameters: {
      type: "OBJECT",
      properties: {
        action: { type: "STRING", enum: [...ADJUST_ACTIONS] },
        reason: { type: "STRING", description: "Short reason in the user's words." },
        days_per_week: { type: "INTEGER", description: "2-6, for change_days" },
        preferred_days: { type: "ARRAY", items: { type: "INTEGER" }, description: "weekday numbers 0=Sun..6=Sat, for change_days" },
        session_minutes: { type: "INTEGER", description: "20-120, for change_session_length" },
        equipment: {
          type: "ARRAY",
          items: { type: "STRING", enum: EQUIPMENT_OPTIONS.map((e) => e.key) },
          description: "Full list of equipment she now has (bodyweight is implied), for change_equipment",
        },
      },
      required: ["action", "reason"],
    },
  },
];

async function runTool(sb: Awaited<ReturnType<typeof serverSupabase>>, state: CoachState, args: Record<string, unknown>) {
  if (!state.intake || !state.analysis) return { ok: false, error: "Questionnaire and fitness tests must be completed first." };
  const action = args.action as AdjustAction;
  if (!ADJUST_ACTIONS.includes(action)) return { ok: false, error: `Unknown action ${action}` };
  const res = adjustProgram(state.intake, state.analysis, state.program, action, {
    days_per_week: args.days_per_week as number | undefined,
    preferred_days: args.preferred_days as number[] | undefined,
    session_minutes: args.session_minutes as number | undefined,
    equipment: args.equipment as string[] | undefined,
  });
  if (res.intakeChanged) {
    const { error } = await sb.from("intakes").insert({ user_id: state.userId, data: res.intake });
    if (error) return { ok: false, error: error.message };
  }
  await sb.from("programs").update({ status: "archived" }).eq("status", "active");
  const { error } = await sb.from("programs").insert({
    user_id: state.userId, plan: res.plan, start_date: res.startDate, reason: `coach:${action} ${String(args.reason ?? "")}`.slice(0, 300),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, summary: res.summary, split: res.plan.split, start_date: res.startDate };
}

export async function POST(req: Request) {
  const sb = await serverSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { message, checkin } = parsed.data;
  if (!message && !checkin) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const userId = auth.user.id;
  const { data: history } = await sb
    .from("chat_messages").select("role, content, created_at")
    .order("created_at", { ascending: false }).limit(24);
  const past = (history ?? []).reverse();

  if (checkin) {
    const lastModel = [...past].reverse().find((m) => m.role === "model");
    if (lastModel && Date.now() - new Date(lastModel.created_at).getTime() < 18 * 3600 * 1000) {
      return NextResponse.json({ skipped: true });
    }
  }

  if (!gemmaConfigured()) {
    return NextResponse.json({ error: "The AI coach isn't configured yet. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables." }, { status: 503 });
  }

  const state = await loadState(sb, userId);
  const userText = checkin ? `[CHECK-IN EVENT] The user just opened the app. Facts: ${checkinFacts(state)}` : message!;
  const contents: Content[] = normalise([
    ...past.map((m): Content => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.role === "event" ? `[CHECK-IN EVENT] ${m.content}` : m.content }],
    })),
    { role: "user", parts: [{ text: userText }] },
  ]);

  const system = `${MASTER_PROMPT}\n\n# CONTEXT (live data, refreshed every message)\n${buildContext(state)}`;
  let programChanged = false;
  let reply = "";
  try {
    for (let i = 0; i < 3; i++) {
      const out = await generate({ system, contents, tools: TOOLS });
      contents.push(out);
      const calls = out.parts.filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } => "functionCall" in p);
      if (!calls.length) { reply = textOf(out); break; }
      const responses = [];
      for (const c of calls) {
        const result = c.functionCall.name === "adjust_program" ? await runTool(sb, state, c.functionCall.args ?? {}) : { ok: false, error: "unknown tool" };
        if (result.ok) programChanged = true;
        responses.push({ functionResponse: { name: c.functionCall.name, response: result } });
      }
      contents.push({ role: "user", parts: responses });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "The coach is having trouble connecting. Please try again in a moment." }, { status: 502 });
  }
  if (!reply) reply = programChanged ? "Done. Your program has been updated." : "Hmm, I lost my train of thought. Could you say that again?";

  const t = Date.now();
  const rows = [
    checkin
      ? { user_id: userId, role: "event", content: checkinFacts(state), created_at: new Date(t - 1).toISOString() }
      : { user_id: userId, role: "user", content: message!, created_at: new Date(t - 1).toISOString() },
    { user_id: userId, role: "model", content: reply, meta: programChanged ? { programChanged } : null, created_at: new Date(t).toISOString() },
  ];
  await sb.from("chat_messages").insert(rows);
  return NextResponse.json({ reply, programChanged });
}
