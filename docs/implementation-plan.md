# ChefBOT — Implementation Plan

Status legend: `pending` · `in progress` · `done` · `blocked`

Target: hackathon-ready MVP. Select ingredients → three AI recipes → record a cooking stamp on BOT Chain → leaderboard/My Kitchen read on-chain data.

## Verified configuration (authoritative sources)

| Item | Value | Source |
|---|---|---|
| Mainnet chain ID | `677` (0x2a5) | dev-docs.botchain.ai/docs/Developers/quick-guide |
| Mainnet RPC | `https://rpc.botchain.ai` | same + botchain.ai help center |
| Mainnet explorer | `https://scan.botchain.ai` | same |
| Native token | `BOT` | same |
| Testnet chain ID | `968` | dev-docs quick guide |
| Testnet RPC | `https://rpc.bohr.life` | dev-docs quick guide |
| Testnet explorer | `https://scan.bohr.life` | dev-docs quick guide |
| Testnet faucet | `https://faucet.botchain.ai` | official links |
| AI provider | OpenAI `gpt-4o-mini`, key server-side in Worker | user decision |
| Hosting | Vercel (frontend) + Cloudflare Worker (AI) | user decision |
| Contract deployment | User deploys via Remix IDE — agent never deploys | user constraint |

## Stack

- Frontend: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, deployed to Vercel
- Wallet: wagmi + viem (chain 677 config in one module `lib/config.ts`)
- Contract: Solidity `^0.8.20`, `contracts/ChefBOT.sol`, tested with Hardhat 3
- Worker: Cloudflare Worker in `worker/`, `POST /recipes`, OpenAI `gpt-4o-mini`
- Tests: vitest (frontend/unit), Hardhat 3 (contract), @testing-library/react (components)

## Canonical recipe-key algorithm (single source of truth)

Normalization (implemented byte-identically in Solidity and TypeScript):

1. Trim leading/trailing ASCII whitespace: `0x20` (space), `0x09` (tab), `0x0A` (LF), `0x0D` (CR).
2. Lowercase ASCII letters only: bytes `0x41–0x5A` → `+0x20`. Non-ASCII bytes unchanged.
3. `key = keccak256(bytes(normalizedTitle))` — plain text hash, never `abi.encode`.
4. Contract re-normalizes internally (`recipeKey(string)` pure view exposes the algorithm for parity tests). Frontend uses `lib/recipe-key.ts` to predict `Cooked` state.

Test vectors: `"Fried Rice"`, `"fried rice"`, `" fried rice "` → same key.

## Milestones

### M0 — Repository audit & scaffold (done)

- [x] Read AGENTS.md + PRD, audit repo (greenfield: no app code, no Worker, not a git repo)
- [x] Verify BOT Chain network values from official docs
- [x] `git init`
- [x] Scaffold Next.js 16 app, Worker package, Hardhat 3 workspace
- [x] ESLint / typecheck / vitest / build scripts wired
- [x] `.env.example` with placeholders only

**Verification:** `npm run lint` ✓ · `npm run typecheck` ✓ · `npm test` ✓ (1) · `npm run build` ✓ (static).

### M1 — Domain model & smart contract (done)

- [x] `lib/recipe-key.ts` + parity test vectors (ASCII trim + lowercase, keccak256)
- [x] `contracts/ChefBOT.sol`: Dish/dishes/dishKeys/cooked/myDishes, `cookIt`, `getDishes`, `getMyDishes`, `getDishKeys`, `getDish`, `recipeKey`, `Cooked` event, custom errors
- [x] Guards: EmptyTitle, TitleTooLong (64 B), EmojiTooLong (16 B), AlreadyCooked, checked-math uint32 overflow, first-time registration, event emission
- [x] Hardhat 3 test suite — **16/16 passing** (`npm run test:contract`)
- [x] ABI export: `npm run abi:export` → `lib/abi/ChefBOT.ts`
- [x] `docs/remix-deployment.md` (compiler 0.8.34/opt 200, Injected Provider, chain 968→677, testnet checklist, verification, gas/size notes)

