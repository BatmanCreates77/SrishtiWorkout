// Exercise pool per movement pattern. Every id is an openGym catalogue entry
// (vendor/openGym/catalogue/exercises/<id>.json). tier: 1 = regression, 2 = standard, 3 = progression.
// tags let the coach skill's curation rules (coach-skill/content/curation.json) exclude exercises,
// e.g. "jump" for sore knees, "wrist" for floor-loaded wrists, "spine" for heavy spinal loading.

export type EquipKey =
  | "bodyweight" | "dumbbell" | "kettlebell" | "band" | "pullup_bar" | "bench" | "barbell" | "cable"
  | "machine" | "smith" | "trap_bar" | "stability_ball" | "jump_rope" | "cardio_machine" | "step";

export const EQUIPMENT_OPTIONS: { key: EquipKey; label: string }[] = [
  { key: "dumbbell", label: "Dumbbells" },
  { key: "kettlebell", label: "Kettlebell" },
  { key: "band", label: "Resistance bands" },
  { key: "pullup_bar", label: "Pull-up bar" },
  { key: "bench", label: "Bench / sturdy surface" },
  { key: "step", label: "Step or stairs" },
  { key: "barbell", label: "Barbell & plates" },
  { key: "trap_bar", label: "Trap / hex bar" },
  { key: "cable", label: "Cable machine" },
  { key: "machine", label: "Gym machines" },
  { key: "smith", label: "Smith machine" },
  { key: "stability_ball", label: "Swiss ball" },
  { key: "jump_rope", label: "Jump rope" },
  { key: "cardio_machine", label: "Treadmill / bike / elliptical" },
];

export const GYM_EQUIPMENT: EquipKey[] = [
  "dumbbell", "kettlebell", "band", "pullup_bar", "bench", "step", "barbell", "trap_bar",
  "cable", "machine", "smith", "stability_ball", "jump_rope", "cardio_machine",
];

export type Pattern =
  | "squat" | "hinge" | "lunge" | "hpush" | "vpush" | "hpull" | "vpull"
  | "core" | "core_rot" | "glute" | "carry" | "biceps" | "triceps" | "shoulders"
  | "calves" | "cardio" | "mobility";

export type Tag = "jump" | "deep_knee" | "wrist" | "spine" | "overhead" | "floor" | "impact" | "high_heart";
export type Candidate = { id: string; tier: 1 | 2 | 3; needs: EquipKey[]; tags?: Tag[] };

const c = (id: string, tier: 1 | 2 | 3, needs: EquipKey[] = [], tags: Tag[] = []): Candidate => ({ id, tier, needs, tags });

