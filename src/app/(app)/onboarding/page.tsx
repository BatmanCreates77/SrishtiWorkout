"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Chips, inputCls, Label, Notice, NumberInput, Scale, Spinner } from "@/components/ui";
import { getLatestIntake, saveIntake } from "@/lib/data";
import { PARQ_QUESTIONS } from "@/lib/science/analysis";
import { EQUIPMENT_OPTIONS, GYM_EQUIPMENT } from "@/lib/science/patterns";
import type { Intake } from "@/lib/science/types";
import { supabase } from "@/lib/supabase/client";

const DEFAULTS: Partial<Intake> = {
  sex: "female", parq: {}, pregnancy: "no", injuries: "", painAreas: [], trainingAge: 0, currentDaysPerWeek: 0,
  currentActivities: [], dailySteps: "3to6k", jobActivity: "sedentary", primaryGoal: "general", secondaryGoal: "",
  goalNote: "", daysPerWeek: 3, preferredDays: [], sessionMinutes: 45, location: "home", equipment: [],
  sleepHours: 7, sleepQuality: 3, stress: 3, energy: 3, dietPattern: "vegetarian", mealsPerDay: 3, proteinPalms: 2,
  vegServings: 2, fruitServings: 1, waterLiters: 2, sugaryDrinksPerWeek: 2, alcoholPerWeek: 0, friedOrPackagedPerWeek: 3,
  lateEating: false, supplements: [],
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STEPS = ["About you", "Health check", "Activity", "Goals", "Schedule & equipment", "Recovery", "Nutrition"];

function Q({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return <div className="space-y-1"><Label hint={hint}>{label}</Label>{children}</div>;
}

export default function Onboarding() {
  const router = useRouter();
  const [d, setD] = useState<Partial<Intake> | null>(null);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setD((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const existing = await getLatestIntake();
      const { data } = await supabase().auth.getUser();
      setD(existing ?? { ...DEFAULTS, name: (data.user?.user_metadata?.display_name as string) ?? "" });
    })();
  }, []);

  if (!d) return <Spinner />;

  function validate(): string {
    if (step === 0) {
      if (!d!.name) return "Please enter your name.";
      if (!d!.age || d!.age < 14 || d!.age > 90) return "Please enter an age between 14 and 90.";
      if (!d!.heightCm || d!.heightCm < 120 || d!.heightCm > 220) return "Please enter your height in cm.";
      if (!d!.weightKg || d!.weightKg < 30 || d!.weightKg > 250) return "Please enter your weight in kg.";
    }
    if (step === 1 && PARQ_QUESTIONS.some((q) => d!.parq?.[q.key] === undefined)) return "Please answer every health question.";
    if (step === 4 && d!.preferredDays!.length && d!.preferredDays!.length !== d!.daysPerWeek)
      return `Pick exactly ${d!.daysPerWeek} preferred days, or clear them to let the coach choose.`;
    return "";
  }

  async function next() {
    const e = validate();
    setErr(e);
    if (e) return;
    if (step < STEPS.length - 1) { setStep(step + 1); window.scrollTo(0, 0); return; }
    setSaving(true);
    try {
      await saveIntake({ ...(DEFAULTS as Intake), ...(d as Intake) });
      router.push("/assessment");
    } catch (x) {
      setErr((x as Error).message);
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <div className="mb-2 flex justify-between text-xs font-medium text-muted"><span>Step {step + 1} of {STEPS.length}</span><span>{STEPS[step]}</span></div>
        <div className="h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>
      <h1 className="mb-1 text-2xl font-bold">{STEPS[step]}</h1>
      <p className="mb-6 text-sm text-muted">
        {["The basics your coach needs to use the right norms and targets.", "A standard pre-exercise screen (PAR-Q+). Answer honestly, it keeps you safe.", "Where you are starting from today.", "What success looks like for you.", "We build the plan around your real life.", "Recovery drives results as much as training does.", "No judgement, just a snapshot of a typical day. Estimates are fine."][step]}
      </p>

      <div className="space-y-6">
        {step === 0 && (<>
          <Q label="Name"><input className={inputCls} value={d.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Q>
          <div className="grid grid-cols-2 gap-3">
            <Q label="Age"><NumberInput value={d.age} onChange={(v) => set("age", v!)} suffix="yrs" /></Q>
            <Q label="Sex (for norms)"><Chips options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} value={d.sex} onChange={(v) => set("sex", v as Intake["sex"])} /></Q>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Q label="Height"><NumberInput value={d.heightCm} onChange={(v) => set("heightCm", v!)} suffix="cm" /></Q>
            <Q label="Weight"><NumberInput value={d.weightKg} onChange={(v) => set("weightKg", v!)} step={0.1} suffix="kg" /></Q>
          </div>
          <Q label="Waist (optional)" hint="At belly-button level. You can also measure it during the tests."><NumberInput value={d.waistCm} onChange={(v) => set("waistCm", v)} suffix="cm" /></Q>
        </>)}

        {step === 1 && (<>
          {PARQ_QUESTIONS.map((q) => (
            <Q key={q.key} label={q.text}>
              <Chips options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]}
                value={d.parq?.[q.key] === undefined ? undefined : d.parq[q.key] ? "yes" : "no"}
                onChange={(v) => set("parq", { ...d.parq, [q.key]: v === "yes" })} />
            </Q>
          ))}
          {d.sex === "female" && (
            <Q label="Pregnancy / postpartum">
              <Chips options={[{ value: "no", label: "Neither" }, { value: "pregnant", label: "Pregnant" }, { value: "postpartum_lt12w", label: "Postpartum < 12 weeks" }, { value: "postpartum_gt12w", label: "Postpartum > 12 weeks" }]}
                value={d.pregnancy} onChange={(v) => set("pregnancy", v as Intake["pregnancy"])} />
            </Q>
          )}
          <Q label="Any pain right now or during exercise?">
            <Chips multi options={["neck", "shoulder", "elbow/wrist", "upper back", "lower back", "hip", "knee", "ankle/foot", "pelvic floor"].map((x) => ({ value: x, label: x }))}
              value={d.painAreas} onChange={(v) => set("painAreas", v as string[])} />
          </Q>
          <Q label="Past injuries, surgeries or conditions (optional)"><textarea className={inputCls} rows={2} value={d.injuries} onChange={(e) => set("injuries", e.target.value)} placeholder="e.g. ACL repair 2019, mild scoliosis, PCOS, thyroid…" /></Q>
          {Object.values(d.parq ?? {}).some(Boolean) && <Notice>You answered yes to a screening question. You can continue, but please get clearance from a doctor before the harder tests and vigorous training. Your plan will start conservatively.</Notice>}
        </>)}

        {step === 2 && (<>
          <Q label="Strength-training experience">
            <Chips options={[{ value: 0, label: "None" }, { value: 1, label: "< 6 months" }, { value: 2, label: "6–24 months" }, { value: 3, label: "2+ years" }]} value={d.trainingAge} onChange={(v) => set("trainingAge", v as Intake["trainingAge"])} />
          </Q>
          <Q label="How many days a week do you exercise now?"><Chips options={[0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) }))} value={d.currentDaysPerWeek} onChange={(v) => set("currentDaysPerWeek", v as number)} /></Q>
          <Q label="What do you currently do?">
            <Chips multi options={["walking", "running", "gym weights", "home workouts", "yoga", "pilates", "dance / zumba", "cycling", "swimming", "sports"].map((x) => ({ value: x, label: x }))} value={d.currentActivities} onChange={(v) => set("currentActivities", v as string[])} />
          </Q>
          <Q label="Typical daily steps"><Chips options={[{ value: "lt3k", label: "< 3k" }, { value: "3to6k", label: "3–6k" }, { value: "6to9k", label: "6–9k" }, { value: "gt9k", label: "9k+" }]} value={d.dailySteps} onChange={(v) => set("dailySteps", v as Intake["dailySteps"])} /></Q>
          <Q label="Your day job is mostly…"><Chips options={[{ value: "sedentary", label: "Sitting" }, { value: "light", label: "On my feet sometimes" }, { value: "active", label: "Physically active" }]} value={d.jobActivity} onChange={(v) => set("jobActivity", v as Intake["jobActivity"])} /></Q>
        </>)}

        {step === 3 && (() => {
          const goals = [{ value: "fat_loss", label: "Lose fat" }, { value: "muscle", label: "Tone & build muscle" }, { value: "strength", label: "Get stronger" }, { value: "endurance", label: "Stamina & endurance" }, { value: "general", label: "Overall health & energy" }, { value: "mobility", label: "Mobility & posture" }];
          return (<>
            <Q label="Main goal"><Chips options={goals} value={d.primaryGoal} onChange={(v) => set("primaryGoal", v as Intake["primaryGoal"])} /></Q>
            <Q label="Secondary goal (optional)"><Chips options={[{ value: "", label: "None" }, ...goals.filter((g) => g.value !== d.primaryGoal)]} value={d.secondaryGoal ?? ""} onChange={(v) => set("secondaryGoal", v as Intake["secondaryGoal"])} /></Q>
            <Q label="In your words: what would make the next 3 months a win?"><textarea className={inputCls} rows={3} value={d.goalNote} onChange={(e) => set("goalNote", e.target.value)} placeholder="e.g. do 5 real push-ups, fit into my old jeans, play with my kids without getting tired…" /></Q>
          </>);
        })()}

        {step === 4 && (<>
          <Q label="Training days per week"><Chips options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} value={d.daysPerWeek} onChange={(v) => { set("daysPerWeek", v as number); set("preferredDays", []); }} /></Q>
          <Q label="Preferred days (optional)" hint={`Pick ${d.daysPerWeek}, or leave empty for a balanced default.`}>
            <Chips multi options={DAYS.map((x, i) => ({ value: i, label: x }))} value={d.preferredDays} onChange={(v) => set("preferredDays", v as number[])} />
          </Q>
          <Q label="Time per session"><Chips options={[30, 45, 60, 75].map((n) => ({ value: n, label: `${n} min` }))} value={d.sessionMinutes} onChange={(v) => set("sessionMinutes", v as number)} /></Q>
          <Q label="Where will you train?">
            <Chips options={[{ value: "home", label: "Home" }, { value: "gym", label: "Gym" }, { value: "both", label: "Both" }]} value={d.location}
              onChange={(v) => { set("location", v as Intake["location"]); if (v !== "home") set("equipment", GYM_EQUIPMENT); }} />
          </Q>
          <Q label="Equipment you can use" hint="Bodyweight is always included.">
            <Chips multi options={EQUIPMENT_OPTIONS.map((e) => ({ value: e.key, label: e.label }))} value={d.equipment} onChange={(v) => set("equipment", v as Intake["equipment"])} />
          </Q>
        </>)}

        {step === 5 && (<>
          <Q label="Average sleep per night"><NumberInput value={d.sleepHours} onChange={(v) => set("sleepHours", v!)} step={0.5} suffix="hours" /></Q>
          <Q label="Sleep quality"><Scale value={d.sleepQuality} onChange={(v) => set("sleepQuality", v)} low="Poor" high="Great" /></Q>
          <Q label="Stress level"><Scale value={d.stress} onChange={(v) => set("stress", v)} low="Calm" high="Very stressed" /></Q>
          <Q label="Daily energy"><Scale value={d.energy} onChange={(v) => set("energy", v)} low="Drained" high="Energetic" /></Q>
        </>)}

        {step === 6 && (<>
          <Q label="Diet pattern"><Chips options={[{ value: "vegetarian", label: "Vegetarian" }, { value: "eggetarian", label: "Eggetarian" }, { value: "non_vegetarian", label: "Non-veg" }, { value: "pescatarian", label: "Pescatarian" }, { value: "vegan", label: "Vegan" }]} value={d.dietPattern} onChange={(v) => set("dietPattern", v as Intake["dietPattern"])} /></Q>
          <Q label="Meals per day (incl. snacks)"><Chips options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} value={d.mealsPerDay} onChange={(v) => set("mealsPerDay", v as number)} /></Q>
          <Q label="Palm-sized protein portions per day" hint="1 palm ≈ 100 g paneer/chicken/tofu, 2 eggs, 1 big bowl of curd, 1 scoop whey, ~1.5 bowls of dal.">
            <Chips options={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} value={d.proteinPalms} onChange={(v) => set("proteinPalms", v as number)} />
          </Q>
          <div className="grid grid-cols-2 gap-3">
            <Q label="Veg servings / day" hint="1 serving ≈ 1 cup"><NumberInput value={d.vegServings} onChange={(v) => set("vegServings", v ?? 0)} /></Q>
            <Q label="Fruit servings / day"><NumberInput value={d.fruitServings} onChange={(v) => set("fruitServings", v ?? 0)} /></Q>
            <Q label="Water / day"><NumberInput value={d.waterLiters} onChange={(v) => set("waterLiters", v ?? 0)} step={0.25} suffix="L" /></Q>
            <Q label="Sugary drinks / week" hint="Soda, juice, sweet chai/coffee"><NumberInput value={d.sugaryDrinksPerWeek} onChange={(v) => set("sugaryDrinksPerWeek", v ?? 0)} /></Q>
            <Q label="Fried / packaged foods / week"><NumberInput value={d.friedOrPackagedPerWeek} onChange={(v) => set("friedOrPackagedPerWeek", v ?? 0)} /></Q>
            <Q label="Alcoholic drinks / week"><NumberInput value={d.alcoholPerWeek} onChange={(v) => set("alcoholPerWeek", v ?? 0)} /></Q>
          </div>
          <Q label="Do you usually eat dinner within 2 hours of bed?"><Chips options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} value={d.lateEating ? "yes" : "no"} onChange={(v) => set("lateEating", v === "yes")} /></Q>
          <Q label="Supplements"><Chips multi options={["protein powder", "creatine", "vitamin D", "B12", "iron", "multivitamin", "omega-3", "calcium"].map((x) => ({ value: x, label: x }))} value={d.supplements} onChange={(v) => set("supplements", v as string[])} /></Q>
        </>)}
      </div>

      {err && <div className="mt-5"><Notice>{err}</Notice></div>}
      <div className="mt-8 flex gap-3">
        {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
        <Button full onClick={next} disabled={saving}>{step === STEPS.length - 1 ? (saving ? "Saving…" : "Save & go to fitness tests") : "Continue"}</Button>
      </div>
    </div>
  );
}
