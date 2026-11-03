"use client";
import { useCallback, useEffect, useState } from "react";
import { useCoach } from "@/components/AppShell";
import { getActiveProgram, getLogs, getRecentLogs, type ProgramRow } from "./data";
import { schedule, type LogRow, type ScheduledSession } from "./science/schedule";

type State = { loading: boolean; program: ProgramRow | null; logs: LogRow[]; history: LogRow[]; sched: ScheduledSession[] };

/** Active plan + its logs. Reloads when the coach applies or undoes a change (planVersion). */
export function useProgram() {
  const { planVersion } = useCoach();
  const [state, setState] = useState<State>({ loading: true, program: null, logs: [], history: [], sched: [] });
  const load = useCallback(async () => {
    const program = await getActiveProgram();
    const [logs, history] = await Promise.all([program ? getLogs(program.id) : [], getRecentLogs(90)]);
    setState({ loading: false, program, logs, history, sched: program ? schedule(program.plan, program.start_date, logs) : [] });
  }, []);
  useEffect(() => { load(); }, [load, planVersion]);
  return { ...state, reload: load };
}
