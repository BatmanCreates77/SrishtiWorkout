"use client";
// Client-side data access. All tables are protected by RLS (owner only).
import { supabase } from "./supabase/client";
import type { Answers } from "./onboarding";
import type { PlanDiff } from "./science/adjust";
import type { Analysis, Intake, Program, TestResults, TrialResult } from "./science/types";
import type { LogRow } from "./science/schedule";

export type ProgramRow = {
  id: string; plan: Program; start_date: string; status: string; created_at: string; reason: string | null;
  parent_id?: string | null; changes?: PlanDiff | null;
};
export type AssessmentRow = { id: string; results: TestResults; analysis: Analysis; created_at: string };
export type Proposal = {
  id: string; action: string; summary: string; diff: string[]; plan: Program; start_date: string;
  intake: Intake | null; status: "pending" | "applied" | "dismissed"; program_id: string | null; created_at: string;
};

export type OnboardingState = {
  stage?: "questions" | "trial-intro" | "trials" | "health" | "analysis" | "plan";
  qIndex?: number;
  trialIndex?: number;
  answers: Answers;
  followups: { section: string; ask: string; answer: string }[];
  followupCount?: Record<string, number>;
  trials: TrialResult[];
  health: TestResults;
  summary?: string;
};

async function uid() {
  const { data } = await supabase().auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

// --- onboarding ---------------------------------------------------------------
export async function getOnboarding(): Promise<{ state: OnboardingState; completedAt: string | null }> {
  const { data } = await supabase().from("profiles").select("onboarding, onboarding_completed_at").maybeSingle();
  const raw = (data?.onboarding ?? {}) as Partial<OnboardingState>;
  return {
    state: { answers: {}, followups: [], trials: [], health: {}, ...raw },
    completedAt: (data?.onboarding_completed_at as string | null) ?? null,
  };
}

export async function saveOnboarding(state: OnboardingState) {
  const id = await uid();
  const { error } = await supabase().from("profiles").update({ onboarding: state }).eq("id", id);
  if (error) throw error;
}

export async function completeOnboarding() {
  const id = await uid();
  const { error } = await supabase().from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// --- profile, assessments --------------------------------------------------------
export async function getLatestIntake(): Promise<Intake | null> {
  const { data } = await supabase().from("intakes").select("data").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data?.data as Intake) ?? null;
}

export async function saveIntake(intake: Intake) {
  const { error } = await supabase().from("intakes").insert({ user_id: await uid(), data: intake });
  if (error) throw error;
}

export async function getLatestAssessment(): Promise<AssessmentRow | null> {
  const { data } = await supabase().from("assessments").select("id, results, analysis, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as AssessmentRow) ?? null;
}

export async function listAssessments(): Promise<AssessmentRow[]> {
  const { data } = await supabase().from("assessments").select("id, results, analysis, created_at").order("created_at", { ascending: true });
  return (data as AssessmentRow[]) ?? [];
}

export async function saveAssessment(results: TestResults, analysis: Analysis) {
  const { error } = await supabase().from("assessments").insert({ user_id: await uid(), results, analysis });
  if (error) throw error;
}

// --- programs (versioned: every change is a new row pointing at its parent) ---------
const PROGRAM_COLS = "id, plan, start_date, status, created_at, reason, parent_id, changes";

export async function getActiveProgram(): Promise<ProgramRow | null> {
  const { data } = await supabase().from("programs").select(PROGRAM_COLS).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as ProgramRow) ?? null;
}

export async function listProgramHistory(limit = 10): Promise<ProgramRow[]> {
  const { data } = await supabase().from("programs").select(PROGRAM_COLS).order("created_at", { ascending: false }).limit(limit);
  return (data as ProgramRow[]) ?? [];
}

export async function activateProgram(plan: Program, startDate: string, reason: string, changes?: PlanDiff) {
  const sb = supabase();
  const user_id = await uid();
  const current = await getActiveProgram();
  await sb.from("programs").update({ status: "archived" }).eq("status", "active");
  const { data, error } = await sb.from("programs")
    .insert({ user_id, plan, start_date: startDate, reason, parent_id: current?.id ?? null, changes: changes ?? null })
    .select("id").single();
  if (error) throw error;
  return data.id as string;
}

/** Undo the latest change: re-activate the parent version. */
export async function undoProgram(current: ProgramRow) {
  if (!current.parent_id) return false;
  const sb = supabase();
  await sb.from("programs").update({ status: "archived" }).eq("id", current.id);
  const { error } = await sb.from("programs").update({ status: "active" }).eq("id", current.parent_id);
  if (error) throw error;
  return true;
}

// --- workout logs ------------------------------------------------------------------
export async function getLogs(programId: string): Promise<LogRow[]> {
  const { data } = await supabase().from("workout_logs").select("id, session_key, status, performed_at, session_rpe, notes, entries").eq("program_id", programId);
  return (data as LogRow[]) ?? [];
}

/** Recent logs across plan versions (a re-plan keeps her history for "last time"). */
export async function getRecentLogs(days = 60): Promise<LogRow[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase().from("workout_logs").select("id, session_key, status, performed_at, session_rpe, notes, entries").gte("performed_at", since).order("performed_at", { ascending: true });
  return (data as LogRow[]) ?? [];
}

export async function saveLog(programId: string, log: Omit<LogRow, "id">) {
  const { error } = await supabase().from("workout_logs").upsert(
    { user_id: await uid(), program_id: programId, ...log },
    { onConflict: "program_id,session_key" },
  );
  if (error) throw error;
}

// --- coach proposals -----------------------------------------------------------------
export async function getProposal(id: string): Promise<Proposal | null> {
  const { data } = await supabase().from("coach_proposals").select("id, action, summary, diff, plan, start_date, intake, status, program_id, created_at").eq("id", id).maybeSingle();
  return (data as Proposal) ?? null;
}

export async function applyProposal(p: Proposal) {
  if (p.intake) await saveIntake(p.intake);
  await activateProgram(p.plan, p.start_date, `coach:${p.action}`, { lines: p.diff });
  await supabase().from("coach_proposals").update({ status: "applied" }).eq("id", p.id);
}

export async function dismissProposal(id: string) {
  await supabase().from("coach_proposals").update({ status: "dismissed" }).eq("id", id);
}

/** Re-open the coach's onboarding (answers are kept so she only changes what's different). */
export async function reopenOnboarding() {
  const id = await uid();
  const { state } = await getOnboarding();
  const { error } = await supabase().from("profiles")
    .update({ onboarding_completed_at: null, onboarding: { ...state, stage: "questions", summary: undefined } }).eq("id", id);
  if (error) throw error;
}
