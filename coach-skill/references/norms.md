# Field test protocols & norms

Scores are 1 (needs work) → 5 (excellent). Tables are approximations of published norms and are
for *tracking change*, not clinical diagnosis.

| Test | Protocol (short) | Source | Scoring |
|---|---|---|---|
| Resting HR | Morning, seated, count 60 s | ACSM | <60:5, 60-69:4, 70-79:3, 80-89:2, ≥90:1; ≥100 flag |
| Push-ups | Knee (default for women) or full, to form failure, no rest | CSEP | age-band table in `src/lib/science/tests.ts` |
| Forearm plank | Max hold until hips sag | practical ranges | <30s:1, 30-59:2, 60-89:3, 90-119:4, ≥120:5 |
| 1-min squat | Bodyweight squats to chair height in 60 s | YMCA-derived tables | 7 categories → 1–5 |
| YMCA step test | 30 cm step, 96 bpm metronome, 3 min, count HR 60 s from 5 s after | YMCA | recovery HR age/sex table |
| Rockport walk | Walk 1 mile as fast as possible, HR at finish | Kline 1987 | VO2max = 132.853 − 0.0769·lb − 0.3877·age + 6.315·male − 3.2649·min − 0.1565·HR; Cooper Institute table |
| Sit & reach | Seated, legs straight, reach; cm past toes (negative if short) | YMCA (adapted) | ≤−10:1, −9..−1:2, 0..4:3, 5..9:4, ≥10:5 |
| Single-leg stance | Eyes open, hands on hips, max 45 s, weaker leg | Springer 2007 | <10:1, 10-19:2, 20-29:3, 30-44:4, 45:5 (×0.6 thresholds ≥60 y) |
| Waist-to-height | Waist at navel / height | Ashwell 2012 | 0.40-0.49:5, <0.40:4, 0.50-0.59:3, ≥0.60:1 |
| Dead hang | Overhand, max time | practical ranges | <10:1, 10-19:2, 20-39:3, 40-59:4, ≥60:5 |

Movement faults on the squat test (NASM overhead-squat logic):
- knees cave → glute-med work (side-lying abduction, monster walk)
- heels lift → ankle dorsiflexion mobility, heel-elevated squats
- excessive forward lean → goblet squat, hip-flexor/ankle mobility, core bracing

## Movement-check targets (results screen, `src/lib/science/benchmarks.ts`)
- Push-ups and 1-min squat use the CSEP / YMCA age-sex tables above. Push-ups are converted between knee and full (×1.6).
- Plank uses the practical ranges above.
- Glute bridge (60 s), lunge (60 s, per leg) and dumbbell row (45 s) have no published norm. They use coach benchmarks for adults under 40 (Fair/Good/Very good/Excellent from 15/22/30/38, 8/11/14/17 and 12/16/20/25), scaled ×0.9 for 40–49, ×0.8 for 50–59 and ×0.7 for 60+. The row is also scaled ×0.9 for women.
- Target by training experience:

  | Training experience | Target |
  |---|---|
  | None, or under 6 months | Good |
  | 6 months – 2 years | Very good |
  | Over 2 years | Excellent |

  "Very fit" adds one level.
