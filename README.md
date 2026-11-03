# Srishti Workout

A coach-led training app. **Coach Maya** gets to know you through adaptive questions (each with options and a
free-text answer, plus AI follow-ups), runs a 6-exercise movement check, and curates a 4-week plan from your
answers and results. After onboarding the app is all about your workouts, and Maya stays one tap away to scale
up or down, re-plan after missed days, or swap exercises. Every change is shown as a card you apply, with undo.

**Stack:** Next.js 16 · Tailwind v4 · Supabase (auth + Postgres with RLS) · Gemma 4 via the Gemini API ·
[openGym](https://github.com/DuarteSantos8/openGym) exercise database · [free-exercise-db](https://github.com/yuhonas/free-exercise-db) demo photos.

## Where things live
| What | Where |
|---|---|
| **Coach skill**: questions, branching, movement check, health tests, curation rules, programming, prompts | `coach-skill/` (see `coach-skill/SKILL.md`) |
| Skill + catalogue + demo compiler (runs before dev/build) | `scripts/build-data.mjs` |
| Onboarding flow | `src/app/(app)/onboarding/page.tsx`, `src/lib/onboarding.ts` |
| Curation (answers + trials → plan) | `src/lib/plan-builder.ts`, `src/lib/science/curate.ts`, `program.ts`, `patterns.ts` |
| Plan changes, swaps, diffs | `src/lib/science/adjust.ts` |
| Coach API (Gemma, proposals, follow-ups, analysis) | `src/app/api/coach/**` |
| Database schema | `supabase/migrations/0001_init.sql`, `0002_onboarding.sql` |

## Setup
1. `git clone --recurse-submodules` (or `git submodule update --init --depth 1`).
2. `cp .env.example .env.local`: add the Supabase URL + publishable key and `GEMINI_API_KEY`
   (https://aistudio.google.com/apikey). `GEMMA_MODEL` defaults to `gemma-4-26b-a4b-it`.
3. Run both migrations in the Supabase SQL editor. In Authentication, set the **Site URL** and turn off
   "Confirm email" (or configure SMTP).
4. `npm install && npm run dev`.

Editing the coach: change files in `coach-skill/content/` and run `npm run skill` to validate and recompile.

Licence: AGPL-3.0 (see NOTICE.md). Not medical advice.