**Verification:** lint ✓ · typecheck ✓ · vitest 17 ✓ · hardhat 16 ✓ · build ✓.
Deployed bytecode 4,779 B (19% of EIP-170 limit). No address fabricated.

### M2 — Recipe service & fallback (done)

- [x] Worker `POST /recipes`: input validation, CORS allowlist, 20 req/IP/hour rate limit, request-size cap
- [x] OpenAI call with ~7s abort, JSON-mode prompt
- [x] Output validation: exactly 3 recipes, required fields, types, ≤8 steps, string caps; safe error responses (no provider details)
- [x] Extensible router for future shared endpoints (`/aura`, `/study`, `/ask`, GitHub auth scaffold)
- [x] `data/recipes.json` (~25 curated recipes with categories, uses/missing/steps/minutes/vegetarian)
- [x] Frontend: 8s timeout, overlap-scored fallback, "House favourites" label, loading/error states
- [x] vitest: schema validation, timeout, fallback matching

**Verification:** vitest 64 ✓ · lint ✓ · typecheck ✓ · worker tsc ✓ · `wrangler dev` smoke ✓ (/health 200, invalid JSON 400, valid no-key 503, CORS preflight 204). Shared schema in `shared/recipe-schema.ts` imported by frontend + Worker; Worker entry exports only the default handler (runtime helpers in `worker/src/runtime.ts`).

**Acceptance:** valid → exactly 3 recipes; simulated timeout/500/invalid JSON → fallback with label.

### M3 — Frontend experience (done, incl. landing/app split)

- [x] Floating `ChefBOT` pill nav (sticky)
- [x] Media-led hero: "Real Food. Real Fast." + manifesto + Start cooking CTA
- [x] Ingredient picker: Protein & Fats / Vegetables & Fruits / Grains / Pantry chips; CTA disabled <2 ingredients
- [x] Cooking time 10/20/30 + vegetarian toggle
- [x] Recipe cards: title, emoji, minutes, uses, missing (red), expandable steps
- [x] Most Cooked: red bars from contract reads, sorted, counts, empty/no-config/error states
- [x] Manifesto footer: "Cooked on BOT Chain.", botchain.ai, explorer link
- [x] Unsplash imagery (URLs verified 200), reduced-motion, focus states, keyboard nav, responsive (≥44px targets, no horizontal scroll)
- [x] **Page split:** `/` landing (LandingNav/Hero/Stats/Manifesto/How/Features/FAQ) + `/app` tool (AppNav + CookFlow + Leaderboard + My Kitchen)

**Verification:** lint ✓ · typecheck ✓ · vitest ✓ · build ✓ (`/` + `/app` static) · dev render ✓ both routes.

### M4 — Wallet integration (done)

- [x] wagmi/viem config: chain 968 testnet + 677 mainnet (`lib/wagmi.ts`, verified RPC/explorer), add/switch network flow; target via `NEXT_PUBLIC_CHEFBOT_CHAIN_ID` (default 677)
- [x] MetaMask connect/disconnect, shortened address (`WalletButton` in AppNav; install link when no provider)
- [x] `cookIt` tx states: idle → wallet prompt → pending → confirmed/rejected/failed, explorer link from real hash (`CookButton`)
- [x] Duplicate prevention: contract-enforced, UI shows `Cooked ✓` from `cooked[key][addr]` (`useIsCooked`)
- [x] Post-receipt refresh of `getDishes`/`getMyDishes` (`useRefreshOnChain` prefix-invalidation of `["chefbot"]`)
- [x] Recipe-card "I cooked it 🍳" action; click while disconnected prompts connect; wrong network prompts switch
- [x] My Kitchen full states: disconnected → connect, loading, empty, error+retry, ready grid (react-query, auto-updates on wallet change)
- [x] `CONTRACT_ADDRESS` unset placeholder + explanatory notices (CookButton + My Kitchen + Leaderboard)
- [x] Providers: `app/providers.tsx` (WagmiProvider + QueryClientProvider), unit/component tests for wallet, cook, kitchen

