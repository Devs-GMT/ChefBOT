# ChefBOT — Mainnet Release Checklist

Run top to bottom. **Every "verify" step needs visible evidence — never
tick from memory.** Agent never deploys or signs; the owner executes
wallet/Cloudflare/Vercel steps and reports results.

## 0. Preflight (repo)

- [ ] `npm run lint` · `npm run typecheck` · `npm test` (104) ·
      `npm run test:contract` (16) · `npm run build` ·
      `cd worker && npm run typecheck` — all green on a clean tree
- [ ] `npm audit` reviewed (current state: 5 high = dev-only `braces` via
      eslint-config-next, deferred in `docs/security-review.md` §3 — confirm
      no new findings) · `worker/: npm audit` → 0
- [ ] No secrets in git: `git grep -iE "sk-[a-z0-9]|api[_-]?key.*=.*['\"][^'\"]{8,}"`
      returns nothing real; only `.env.example` committed
- [ ] Security review current (`docs/security-review.md`)

## 1. Testnet (968) — deployment done; exercise still required

Status 2026-10-16: contract **verified live** at
`0x5191b250E9F18d640B2138a1Da0409be0f1dD092`
(`recipeKey("Fried Rice")` == repo anchor `0x52d7d42a…` on
`https://rpc.bohr.life`). `getDishes()` returned an **empty** list —
the exercise checklist below has **not** been run yet.

- [ ] Wallet A: `cookIt("Fried Rice", "🍳")` → `getDishes()` shows
      `cooks = 1`
- [ ] Wallet A again with `" fried rice "` → reverts `AlreadyCooked`
- [ ] Wallet B with `"FRIED RICE"` → same dish, `cooks = 2`
- [ ] `getMyDishes(A)` / `getMyDishes(B)` each return only their own keys
- [ ] `cookIt("", …)` → `EmptyTitle`; >64-byte title → `TitleTooLong`
- [ ] Frontend end-to-end: `.env.local` with testnet address +
      `NEXT_PUBLIC_CHEFBOT_CHAIN_ID=968` → `/app` → generate recipes →
      stamp → **Stamped! ✓** → leaderboard & My Kitchen update after receipt
- [ ] Explorer page for the address opens correctly on
      https://scan.bohr.life

## 2. Worker live (Cloudflare)

- [ ] `wrangler secret put GEMINI_API_KEY` set (verify with a live
      `/recipes` call, not by reading secrets back)
- [ ] `CORS_ALLOWED_ORIGINS` includes **both** localhost and the final
      Vercel production URL (exact origins, no `*`)
- [ ] `RATE_LIMIT_PER_HOUR` decided (default 20); the `RATE_LIMITER`
      Durable Object migration (`v1`, `new_sqlite_classes`) applied on deploy
- [ ] Live latency of `POST /recipes` well under the 7 s Worker budget
      (else change `GEMINI_MODEL`); 21st call in an hour → 429 + Retry-After
- [ ] Reserved GitAura/PocketLM routes answer 501
- [ ] Smoke: `/health` → `{"ok":true}`; a valid `POST /recipes` returns
      3 recipes; an unknown origin returns 403
- [ ] No key in any response: response body never contains the key or
      `googleapis.com`

## 3. Mainnet (677) — deploy only after 1–2 pass

- [ ] All suites green (§0) and testnet fully exercised (§1)
- [ ] MetaMask on **chain 677** (`https://rpc.botchain.ai`), wallet funded
      with mainnet BOT for gas
- [ ] Remix deploy on 677 (compiler 0.8.34, optimizer 200 runs,
      Injected Provider) — see `docs/remix-deployment.md` §4
- [ ] Verify the NEW address on-chain (copy-paste, never from memory):
      `eth_call recipeKey("Fried Rice")` on `https://rpc.botchain.ai`
      must equal the repo anchor `0x52d7d42a467f5ae80877e24ce4b7bdfdcbc7a3ccc2144b23b666d3efbf545395`
- [ ] Post-deploy smoke on mainnet: one `cookIt` from the release wallet,
      visible in `getDishes()` and the `Cooked` event on
      https://scan.botchain.ai
- [ ] Vercel env updated: `NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS=<mainnet>`,
      `NEXT_PUBLIC_CHEFBOT_CHAIN_ID=677` (or unset = default 677),
      `NEXT_PUBLIC_RECIPES_API_URL=<worker url>` — then **redeploy**
      (NEXT_PUBLIC is build-time)
- [ ] Worker `CORS_ALLOWED_ORIGINS` contains the production Vercel URL
- [ ] Fresh browser: connect wallet on 677 (auto-switch prompt works),
      full flow → Stamped ✓ → leaderboard/kitchen update
- [ ] Footer explorer link opens the real contract on scan.botchain.ai
- [ ] Explorer verification attempted if the form exists (if not — record
      that fact in README; do not claim verified)

## 4. Post-release

- [ ] First git commit(s) — run the secret grep of §0 one more time
      before pushing; CI (`.github/workflows/ci.yml`) green on GitHub
- [ ] If any secret ever lands in git history: **rotate first** (new
      Gemini key in AI Studio, new wrangler secret), then purge history
- [ ] Monitor Worker errors/rate-limit 429s and frontend error rate for
      the first day

**Rollback:** frontend — Vercel instant rollback to the previous
deployment; Worker — `npx wrangler rollback`; contract — immutable, so
testnet exercise (§1) is the last gate before mainnet.
