#!/usr/bin/env node
// Builds the exercise data from a local clone of github.com/DuarteSantos8/openGym.
// Only entries with textSource "exercisedb" (MIT-licensed text) are used. openGym-written
// descriptions (AGPL) and all media (Gym visual licence) are deliberately NOT copied.
//   node scripts/build-catalogue.mjs /path/to/openGym
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) { console.error("usage: build-catalogue.mjs <openGym clone>"); process.exit(1); }
const dir = path.join(root, "catalogue", "exercises");
const all = [];
for (const f of fs.readdirSync(dir)) {
  const e = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (e.textSource !== "exercisedb") continue;
  all.push({
    id: e.id, name: e.name, bodyPart: e.bodyPart, equipment: e.equipment, target: e.target,
    secondaryMuscles: e.secondaryMuscles ?? [], category: e.category, instructions: e.instructions ?? [],
    ...(e.hold ? { hold: true } : {}),
  });
}
all.sort((a, b) => a.id.localeCompare(b.id));
fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("public/data/exercises.json", JSON.stringify(all));

// Curated subset used by the program engine.
const src = fs.readFileSync("src/lib/science/patterns.ts", "utf8");
const ids = new Set([...src.matchAll(/(?:bw|eq)\("([0-9]{4})"/g)].map((m) => m[1]));
const byId = new Map(all.map((e) => [e.id, e]));
const missing = [...ids].filter((id) => !byId.has(id));
if (missing.length) { console.error("Curated ids not in MIT subset:", missing); process.exit(1); }
const curated = Object.fromEntries([...ids].sort().map((id) => [id, byId.get(id)]));
fs.writeFileSync("src/data/curated-exercises.json", JSON.stringify(curated, null, 0));
console.log(`catalogue: ${all.length} exercises, curated: ${ids.size}`);
