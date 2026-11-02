---
name: exercise-science-coach
description: Evidence-based strength & conditioning coach knowledge for the OpenGym Coach app. Use when changing the intake questionnaire, fitness test protocols/norms, scoring, diet analysis, program generation (src/lib/science/*), or the Gemma coach master prompt (src/lib/coach/*). Also use when reviewing whether a prescription is safe and scientifically sound.
---

# Exercise Science Coach

This skill is the single source of truth for the coaching logic in this repo. Code in
`src/lib/science/` implements it; `src/lib/coach/master-prompt.ts` teaches it to the Gemma chatbot.
When you change one, keep the other in sync.

## Pipeline

1. **Screen** – PAR-Q+ style 7 questions + pregnancy/postpartum. Any "yes" → recommend medical
   clearance before maximal tests; pregnancy or < 12 weeks postpartum → no auto program, refer to
   clinician / pelvic-floor physio, coach still available for general guidance.
2. **Intake questionnaire** – demographics, activity history (training age), goals, schedule,
   equipment, injuries, sleep/stress, diet habits (Indian diet patterns supported).
3. **Field tests** (home friendly, all optional, each with protocol + timer):
   resting HR, knee/full push-ups (CSEP), forearm plank, 1-min bodyweight squat, YMCA 3-min step
   test *or* Rockport 1-mile walk (VO2max estimate), sit-and-reach (cm past toes), single-leg
   stance, waist + height (WHtR), optional dead hang. Squat test also records movement faults
   (knees cave, heels lift, forward lean) for corrective work.
4. **Analyse** – each test → score 1–5 against age/sex norms (see `references/norms.md`).
   Domains: cardio, upper, lower, core, mobility, balance, body composition.
   Fitness level from training age + mean domain score.
5. **Diet analysis** – protein estimate (palm portions × ~25 g) vs target (1.2 g/kg health,
   1.6 g/kg fat-loss/muscle; Morton 2018), Mifflin-St Jeor BMR × activity factor for an energy
   *range* (never a crash diet: max −20 %), produce/fibre, water (~35 ml/kg), sugary drinks,
   alcohol, sleep 7–9 h. Output top-3 priorities, not a meal plan.
6. **Program** – 4-week mesocycle, week 4 deload. See `references/programming.md`.
7. **Coach loop** – daily check-in, adherence tracking, auto-regulation (RIR/RPE), retest every
   6–8 weeks.

## Non-negotiable safety rules

- Never diagnose. Red flags (chest pain, fainting, sharp joint pain, pelvic pain/leaking,
  dizziness) → stop exercise and see a clinician.
- No max-effort tests or high intensity if any PAR-Q flag is unacknowledged.
- Progress load ≤ ~10 %/week; one variable at a time.
- Calorie targets are ranges and never below BMR.
- Menstrual cycle: evidence for cycle-phase programming is weak (McNulty 2020) – adjust by
  symptoms/readiness, not by calendar.

## Files

- `references/norms.md` – test protocols and scoring tables.
- `references/programming.md` – splits, goal prescriptions, progression, exercise selection.
