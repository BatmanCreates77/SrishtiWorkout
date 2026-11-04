# Test environment

| | Production | Test |
|---|---|---|
| Branch | `main` | `test` |
| URL | https://projectamazon-phi.vercel.app | Vercel Preview for branch `test` (stable branch URL) |
| Data | app account `app@…` | separate account `test@…` (same Supabase project, isolated by RLS) |
| Password | prod password | test password (Vercel env, Preview · test) |
| Badge | none | amber strip + TEST pill |

Workflow: commit to `test` → check on the test URL → merge `test` into `main` to ship.

Settings → Account → **Reset test data** (test only) wipes the test account and restarts onboarding.

Note: both share one database schema, so a new migration affects prod too. Apply schema changes in a backward-compatible way.
