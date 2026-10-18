<p align="center">
  <img src="app/icon.svg" width="128" height="128" alt="ChefBOT logo: a chef's hat on a little bot head with a red light">
</p>

<p align="center">
  <a href="https://chef-bot-kappa.vercel.app"><img src="https://img.shields.io/badge/live-chef--bot--kappa.vercel.app-d50000?style=flat-square&logo=vercel&logoColor=white" alt="Live site"></a>
  <a href="https://scan.bohr.life/address/0x939878F4aA5564B91aFa1e8758A100F14AAbcB85"><img src="https://img.shields.io/badge/BOT%20Chain-testnet%20968-110000?style=flat-square" alt="BOT Chain testnet 968"></a>
  <img src="https://img.shields.io/badge/mainnet-not%20deployed-8d7d7d?style=flat-square" alt="Mainnet not deployed">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat-square&logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/Google-Gemini-8e75b2?style=flat-square&logo=googlegemini&logoColor=white" alt="Google Gemini">
  <img src="https://img.shields.io/badge/Solidity-0.8.34-363636?style=flat-square&logo=solidity&logoColor=white" alt="Solidity 0.8.34">
  <img src="https://img.shields.io/badge/wagmi-3-1c1b1b?style=flat-square" alt="wagmi 3">
  <img src="https://img.shields.io/badge/tests-vitest%20%2B%20hardhat-6e9f18?style=flat-square&logo=vitest&logoColor=white" alt="Tests: Vitest and Hardhat">
</p>

# ChefBOT

**Pick. Cook. Stamp.** Tell ChefBOT what's in your fridge, get three
realistic recipes from AI, and when you actually cook one, stamp it on
**BOT Chain**. Every stamp counts toward a public *Most Cooked*
leaderboard and your own on-chain kitchen.

