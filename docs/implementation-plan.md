# ChefBOT â€” Implementation Plan

Status legend: `pending` Â· `in progress` Â· `done` Â· `blocked`

Target: hackathon-ready MVP. Select ingredients â†’ three AI recipes â†’ record a cooking stamp on BOT Chain â†’ leaderboard/My Kitchen read on-chain data.

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
| AI provider | Google Gemini free tier (`gemini-3.5-flash-lite`, `generateContent` REST), key server-side in Worker | user decision 2026-10-18 (was OpenAI `gpt-4o-mini`) |
| Hosting | Vercel (frontend) + Cloudflare Worker (AI) | user decision |
| Contract deployment | User deploys via Remix IDE â€” agent never deploys | user constraint |

## Stack

- Frontend: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, deployed to Vercel
- Wallet: wagmi + viem (chain 677 config in one module `lib/config.ts`)
- Contract: Solidity `^0.8.20`, `contracts/ChefBOT.sol`, tested with Hardhat 3
- Worker: Cloudflare Worker in `worker/` (shared GitAura-style route table), `POST /recipes` via Gemini; GitAura/PocketLM routes reserved (501); 20 req/IP/hour via Durable Object
- Tests: vitest (frontend/unit), Hardhat 3 (contract), @testing-library/react (components)

## Canonical recipe-key algorithm (single source of truth)

Normalization (implemented byte-identically in Solidity and TypeScript):

1. Trim leading/trailing ASCII whitespace: `0x20` (space), `0x09` (tab), `0x0A` (LF), `0x0D` (CR).
2. Lowercase ASCII letters only: bytes `0x41â€“0x5A` â†’ `+0x20`. Non-ASCII bytes unchanged.
3. `key = keccak256(bytes(normalizedTitle))` â€” plain text hash, never `abi.encode`.
4. Contract re-normalizes internally (`recipeKey(string)` pure view exposes the algorithm for parity tests). Frontend uses `lib/recipe-key.ts` to predict `Cooked` state.

Test vectors: `"Fried Rice"`, `"fried rice"`, `" fried rice "` â†’ same key.

## Milestones

### M0 â€” Repository audit & scaffold (done)

- [x] Read AGENTS.md + PRD, audit repo (greenfield: no app code, no Worker, not a git repo)
- [x] Verify BOT Chain network values from official docs
- [x] `git init`
- [x] Scaffold Next.js 16 app, Worker package, Hardhat 3 workspace
- [x] ESLint / typecheck / vitest / build scripts wired
- [x] `.env.example` with placeholders only

**Verification:** `npm run lint` âœ“ Â· `npm run typecheck` âœ“ Â· `npm test` âœ“ (1) Â· `npm run build` âœ“ (static).

### M1 â€” Domain model & smart contract (done)

- [x] `lib/recipe-key.ts` + parity test vectors (ASCII trim + lowercase, keccak256)
- [x] `contracts/ChefBOT.sol`: Dish/dishes/dishKeys/cooked/myDishes, `cookIt`, `getDishes`, `getMyDishes`, `getDishKeys`, `getDish`, `recipeKey`, `Cooked` event, custom errors
- [x] Guards: EmptyTitle, TitleTooLong (64 B), EmojiTooLong (16 B), AlreadyCooked, checked-math uint32 overflow, first-time registration, event emission
- [x] Hardhat 3 test suite â€” **16/16 passing** (`npm run test:contract`)
- [x] ABI export: `npm run abi:export` â†’ `lib/abi/ChefBOT.ts`
- [x] `docs/remix-deployment.md` (compiler 0.8.34/opt 200, Injected Provider, chain 968â†’677, testnet checklist, verification, gas/size notes)

**Verification:** lint âœ“ Â· typecheck âœ“ Â· vitest 17 âœ“ Â· hardhat 16 âœ“ Â· build âœ“.
Deployed bytecode 4,779 B (19% of EIP-170 limit). No address fabricated.

### M2 â€” Recipe service & fallback (done)

- [x] Worker `POST /recipes`: input validation, CORS allowlist, 20 req/IP/hour rate limit, request-size cap
- [x] OpenAI call with ~7s abort, JSON-mode prompt
- [x] Output validation: exactly 3 recipes, required fields, types, â‰¤8 steps, string caps; safe error responses (no provider details)
- [x] Extensible router for future shared endpoints (`/aura`, `/study`, `/ask`, GitHub auth scaffold)
- [x] `data/recipes.json` (~25 curated recipes with categories, uses/missing/steps/minutes/vegetarian)
- [x] Frontend: 8s timeout, overlap-scored fallback, "House favourites" label, loading/error states
- [x] vitest: schema validation, timeout, fallback matching

**Verification:** vitest 64 âœ“ Â· lint âœ“ Â· typecheck âœ“ Â· worker tsc âœ“ Â· `wrangler dev` smoke âœ“ (/health 200, invalid JSON 400, valid no-key 503, CORS preflight 204). Shared schema in `shared/recipe-schema.ts` imported by frontend + Worker; Worker entry exports only the default handler (runtime helpers in `worker/src/runtime.ts`).

**Acceptance:** valid â†’ exactly 3 recipes; simulated timeout/500/invalid JSON â†’ fallback with label.

### M3 â€” Frontend experience (done, incl. landing/app split)

- [x] Floating `ChefBOT` pill nav (sticky)
- [x] Media-led hero: "Real Food. Real Fast." + manifesto + Start cooking CTA
- [x] Ingredient picker: Protein & Fats / Vegetables & Fruits / Grains / Pantry chips; CTA disabled <2 ingredients
- [x] Cooking time 10/20/30 + vegetarian toggle
- [x] Recipe cards: title, emoji, minutes, uses, missing (red), expandable steps
- [x] Most Cooked: red bars from contract reads, sorted, counts, empty/no-config/error states
- [x] Manifesto footer: "Cooked on BOT Chain.", botchain.ai, explorer link
- [x] Unsplash imagery (URLs verified 200), reduced-motion, focus states, keyboard nav, responsive (â‰¥44px targets, no horizontal scroll)
- [x] **Page split:** `/` landing (LandingNav/Hero/Stats/Manifesto/How/Features/FAQ) + `/app` tool (AppNav + CookFlow + Leaderboard + My Kitchen)

