// Curated exercise candidates per movement pattern.
// IDs refer to openGym catalogue entries (MIT-licensed ExerciseDB text subset, see NOTICE.md).
// IDs starting with "c-" are our own exercises (text written for this app).
// tier: 1 = regression / beginner, 2 = standard, 3 = progression.

export type EquipKey =
  | "bodyweight"
  | "dumbbell"
  | "kettlebell"
  | "band"
  | "pullup_bar"
  | "bench"
  | "barbell"
  | "cable"
  | "machine"
  | "smith"
  | "trap_bar"
  | "stability_ball"
  | "jump_rope"
  | "cardio_machine"
  | "step";

export const EQUIPMENT_OPTIONS: { key: EquipKey; label: string }[] = [
  { key: "dumbbell", label: "Dumbbells" },
  { key: "kettlebell", label: "Kettlebell" },
  { key: "band", label: "Resistance bands / mini bands" },
  { key: "pullup_bar", label: "Pull-up bar" },
  { key: "bench", label: "Bench (or sturdy flat surface)" },
  { key: "step", label: "Step / box / stairs" },
  { key: "barbell", label: "Barbell & plates" },
  { key: "trap_bar", label: "Trap / hex bar" },
  { key: "cable", label: "Cable machine" },
  { key: "machine", label: "Gym machines (leg press, chest press, lat pulldown…)" },
  { key: "smith", label: "Smith machine" },
  { key: "stability_ball", label: "Stability / Swiss ball" },
  { key: "jump_rope", label: "Jump rope" },
  { key: "cardio_machine", label: "Cardio machine (treadmill, bike, elliptical)" },
];

export const GYM_EQUIPMENT: EquipKey[] = [
  "dumbbell", "kettlebell", "band", "pullup_bar", "bench", "step", "barbell", "trap_bar",
  "cable", "machine", "smith", "stability_ball", "jump_rope", "cardio_machine",
];

export type Pattern =
  | "squat" | "hinge" | "lunge" | "hpush" | "vpush" | "hpull" | "vpull"
  | "core" | "core_rot" | "glute" | "carry" | "biceps" | "triceps" | "shoulders"
  | "calves" | "cardio" | "mobility";

export type Candidate = { id: string; tier: 1 | 2 | 3; needs: EquipKey[] };

const bw = (id: string, tier: 1 | 2 | 3, ...extra: EquipKey[]): Candidate => ({ id, tier, needs: extra });
const eq = (id: string, tier: 1 | 2 | 3, ...needs: EquipKey[]): Candidate => ({ id, tier, needs });

