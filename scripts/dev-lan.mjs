#!/usr/bin/env node
/**
 * `npm run dev:lan` — open the dev app on a phone on the same Wi-Fi.
 *
 * A phone loads http://<laptop-ip>:3000, which plain `next dev` treats as a
 * foreign origin: dev JS is blocked, React never hydrates and nothing can be
 * tapped. This starts both servers so that works:
 *   - Worker: `wrangler dev` on all interfaces, CORS allowing the LAN origin
 *     (passed with --var, so worker/.dev.vars is never touched).
 *   - Next: `next dev -H 0.0.0.0` with CHEFBOT_LAN_HOST (→ allowedDevOrigins
 *     in next.config.ts) and NEXT_PUBLIC_RECIPES_API_URL pointing at the
 *     laptop instead of 127.0.0.1 (which, on the phone, is the phone).
 *
 * Options: --host <ip>  --port <web port, 3000>  --api-port <worker port, 8787>
 *          --prod  production build + `next start` instead of `next dev`
 *                  (`npm run preview:lan`): what users get. Dev mode loads
 *                  CSS/JS late and compiles on demand, so a phone sees a slow,
 *                  half-styled first paint that production does not have.
 * Nothing here is used by `wrangler deploy` or Vercel.
 */
import { spawn, spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function lanAddress() {
  const candidates = [];
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal && PRIVATE.test(address.address)) {
        const wifi = /wi-?fi|wlan|wireless|en0/i.test(name);
        candidates.push({ address: address.address, score: wifi ? 0 : 1 });
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0]?.address;
}

const host = arg("host", lanAddress());
const port = arg("port", "3000");
const apiPort = arg("api-port", "8787");
const prod = process.argv.includes("--prod");

if (!host) {
  console.error("No private IPv4 found. Connect to Wi-Fi or pass --host <ip>.");
  process.exit(1);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const children = [];

function run(label, command, args, options) {
  const child = spawn(command, args, { stdio: "inherit", shell: true, ...options });
  child.on("exit", (code) => {
    console.log(`[dev:lan] ${label} exited (${code ?? "signal"}); stopping.`);
    shutdown(code ?? 0);
  });
  children.push(child);
}

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    // With `shell: true` the pid is the shell; on Windows only taskkill /T
    // reaches wrangler/next underneath.
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const origins = [`http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://${host}:${port}`].join(",");

run("worker", "npx", [
  "wrangler", "dev",
  "--ip", "0.0.0.0",
  "--port", apiPort,
  "--var", `CORS_ALLOWED_ORIGINS:${origins}`,
], { cwd: `${root}worker` });

const webEnv = {
  ...process.env,
  CHEFBOT_LAN_HOST: host,
  // NEXT_PUBLIC_* is inlined at build time, so prod must build with it.
  NEXT_PUBLIC_RECIPES_API_URL: `http://${host}:${apiPort}`,
};
if (prod) {
  console.log("[dev:lan] Building for production (takes ~1 min)...");
  const build = spawnSync("npx", ["next", "build"], { cwd: root, env: webEnv, stdio: "inherit", shell: true });
  if (build.status !== 0) {
    console.error("[dev:lan] Build failed; stopping.");
    shutdown(build.status ?? 1);
  }
  run("next", "npx", ["next", "start", "-H", "0.0.0.0", "-p", port], { cwd: root, env: webEnv });
} else {
  run("next", "npx", ["next", "dev", "-H", "0.0.0.0", "-p", port], { cwd: root, env: webEnv });
}

console.log(`\n[dev:lan] Open on your phone (same Wi-Fi): http://${host}:${port}/app\n`);