export const PATTERNS: Record<Pattern, Candidate[]> = {
  squat: [
    c("10168", 1), c("1197", 2, [], ["deep_knee"]), c("3769", 2, [], ["deep_knee"]), c("0514", 3, [], ["jump", "impact", "deep_knee"]),
    c("0784", 1, ["band"]), c("1760", 2, ["dumbbell"]), c("0534", 2, ["kettlebell"]),
    c("0750", 1, ["smith"]), c("0739", 2, ["machine"]), c("1436", 2, ["barbell"], ["spine"]), c("0042", 3, ["barbell"], ["spine", "deep_knee"]),
  ],
  hinge: [
    c("3013", 1, [], ["floor"]), c("3561", 2, [], ["floor"]), c("0726", 3, [], ["floor"]),
    c("0991", 1, ["band"]), c("1010", 2, ["band"]),
    c("1459", 2, ["dumbbell"]), c("1757", 3, ["dumbbell"]), c("0549", 2, ["kettlebell"], ["spine"]),
    c("0811", 2, ["trap_bar"], ["spine"]), c("0085", 2, ["barbell"], ["spine"]), c("0032", 3, ["barbell"], ["spine"]), c("0157", 2, ["cable"]),
  ],
  lunge: [
    c("2368", 1, [], ["deep_knee"]), c("0612", 2, [], ["deep_knee"]), c("1460", 2, [], ["deep_knee"]), c("3470", 3, [], ["deep_knee"]),
    c("0801", 1, ["step"]), c("1008", 1, ["band", "step"]), c("0431", 2, ["dumbbell", "step"]), c("0381", 2, ["dumbbell"], ["deep_knee"]),
    c("0336", 2, ["dumbbell"], ["deep_knee"]), c("0410", 3, ["dumbbell", "bench"], ["deep_knee"]), c("0078", 3, ["barbell"], ["deep_knee", "spine"]),
  ],
  hpush: [
    c("0659", 1), c("0493", 1), c("3211", 2, [], ["wrist", "floor"]), c("0662", 3, [], ["wrist", "floor"]), c("0279", 3, [], ["wrist", "floor"]),
    c("3124", 1, ["band"]), c("1254", 2, ["band"]), c("0576", 1, ["machine"]), c("2144", 2, ["cable"]),
    c("0289", 2, ["dumbbell", "bench"]), c("0314", 2, ["dumbbell", "bench"]), c("0025", 3, ["barbell", "bench"]),
  ],
  vpush: [
    c("2921", 3, [], ["wrist", "overhead"]),
    c("0997", 1, ["band"], ["overhead"]), c("3122", 1, ["band"], ["overhead"]),
    c("0405", 1, ["dumbbell"], ["overhead"]), c("0426", 2, ["dumbbell"], ["overhead"]), c("0414", 2, ["dumbbell"], ["overhead"]),
    c("0553", 2, ["kettlebell"], ["overhead"]), c("0603", 1, ["machine"], ["overhead"]), c("0219", 2, ["cable"], ["overhead"]),
    c("1456", 3, ["barbell"], ["overhead", "spine"]),
  ],
  hpull: [
    c("3165", 1), c("3166", 1), c("2300", 2, ["pullup_bar"]), c("0499", 3, ["pullup_bar"]),
    c("3144", 1, ["band"]), c("0988", 1, ["band"]),
    c("0292", 1, ["dumbbell"]), c("0293", 2, ["dumbbell"]), c("0522", 2, ["kettlebell"]),
    c("1350", 1, ["machine"]), c("0861", 2, ["cable"]), c("0027", 3, ["barbell"], ["spine"]),
  ],
  vpull: [
    c("3117", 1, ["band"]), c("0983", 1, ["band"]), c("0688", 1, ["pullup_bar"]),
    c("0970", 2, ["pullup_bar", "band"]), c("7385", 2, ["pullup_bar"]),
    c("1326", 3, ["pullup_bar"]), c("0652", 3, ["pullup_bar"]),
    c("0017", 1, ["machine"]), c("0579", 1, ["machine"]), c("2330", 2, ["cable"]),
  ],
  core: [
    c("0276", 1, [], ["floor"]), c("1241", 1, [], ["floor", "wrist"]), c("0463", 2, [], ["floor"]), c("0872", 2, [], ["floor"]),
    c("0630", 2, [], ["wrist", "high_heart"]), c("2135", 3, ["dumbbell"], ["floor"]), c("0472", 3, ["pullup_bar"]),
  ],
  core_rot: [
    c("0133", 1, [], ["floor"]), c("0715", 2, [], ["floor"]), c("0664", 3, [], ["wrist", "floor"]),
    c("0979", 2, ["band"]), c("1015", 2, ["band"]),
  ],
  glute: [
    c("0710", 1, [], ["floor"]), c("2461", 1, [], ["floor"]), c("0628", 2, ["band"]), c("3236", 2, ["band"]),
    c("1409", 3, ["barbell"]), c("0597", 2, ["machine"]), c("3523", 2, ["bench"]),
  ],
  carry: [c("2133", 2, ["dumbbell"]), c("3548", 3, ["dumbbell"], ["overhead"]), c("5099", 2, ["kettlebell"])],
  biceps: [c("0968", 1, ["band"]), c("0294", 2, ["dumbbell"]), c("0313", 2, ["dumbbell"]), c("0868", 2, ["cable"])],
  triceps: [c("0815", 1, [], ["wrist", "floor"]), c("0998", 1, ["band"]), c("0430", 2, ["dumbbell"], ["overhead"]), c("0241", 2, ["cable"]), c("0812", 2, ["bench"], ["wrist"])],
  shoulders: [c("0977", 1, ["band"]), c("0334", 2, ["dumbbell"]), c("0380", 2, ["dumbbell"]), c("0178", 2, ["cable"])],
  calves: [c("3018", 1), c("0417", 2, ["dumbbell"]), c("0999", 2, ["band"]), c("0605", 2, ["machine"])],
  cardio: [
    c("3004", 1), c("0685", 2, [], ["impact"]), c("2612", 2, ["jump_rope"], ["jump", "impact", "high_heart"]),
    c("3224", 2, [], ["jump", "impact", "high_heart"]), c("1160", 3, [], ["jump", "impact", "wrist", "high_heart"]),
    c("2138", 1, ["cardio_machine"]), c("2141", 1, ["cardio_machine"]),
  ],
  mobility: [c("4580", 1, [], ["wrist", "floor"]), c("4633", 1), c("1053", 1), c("2936", 1)],
};

export const WARMUP_IDS = { catCow: "4580", greatest: "4633", hipFlexor: "1053", ankle: "2936" };
export const BRISK_WALK_ID = "3004";

/** All candidates of a pattern, for Swap: same movement, her equipment, not excluded. */
export function alternatives(p: Pattern, equip: Set<EquipKey>, exclude: Set<string>, excludeTags: Set<Tag>) {
  return PATTERNS[p].filter((x) => x.needs.every((n) => equip.has(n)) && !exclude.has(x.id) && !(x.tags ?? []).some((t) => excludeTags.has(t)));
}