- **Live (testnet):** https://chef-bot-kappa.vercel.app
- **Contract (BOT Chain testnet, chain 968):** [`0x939878F4aA5564B91aFa1e8758A100F14AAbcB85`](https://scan.bohr.life/address/0x939878F4aA5564B91aFa1e8758A100F14AAbcB85)
- **Status:** the full MVP plus v1.1 features is live on testnet. Mainnet (chain 677) is not deployed yet.

**Docs:** [PRD](./ChefBOT_Development_Plan_EN.md) ·
[v1.1 spec](./docs/spec-v1.1.md) ·
[Implementation log](./docs/implementation-plan.md) ·
[Security review](./docs/security-review.md) ·
[Remix deployment guide](./docs/remix-deployment.md) ·
[Mainnet release checklist](./docs/release-checklist.md) ·
[Design system](./DESIGN.md)

---

## Contents

1. [What you can do](#what-you-can-do)
2. [Pages](#pages)
3. [How it works](#how-it-works)
4. [Tech stack](#tech-stack)
5. [Getting started](#getting-started)
6. [Environment variables](#environment-variables)
7. [The Cloudflare Worker](#the-cloudflare-worker)
8. [The smart contract](#the-smart-contract)
9. [Testing](#testing)
10. [Deploying](#deploying)
11. [Security and privacy](#security-and-privacy)
12. [Project structure](#project-structure)
13. [Known limitations](#known-limitations)

---

## What you can do

| Feature | What happens | Needs a wallet? |
|---|---|---|
| **Pick ingredients** | Choose 2–12 items from 62 ingredients in four food groups (Protein & Fats, Vegetables & Fruits, Grains, Pantry), set a time limit (10 / 20 / 30 min) and a vegetarian switch. | No |
| **Scan your fridge** | Take or upload a photo; AI recognises ingredients from the same 62-item list and **pre-selects** them for you to confirm. The photo is never stored. | No |
| **Get three recipes** | Gemini writes three home-cook recipes: time, what it uses from your picks, what's missing, numbered steps and a rough kcal/protein estimate. | No |
| **New ideas ↻** | Each press asks for a different cooking style (Indonesian, Japanese, Korean, Thai…) and skips dishes you've already seen. | No |
| **House favourites** | If the AI is unreachable, slow or rate-limited, 27 curated recipes take over, clearly labelled. The cook flow never breaks. | No |
| **Shopping list** | "+ Shopping list" on a card adds its missing items. The list is printed as a receipt, grouped by food group, with copy/share. | No (browser only) |
| **My Recipes** | Write your own recipes; they're filed in a recipe box with time filters and search. | No (browser only) |
| **I cooked it** | Stamps the dish on BOT Chain (`cookIt(title, emoji)`): one stamp per wallet per dish. You see "You're cook #N", a BOT Scan link and a Share on X button. | **Yes** (MetaMask) |
| **Most Cooked** | Leaderboard read straight from the contract: the top three on a podium, everyone else on a ranked ladder. Tap a dish to see its recipe. | No |
| **My Kitchen** | Every dish your wallet stamped, as a passport of rubber stamps (12 per page). | Yes |

Everything except stamping works without a wallet, and nothing requires a sign-up.

## Pages

| URL | Page |
|---|---|
| `/` | Landing page: intro, how it works, food groups, painted pantry gallery, FAQ |
| `/app` | **Cook:** ingredient picker, fridge scan, AI recipes, stamping |
| `/app/list` | **Shopping List** (receipt) |
| `/app/recipes` | **My Recipes** (recipe box) |
| `/app/leaderboard` | **Most Cooked** (podium + ladder) |
| `/app/kitchen` | **My Kitchen** (stamp passport) |

The kitchen pages share one navbar, wallet and footer.

- Moving between them is client-side, so the wallet stays connected and your cook results are still there when you come back to `/app`.
- Old links like `/app#most-cooked` are forwarded to the new pages.

## How it works

```
Browser — Next.js 16 on Vercel (wagmi + viem)
 │
 ├─ POST /recipes  {ingredients, maxMinutes, vegetarian, variation?}
 ├─ POST /scan     {image (≤1.5 MB), mime}
 ├─ GET  /dishes?title=…          (recipe archive, read)
 ├─ POST /dishes   {txHash, recipe} (recipe archive, write — proven by a stamp)
 │        │
 │        ▼
 │   Cloudflare Worker ── Google Gemini (gemini-3.5-flash-lite, free tier)
 │   · API key stays server-side          · KV "DISHES" (recipe archive)
 │   · CORS allowlist, 20 req / IP / hour (Durable Object)
 │   · every AI answer schema-validated   · on any failure → client fallback
 │
 └─ JSON-RPC + MetaMask ── BOT Chain (968 testnet · 677 mainnet)
          contract ChefBOT: cookIt · getDishes · getMyDishes · getDish · cooked
```

Key design decisions:

- **No free text reaches the AI.**
  - Ingredients are ids from a fixed vocabulary (`shared/ingredients.ts`), validated on both the client and the Worker.
  - "New ideas" sends a number; the Worker maps it to its own list of cuisine styles.
- **One schema, both sides.** `shared/recipe-schema.ts` validates requests and AI output in the Worker and again in the browser.
- **Same recipe key everywhere.** The title normalisation + `keccak256` key is byte-identical in Solidity (`contracts/ChefBOT.sol`) and TypeScript (`lib/recipe-key.ts`), proven by parity tests.
- **Only title + emoji go on-chain.** Steps stay off-chain. When a dish is stamped, its full recipe can be stored in the Worker's KV archive, so the leaderboard can show the steps. The Worker accepts it only after checking the transaction receipt contains the contract's `Cooked` event for that exact title, and the first writer wins.
- **Private by default.** The shopping list and My Recipes live in `localStorage`. Own recipes are never sent to the archive.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16.4 (App Router, Turbopack, Cache Components) · React 19 · Tailwind CSS 4 · TypeScript 5 |
| Motion | GSAP 3.15 (ScrollTrigger, SplitText) · Lenis (desktop only) · CSS compositor animations |
| Wallet / chain | wagmi 3 · viem 2 · TanStack Query 5 · MetaMask via the injected EIP-1193 provider (no SDK) |
| AI proxy | Cloudflare Worker (Wrangler 4) · Durable Object rate limiter · KV · Google Gemini `gemini-3.5-flash-lite` |
| Contract | Solidity 0.8.34 (`^0.8.20`) · Hardhat 3 + viem toolbox |
| Tests | Vitest + Testing Library (unit, component, end-to-end through the real Worker handler) · Hardhat (`node:test`) |
| Hosting | Vercel (site) · Cloudflare Workers (API) · BOT Chain (contract) |

## Getting started

**Requirements:** Node.js 22+, npm, and optionally MetaMask (for stamping) and a free [Google AI Studio](https://aistudio.google.com/apikey) key (for live AI).

```bash
git clone https://github.com/Devs-GMT/ChefBOT.git
cd ChefBOT
npm install
cp .env.example .env.local        # testnet contract + local Worker URL are prefilled
```

### Option A: site only (curated recipes)

```bash
npm run dev                       # http://localhost:3000  ·  kitchen at /app
```

Without a Worker the recipes come from the 27 curated "House favourites". Seeing `127.0.0.1:8787 … ERR_CONNECTION_REFUSED` in the console is expected in this mode.

### Option B: site + live AI (recommended)

```bash
cd worker && npm install && cd ..
# put your key in worker/.dev.vars (git-ignored):
#   GEMINI_API_KEY=your-key
npm run dev:lan                   # starts the Worker (8787) and Next.js (3000) together
```

`dev:lan` also prints a `http://<laptop-ip>:3000/app` address for **testing on a phone** on the same Wi-Fi.
- `npm run preview:lan` does the same with a production build. Use it to judge real speed and the intro animation; dev mode loads slowly and briefly unstyled.
- If Windows Firewall asks, allow Node on private networks.

You can also run the Worker on its own: `cd worker && npx wrangler dev`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run dev:lan` / `preview:lan` | Worker + site on your LAN (dev / production build) |
| `npm run build` / `start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + app types + contract tests' types (runs `hardhat build`) |
| `npm test` | Vitest (≈390 tests) |
| `npm run test:contract` | Hardhat contract tests (17) |
| `npm run abi:export` | Regenerate `lib/abi/ChefBOT.ts` from the compiled contract |
| `npm run eval:scan` | Measure fridge-scan precision/recall against labelled photos (needs a local Worker) |
| `cd worker && npm run typecheck` | Worker types |

## Environment variables

### Website (`.env.local` locally, Vercel → Settings → Environment Variables in production)

`NEXT_PUBLIC_*` values are baked in **at build time**. After changing one, redeploy.

| Variable | Meaning | Current value |
|---|---|---|
| `NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS` | ChefBOT contract | `0x939878F4aA5564B91aFa1e8758A100F14AAbcB85` (testnet). Empty → the UI shows "not deployed yet" notices |
| `NEXT_PUBLIC_CHEFBOT_CHAIN_ID` | `968` testnet or `677` mainnet | `968` (defaults to `677` if unset) |
| `NEXT_PUBLIC_RECIPES_API_URL` | Worker base URL, no trailing slash | local `http://127.0.0.1:8787`; production `https://chefbot-recipes.bayuapriansyah2022.workers.dev`. Empty → curated recipes only |

None of these are secrets. The Gemini key never goes into the website.

### Worker (`worker/wrangler.jsonc` → `vars`, secrets via Wrangler)

| Variable | How it's set | Notes |
|---|---|---|
| `GEMINI_API_KEY` | `npx wrangler secret put GEMINI_API_KEY` (local: `worker/.dev.vars`) | **Secret.** Never in code or git |
| `GEMINI_MODEL` | `vars` | default `gemini-3.5-flash-lite` |
| `GEMINI_THINKING_LEVEL` | `vars` (optional) | unset = model default |
| `GEMINI_SCAN_MODEL` / `GEMINI_SCAN_THINKING_LEVEL` | `vars` (optional) | override for `/scan`; unset = same as recipes |
| `CORS_ALLOWED_ORIGINS` | `vars` | exact origins, comma-separated. **Must include the live site URL** or the browser gets 403 |
| `RATE_LIMIT_PER_HOUR` | `vars` | default `20` per IP per hour (shared by `/recipes`, `/scan`, `POST /dishes`) |
| `CHAIN_RPC_URL` | `vars` | RPC used to prove stamps before archiving (`https://rpc.bohr.life` on testnet) |
| `CHEFBOT_CONTRACT_ADDRESS` | `vars` | the contract whose `Cooked` events count as proof |

Bindings: `RATE_LIMITER` (Durable Object, SQLite) and `DISHES` (KV, provisioned automatically on deploy).

## The Cloudflare Worker

Located in `worker/`. A single Worker with a route table shared with the sister projects GitAura and PocketLM.

| Route | Limited | Purpose |
|---|---|---|
| `GET /health` | – | `{"ok":true}` |
| `POST /recipes` | ✓ | 3 recipes from Gemini (JSON mode + response schema, validated again before returning) |
| `POST /scan` | ✓ | Fridge photo → ingredient ids (answer locked to the 62-id vocabulary) |
| `POST /dishes` | ✓ | Archive a stamped recipe; proven via the transaction receipt |
| `GET /dishes?title=` | – | Read an archived recipe (cached 5 min) |
| `/auth/github/*`, `/auth/attest`, `/aura`, `/study`, `/ask` | ✓ | Reserved for GitAura / PocketLM → `501` |

Errors use `{ "error": { "code", "message" } }` with 400 / 403 / 404 / 405 / 413 / 422 / 429 (`Retry-After`) / 502 / 503 / 504. AI failures carry a non-sensitive `reason` such as `upstream_429`. Placement is pinned near Google's API (`placement.hostname`), which fixed intermittent upstream errors.

Smoke test:

```bash
curl -s https://chefbot-recipes.bayuapriansyah2022.workers.dev/health
curl -s -X POST https://chefbot-recipes.bayuapriansyah2022.workers.dev/recipes \
  -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -d '{"ingredients":["egg","rice"],"maxMinutes":20,"vegetarian":false}'
```

## The smart contract

`contracts/ChefBOT.sol` is small and immutable, with no owner, tokens or payments.

| Function | Purpose |
|---|---|
| `cookIt(title, emoji)` | Record that the caller cooked a dish. Reverts on `EmptyTitle`, `TitleTooLong` (> 64 bytes), `EmojiTooLong` (> 16 bytes), `AlreadyCooked`. Emits `Cooked(key, cook, title, cooks)` |
| `getDishes()` | All dish keys + dishes in one call (leaderboard) |
| `getMyDishes(address)` | Keys a wallet stamped (My Kitchen) |
| `getDish(key)` / `cooked(key, cook)` / `recipeKey(title)` | Lookups |

A stamp proves a wallet *submitted* a record. It cannot prove the cooking physically happened.

| Network | Chain ID | RPC | Explorer | Address |
|---|---|---|---|---|
| BOT Chain testnet | 968 | `https://rpc.bohr.life` | `https://scan.bohr.life` | `0x939878F4aA5564B91aFa1e8758A100F14AAbcB85` |
| BOT Chain mainnet | 677 | `https://rpc.botchain.ai` | `https://scan.botchain.ai` | not deployed yet |

The contract is deployed by hand through Remix (compiler 0.8.34, optimizer 200 runs). See [docs/remix-deployment.md](./docs/remix-deployment.md). Mainnet follows [docs/release-checklist.md](./docs/release-checklist.md) and requires the project owner's explicit approval.

## Testing

```bash
npm run lint && npm run typecheck && npm test && npm run test:contract && npm run build
```

- **Vitest (≈390 tests)** covers:
  - the shared schemas and vocabulary;
  - the Worker (CORS, rate limit, Gemini proxy, scan, archive proof, leak checks: the API key never appears in responses);
  - the client (fallback, rotation, shopping list, my recipes, wallet errors, hydration safety);
  - every kitchen component, and an end-to-end path UI → client → real Worker handler.
- **Hardhat (17 tests)** covers stamping rules, events, getters and recipe-key parity with TypeScript.
- **CI:** `.github/workflows/ci.yml` runs lint → typecheck → tests → contract tests → build on every push/PR to `main`, plus the Worker typecheck.

**Manual check on testnet:**
1. Add BOT Chain testnet (968) to MetaMask; get test BOT from https://faucet.botchain.ai.
2. Open `/app`, pick 2+ ingredients, Cook, then **I cooked it** → confirm. You should see "Stamped! You're cook #N".
3. Open **Most Cooked**, tap your dish and check the steps appear; your stamp should also be in **My Kitchen**.

## Deploying

The order matters: the Worker first (the site depends on it), then the site, then CORS.

1. **Worker**
   ```bash
   cd worker
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```
2. **Website (Vercel):** import the repo (Next.js is auto-detected, root `./`). Set the three `NEXT_PUBLIC_*` variables *before* the first build, then deploy. Every push to `main` redeploys automatically.
3. **CORS:** add the Vercel URL to `CORS_ALLOWED_ORIGINS` in `worker/wrangler.jsonc` and run `npx wrangler deploy` again.
4. **Rollback:**
   - Vercel: "Promote" a previous deployment.
   - Worker: `npx wrangler rollback`.
   - The contract is immutable; a fix means a new deployment and a new address.

## Security and privacy

- **The Gemini key lives only in the Worker.** It is a Wrangler secret, never in the website bundle, and tests scan responses for leaks.
- **Every Worker input is validated:** ingredient ids are allow-listed, body sizes are capped, images are checked by MIME type and magic bytes, and AI output is schema-validated twice.
- **Abuse limits:** CORS allowlist of exact origins, 20 requests per IP per hour, and the archive accepts only stamp-proven recipes with first writer wins.
- **What is sent to Google:**
  - only ingredient ids from a fixed list, time and diet;
  - for a scan, the photo after consent;
  - no personal data, no wallet addresses.
  - On Gemini's free tier, Google may use prompts to improve its products. The app says so before the first scan.
- **What stays in your browser:** the shopping list and your own recipes. Nothing is stored server-side except stamped recipe text in the archive.
- **Files never committed:** `.env*` (only `.env.example`) and `worker/.dev.vars`.

Full review: [docs/security-review.md](./docs/security-review.md).

## Project structure

```
app/                    Next.js routes
  page.tsx              landing (/)
  app/                  kitchen: layout (nav, wallet, footer) + /app, /list, /recipes, /leaderboard, /kitchen
  icon.svg, apple-icon.tsx, opengraph-image.tsx   logo, home-screen icon, share card
components/
  landing/              landing sections, intro curtain, painted gallery, GSAP motion
  kitchen/              cook flow, picker, fridge scan, recipe card, stamping, leaderboard,
                        passport, recipe box, receipt, wallet button, nav
  ui/                   pill nav, ChefBOT logo mark, footer, reveal helpers
  illustrations/        how-it-works SVG illustrations
lib/                    wallet/chain/contract helpers, recipe client + fallback, local stores
shared/                 schemas + ingredient vocabulary used by BOTH the site and the Worker
data/recipes.json       27 curated fallback recipes
worker/                 Cloudflare Worker (routes, Gemini client, rate limiter, chain proof)
contracts/ChefBOT.sol   the contract
test/                   Hardhat contract tests
tests/                  Vitest tests
scripts/                dev-lan, scan evaluation, ABI export, food-art generator
public/                 photos (Unsplash licence, see public/food/CREDITS.md), food art, BOT Chain marks
docs/                   PRD-derived plans, specs, security review, deployment guides
DESIGN.md               design system (parchment, ink, one alert red)
```

## Known limitations

- **Testnet only** for now; mainnet needs a separate deploy and the owner's approval.
- **Some Indonesian ISPs (e.g. XL) block `*.workers.dev`.**
  - Browsers using secure DNS still reach the Worker.
  - Others get the curated fallback.
  - A custom domain for the Worker fixes this.
- **Free AI tier:** Gemini quota and the 20 requests/hour/IP limit can push users onto the curated fallback during heavy testing.
- **Device-only data:** the shopping list and My Recipes don't sync between devices.
