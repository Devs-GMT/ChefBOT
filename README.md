# ChefBOT

AI-powered cooking companion: pick ingredients → get three AI recipes →
record an on-chain cooking stamp on **BOT Chain** → compete on the
Most Cooked leaderboard.

Two surfaces:

| Route | Purpose |
|---|---|
| `/` | Landing page — manifesto, how it works, features, FAQ |
| `/app` | The kitchen — ingredient picker, AI recipes, leaderboard, My Kitchen |

**Docs:** [PRD](./ChefBOT_Development_Plan_EN.md) ·
[Implementation plan](./docs/implementation-plan.md) ·
[Remix deployment guide](./docs/remix-deployment.md) ·
[Security review](./docs/security-review.md) ·
[Mainnet release checklist](./docs/release-checklist.md) ·
[Design system](./DESIGN.md)

## Architecture

```
Browser (Next.js 16, wagmi/viem)
 ├─ POST {WORKER_URL}/recipes ──► Cloudflare Worker ──► OpenAI gpt-4o-mini
 │                                  (key stays server-side; schema-validated)
 │                                  failures → local "House favourites" fallback
 └─ RPC + wallet ──► BOT Chain (chain 968 testnet / 677 mainnet)
                      contract ChefBOT: cookIt / getDishes / getMyDishes
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
| Contract | Solidity `^0.8.20`, Hardhat 3 (16 tests) |
| AI | Cloudflare Worker, OpenAI `gpt-4o-mini` (key: wrangler secret) |
| Tests | vitest 104 (unit + RTL component + e2e-through-Worker) |

## Quickstart

```bash
npm install
cp .env.example .env.local      # then edit — see table below
npm run dev                     # http://localhost:3000 (landing), /app (kitchen)

# optional — live AI (otherwise the curated fallback serves recipes):
cd worker && npm install && npx wrangler dev   # http://127.0.0.1:8787
```

### Scripts

```bash
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm test                # vitest (104 tests incl. e2e through the real Worker handler)
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
| `NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS` | ChefBOT contract address | `0x5191…D092` — **verified testnet (968) deployment**, checked on-chain 2026-10-16 (`recipeKey("Fried Rice")` matches the repo anchor). Empty → UI shows the "not deployed" notices |
| `NEXT_PUBLIC_CHEFBOT_CHAIN_ID` | Target chain: `968` testnet / `677` mainnet | `968` in `.env.example`; production default is `677` when unset |
| `NEXT_PUBLIC_RECIPES_API_URL` | Worker base URL (no trailing slash) | `http://127.0.0.1:8787`; empty → fallback recipes, labeled |

### Cloudflare Worker

| Variable | How to set | Notes |
|---|---|---|
| `OPENAI_API_KEY` | `npx wrangler secret put OPENAI_API_KEY` | never in code or git |
| `CORS_ALLOWED_ORIGINS` | `worker/wrangler.jsonc` → `vars` | exact origins, comma-separated — **must include the final Vercel domain** or the browser will be blocked (403) |
| `RATE_LIMIT_PER_HOUR` | same `vars` | default 20 per IP per hour |

## Smart contract (deployed by you, via Remix)

1. Follow **[docs/remix-deployment.md](./docs/remix-deployment.md)**
   (compiler 0.8.34, optimizer 200 runs, Injected Provider).
2. **Testnet (already done):** contract verified live at
   `0x5191b250E9F18d640B2138a1Da0409be0f1dD092` on chain **968**
   (`https://scan.bohr.life/address/0x5191b250E9F18d640B2138a1Da0409be0f1dD092`).
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
npx wrangler secret put OPENAI_API_KEY
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

## Security

See [docs/security-review.md](./docs/security-review.md): boundary
validation, CORS allowlist, rate limiting, key custody, LLM-output schema
validation, dependency audit (0 runtime findings), accepted risks with
remediation paths. No secrets belong in git — `.env*` is ignored
(`.env.example` is the only committed env file).

## Repo layout

```
app/            routes (/ landing, /app kitchen), providers, tokens
components/     landing-* sections, cook-flow, recipe-card, cook-button,
                leaderboard, my-kitchen, wallet-button, navs, footer
lib/            wagmi/chain/contract/queries/recipes/recipe-key helpers
shared/         recipe-schema (imported by frontend AND Worker)
worker/         Cloudflare Worker (POST /recipes) + wrangler config
contracts/      ChefBOT.sol
test/           Hardhat contract tests (16)
tests/          vitest: unit + component + e2e-through-Worker (104)
docs/           plan, Remix guide, security review, release checklist
```