**Verification:** lint âœ“ Â· typecheck âœ“ Â· vitest âœ“ Â· build âœ“ (`/` + `/app` static) Â· dev render âœ“ both routes.

### M4 â€” Wallet integration (done)

- [x] wagmi/viem config: chain 968 testnet + 677 mainnet (`lib/wagmi.ts`, verified RPC/explorer), add/switch network flow; target via `NEXT_PUBLIC_CHEFBOT_CHAIN_ID` (default 677)
- [x] MetaMask connect/disconnect, shortened address (`WalletButton` in AppNav; install link when no provider)
- [x] `cookIt` tx states: idle â†’ wallet prompt â†’ pending â†’ confirmed/rejected/failed, explorer link from real hash (`CookButton`)
- [x] Duplicate prevention: contract-enforced, UI shows `Cooked âœ“` from `cooked[key][addr]` (`useIsCooked`)
- [x] Post-receipt refresh of `getDishes`/`getMyDishes` (`useRefreshOnChain` prefix-invalidation of `["chefbot"]`)
- [x] Recipe-card "I cooked it ðŸ³" action; click while disconnected prompts connect; wrong network prompts switch
- [x] My Kitchen full states: disconnected â†’ connect, loading, empty, error+retry, ready grid (react-query, auto-updates on wallet change)
- [x] `CONTRACT_ADDRESS` unset placeholder + explanatory notices (CookButton + My Kitchen + Leaderboard)
- [x] Providers: `app/providers.tsx` (WagmiProvider + QueryClientProvider), unit/component tests for wallet, cook, kitchen

**Acceptance:** leaderboard counts change only from confirmed on-chain reads âœ“ (react-query invalidation after receipt; reads disabled without configured address).

### M5 â€” Integration testing (done)

- [x] End-to-end with mocked AI Worker â€” `tests/e2e-recipes.test.tsx` dispatches the UI's fetch to the **real Worker handler** (`worker/src/index.ts`) with canned OpenAI responses; covers AI-success ("Tonight's picks", 3 judul) and provider-500 fallback ("House favourites"), asserting the clientâ†’Workerâ†’OpenAI call chain
- [x] Missing contract address, unsupported network (switch flow), tx rejection/failure paths â€” `cook-button`/`wallet-button`/`my-kitchen`/`leaderboard` tests
- [x] Loading/empty/error states + ingredient-selection component tests â€” `ingredient-picker`, `cook-flow`, `recipe-card`, `leaderboard`, `my-kitchen`; **responsive**: no meaningful jsdom test exists for breakpoints â€” verified manually (dev render at 375/768/1280, no horizontal scroll, â‰¥44px targets) and documented in README
- [x] Production build check â€” `npm run build` âœ“ (`/` + `/app` static)

**Verification:** vitest **104/104** âœ“ Â· lint âœ“ Â· typecheck âœ“ Â· `test:contract` 16/16 âœ“ Â· build âœ“.

### M6 â€” Release preparation (done)

- [x] README â€” local dev, scripts, env-var table, Worker deploy (`wrangler` + secrets + CORS), Remix guide link, Vercel deploy, testnet/mainnet config, manual responsive smoke checklist, troubleshooting pointers
- [x] `.env.example` (placeholders + verified testnet address with honest labeling) Â· `.gitignore` (`.env*` ignored, only `.env.example` re-included) Â· **CI workflow** `.github/workflows/ci.yml` (frontend job: lintâ†’typecheckâ†’vitestâ†’hardhatâ†’build; worker job: `npm ci`+typecheck) â€” runs after first push
- [x] Mainnet release checklist â†’ `docs/release-checklist.md` (preflight gates, testnet exercise [deployment verified, exercise still open], Worker/CORS/secrets, mainnet deploy + on-chain anchor verification, post-release/rollback)
- [x] Security review â†’ `docs/security-review.md` (threat model B1â€“B5, controls+evidence, `npm audit` triage: 5 high = dev-only `braces`, deferred with reason; worker 0 vulns; accepted risks: prompt-injection blast radius, in-memory rate limiter on serverless, no CSP yet) + hardening added: security headers in `next.config.ts` (nosniff/DENY/referrer/permissions-policy)

**Acceptance:** documentation complete; DoD items mapped to evidence â€” see section below.

## Definition of Done (PRD Â§11) â†’ evidence

| # | DoD item | Evidence | Status |
|---|---|---|---|
| 1 | Open without wallet | `/` + `/app` render with no wallet (dev smoke, SSR "Connect wallet") | âœ“ dev |
| 2 | Pick â‰¥2 ingredients + preferences | `ingredient-picker.test` Â· `cook-flow.test` (CTA <2, time/veg args) | âœ“ |
| 3 | Three valid recipes from AI or fallback | `e2e-recipes.test` (real Worker handler â†’ AI + fallback) Â· `recipes-client.test` | âœ“ |
| 4 | I cooked it â†’ connect â†’ switch to BOT Chain | `cook-button.test` (connect prompt, switch-to-677 flow) Â· `wallet-button.test` | âœ“ code |
| 5 | Approve â†’ success + transaction link | `cook-button.test` ("Stamped! âœ“" + explorer link from real hash) | âœ“ code |
| 6 | Leaderboard increases from contract data | `useRefreshOnChain` invalidation + `leaderboard.test`; reads only from chain | âœ“ code |
| 7 | Cooked âœ“ + appears in My Kitchen | `cook-button.test` (disabled Cooked âœ“) Â· `my-kitchen.test` (grid, keysâ†’dishes) | âœ“ code |
| 8 | Footer â†’ BOT site + correct explorer page | `site-footer.test` â€” botchain.ai link + contract `/address/â€¦` link when configured, generic explorer fallback; verified headers response | âœ“ |
| 9 | Usable on mobile | manual responsive smoke (375/768/1280) in README | âœ“ dev |

