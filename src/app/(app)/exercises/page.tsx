"use client";
// Library: the whole openGym catalogue, with demos for exercises that have one.
import { useEffect, useMemo, useState } from "react";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { cx, inputCls, Spinner } from "@/components/ui";
import { hasDemo } from "@/lib/coach/skill";
import { getLatestIntake } from "@/lib/data";
import type { EquipKey } from "@/lib/science/patterns";
import { titleCase } from "@/lib/science/program";

type Row = [id: string, name: string, bodyPart: string, equipment: string, target: string, category: string];
type Full = { id: string; name: string; description: string; instructions: string[]; target: string; secondaryMuscles: string[]; equipment: string; bodyPart: string };

const EQUIP_MAP: Record<EquipKey, string[]> = {
  bodyweight: ["body weight"], dumbbell: ["dumbbell", "weighted", "weight plate"], kettlebell: ["kettlebell"],
  band: ["band", "resistance band"], barbell: ["barbell", "ez barbell", "olympic barbell"], cable: ["cable", "rope"],
  machine: ["leverage machine", "sled machine", "assisted"], smith: ["smith machine"], trap_bar: ["trap bar"],
  stability_ball: ["stability ball"], jump_rope: ["rope"], cardio_machine: ["stationary bike", "elliptical machine", "stepmill machine", "skierg machine", "upper body ergometer"],
  pullup_bar: [], bench: [], step: [],
};
const PARTS = ["all", "upper legs", "back", "chest", "shoulders", "upper arms", "waist", "lower legs", "cardio", "full body"];

export default function LibraryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [mine, setMine] = useState<Set<string> | null>(null);
  const [onlyMine, setOnlyMine] = useState(true);
  const [q, setQ] = useState("");
  const [part, setPart] = useState("all");
  const [demosFirst, setDemosFirst] = useState(true);
  const [open, setOpen] = useState<Full | null>(null);

  useEffect(() => {
    fetch("/data/exercise-index.json").then((r) => r.json()).then(setRows);
    getLatestIntake().then((i) => setMine(new Set(["bodyweight", ...(i?.equipment ?? [])].flatMap((k) => EQUIP_MAP[k as EquipKey] ?? []))));
  }, []);

  const list = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    const out = rows.filter(([, name, bp, eq, tg]) =>
      (part === "all" || bp === part) && (!onlyMine || !mine || mine.has(eq)) && (!needle || `${name} ${tg}`.includes(needle)));
    if (demosFirst) out.sort((a, b) => Number(hasDemo(b[0])) - Number(hasDemo(a[0])));
    return out.slice(0, 60);
  }, [rows, q, part, onlyMine, mine, demosFirst]);

  async function show(id: string) {
    const bucket = await fetch(`/data/ex/${Number.parseInt(id, 10) % 64}.json`).then((r) => r.json());
    setOpen(bucket[id]);
  }

  if (!rows) return <Spinner />;
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[26px] font-bold leading-tight">Library</h1>
        <p className="text-sm text-muted">{rows.length.toLocaleString()} exercises from openGym</p>
      </header>
      <input id="library-search" className={inputCls} placeholder="Search: glute bridge, row, plank…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {PARTS.map((p) => (
          <button key={p} type="button" onClick={() => setPart(p)} className={cx("min-h-9 shrink-0 rounded-full border px-3.5 text-sm capitalize", part === p ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-surface")}>
            {p === "all" ? "All" : p}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex min-h-9 items-center gap-2"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />Only my equipment</label>
        <label className="flex min-h-9 items-center gap-2"><input type="checkbox" checked={demosFirst} onChange={(e) => setDemosFirst(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />Demos first</label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {list.map(([id, name, , eq, tg]) => (
          <button key={id} type="button" onClick={() => show(id)} className="min-w-0 text-left">
            <ExerciseMedia id={id} alt={name} size="md" className="!aspect-square" />
            <div className="mt-1.5 line-clamp-2 text-sm font-semibold leading-tight">{titleCase(name)}</div>
            <div className="truncate text-xs text-muted">{tg} · {eq}</div>
          </button>
        ))}
      </div>
      {list.length === 60 && <p className="text-center text-xs text-muted">Showing 60. Search or filter to narrow down.</p>}
      <p className="text-center text-[11px] text-muted">Exercise data: openGym (AGPL). Demo photos: free-exercise-db (public domain).</p>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={() => setOpen(null)}>
          <div className="mx-auto max-h-[88dvh] w-full max-w-xl space-y-3 overflow-y-auto rounded-t-3xl bg-bg p-4" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
            <ExerciseMedia id={open.id} alt={open.name} />
            <h2 className="text-xl font-bold">{titleCase(open.name)}</h2>
            <div className="text-sm text-muted">Targets {open.target}{open.secondaryMuscles?.length ? ` · ${open.secondaryMuscles.join(", ")}` : ""} · {open.equipment}</div>
            {open.description && <p className="text-[15px]">{open.description}</p>}
            <ol className="list-decimal space-y-1 pl-5 text-[15px]">{open.instructions.map((s) => <li key={s}>{s}</li>)}</ol>
            <button type="button" onClick={() => setOpen(null)} className="min-h-12 w-full rounded-2xl bg-surface-2 font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
