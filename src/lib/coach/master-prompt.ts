import "server-only";
// Coach Maya's prompts come from the coaching skill (coach-skill/content/prompts/*.md),
// compiled into src/data/coach-prompts.json by scripts/build-data.mjs.
import prompts from "@/data/coach-prompts.json";

const P = prompts as Record<string, string>;

export const MASTER_PROMPT = [P.persona, P.checkin].filter(Boolean).join("\n\n");
export const FOLLOWUP_PROMPT = P.followups ?? "";
export const INTERPRET_PROMPT = P.interpret ?? "";
export const ANALYSIS_PROMPT = `${P.persona}\n\n${P.analysis ?? ""}`;