**Acceptance:** leaderboard counts change only from confirmed on-chain reads ✓ (react-query invalidation after receipt; reads disabled without configured address).

### M5 — Integration testing (done)

- [x] End-to-end with mocked AI Worker — `tests/e2e-recipes.test.tsx` dispatches the UI's fetch to the **real Worker handler** (`worker/src/index.ts`) with canned OpenAI responses; covers AI-success ("Tonight's picks", 3 judul) and provider-500 fallback ("House favourites"), asserting the client→Worker→OpenAI call chain
- [x] Missing contract address, unsupported network (switch flow), tx rejection/failure paths — `cook-button`/`wallet-button`/`my-kitchen`/`leaderboard` tests
- [x] Loading/empty/error states + ingredient-selection component tests — `ingredient-picker`, `cook-flow`, `recipe-card`, `leaderboard`, `my-kitchen`; **responsive**: no meaningful jsdom test exists for breakpoints — verified manually (dev render at 375/768/1280, no horizontal scroll, ≥44px targets) and documented in README
- [x] Production build check — `npm run build` ✓ (`/` + `/app` static)

**Verification:** vitest **104/104** ✓ · lint ✓ · typecheck ✓ · `test:contract` 16/16 ✓ · build ✓.

### M6 — Release preparation (done)

- [x] README — local dev, scripts, env-var table, Worker deploy (`wrangler` + secrets + CORS), Remix guide link, Vercel deploy, testnet/mainnet config, manual responsive smoke checklist, troubleshooting pointers
- [x] `.env.example` (placeholders + verified testnet address with honest labeling) · `.gitignore` (`.env*` ignored, only `.env.example` re-included) · **CI workflow** `.github/workflows/ci.yml` (frontend job: lint→typecheck→vitest→hardhat→build; worker job: `npm ci`+typecheck) — runs after first push
- [x] Mainnet release checklist → `docs/release-checklist.md` (preflight gates, testnet exercise [deployment verified, exercise still open], Worker/CORS/secrets, mainnet deploy + on-chain anchor verification, post-release/rollback)
- [x] Security review → `docs/security-review.md` (threat model B1–B5, controls+evidence, `npm audit` triage: 5 high = dev-only `braces`, deferred with reason; worker 0 vulns; accepted risks: prompt-injection blast radius, in-memory rate limiter on serverless, no CSP yet) + hardening added: security headers in `next.config.ts` (nosniff/DENY/referrer/permissions-policy)

**Acceptance:** documentation complete; DoD items mapped to evidence — see section below.

## Definition of Done (PRD §11) → evidence

| # | DoD item | Evidence | Status |
|---|---|---|---|
| 1 | Open without wallet | `/` + `/app` render with no wallet (dev smoke, SSR "Connect wallet") | ✓ dev |
| 2 | Pick ≥2 ingredients + preferences | `ingredient-picker.test` · `cook-flow.test` (CTA <2, time/veg args) | ✓ |
| 3 | Three valid recipes from AI or fallback | `e2e-recipes.test` (real Worker handler → AI + fallback) · `recipes-client.test` | ✓ |
| 4 | I cooked it → connect → switch to BOT Chain | `cook-button.test` (connect prompt, switch-to-677 flow) · `wallet-button.test` | ✓ code |
| 5 | Approve → success + transaction link | `cook-button.test` ("Stamped! ✓" + explorer link from real hash) | ✓ code |
| 6 | Leaderboard increases from contract data | `useRefreshOnChain` invalidation + `leaderboard.test`; reads only from chain | ✓ code |
| 7 | Cooked ✓ + appears in My Kitchen | `cook-button.test` (disabled Cooked ✓) · `my-kitchen.test` (grid, keys→dishes) | ✓ code |
| 8 | Footer → BOT site + correct explorer page | `site-footer.test` — botchain.ai link + contract `/address/…` link when configured, generic explorer fallback; verified headers response | ✓ |
| 9 | Usable on mobile | manual responsive smoke (375/768/1280) in README | ✓ dev |

