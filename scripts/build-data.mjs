#!/usr/bin/env node
// Compiles the coach skill + exercise data. Runs before `next dev` / `next build` (see package.json).
//
// Inputs
//   coach-skill/content/**            Coach Maya's skill (questions, trials, curation, prompts, media map)
//   vendor/openGym/catalogue          exercise database (git submodule, AGPL text)
//   vendor/free-exercise-db           public-domain demo photos (git submodule, Unlicense)
// Outputs
//   src/data/coach-skill.json         client-safe skill content
//   src/data/coach-prompts.json       server-only prompts for Gemma
//   src/data/curated-exercises.json   full entries for every exercise the engine/skill references
//   public/data/exercise-index.json   light index of the whole catalogue (Library)
//   public/data/ex/<n>.json           full entries in 64 buckets (loaded on demand)
//   public/demo/<openGymId>/{0,1}.jpg demo frames for mapped exercises
// openGym's own media (Gym visual licence) is never read or copied.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKILL = path.join(ROOT, "coach-skill/content");
const OG = path.join(ROOT, "vendor/openGym/catalogue/exercises");
const FX = path.join(ROOT, "vendor/free-exercise-db");
const fail = (m) => { console.error("✗ " + m); process.exit(1); };

if (!fs.existsSync(OG) || !fs.existsSync(FX)) {
  if (fs.existsSync("src/data/coach-skill.json")) { console.log("vendor/ missing, using committed data"); process.exit(0); }
  fail("vendor submodules missing. Run: git submodule update --init --depth 1");
}

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const strip = (o) => { if (o && typeof o === "object") { delete o.$comment; Object.values(o).forEach(strip); } return o; };

// --- skill -----------------------------------------------------------------
const questions = strip(readJson(path.join(SKILL, "questions.json")));
const trials = strip(readJson(path.join(SKILL, "trials.json")));
const healthTests = strip(readJson(path.join(SKILL, "health-tests.json")));
const curation = strip(readJson(path.join(SKILL, "curation.json")));
const programming = strip(readJson(path.join(SKILL, "programming.json")));
const mediaMap = strip(readJson(path.join(SKILL, "media-map.json"))).map;
const prompts = Object.fromEntries(fs.readdirSync(path.join(SKILL, "prompts"))
  .filter((f) => f.endsWith(".md")).map((f) => [f.replace(/\.md$/, ""), fs.readFileSync(path.join(SKILL, "prompts", f), "utf8").trim()]));

// validate question graph
const qids = new Set();
for (const q of questions.questions) {
  if (qids.has(q.id)) fail(`duplicate question id ${q.id}`);
  if (q.when && !qids.has(q.when.q)) fail(`question ${q.id}: 'when' refers to ${q.when.q}, which is not asked before it`);
  if (!questions.sections.some((s) => s.id === q.section)) fail(`question ${q.id}: unknown section ${q.section}`);
  qids.add(q.id);
}
for (const r of curation.rules) if (!qids.has(r.q)) fail(`curation rule refers to unknown question ${r.q}`);

// --- catalogue -------------------------------------------------------------
const all = fs.readdirSync(OG).filter((f) => f.endsWith(".json")).map((f) => readJson(path.join(OG, f)))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
const byId = new Map(all.map((e) => [e.id, e]));
const full = (e) => ({
  id: e.id, name: e.name, bodyPart: e.bodyPart, equipment: e.equipment, target: e.target,
  secondaryMuscles: e.secondaryMuscles ?? [], category: e.category, description: e.description ?? "",
  instructions: e.instructions ?? [], ...(e.hold ? { hold: true } : {}),
});
fs.mkdirSync("public/data/ex", { recursive: true });
fs.writeFileSync("public/data/exercise-index.json", JSON.stringify(all.filter((e) => !e.variantOf)
  .map((e) => [e.id, e.name, e.bodyPart, e.equipment, e.target, e.category])));
const buckets = Array.from({ length: 64 }, () => ({}));
for (const e of all) buckets[Number.parseInt(e.id, 10) % 64][e.id] = full(e);
buckets.forEach((b, i) => fs.writeFileSync(`public/data/ex/${i}.json`, JSON.stringify(b)));

// every id referenced by the engine or the skill must exist
const ids = new Set();
for (const f of ["src/lib/science/patterns.ts", path.join(SKILL, "trials.json"), path.join(SKILL, "curation.json")])
  for (const m of fs.readFileSync(f, "utf8").matchAll(/["'](\d{4,5})["']/g)) ids.add(m[1]);
const unknown = [...ids].filter((id) => !byId.has(id));
if (unknown.length) fail(`unknown openGym exercise ids: ${unknown.join(", ")}`);

// --- demos -----------------------------------------------------------------
fs.rmSync("public/demo", { recursive: true, force: true });
const withDemo = [];
for (const id of ids) {
  const fx = mediaMap[id];
  if (!fx) continue;
  const dir = path.join(FX, "exercises", fx);
  if (!fs.existsSync(path.join(dir, "0.jpg"))) fail(`media-map: ${id} -> ${fx} has no images`);
  fs.mkdirSync(`public/demo/${id}`, { recursive: true });
  for (const n of ["0", "1"]) if (fs.existsSync(path.join(dir, `${n}.jpg`))) fs.copyFileSync(path.join(dir, `${n}.jpg`), `public/demo/${id}/${n}.jpg`);
  withDemo.push(id);
}
const noDemo = [...ids].filter((id) => !mediaMap[id]);

// --- write -----------------------------------------------------------------
fs.mkdirSync("src/data", { recursive: true });
const curated = Object.fromEntries([...ids].sort().map((id) => [id, full(byId.get(id))]));
fs.writeFileSync("src/data/curated-exercises.json", JSON.stringify(curated));
fs.writeFileSync("src/data/coach-skill.json", JSON.stringify({ questions, trials, healthTests, curation, programming, demoIds: withDemo.sort() }));
fs.writeFileSync("src/data/coach-prompts.json", JSON.stringify(prompts));
console.log(`✓ skill: ${questions.questions.length} questions, ${trials.trials.length} trials, ${curation.rules.length} curation rules, ${Object.keys(prompts).length} prompts`);
console.log(`✓ catalogue: ${all.length} exercises · curated ${ids.size} · demos ${withDemo.length}${noDemo.length ? ` · no demo: ${noDemo.join(", ")}` : ""}`);
