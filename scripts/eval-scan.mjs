#!/usr/bin/env node
/**
 * Measure fridge-scan accuracy against labelled photos.
 *
 *   npm run eval:scan -- --dir <folder of .jpg> [--labels <json>] [--api http://127.0.0.1:8787] [--runs 2] [--delay 4500]
 *
 * Posts each photo to a running Worker's POST /scan (start it with
 * `cd worker && npx wrangler dev --var RATE_LIMIT_PER_HOUR:1000` so the
 * eval isn't rate-limited) and reports hits, misses and false positives per
 * photo, then precision, recall and latency overall. Photos are sent as-is —
 * shrink them the way the app does (≤768 px JPEG) for realistic numbers.
 * Labels only count vocabulary ids; `ambiguous` ids never count either way.
 * --delay paces calls: the Gemini free tier has a per-minute cap, and a
 * burst returns 502 for every call until the minute rolls over.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const dir = arg("dir");
if (!dir) {
  console.error("Usage: npm run eval:scan -- --dir <folder> [--labels file] [--api url] [--runs n]");
  process.exit(1);
}
const labelsPath = arg("labels", fileURLToPath(new URL("./scan-eval-labels.json", import.meta.url)));
const api = arg("api", "http://127.0.0.1:8787").replace(/\/+$/, "");
const runs = Number(arg("runs", "2"));
const origin = arg("origin", "http://localhost:3000");
const delayMs = Number(arg("delay", "4500"));
const pause = () => new Promise((resolve) => setTimeout(resolve, delayMs));

const labels = JSON.parse(readFileSync(labelsPath, "utf8"));
const files = readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f) && labels[f]);
if (files.length === 0) {
  console.error(`No labelled .jpg files from ${labelsPath} found in ${dir}.`);
  process.exit(1);
}

let tp = 0, fp = 0, fn = 0;
const latencies = [];
const rows = [];

for (const file of files) {
  const expect = new Set(labels[file].expect);
  const ambiguous = new Set(labels[file].ambiguous ?? []);
  const image = readFileSync(join(dir, file)).toString("base64");
  for (let run = 0; run < runs; run++) {
    if (latencies.length > 0) await pause();
    const started = performance.now();
    const response = await fetch(`${api}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ image, mime: "image/jpeg" }),
    });
    const ms = Math.round(performance.now() - started);
    latencies.push(ms);
    if (!response.ok) {
      rows.push(`${file} #${run + 1}  HTTP ${response.status} (${ms} ms)`);
      fn += expect.size;
      continue;
    }
    const found = new Set((await response.json()).ingredients);
    const hits = [...found].filter((id) => expect.has(id));
    const wrong = [...found].filter((id) => !expect.has(id) && !ambiguous.has(id));
    const missed = [...expect].filter((id) => !found.has(id));
    tp += hits.length;
    fp += wrong.length;
    fn += missed.length;
    rows.push(
      `${file} #${run + 1}  ${ms} ms  hit [${hits}]  missed [${missed}]  wrong [${wrong}]`,
    );
  }
}

latencies.sort((a, b) => a - b);
const pct = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

console.log(rows.join("\n"));
console.log(
  `\nprecision ${precision.toFixed(2)}  recall ${recall.toFixed(2)}  ` +
    `(tp ${tp}, fp ${fp}, fn ${fn})  latency median ${pct(0.5)} ms, p95 ${pct(0.95)} ms`,
);
