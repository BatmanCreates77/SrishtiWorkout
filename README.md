# OpenGym Coach

A science-based fitness coaching app. The flow: intake questionnaire → validated field tests → scored
analysis (fitness and nutrition) → 4-week periodised program → workout logging → an AI coach (Gemma) that
checks in, tracks adherence and adjusts the plan.

**Stack:** Next.js 16 (App Router) · Tailwind v4 · Supabase (auth + Postgres with RLS) · Gemma 4 via the
Gemini API · exercise catalogue from [openGym](https://github.com/DuarteSantos8/openGym) (MIT subset, see NOTICE.md).

| Area | Where |
|---|---|
| Coaching science (norms, programming rules) | `.claude/skills/exercise-science-coach/` |
| Test protocols & scoring | `src/lib/science/tests.ts` |
| Analysis + diet | `src/lib/science/analysis.ts` |
| Program generator | `src/lib/science/program.ts`, `patterns.ts` |
| Scheduling / adherence | `src/lib/science/schedule.ts` |
| Plan adjustments (UI + AI tools) | `src/lib/science/adjust.ts` |
| Coach master prompt | `src/lib/coach/master-prompt.ts` |
| Coach API (Gemma + function calling) | `src/app/api/coach/route.ts` |
| DB schema | `supabase/migrations/0001_init.sql` |

## Setup
1. `cp .env.example .env.local`, fill in the Supabase URL and publishable key, and add `GEMINI_API_KEY`
   from https://aistudio.google.com/apikey (`GEMMA_MODEL` defaults to `gemma-4-26b-a4b-it`).
2. Apply `supabase/migrations/0001_init.sql` to your Supabase project.
3. Supabase → Authentication: set **Site URL** to the deployed URL. Either keep "Confirm email" (with custom
   SMTP) or turn it off for a private app.
4. `npm install && npm run dev`.

To regenerate the exercise data: `node scripts/build-catalogue.mjs /path/to/openGym-clone`.

Not medical advice.