export const PATTERNS: Record<Pattern, Candidate[]> = {
  squat: [
    bw("c-box-squat", 1), bw("c-bodyweight-squat", 2), bw("3769", 2), bw("0514", 3),
    eq("1004", 1, "band"), eq("1760", 2, "dumbbell"), eq("0534", 2, "kettlebell"),
    eq("0750", 1, "smith"), eq("c-leg-press", 2, "machine"), eq("0743", 3, "machine"),
    eq("1436", 2, "barbell"), eq("0042", 3, "barbell"),
  ],
  hinge: [
    bw("3013", 1), bw("3561", 2), bw("c-single-leg-bridge", 3),
    eq("0991", 1, "band"), eq("1010", 2, "band"),
    eq("1459", 2, "dumbbell"), eq("1757", 3, "dumbbell"),
    eq("0549", 2, "kettlebell"), eq("0811", 2, "trap_bar"),
    eq("0085", 2, "barbell"), eq("0032", 3, "barbell"), eq("0157", 2, "cable"),
  ],
  lunge: [
    bw("2368", 1), bw("c-reverse-lunge", 2), bw("1460", 2), bw("3470", 3),
    eq("1008", 1, "band", "step"), eq("0431", 2, "dumbbell", "step"), eq("0381", 2, "dumbbell"),
    eq("0336", 2, "dumbbell"), eq("0410", 3, "dumbbell", "bench"), eq("0078", 3, "barbell"),
  ],
  hpush: [
    bw("0659", 1), bw("0493", 1), bw("3211", 2), bw("0662", 3), bw("0279", 3),
    eq("3124", 1, "band"), eq("1254", 2, "band"),
    eq("0576", 1, "machine"), eq("2144", 2, "cable"),
    eq("0289", 2, "dumbbell", "bench"), eq("0314", 2, "dumbbell", "bench"),
    eq("0025", 3, "barbell", "bench"),
  ],
  vpush: [
    bw("c-pike-push-up", 3),
    eq("0997", 1, "band"), eq("3122", 1, "band"),
    eq("0405", 1, "dumbbell"), eq("0426", 2, "dumbbell"), eq("0414", 2, "dumbbell"),
    eq("0553", 2, "kettlebell"), eq("0603", 1, "machine"), eq("0219", 2, "cable"),
    eq("1456", 3, "barbell"),
  ],
  hpull: [
    bw("3165", 1), bw("3166", 1), eq("2300", 2, "pullup_bar"), eq("0499", 3, "pullup_bar"),
    eq("3144", 1, "band"), eq("0988", 1, "band"),
    eq("0292", 1, "dumbbell"), eq("0293", 2, "dumbbell"), eq("0522", 2, "kettlebell"),
    eq("1350", 1, "machine"), eq("0861", 2, "cable"), eq("0027", 3, "barbell"),
  ],
  vpull: [
    eq("3117", 1, "band"), eq("0983", 1, "band"), eq("0688", 1, "pullup_bar"),
    eq("0970", 2, "pullup_bar", "band"), eq("c-negative-pull-up", 2, "pullup_bar"),
    eq("1326", 3, "pullup_bar"), eq("0652", 3, "pullup_bar"),
    eq("0017", 1, "machine"), eq("0579", 1, "machine"), eq("2330", 2, "cable"),
  ],
  core: [
    bw("0276", 1), bw("c-bird-dog", 1), bw("c-forearm-plank", 2), bw("0872", 2), bw("0630", 2),
    eq("2135", 3, "dumbbell"), eq("0472", 3, "pullup_bar"),
  ],
  core_rot: [
    bw("3544", 1), bw("0705", 2), bw("0664", 3),
    eq("0979", 2, "band"), eq("1015", 2, "band"),
  ],
  glute: [
    bw("0710", 1), bw("c-clamshell", 1), eq("0628", 2, "band"), eq("3236", 2, "band"),
    eq("1409", 3, "barbell"), eq("0597", 2, "machine"), bw("3523", 2, "bench"),
  ],
  carry: [eq("2133", 2, "dumbbell"), eq("3548", 3, "dumbbell"), eq("c-kb-suitcase-carry", 2, "kettlebell")],
  biceps: [eq("0968", 1, "band"), eq("0294", 2, "dumbbell"), eq("0313", 2, "dumbbell"), eq("0868", 2, "cable")],
  triceps: [bw("0815", 1), eq("0998", 1, "band"), eq("0430", 2, "dumbbell"), eq("0241", 2, "cable"), eq("0812", 2, "bench")],
  shoulders: [eq("0977", 1, "band"), eq("0334", 2, "dumbbell"), eq("0380", 2, "dumbbell"), eq("0178", 2, "cable")],
  calves: [bw("c-calf-raise", 1), eq("0417", 2, "dumbbell"), eq("0999", 2, "band"), eq("0605", 2, "machine")],
  cardio: [
    bw("c-brisk-walk", 1), bw("0685", 2), eq("2612", 2, "jump_rope"), bw("3224", 2), bw("1160", 3),
    eq("2138", 1, "cardio_machine"), eq("2141", 1, "cardio_machine"),
  ],
  mobility: [bw("c-cat-cow", 1), bw("c-worlds-greatest-stretch", 1), bw("c-hip-flexor-stretch", 1), bw("c-ankle-rocks", 1)],
};

export type CustomExercise = {
  id: string; name: string; bodyPart: string; equipment: string; target: string;
  secondaryMuscles: string[]; category: string; instructions: string[]; hold?: boolean;
};