"✓ code" = covered by automated tests; "production-domain" verification of
items 1, 4–8 is **blocked on owner-run deployments** (Worker live,
Vercel live, mainnet Remix deploy) — execute
`docs/release-checklist.md` §2–§3 and re-walk DoD 1–9 on the live domain.

## Dependencies & external requirements (blockers)

| Need | Blocks | Owner |
|---|---|---|
| OpenAI API key | Live AI (fallback works without) | User: `wrangler secret put OPENAI_API_KEY` |
| Cloudflare account deploy | Worker going live | User (agent prepares code + commands) |
| Remix deployment + address | Real `cookIt`/leaderboard/kitchen | User (agent prepares contract + guide) |
| GitHub OAuth client secret | Future `/auth/*` endpoints (out of MVP scope) | User |
| Vercel production deploy | Public URL | User authorizes |

## Verification commands

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # vitest (frontend/unit/component)
npm run test:contract  # hardhat test
npm run build       # next build
```

## Progress log

- 2026-10-16: M0 done — scaffold verified (lint/typecheck/test/build).
- 2026-10-16: M1 done — contract + 16 Hardhat tests + recipe-key parity (17 vitest) + ABI export + Remix guide.
- 2026-10-16: M2 started — ingredient vocabulary, fallback recipes, Worker POST /recipes.
- 2026-10-16: M2 done — shared schema, Worker (runtime.ts + index.ts), frontend client w/ fallback; vitest 64; wrangler dev smoke verified.
- 2026-10-16: M3 started — frontend experience.
- 2026-10-16: M3 core done — nav/hero/cook-flow/cards/leaderboard/footer, tokens, Unsplash; vitest 78; dev render verified. Cook action + My Kitchen wallet states deferred to M4.
- 2026-10-16: M3 split done — `/` landing (Landing* sections) + `/app` tool page (AppNav); lint/typecheck/test/build + both-route render verified.
- 2026-10-16: M4 done — wagmi 968+677 config, Providers, WalletButton (connect/switch/disconnect/install-link), CookButton (connect-prompt, switch, cookIt, receipt, explorer link, Cooked ✓), MyKitchen full states, react-query invalidation; vitest 102 ✓ · lint ✓ · typecheck ✓ · build ✓ (/ + /app static).
- 2026-10-16: M5 done — e2e pipeline test (UI → client → real Worker handler → mocked OpenAI; AI + fallback), full gate: vitest 104 ✓ · lint ✓ · typecheck ✓ · hardhat 16 ✓ · build ✓. Responsive documented as manual smoke.
- 2026-10-16: M6 done — README, CI workflow, `docs/security-review.md`, `docs/release-checklist.md`, security headers in `next.config.ts`, DoD mapping. **Discovery: testnet contract `0x5191b250E9F18d640B2138a1Da0409be0f1dD092` (chain 968) verified on-chain** — `recipeKey("Fried Rice")` matches repo anchor via `rpc.bohr.life`; `getDishes()` empty (testnet exercise not yet run); mainnet `eth_getCode` = `0x` (not deployed). `.env.example` corrected to label testnet + `CHAIN_ID=968`. Contract explorer link added to site-footer (vitest 106).
- 2026-10-16: Design overhaul done — whole site migrated to DESIGN.md parchment system (light): globals tokens + `.band-dark` focus ring, BriefBanner, SectionTag, ink hero/manifesto bands (no photo), mono ticker replacing emoji marquee, red-only stats/leaderboard-data/alarm callouts, white shadow-card panels, pill ink buttons. Legacy dark-kitchen tokens removed after grep-clean (0 hits). Full gate: lint ✓ · typecheck ✓ · vitest 106/106 ✓ · hardhat 16/16 ✓ · build ✓ (/ + /app static) · worker tsc ✓ · `next start` smoke: `/` and `/app` render with 0 legacy classes.
