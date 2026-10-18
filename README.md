# ChefBOT

AI-powered cooking companion: pick ingredients → get three AI recipes →
record an on-chain cooking stamp on **BOT Chain** → compete on the
Most Cooked leaderboard.

Two surfaces:

| Route | Purpose |
|---|---|
| `/` | Landing page — manifesto, how it works, features, FAQ |
| `/app` | Cook — ingredient picker, fridge scan, AI recipes, stamp on BOT Chain |
| `/app/list` | Shopping List — missing items as a receipt (this browser only) |
| `/app/recipes` | My Recipes — your own recipe box (this browser only) |
| `/app/leaderboard` | Most Cooked — podium + ladder read from the contract |
| `/app/kitchen` | My Kitchen — your wallet's stamps as a passport |

**Docs:** [PRD](./ChefBOT_Development_Plan_EN.md) ·
[Implementation plan](./docs/implementation-plan.md) ·
[Remix deployment guide](./docs/remix-deployment.md) ·
[Security review](./docs/security-review.md) ·
[Mainnet release checklist](./docs/release-checklist.md) ·
[Design system](./DESIGN.md)

## Architecture

```
Browser (Next.js 16, wagmi/viem)
 ├─ POST {WORKER_URL}/recipes ──► Cloudflare Worker ──► Google Gemini (free tier)
 │                                  (key stays server-side; schema-validated;
 │                                   20 req / IP / hour via Durable Object)
 │                                  failures → local "House favourites" fallback
 └─ RPC + wallet ──► BOT Chain (chain 968 testnet / 677 mainnet)
                      contract ChefBOT: cookIt / getDishes (keys + dishes) / getMyDishes
```

- Recipe-key algorithm is byte-identical in Solidity
  (`contracts/ChefBOT.sol`) and TypeScript (`lib/recipe-key.ts`), proven by
  parity tests.
- The AI response is validated against one shared schema
  (`shared/recipe-schema.ts`) on both sides of the wire.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) · React 19 · Tailwind 4 · TypeScript 5 |
| Wallet/chain | wagmi 3 · viem 2 · @tanstack/react-query 5 |
| Contract | Solidity `^0.8.20`, Hardhat 3 (17 tests) |
| AI | Cloudflare Worker (shared GitAura-style route table), Google Gemini `gemini-3.5-flash-lite` free tier (key: wrangler secret) |
| Tests | vitest (unit + RTL component + e2e-through-Worker) · Hardhat |

## Quickstart

```bash
npm install
cp .env.example .env.local      # then edit — see table below
npm run dev                     # http://localhost:3000 (landing), /app (kitchen)

# optional — live AI (otherwise the curated fallback serves recipes):
cd worker && npm install && npx wrangler dev   # http://127.0.0.1:8787
```

If `.env.local` points `NEXT_PUBLIC_RECIPES_API_URL` at `http://127.0.0.1:8787` but no
Worker is running, the browser console shows `ERR_CONNECTION_REFUSED` and every request
falls back to the 27 curated "House favourites". `npm run dev:lan` starts both. "New
ideas" asks the AI for a different cooking style each round, and the fallback rotates
through recipes you haven't seen yet.

### Test on your phone (same Wi-Fi)

Plain `npm run dev` only serves its dev scripts to `localhost`, so a phone opening
`http://<laptop-ip>:3000` sees the page but cannot tap anything. Stop it, then:

```bash
npm run dev:lan        # prints http://<laptop-ip>:3000/app — open that on the phone
npm run preview:lan    # same, but a production build: judge speed and the intro here
```

`dev:lan` is for quick edits; its first load is slow and briefly unstyled (dev serves
CSS/JS late and compiles on demand). `preview:lan` is what visitors actually get.

It starts the Worker on all interfaces with CORS for the LAN origin (via `--var`,
`worker/.dev.vars` untouched) and `next dev -H 0.0.0.0` with that IP allowed
(`allowedDevOrigins`) and the recipe API pointed at the laptop. Dev only. Allow Node
through Windows Firewall on private networks if asked. Plain http on a LAN is not a
secure context, so Copy/Share in the shopping list may fall back to a message there.

### Scripts