"âœ“ code" = covered by automated tests; "production-domain" verification of
items 1, 4â€“8 is **blocked on owner-run deployments** (Worker live,
Vercel live, mainnet Remix deploy) â€” execute
`docs/release-checklist.md` Â§2â€“Â§3 and re-walk DoD 1â€“9 on the live domain.

## Dependencies & external requirements (blockers)

| Need | Blocks | Owner |
|---|---|---|
| Gemini API key (free, AI Studio) | Live AI (fallback works without) | User: `worker/.dev.vars` locally, `wrangler secret put GEMINI_API_KEY` for deploy |
| Testnet redeploy of the aligned contract | Leaderboard reads on 968 (old deployment lacks the new `getDishes()` shape) | User: Remix redeploy, update `.env.local` |
| GitAura PRD | `/auth/github/*`, `/auth/attest`, `/aura`, `/study`, `/ask` | User: share spec |
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

- 2026-10-16: M0 done â€” scaffold verified (lint/typecheck/test/build).
- 2026-10-16: M1 done â€” contract + 16 Hardhat tests + recipe-key parity (17 vitest) + ABI export + Remix guide.
- 2026-10-16: M2 started â€” ingredient vocabulary, fallback recipes, Worker POST /recipes.
- 2026-10-16: M2 done â€” shared schema, Worker (runtime.ts + index.ts), frontend client w/ fallback; vitest 64; wrangler dev smoke verified.
- 2026-10-16: M3 started â€” frontend experience.
- 2026-10-16: M3 core done â€” nav/hero/cook-flow/cards/leaderboard/footer, tokens, Unsplash; vitest 78; dev render verified. Cook action + My Kitchen wallet states deferred to M4.
- 2026-10-16: M3 split done â€” `/` landing (Landing* sections) + `/app` tool page (AppNav); lint/typecheck/test/build + both-route render verified.
- 2026-10-16: M4 done â€” wagmi 968+677 config, Providers, WalletButton (connect/switch/disconnect/install-link), CookButton (connect-prompt, switch, cookIt, receipt, explorer link, Cooked âœ“), MyKitchen full states, react-query invalidation; vitest 102 âœ“ Â· lint âœ“ Â· typecheck âœ“ Â· build âœ“ (/ + /app static).
- 2026-10-16: M5 done â€” e2e pipeline test (UI â†’ client â†’ real Worker handler â†’ mocked OpenAI; AI + fallback), full gate: vitest 104 âœ“ Â· lint âœ“ Â· typecheck âœ“ Â· hardhat 16 âœ“ Â· build âœ“. Responsive documented as manual smoke.
- 2026-10-16: M6 done â€” README, CI workflow, `docs/security-review.md`, `docs/release-checklist.md`, security headers in `next.config.ts`, DoD mapping. **Discovery: testnet contract `0x5191b250E9F18d640B2138a1Da0409be0f1dD092` (chain 968) verified on-chain** â€” `recipeKey("Fried Rice")` matches repo anchor via `rpc.bohr.life`; `getDishes()` empty (testnet exercise not yet run); mainnet `eth_getCode` = `0x` (not deployed). `.env.example` corrected to label testnet + `CHAIN_ID=968`. Contract explorer link added to site-footer (vitest 106).
- 2026-10-16: Design overhaul done â€” whole site migrated to DESIGN.md parchment system (light): globals tokens + `.band-dark` focus ring, BriefBanner, SectionTag, ink hero/manifesto bands (no photo), mono ticker replacing emoji marquee, red-only stats/leaderboard-data/alarm callouts, white shadow-card panels, pill ink buttons. Legacy dark-kitchen tokens removed after grep-clean (0 hits). Full gate: lint âœ“ Â· typecheck âœ“ Â· vitest 106/106 âœ“ Â· hardhat 16/16 âœ“ Â· build âœ“ (/ + /app static) Â· worker tsc âœ“ Â· `next start` smoke: `/` and `/app` render with 0 legacy classes.
- 2026-10-17: Landing strict DESIGN.md pass â€” SectionProgressDots replace thin bar on `/`, stats â†’ 3 red blocks (155px numbers), nav â†’ real pills, hero/manifesto/FAQ subtitles full parchment, section padding 80/128 tokens, headingâ†’grid 80px, cards 24px padding, features h2 96px. Verified on dev :3000 (0 legacy classes, 0 `parchment/70`).
- 2026-10-17: MetaMask + chain-aware fixes done (TDD, on top of baseline `15af269`) â€” Bug 1: `metaMask()` SDK connector (missing optional dep `@metamask/connect-evm`) replaced by `injected({ target: "metaMask" })` + generic `injected()` fallback + shared `lib/wallet-connect.ts` (`orderedConnectors`, `connectFirstAvailable`); Bug 2: all reads chain-aware via `publicClientFor()` (was pinned to mainnet 677 while the contract lives on 968); Bug 3: explorer URLs via `explorerUrlFor/explorerTxUrl/explorerAddressUrl` (scan.bohr.life on 968); Bug 4: `ssr: true` in wagmi config; Bug 5: receipt watched with `chainId: target`; Bug 6: `wrong_chain` error kind; also fixed `fetchIsCooked` arg order `[key, cook]`. New tests: chain(9), contract-chain(4), wagmi-config(4), metamask-connect(3, simulated EIP-1193), wallet-connect(8) + wallet-errors extended. Full gate: **vitest 21 files / 135 tests âœ“** Â· hardhat 16 âœ“ Â· lint âœ“ Â· tsc âœ“ Â· next build âœ“ (/ + /app static) Â· worker tsc âœ“. Live proof: testnet 968 `eth_getCode` = 7420 bytes, `getDishes()` â†’ `[]`; mainnet 677 no code (read errors as expected). Smoke: dev :3000 `/`+`/app` 200; wrangler dev `/health` 200, POST `/recipes` â†’ 503 without key + CORS `http://localhost:3000`, OPTIONS â†’ 204.
- 2026-10-17: Landing hero cleaned + how-it-works rebuilt to realfood.gov scrollytelling â€” Removed hero video figure (`.hero-organic` + organic-drift keyframes + play trigger) from `landing-hero.tsx`; restored outlined pill "See how it works" â†’ `#how`. Deleted `.swap-fade` CSS. Rewrote `landing-how.tsx` as static server component: each step is a full-viewport (`lg:min-h-[100svh]`) two-column panel â€” left text (mono `Step NN / 03`, ~44px h3, body, bold target line), right large SVG line-art illustration. Added `components/illustrations/{pantry,recipes,stamp}-illustration.tsx` â€” hand-drawn ink/wheat line-art (viewBox 480, stroke `#110000`, fill `#f3f0d6`/`#fdfbee`), decorative + aria-hidden with sr-only captions. Upgraded `section-dots.tsx` pill to reference pattern `â— â— â— <active label> â— â— â—`. Full gate: lint âœ“ Â· tsc âœ“ Â· vitest 21 files / 135 tests âœ“ Â· next build âœ“ (/ + /app static). Smoke dev :3000: `/`+`/app` 200; 0 hits for `hero-organic`/`swap-fade`; 3Ã— 480 SVGs, `min-h-[100svh]` panels present, STAMPED seal + target lines render.
- 2026-10-17: Intro curtain + scroll feel landed (realfood.gov pattern) — Removed BriefBanner (deleted components/brief-banner.tsx) and SectionDots (deleted components/section-dots.tsx): single navbar only. New components/intro-curtain.tsx: pre-paint inline script adds html.intro-active on first visit per session (skips when seen or reduced-motion), green `#066742 overlay with 3 full-color food SVGs (components/illustrations/intro/{broccoli,milk,steak}-intro.tsx) flying in via CSS keyframes, curtain lifts at 2.25s while .landing-stage rises from translateY(180px) and .landing-header drops from -160px; client effect releases class + sets sessionStorage.chefbot-intro-seen after 3.5s and unlocks scroll on unmount. New components/scroll-words.tsx: scroll-linked word lighting (dim sh ? lit inherited color following scroll progress 85%?35% viewport, data-lit written straight to DOM, rAF-throttled; reduced-motion lights all) wired into manifesto body paragraph. New components/parallax-figure.tsx: ±18px Y drift on the how-panel illustrations (transform on inner div, composes with Reveal). Stats blocks now effect=grow (scaleY 0.12?1 from baseline, RevealEffect union extended). Hero entrance synced to curtain via .intro-active #hero CSS (reveal delay 2550ms, words held until lift). pp/page.tsx wraps nav/main/footer in .landing-stage + renders IntroCurtain. Full gate: lint ? · tsc ? · vitest 21 files / 135 tests ? · next build ? (/ + /app static). Smoke dev :3000: /+/app 200; HTML contains intro-overlay, 3 intro food SVG viewBoxes, pre-paint script (chefbot-intro-seen), landing-stage, landing-header, 39 data-scroll-word spans, 3 data-reveal=grow; 0 hits for brief-banner/section-dots.
- 2026-10-17: PRD core gaps closed + realfood.gov UI pass (TDD for logic). **Core:** success state now reads the cook number from the `Cooked` event in the receipt (`lib/cooked-event.ts` → "Stamped! You're cook #N of this dish") + Share on X intent; wallet connect auto-switches/adds the target chain right after connecting (declining keeps the "Switch to BOT Chain" fallback); tx error shows Retry; leaderboard = vertical red bars (count inside, title under, tap → dish detail with cookbook steps via `findCuratedRecipe`), empty state "Be the first to cook something"; ingredient picker = WAI-ARIA food-group tabs (arrow/Home/End, per-tab counts) + removable "Your fridge" tray in a sticky action bar; CTA "Cook something →"; loading = skeleton cards + "ChefBOT is tasting ideas…"; stacked full-width recipe cards ("Uses N of your ingredients", missing as red chips, numbered steps). **UI:** shared dark floating `PillNav` (☰ on mobile; landing nav was previously not mounted), parchment hero with giant headline + photo media card and "▶ Start cooking" pill, staggered stat bars, new `LandingFoodGroups` (letter-by-letter `ScrollLetters` "Real food can be this easy." + inverted-pyramid tiers), photo-led features list, PRD §8 footer (letter-revealed "Cooked on BOT Chain.", dark glow card → botchain.ai with BOT Chain logo, "View on explorer ↗" pill → contract, red chain-ID caption, © line). Food photos self-hosted in `public/food/` (Unsplash License, credits in `public/food/CREDITS.md`); BOT Chain marks in `public/brand/`. Gate: tsc ✓ · eslint ✓ · **vitest 22 files / 155 tests ✓** · next build ✓ (/ + /app static). Browser check (Edge via playwright-core, 1440×900 + 390×844): no page errors; pick → fallback recipes → steps → bar detail flow works; leaderboard read 3 real dishes from testnet 968. Not verified live: a real `cookIt` signature (needs the owner's MetaMask) and the AI path (Worker not running locally → fallback served).
- 2026-10-17: Landing motion overhaul + component restructure. **Structure:** `components/{landing,kitchen,ui,illustrations}` (landing sub-folders `how-it-works/`, `intro/`, `motion/`); imports + test imports updated; dead code removed (`scroll-words`, `parallax-figure`, old CSS intro keyframes, 3 intro SVGs). **Motion:** GSAP 3.15.0 + ScrollTrigger/SplitText/Flip/DrawSVG via `@gsap/react` 2.1.2, Lenis 1.3.27 smooth scroll on `/` only (pinned exact). Intro = one timeline (photos pop, "Real Food." chars rise, preheating counter, side photos fly out, curtain wipes, centre photo Flip-morphs into the hero card; click/key/wheel fast-forward; 7s safety). Hero: masked char headline, scroll recede + photo parallax. Stats bars scrub-grow (trigger = chart, not the scaled bars). Food groups: pinned stone→ink letter scrub + tiers sweep in. Manifesto: band opens inset→full-bleed, words light on scrub, velocity-reactive tickers. How it works: desktop pin (+320%), one scrubbed master timeline (pantry draws + door swings + items pop / cards fan + check / receipt prints + seal slams + burst), odometer + rail, snap to nearest step with start/end rest points; mobile plays each step on enter. Features: photo zoom/parallax, hairline draw. FAQ: smooth `<details>` height, CTA scale-in, magnetic buttons. Auto-hiding nav, scroll progress line. **Safety:** `html.motion` only via pre-paint script when JS + motion allowed, 6s fallback un-hides; reduced motion = static page, no Lenis, no pin. Gate: tsc ✓ · eslint ✓ · **vitest 23 files / 172 ✓** (+8 `intro-script.test.ts`) · build ✓; gsap/lenis chunk referenced by `/` only, not `/app`. Edge harness (1440×900 + 390×844): 0 page errors; CLS 0.002 / 0.000 (fixed from 0.131 — intro morph was resizing an in-flow element); anchor #how lands at its 96px scroll margin (fixed double offset); How-it-works snaps 1→2→3 (fixed step 2 being skipped by directional snap); reduced motion: 0 hidden elements, no pin, no curtain; JS off: content visible.
- 2026-10-17: Intro photo fix + phone performance pass. **Intro:** replaced the Flip morph with one fixed photo layer that *is* the hero card (same image URL/`sizes`/quality via `components/landing/hero-photo.ts`, same inner crop box), clipped to a circle with `clip-path: inset(… round)` driven from a numeric proxy (the browser's shortened clip-path serialisation broke GSAP's interpolation). The circle now shows the middle of the final framing (food only — no grey table crescent) and the morph lands pixel-identical on the card (card hidden while the layer travels, swapped in one frame). Starts after `img.decode()` + idle (1.2s cap); phones: shorter cut (×1.4, no counter, one side photo); Save-Data / ≤2 GB devices skip it (`isLiteDevice`, +5 tests in `intro-script.test.ts`). Flip plugin dropped. **Bundle:** wallet stack removed from `/` — `Providers` moved to `app/app/layout.tsx`, new wallet-free `lib/chain-config.ts` (re-exported by `lib/chain.ts`/`lib/contract.ts`); landing JS 359 → 251 KB gzip, no wagmi/viem/secp256k1 chunk on `/`. **Phones:** Lenis only for fine pointers (native scroll on touch); scroll-progress without React state or per-frame layout reads; nav auto-hide tweens only on direction flips; nav blur md+ only; section animation setup deferred to idle/near-viewport on touch; scrubs converted to play-once on touch (stats bars, statement, tiers, manifesto words, FAQ CTA), desktop-only clip-path band + features zoom, CSS (compositor) tickers on touch, letter reveals → word reveals, How-it-works figures revealed whole; hero card paints from first frame on touch (LCP). **Bug found & fixed:** tiers' off-screen start state widened the page to 445px on phones (horizontal scroll, off-centre intro) → `overflow-x: clip` on the section + body. **Measured** (Edge, 390×844@3x, 4× CPU, 1.6 Mbps/150 ms; medians, noisy machine with ~0.7 GB free RAM): LCP 5.2–5.3s → 2.1–2.4s (no-motion control 2.4s); repeat-visit TBT 2.4s → ~1.6–1.7s (control 1.44s — React hydration floor); first-visit TBT 3.1s → ~2.4s; CLS 0; idle 60 fps; steady-state per-section scroll 39–48 fps (control 47–60) — remaining gap is one-shot reveals playing. Gate: tsc ✓ · eslint ✓ · vitest 23/177 ✓ · build ✓; desktop regression: CLS 0.002, anchors at scroll margin, How-it-works snaps 1→2→3, reduced-motion/no-JS fully visible.
- 2026-10-18: PRD gap analysis + Gemini switch + GitAura-shaped Worker + contract alignment. **Worker** restructured into the shared GitAura route table (`env.ts`, `routes.ts`, `routes/{recipes,reserved}.ts`, `lib/{http,cors,gemini,rate-limit}.ts`): `POST /recipes` now calls Google Gemini `generateContent` (default `gemini-3.5-flash-lite`, free tier; key in `x-goog-api-key` header; JSON mode + responseSchema; thought parts ignored; SAFETY/blocked finish reasons -> 502; optional `GEMINI_MODEL` / `GEMINI_THINKING_LEVEL` vars). GitAura/PocketLM routes (`/auth/github/login`, `/auth/github/callback`, `/auth/attest`, `/aura`, `/study`, `/ask`) reserved -> 501 until the GitAura PRD arrives. Real 20 req/IP/hour via a SQLite-backed Durable Object (`RATE_LIMITER`, migration v1) with in-memory fallback. **Hardening:** vocabulary moved to `shared/ingredients.ts` (garlic/chili now under Pantry per PRD); Worker rejects unknown ingredient ids (free text never reaches the prompt); `uses` filtered to picked ids on Worker + client; `.dev.vars` added to .gitignore (was not ignored). **Contract:** `getDishes()` now returns `(bytes32[] keys, Dish[] list)` per PRD §5, `getDishKeys()` removed, ABI re-exported, `fetchDishes()` = one atomic call. NOTE: the existing testnet deployment `0x5191...D092` has the old ABI -> leaderboard reads fail until the owner redeploys to 968. Gate: tsc OK, worker tsc OK, eslint OK, **vitest 23 files / 191 OK**, **hardhat 17 OK**, next build OK, `wrangler deploy --dry-run` OK (6.33 KiB gz, DO bound). `wrangler dev` smoke (no key): /health 200, reserved route 501, unknown ingredient 400, missing key 503, foreign origin 403, DO limiter 429 + Retry-After 3600. NOT yet verified: a live Gemini call (needs the owner's free AI Studio key), testnet redeploy + real cookIt, Worker/Vercel deploys, mainnet.
- 2026-10-18: **Live verification (owner key + redeployed testnet contract).** Owner created `worker/.dev.vars` (format checked without reading the value; git-ignored) and redeployed the aligned contract to 968 at `0x939878F4aA5564B91aFa1e8758A100F14AAbcB85`. On-chain (rpc.bohr.life): 7,388 bytes of code, `recipeKey("Fried Rice")` == repo anchor, new `getDishes()` decodes `(keys, list)` (empty), removed `getDishKeys()` reverts. Gemini via `wrangler dev` (`gemini-3.5-flash-lite`, real key): 3 calls → HTTP 200, 3 schema-valid recipes each, latency 2.23 s / 1.97 s / 1.66 s; the vegetarian 10-minute request returned only vegetarian dishes ≤ 10 min. `GEMINI_THINKING_LEVEL=minimal` accepted by the API (200, 1.89 s, no measurable gain) → left off by default. Browser (Next dev + Worker): egg+rice+garlic → "Fresh from ChefBOT AI" in 2.8 s, every card "Uses 3 of your ingredients", leaderboard reads the new contract ("No dishes stamped yet"), 0 page errors. README + .env.example now point at the new testnet address. Still open: a real `cookIt` signature with MetaMask, Worker + Vercel deploys, mainnet (approval required).
- 2026-10-18: **Worker live on Cloudflare (testnet only, no mainnet).** `https://chefbot-recipes.bayuapriansyah2022.workers.dev`, version `037385fb-8a95-4b4e-90b5-cfe55309a6e7` (`workers_dev: true`, `preview_urls: false`). Bindings: `RATE_LIMITER` Durable Object (migration v1) + vars; secret `GEMINI_API_KEY` present (name only). Live smoke: `/health` 200 (0.13–0.22 s); `POST /recipes` ×3 → 200 with 3 schema-valid recipes in 2.11 / 2.42 / 2.65 s (vegetarian 10-min request respected); preflight 204 + ACAO for localhost:3000; foreign origin 403; unknown ingredient 400; the 6 reserved routes 501; unknown path 404; wrong method 405; live limiter: 20 limited calls allowed, 21st → 429 `Retry-After: 3467`, `/health` unaffected, counter survives a redeploy. Leak scan of all bodies/headers for the key prefix, `googleapis`, `generativelanguage`, `x-goog-api-key`: 0 hits. **Finding:** XL Axiata DNS resolves `*.workers.dev` to `blockpage.xlaxiata.id`; tests used `curl --resolve` to 104.21.83.121 (Cloudflare via 1.1.1.1). Indonesian users on blocking ISPs need the Worker on a custom domain.
- 2026-10-18: **v1.1 on branch `feat/v1.1` (not merged; MVP release unaffected).** Spec `docs/spec-v1.1.md` approved by the owner. F1 shopping list (localStorage, copy/share, "List" nav). F2 optional nutrition estimate; live via `wrangler dev`: 2 calls 200 in 2.20 / 2.03 s, all 6 recipes carried kcal + protein. F3 `POST /scan`: live with repo photos (full-size, curl) 200 in 1.8–2.5 s — pantry flat-lay → tomato, onion, potato, garlic; greens → spinach, lemon; poke bowl → salmon; salmon plate → salmon, tomato. (Correction: an earlier note called cucumber/apple/avocado "missed" — they are not in the ChefBOT vocabulary, so the scan cannot return them.) A broader prompt raised recall slightly but added guesses (lemon, olive oil), so it was reverted. Browser (Edge, 390 px, prod build + local Worker): consent → photo shrunk on device to 93 KB → "Found 4" in 2.7 s, chips pre-selected, nothing auto-submitted, 0 page errors, no horizontal overflow. Gate: tsc ×2, eslint, 266 Vitest tests, next build — green. Real fridge photos from the owner still pending.
- 2026-10-18: **v1.1 fixes after owner testing.** (1) Phone over LAN showed a dead page: dev log confirmed `Blocked cross-origin request to Next.js dev resource ... from "192.168.100.212"` (Next 16 dev default) and the recipe API pointed at 127.0.0.1 → new `npm run dev:lan` (allowedDevOrigins from CHEFBOT_LAN_HOST, Worker on 0.0.0.0 with LAN CORS via `--var`). Reproduced before (Edge via LAN IP: chip and ☰ dead); prod build via LAN IP taps fine; Worker LAN health 200 + preflight ACAO for the LAN origin. The owner's own `next dev` was not restarted, so the dev path awaits the owner running `dev:lan`. Also seen: that `next dev` did not pick up file edits (OneDrive folder) — restart it after pulling changes. (2) "List" did scroll (measured), but sat at the page bottom; moved after Cook, nav count badge, "View list" link. (3) Scan accuracy, `npm run eval:scan` on 8 labelled photos × 2 runs (768 px, as the app sends): A Flash-Lite direct prompt P 0.94 / R 0.89, median 1.76 s; B 1024 px identical P/R, slower p95; C observe-then-map prompt P 0.92 / R 0.89 (cauliflower → broccoli); D gemini-3.5-flash and E + thinking high: most calls 429/503/504 on the free tier, successes 4–6 s and no better (new false positives). Kept A. Remaining errors are consistent across models: lemon guessed in the poke bowl, enoki mushroom and small carrot cubes missed. Biggest real limit is the vocabulary itself (no cucumber, apple, avocado, cauliflower…). Note: stopping background `wrangler dev` tasks left workerd running on Windows; first D/E runs were void and re-run on fresh ports with a fake-model sanity check (502 as expected).
- 2026-10-18: **Intro curtain made lighter, same look.** Opening (circle pop, side photos, "Real Food." chars, meta) moved from a GSAP main-thread timeline to CSS keyframes on transform/opacity, so the compositor plays it from the first paint, even during hydration; chars are pre-split in JSX (no runtime SplitText); background wipe is a `translateY` instead of a clip-path tween; the exit uses the Web Animations API; landing section setup (SplitText/ScrollTriggers/pins) waits for the intro to finish (`afterIntro`). Chrome trace confirms every opening animation composites; only the short clip-path morph into the hero card stays main-thread (`compositeFailed=8192 clip-path`). Measured on prod builds (Edge trace, PipelineReporter), old 3 runs → new 5 runs: phone 390 px @ CPU 4× + slow 4G — intro 5.3 s → 4.2 s, dropped frames that affect smoothness 100% → 34%, animated frames dropped 13.9% → 9.8%; desktop 1440 — intro 3.9 s → 3.7 s, smoothness drops 100% → 74%, animated frames dropped 8.7% → 7.2%. Remaining phone drops coincide with page-load long tasks (240–300 ms) right after first paint. Frame-by-frame screenshots before/after match (desktop + phone). Landing scroll reveals unchanged (identical with and without the intro).
- 2026-10-18: **Vocabulary 39 → 62 ids** (owner-approved list incl. local staples: tempeh, long beans, bok choy, shallot, rice vermicelli, oyster sauce …). Picker emoji for every id (test added; it also caught spring onion + chili, which had no glyph). Narrow phones (<400 px) drop the decorative tick so long names fit. Scan eval (Flash-Lite, 768 px, 8 photos × 2, labels extended to the new ids): precision 0.92, recall 0.95 (tp 59 / fp 5 / fn 3), median 2.2 s — previously 34 of 38 visible vocabulary items, now 59 of 62. Consistent errors: lemon guessed in the poke bowl, cauliflower on the salmon plate (base is likely cauliflower rice; label left as-is). **Release order:** `wrangler deploy` before the frontend, or the live Worker rejects the new ids (400 → fallback).
- 2026-10-18: **"First screen freezes before the intro" (owner, phone via dev:lan).** Filmstrip (CDP screencast, phone, CPU 4×) of the owner's `next dev`: white until 1.8 s, then the intro photo **stretched full-screen and unstyled**, frozen past 3.2 s — dev serves CSS/JS late, so the overlay's `<img>` painted before any styles. Production showed no such frame. Fix: the overlay carries inline `display:none`, shown only by `.intro-active .intro-overlay { display:flex !important }` in globals.css, so without CSS it stays hidden (verified by blocking every .css request: overlay `display:none`); opening starts at once (`--t0: 0s`, circle from scale 0.15). New `npm run preview:lan` (production build + `next start` on the LAN) for judging speed on a phone. Prod filmstrip after: green on first paint, circle ≈0.23 s later, no hero flash. Note: during this fix the prepaint `<script>` line was accidentally deleted in the working copy (hero flashed before the intro in one test run); restored before commit and re-verified in the served HTML (prepaint → overlay → hero).
- 2026-10-18: **Dev console error + "intro plays twice" in dev.** (1) React 19 logs "Encountered a script tag while rendering React component" for the prepaint `<script>` in the client IntroCurtain. Fixed with the `InlineScript` pattern from `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md` (`text/javascript` on the server, `text/plain` + `suppressHydrationWarning` on the client); test proves the control case warns and the helper does not; served HTML still has `<script type="text/javascript">` before the overlay. (2) In dev, Strict Mode's remount resets `<html>`'s classes; the curtain re-added them and the CSS opening restarted (a short first run, then a second intro). The prepaint script now records `window.__chefbotIntroT0`; when the effect re-adds the class it seeks the CSS animations to the elapsed time (only within 5 s, only when re-added). Production checked: one opening start, no restart. Dev path not observed directly here (the owner's `next dev` holds the project's dev lock).
- 2026-10-18: **Blank/cream screen before the intro.** Trace (phone, CPU 4×, slow 4G): HTML done at 0.25 s and CSS at 0.72 s, yet first paint at 2.0 s — the first style + layout of the whole landing (style 177 ms + layout 504 ms) blocked it; and the first paint, when it came, was the cream body before the overlay was parsed. Tried `experimental.inlineCss`: HTML grew to 279 KB and first paint got slower (reverted). Fix: prepaint script moved to the root layout `<head>` (InlineScript, landing path only; `<html suppressHydrationWarning>`); the page is curtain-green while the intro covers it (`html.intro-active:not(.intro-exiting)`), back to cream as the curtain lifts; the first frame lays out only the curtain (`html.intro-first #top > :not(.intro-overlay)`, dropped two frames later while the opening runs on the compositor) — 46 layout objects instead of the full page. Result: first frame is green (no cream flash); slow 4G first paint 2.0 s → 1.15 s; Wi-Fi first visible colour ≈0.5 s at CPU 4× (network + CSS + first style). Smoothness unchanged (phone 36%, desktop 73% smoothness-affecting drops — within run-to-run noise), landing reveals and `/app` unaffected.
- 2026-10-18: **Recipe archive (J1).** Worker `POST /dishes` / `GET /dishes?title=` on KV `DISHES` (binding without id → provisioned on deploy; local KV in dev). Proof of stamp via `eth_getTransactionReceipt` + hand-decoded `Cooked` log (topic0 and decoder pinned against viem in tests). Shared `validateRecipe` extracted from `validateRecipesResponse` (behaviour unchanged, 67 existing tests green). CookButton archives once per confirmed tx (`archive={false}` for private recipes); leaderboard DishDetail falls back to the archive for non-curated dishes. Live (local wrangler dev + real testnet RPC, contract 0x9398…cB85): the one real stamp on chain ("Rice and Potato Frittata", tx 0x362e…be62) → 201 stored in 0.55 s; repeat → 200 stored:false; same tx with another title → 422; fabricated tx → 422; GET by other casing → 200; unknown → 404. (The emoji arrived as "??" only because Git Bash curl mangled it.) Not deployed.
- 2026-10-18: **My Recipes (J2).** `lib/my-recipes.ts` (localStorage `chefbot.my-recipes.v1`, cap 30, titles unique case-insensitively, every entry re-validated on load with the shared `validateRecipe`, 1–180 min) + `components/kitchen/my-recipes.tsx` (write/edit/delete; friendly validation messages) on `/app` with a "Mine" nav link. Cards reuse `RecipeCard` (`total`, `actions`, `archive={false}` → never posted to the archive; stamping puts only title + emoji on-chain). Browser (prod build, 390 + 1440 px): validation message, save → card, persists across reload, no overflow, 0 errors; 5-link nav fits at 768/1024/1280. Gate: 332 tests.
- 2026-10-18: **Painted food gallery (owner refs public/contoh1–3.png, realfood.gov chapters).** 21 SVG cut-outs drawn for ChefBOT (`scripts/build-food-art.mjs`, 43 KB total) and a new landing section "The pantry, painted" after the food pyramid: 4 chapters (Protein & Fats, Vegetables & Fruits, Grains, Pantry) with copy + "ChefBOT knows: N items" + chips beside a big overlapping collage that bleeds off the edge, alternating sides. Motion: items drop in scrubbed by depth, then parallax at different speeds; slow CSS float on desktop; one pop-in on phones. Markup is a server component, motion a tiny client component — an A/B showed the first (all-client) version added ~270 ms TBT during the intro; after the split intro TBT is 1663 ms vs 1661 ms without the section. Gallery scroll (phone, CPU 4×): 59 fps, 0 long tasks. No overflow, 0 errors; landing reveals intact.
- 2026-10-18: **Release prep + Worker deploy (testnet).** Owner has GMT approval to publish. `.codegraph/` ignored; CI now triggers on `main` (it listened on `master`, so it had never run). Gate on `feat/v1.1`: tsc ×2, eslint, 337 Vitest, 17 Hardhat, `next build` — green; no secrets tracked. Review (five axes) approved; mutation spot-checks on the archive first-writer rule, receipt proof, image magic check and recipe cap were all caught by tests. FYI kept: `GET /dishes` is unthrottled (KV read quota), archived text is unmoderated (same exposure as on-chain titles), dev-lan uses `shell:true`. Worker deployed: KV `DISHES` auto-provisioned; live `/recipes` with new ids (tempeh, long beans) 200 with nutrition; `/dishes` GET 404 / fake-tx POST 422; leak scan 0. **Live `/scan` failed intermittently (502)**: added a non-sensitive `reason` to AI errors → `upstream_400` (Gemini rejects some Cloudflare edge locations; successes took 9–10 s). Fix: `placement: { mode: "targeted", hostname: "generativelanguage.googleapis.com" }` → 8/8 scans 200 in 1.6–4.5 s (pantry photo: all 6 vocabulary items), `/recipes` 2.3 s. `wrangler tail` is blocked by the ISP, hence the reason field.
- 2026-10-18: **Phase N: varied ideas + kitchen redesigns (no tabs).**
  - **Repeated ideas.** The owner's console showed `127.0.0.1:8787 ERR_CONNECTION_REFUSED`: no local Worker was running, so every request was served by the deterministic curated fallback. "New ideas" also re-sent the identical request.
    - The request now carries an optional `variation` (integer 0–99). The Worker maps it to a server-side list of 12 cuisine styles and raises the temperature from 0.7 to 0.95. No client text reaches the prompt.
    - The client counts rounds per pick set and remembers shown titles. The fallback skips those titles while unseen candidates remain.
    - Worker deployed as version `f59eeae2`. Live check (egg+rice+garlic, variation 0/1/2): 9 distinct titles, 200 in 2.6–3.4 s, e.g. "Indonesian Nasi Goreng Kampung" and "Garlic Egg Chazuke".
  - **Redesigns**, all on one page:
    - Leaderboard: podium (top 3) plus a ranked ladder with Show more and search.
    - My Kitchen: a passport of rubber stamps, 12 per page, with stats.
    - My Recipes: a recipe box of index cards with time filters and search, one card open at a time.
    - Shopping List: a till receipt, grouped by food group, checked items folded, 12 rows then "Print all".
  - **Bug found and fixed:** a returning MetaMask user reconnected before hydration → React #418. Fixed by `useWalletConnection`; regression test plus a mutation check.
  - **Browser** (prod build, Edge, mocked RPC and injected wallet; 40 dishes, 30 stamps, 20 own recipes, 30 list items):
    - section height in screens at 390 / 1440 px: Most Cooked 1.56 / 1.59, My Kitchen 1.50 / 1.36, My Recipes 1.56 / 1.00, Shopping List 1.66 / 1.52;
    - podium tap opens the detail, passport pages 1 → 2 of 3, an index card opens one full card;
    - no overflow, 0 errors.
  - **Gate:** tsc ×2, eslint, 368 Vitest, 17 Hardhat, `next build`, all green.
