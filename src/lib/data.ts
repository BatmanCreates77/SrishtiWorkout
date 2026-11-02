"use client";
// Client-side data access. All tables are protected by RLS (owner only).
import { supabase } from "./supabase/client";
import type { Analysis, Intake, Program, TestResults } from "./science/types";
import type { LogRow } from "./science/schedule";

export type ProgramRow = { id: string; plan: Program; start_date: string; status: string; created_at: string; reason: string | null };
export type AssessmentRow = { id: string; results: TestResults; analysis: Analysis; created_at: string };

async function uid() {
  const { data } = await supabase().auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

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

export async function getActiveProgram(): Promise<ProgramRow | null> {
  const { data } = await supabase().from("programs").select("id, plan, start_date, status, created_at, reason").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as ProgramRow) ?? null;
}

export async function activateProgram(plan: Program, startDate: string, reason: string) {
  const sb = supabase();
  const user_id = await uid();
  await sb.from("programs").update({ status: "archived" }).eq("status", "active");
  const { data, error } = await sb.from("programs").insert({ user_id, plan, start_date: startDate, reason }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function getLogs(programId: string): Promise<LogRow[]> {
  const { data } = await supabase().from("workout_logs").select("id, session_key, status, performed_at, session_rpe, notes, entries").eq("program_id", programId);
  return (data as LogRow[]) ?? [];
}

export async function saveLog(programId: string, log: Omit<LogRow, "id">) {
  const { error } = await supabase().from("workout_logs").upsert(
    { user_id: await uid(), program_id: programId, ...log },
    { onConflict: "program_id,session_key" },
  );
  if (error) throw error;
}
