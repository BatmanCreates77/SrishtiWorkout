# Coach Maya: the coaching skill

Everything the coach knows, asks and decides lives here. The app compiles this folder at build time
(`scripts/build-data.mjs` → `src/data/coach-skill.json` + `src/data/coach-prompts.json`), so **editing these
files changes the app**. Then run `node scripts/build-data.mjs` (runs before every dev and build) to validate and recompile.

| File | What it controls |
|---|---|
| `content/questions.json` | Onboarding question graph: order, coach lines, options, branching (`when`), coach reactions, which sections get AI follow-ups (`probe`) |
| `content/trials.json` | The movement trial (fitness test): openGym exercise per pattern, protocol, cues, form flags, scoring → tier |
| `content/health-tests.json` | Optional health tests (resting HR, step test, flexibility, balance, waist) |
| `content/curation.json` | How answers shape the plan: injury and dislike exclusions, emphasis, cardio and session style |
| `content/programming.json` | Goal prescriptions, exercises per session length, weekdays, mesocycle |
| `content/prompts/*.md` | Gemma's instructions: persona, onboarding follow-ups, analysis summary, check-ins |
| `references/*.md` | The science behind the numbers (test norms, programming rules) |

## Rules when editing
- Exercise ids must exist in the openGym catalogue (`vendor/openGym/catalogue/exercises`). The build fails on unknown ids.
- Every question keeps free text available; options are suggestions, not limits.
- Safety rules in `prompts/persona.md` are non-negotiable: never diagnose, stop on red flags, pain over 3/10 means modify.
- Keep coach lines short (1-2 sentences), warm, second person.
