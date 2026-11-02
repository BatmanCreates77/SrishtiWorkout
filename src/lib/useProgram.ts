"use client";
import { useCallback, useEffect, useState } from "react";
import { getActiveProgram, getLogs, type ProgramRow } from "./data";
import { schedule, type LogRow, type ScheduledSession } from "./science/schedule";

export function useProgram() {
  const [state, setState] = useState<{ loading: boolean; program: ProgramRow | null; logs: LogRow[]; sched: ScheduledSession[] }>({ loading: true, program: null, logs: [], sched: [] });
  const load = useCallback(async () => {
    const program = await getActiveProgram();
    const logs = program ? await getLogs(program.id) : [];
    setState({ loading: false, program, logs, sched: program ? schedule(program.plan, program.start_date, logs) : [] });
  }, []);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