// Our own exercises fill gaps in the MIT subset (basic patterns, mobility, regressions).
export const CUSTOM_EXERCISES: CustomExercise[] = [
  { id: "c-box-squat", name: "box squat to chair", bodyPart: "upper legs", equipment: "body weight", target: "quads", secondaryMuscles: ["glutes", "hamstrings"], category: "strength", instructions: ["Stand in front of a sturdy chair, feet shoulder-width apart, toes slightly out.", "Push your hips back and bend your knees, keeping your chest proud.", "Lightly touch the chair with your hips without fully sitting down.", "Drive through your whole foot to stand back up tall.", "Keep knees tracking over your toes the whole time."] },
  { id: "c-bodyweight-squat", name: "bodyweight squat", bodyPart: "upper legs", equipment: "body weight", target: "quads", secondaryMuscles: ["glutes", "hamstrings", "core"], category: "strength", instructions: ["Stand with feet shoulder-width apart, toes turned out slightly.", "Brace your core and reach your arms forward for balance.", "Sit down and back until thighs are at least parallel to the floor.", "Keep heels down and knees in line with your toes.", "Stand up by pushing the floor away, squeezing your glutes at the top."] },
  { id: "c-leg-press", name: "lever leg press", bodyPart: "upper legs", equipment: "leverage machine", target: "quads", secondaryMuscles: ["glutes", "hamstrings"], category: "strength", instructions: ["Sit in the machine with your back flat against the pad.", "Place feet hip-width on the platform, mid-height.", "Release the safeties and lower the sled until knees reach about 90 degrees.", "Press through your whole foot to extend without locking the knees.", "Keep your lower back on the pad throughout."] },
  { id: "c-single-leg-bridge", name: "single leg glute bridge", bodyPart: "upper legs", equipment: "body weight", target: "glutes", secondaryMuscles: ["hamstrings", "core"], category: "strength", instructions: ["Lie on your back, one knee bent with the foot flat, the other leg extended.", "Brace your core and press through the planted heel.", "Lift your hips until your body forms a straight line from shoulder to knee.", "Pause and squeeze the glute, keeping hips level.", "Lower slowly and repeat, then switch sides."] },
  { id: "c-reverse-lunge", name: "bodyweight reverse lunge", bodyPart: "upper legs", equipment: "body weight", target: "glutes", secondaryMuscles: ["quadriceps", "hamstrings"], category: "strength", instructions: ["Stand tall with feet hip-width apart.", "Step one foot back and lower until both knees are near 90 degrees.", "Keep your front shin fairly vertical and torso upright.", "Push through the front heel to return to standing.", "Alternate legs or complete all reps on one side."] },
  { id: "c-pike-push-up", name: "pike push-up", bodyPart: "shoulders", equipment: "body weight", target: "delts", secondaryMuscles: ["triceps", "upper back"], category: "calisthenics", instructions: ["Start in a push-up position, then walk your feet in so hips rise into an inverted V.", "Hands slightly wider than shoulders, head between your arms.", "Bend your elbows to lower the top of your head toward the floor.", "Press back up until arms are straight.", "Keep hips high throughout."] },
  { id: "c-negative-pull-up", name: "negative (eccentric) pull-up", bodyPart: "back", equipment: "body weight", target: "lats", secondaryMuscles: ["biceps", "upper back"], category: "strength", instructions: ["Use a step to get your chin above the bar with an overhand grip.", "Step off and hold the top position briefly with shoulders down.", "Lower yourself as slowly as possible (aim for 3 to 5 seconds).", "Reach full arm extension at the bottom.", "Step back up and repeat."] },
  { id: "c-bird-dog", name: "bird dog", bodyPart: "waist", equipment: "body weight", target: "abs", secondaryMuscles: ["glutes", "lower back"], category: "strength", instructions: ["Start on hands and knees, hands under shoulders and knees under hips.", "Brace your core as if about to be poked in the stomach.", "Reach one arm forward and the opposite leg back until both are level with your torso.", "Hold for 2 seconds without letting your hips rotate.", "Return with control and switch sides."] },
  { id: "c-forearm-plank", name: "forearm plank", bodyPart: "waist", equipment: "body weight", target: "abs", secondaryMuscles: ["shoulders", "glutes"], category: "isometric", hold: true, instructions: ["Place forearms on the floor with elbows under shoulders.", "Step your feet back so your body forms a straight line from head to heels.", "Squeeze glutes and brace your core; do not let hips sag or pike.", "Breathe steadily and hold for the prescribed time.", "Drop to knees if form breaks."] },
  { id: "c-clamshell", name: "side-lying clamshell", bodyPart: "upper legs", equipment: "body weight", target: "abductors", secondaryMuscles: ["glutes"], category: "strength", instructions: ["Lie on your side with hips and knees bent about 45 degrees, feet together.", "Keep your feet touching and lift the top knee as high as you can without rolling your pelvis back.", "Pause and feel the side of your hip working.", "Lower slowly.", "Add a mini band above the knees to progress."] },
  { id: "c-kb-suitcase-carry", name: "kettlebell suitcase carry", bodyPart: "waist", equipment: "kettlebell", target: "abs", secondaryMuscles: ["forearms", "traps", "obliques"], category: "strength", instructions: ["Hold a kettlebell in one hand by your side.", "Stand tall, shoulders level, core braced.", "Walk with short controlled steps for the prescribed distance or time.", "Do not lean toward or away from the weight.", "Switch hands and repeat."] },
  { id: "c-calf-raise", name: "bodyweight standing calf raise", bodyPart: "lower legs", equipment: "body weight", target: "calves", secondaryMuscles: ["ankles"], category: "strength", instructions: ["Stand with the balls of your feet on a step or flat floor, holding a wall for balance.", "Rise up onto your toes as high as you can.", "Pause for one second at the top.", "Lower slowly, letting heels drop below the step if using one.", "Progress to single-leg when 20 reps feel easy."] },
  { id: "c-brisk-walk", name: "brisk walk (zone 2)", bodyPart: "cardio", equipment: "body weight", target: "cardiovascular system", secondaryMuscles: ["calves", "glutes"], category: "cardio", instructions: ["Walk at a pace where you breathe harder but can still speak in full sentences.", "Swing your arms naturally and stand tall.", "Use hills or an incline to raise intensity if flat walking feels too easy.", "Keep effort around 3 to 4 out of 10.", "Cool down with 2 minutes of easy walking."] },
  { id: "c-cat-cow", name: "cat-cow", bodyPart: "back", equipment: "body weight", target: "spine", secondaryMuscles: ["core"], category: "mobility", instructions: ["Start on hands and knees.", "Inhale, drop your belly and lift your chest and tailbone (cow).", "Exhale, round your spine toward the ceiling and tuck your chin (cat).", "Move slowly through the full range.", "Repeat for 8 to 10 breaths."] },
  { id: "c-worlds-greatest-stretch", name: "world's greatest stretch", bodyPart: "full body", equipment: "body weight", target: "hamstrings", secondaryMuscles: ["hip flexors", "upper back"], category: "mobility", instructions: ["Step into a long lunge with your right foot forward.", "Place your left hand on the floor and drop your right elbow toward your right instep.", "Rotate your right arm up toward the ceiling, following it with your eyes.", "Return the hand down, straighten the front leg to stretch the hamstring.", "Repeat 3 to 5 times per side."] },
  { id: "c-hip-flexor-stretch", name: "half-kneeling hip flexor stretch", bodyPart: "upper legs", equipment: "body weight", target: "quads", secondaryMuscles: ["hip flexors"], category: "stretching", hold: true, instructions: ["Kneel on one knee with the other foot forward, both knees at 90 degrees.", "Tuck your pelvis under by squeezing the glute of the kneeling leg.", "Shift slightly forward until you feel a stretch at the front of the hip.", "Hold for 30 seconds breathing calmly.", "Switch sides."] },
  { id: "c-ankle-rocks", name: "knee-to-wall ankle rocks", bodyPart: "lower legs", equipment: "body weight", target: "calves", secondaryMuscles: ["ankles"], category: "mobility", instructions: ["Face a wall in a half-kneeling position with the front foot a few cm from the wall.", "Keeping the heel down, drive the knee forward to touch the wall.", "Return and repeat 10 times.", "Move the foot back slightly as it gets easier.", "Switch sides."] },
];