```bash
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm test                # vitest (incl. e2e through the real Worker handler)
npm run test:contract   # Hardhat (16 tests)
npm run build           # production build
npm run abi:export      # regenerate lib/abi/ChefBOT.ts from the contract
cd worker && npm run typecheck   # Worker typecheck
```

## Environment variables

### Frontend — `.env.local` (or Vercel project settings)

`NEXT_PUBLIC_*` values are inlined **at build time** — after changing one,
rebuild/redeploy (on Vercel: a new deployment is required).

| Variable | Meaning | Default / current |
|---|---|---|
| `NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS` | ChefBOT contract address | `0x9398…cB85` — **verified testnet (968) deployment**, redeployed with the PRD §5 `getDishes()` and checked on-chain 2026-10-18 (`recipeKey("Fried Rice")` matches the repo anchor). Empty → UI shows the "not deployed" notices |
| `NEXT_PUBLIC_CHEFBOT_CHAIN_ID` | Target chain: `968` testnet / `677` mainnet | `968` in `.env.example`; production default is `677` when unset |
| `NEXT_PUBLIC_RECIPES_API_URL` | Worker base URL (no trailing slash) | `http://127.0.0.1:8787`; empty → fallback recipes, labeled |

### Cloudflare Worker

| Variable | How to set | Notes |
|---|---|---|
| `GEMINI_API_KEY` | `npx wrangler secret put GEMINI_API_KEY` (local: `worker/.dev.vars`, git-ignored) | free key from Google AI Studio; never in code or git |
| `GEMINI_MODEL` | `worker/wrangler.jsonc` → `vars` | default `gemini-3.5-flash-lite`; any free-tier Flash/Flash-Lite id works |
| `GEMINI_THINKING_LEVEL` | same `vars` (optional) | e.g. `minimal`; unset = model default. Verify against the live API before enabling |
| `CORS_ALLOWED_ORIGINS` | `worker/wrangler.jsonc` → `vars` | exact origins, comma-separated — **must include the final Vercel domain** or the browser will be blocked (403) |
| `RATE_LIMIT_PER_HOUR` | same `vars` | default 20 per IP per hour, enforced by the `RATE_LIMITER` Durable Object (SQLite, free plan) |

**Worker routes** (shared shape with GitAura / PocketLM): `GET /health`, `POST /recipes` (live), `POST /scan` (v1.1 fridge photo → ingredient ids), `POST /dishes` + `GET /dishes?title=` (v1.1 recipe archive: a stamped dish's full recipe, accepted only when the cited transaction's receipt carries the ChefBOT `Cooked` event for that title; KV binding `DISHES`, provisioned by `wrangler deploy`) — on `feat/v1.1` until merged. Reserved, answering `501` until the GitAura PRD specifies them: `GET /auth/github/login`, `GET /auth/github/callback`, `POST /auth/attest`, `POST /aura`, `POST /study`, `POST /ask`.

**Privacy note:** on Gemini's free tier Google may use prompts to improve its products. ChefBOT only sends ingredient ids from a fixed list plus time and diet — no personal data, no wallet addresses.

## Smart contract (deployed by you, via Remix)

1. Follow **[docs/remix-deployment.md](./docs/remix-deployment.md)**
   (compiler 0.8.34, optimizer 200 runs, Injected Provider).
2. **Testnet (already done):** contract verified live at
   `0x939878F4aA5564B91aFa1e8758A100F14AAbcB85` on chain **968**
   (`https://scan.bohr.life/address/0x939878F4aA5564B91aFa1e8758A100F14AAbcB85`).
   The on-chain `getDishes()` is currently empty — run the testnet exercise
   checklist in the guide before mainnet.
3. **Mainnet:** deploy on chain 677, then update
   `NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS` + `NEXT_PUBLIC_CHEFBOT_CHAIN_ID=677`
   and redeploy the frontend.
4. Full mainnet go/no-go: **[docs/release-checklist.md](./docs/release-checklist.md)**.

The agent never deploys, signs, or fabricates addresses — every address in
this repo is verifiable on-chain (commands in the checklist).

## Deploy the Worker (Cloudflare)

