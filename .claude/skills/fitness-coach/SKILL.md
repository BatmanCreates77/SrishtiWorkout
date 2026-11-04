---
name: fitness-coach
description: Coach Maya's coaching skill for the Srishti Workout app — onboarding questions and branching, the movement-trial fitness test, health tests, plan curation rules, programming rules and Gemma prompts. Use when changing what the coach asks, how fitness is tested, how plans are curated, or how the AI coach behaves.
---

The skill's content lives in `coach-skill/` at the repo root (so the app can compile it). Read
`coach-skill/SKILL.md` first; it maps every file to what it controls. After editing, run
`node scripts/build-data.mjs` to validate ids and recompile `src/data/coach-skill.json`.
The science behind the numbers is in `coach-skill/references/` (norms.md, programming.md).
