"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, Chips, inputCls, PageTitle, Spinner } from "@/components/ui";
import { titleCase } from "@/lib/science/program";

type Ex = { id: string; name: string; bodyPart: string; equipment: string; target: string; secondaryMuscles: string[]; category: string; instructions: string[] };

export default function ExercisesPage() {
  const [all, setAll] = useState<Ex[] | null>(null);
  const [q, setQ] = useState("");
  const [part, setPart] = useState("all");
  const [equip, setEquip] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { fetch("/data/exercises.json").then((r) => r.json()).then(setAll); }, []);

  const parts = useMemo(() => ["all", ...new Set((all ?? []).map((e) => e.bodyPart))].sort(), [all]);
  const equips = ["all", "body weight", "dumbbell", "kettlebell", "band", "barbell", "cable", "leverage machine"];
  const list = useMemo(() => (all ?? []).filter((e) =>
    (part === "all" || e.bodyPart === part) &&
    (equip === "all" || e.equipment === equip || (equip === "band" && e.equipment === "resistance band")) &&
    (!q || `${e.name} ${e.target}`.toLowerCase().includes(q.toLowerCase())),
  ).slice(0, 80), [all, q, part, equip]);

  if (!all) return <Spinner />;
  return (
    <div>
      <PageTitle title="Exercise library" sub={`${all.length} exercises from the openGym catalogue`} />
      <input className={inputCls} placeholder="Search e.g. glute bridge, row…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 space-y-2">
        <Chips options={equips.map((e) => ({ value: e, label: e === "all" ? "Any equipment" : e }))} value={equip} onChange={(v) => setEquip(v as string)} />
        <select className={inputCls} value={part} onChange={(e) => setPart(e.target.value)}>
          {parts.map((p) => <option key={p} value={p}>{p === "all" ? "All body parts" : p}</option>)}
        </select>
      </div>
      <div className="mt-4 space-y-2">
        {list.map((e) => (
          <Card key={e.id} className="p-3">
            <button className="w-full text-left" onClick={() => setOpen(open === e.id ? null : e.id)}>
              <div className="font-semibold">{titleCase(e.name)}</div>
              <div className="text-xs text-muted">{e.target} · {e.equipment} · {e.category}</div>
            </button>
            {open === e.id && <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{e.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>}
          </Card>
        ))}
        {list.length === 80 && <p className="text-center text-xs text-muted">Showing the first 80. Refine your search.</p>}
      </div>
    </div>
  );
}