```bash
cd worker
npm install
npx wrangler login                      # or export CLOUDFLARE_API_TOKEN
npx wrangler secret put GEMINI_API_KEY
# edit wrangler.jsonc vars: CORS_ALLOWED_ORIGINS += your Vercel URL
npx wrangler deploy
# → https://<worker>.<account>.workers.dev
```

Set that URL as `NEXT_PUBLIC_RECIPES_API_URL` (no trailing slash) in the
frontend and redeploy. Smoke test:

```bash
curl -s https://<worker>.workers.dev/health        # {"ok":true}
curl -s -X POST https://<worker>.workers.dev/recipes \
  -H "Content-Type: application/json" \
  -d '{"ingredients":["egg","rice"],"maxMinutes":20,"vegetarian":false}'
```

## Deploy the frontend (Vercel)

1. Import the repo — framework auto-detected (Next.js), no overrides.
2. Set the three `NEXT_PUBLIC_*` variables (build-time!).
3. Deploy, then add the production URL to the Worker's
   `CORS_ALLOWED_ORIGINS` and redeploy the Worker.
4. Verify: landing + `/app` load, leaderboard shows the no-config/loading
   states correctly, a testnet wallet can stamp a dish.

## Testing

Automated: `npm test` + `npm run test:contract` (or `npm ci` in CI —
`.github/workflows/ci.yml` runs lint → typecheck → both test suites → build).

**Manual responsive smoke** (no breakpoint assertions in jsdom — this is the
checklist instead): at 375 px / 768 px / 1280 px — no horizontal scroll,
all controls ≥ 44 px and reachable, nav collapses to compact links,
recipe cards single-column on mobile.

**Wallet flow on testnet:** MetaMask → chain 968 (faucet:
https://faucet.botchain.ai) → `/app` → pick 2+ ingredients → generate →
"I cooked it" → confirm → Stamped ✓ → leaderboard + My Kitchen update after
the receipt.

**Chain-aware behavior:** every on-chain read (leaderboard, My Kitchen,
cooked flag) and every explorer link follows
`NEXT_PUBLIC_CHEFBOT_CHAIN_ID` (968 → `rpc.bohr.life` / `scan.bohr.life`,
677 → `rpc.botchain.ai` / `scan.botchain.ai`; default 677). Wallet
connection uses MetaMask's injected EIP-1193 provider directly (no SDK
dependency); if the wallet is on an unknown chain it triggers
`wallet_addEthereumChain` (error 4902) with the BOT Chain parameters.

## Security

See [docs/security-review.md](./docs/security-review.md): boundary
validation, CORS allowlist, rate limiting, key custody, LLM-output schema
validation, dependency audit (0 runtime findings), accepted risks with
remediation paths. No secrets belong in git — `.env*` is ignored
(`.env.example` is the only committed env file).

## Repo layout

```
app/            routes (/ landing; /app, /app/list, /app/recipes, /app/leaderboard, /app/kitchen), providers, tokens
components/
  landing/      "/" only: hero, stats, food-groups, manifesto, features, faq,
                landing-nav, counter, marquee
    how-it-works/  pinned scrollytelling (steps.ts data, step-timelines.ts keyframes)
    intro/         intro curtain + pre-paint script (intro-script.ts, unit-tested)
    motion/        GSAP plugin registry, Lenis smooth scroll, reveal hook, magnetic
  kitchen/      "/app" only: cook-flow, ingredient-picker, recipe-card, cook-button,
                leaderboard, my-kitchen, wallet-button, wallet-wait-hint, app-nav
  ui/           shared: pill-nav, site-footer, section-tag, reveal, stagger-text,
                scroll-letters, scroll-progress
  illustrations/ how-it-works SVGs (data-anim hooks for GSAP)
lib/            wagmi/chain/contract/queries/recipes/recipe-key helpers
shared/         recipe-schema (imported by frontend AND Worker)
worker/         Cloudflare Worker (POST /recipes) + wrangler config
contracts/      ChefBOT.sol
test/           Hardhat contract tests (16)
tests/          vitest: unit + component + e2e-through-Worker (172)
docs/           plan, Remix guide, security review, release checklist
```
