#!/usr/bin/env node
// Maintainer script (not part of the hosted build): fetch the wger videos listed in
// coach-skill/content/video-map.json, keep the chosen segment, and compress to small looping clips.
//   public/video/<openGymId>.mp4   H.264, 480x270, ~24 fps, no audio, faststart
//   public/video/<openGymId>.jpg   poster (first frame)
//   src/data/video-credits.json    attribution (CC BY-SA 4.0 requires it)
// Needs ffmpeg and network. Downloads go to a temp dir and are deleted.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const map = JSON.parse(fs.readFileSync("coach-skill/content/video-map.json", "utf8")).map;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wger-"));
fs.mkdirSync("public/video", { recursive: true });
const credits = {};

for (const [id, cfg] of Object.entries(map)) {
  const meta = await (await fetch(`https://wger.de/api/v2/video/${cfg.wger}/`)).json();
  if (!meta.video) throw new Error(`wger video ${cfg.wger} not found`);
  const out = `public/video/${id}.mp4`;
  if (!fs.existsSync(out) || process.argv.includes("--force")) {
    const raw = path.join(tmp, `${cfg.wger}.mov`);
    fs.writeFileSync(raw, Buffer.from(await (await fetch(meta.video)).arrayBuffer()));
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(cfg.start), "-t", String(cfg.dur), "-i", raw,
      "-vf", "scale=480:270:force_original_aspect_ratio=increase,crop=480:270,fps=24", "-an",
      "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "28", "-preset", "slow", "-movflags", "+faststart", out]);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", out, "-frames:v", "1", "-q:v", "4", `public/video/${id}.jpg`]);
    fs.rmSync(raw);
  }
  credits[id] = { author: meta.license_author || "wger.de contributors", license: "CC BY-SA 4.0", source: `https://wger.de/en/exercise/${meta.exercise}/view/` };
  console.log(`✓ ${id} ← wger ${cfg.wger} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}
fs.writeFileSync("src/data/video-credits.json", JSON.stringify(credits, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
