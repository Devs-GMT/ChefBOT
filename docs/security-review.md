# ChefBOT — Security Review (M6)

**Scope:** frontend (Next.js), Cloudflare Worker (AI proxy), smart contract,
dependency tree, repository hygiene.
**Method:** threat model → controls → evidence (test names + commands) →
accepted risks with remediation paths. Performed by the coding agent,
2026-10-16. Re-run before any mainnet release.

---

## 1. Threat model

### Trust boundaries

| # | Boundary | Untrusted input | Direction |
|---|---|---|---|
| B1 | Browser → Worker `POST /recipes` | JSON body, `Origin` header, IP header | inbound |
| B2 | Worker → OpenAI API | none (fixed URL/model); key custody critical | outbound |
| B3 | LLM output → response → UI | model JSON (never trusted) | inbound |
| B4 | Browser → BOT Chain RPC / wallet | chain data, user signatures | both |
| B5 | Repo → runtime (env, git history) | leaked secrets | inbound |

### Assets

- `OPENAI_API_KEY` (the only server-side secret)
- Contract integrity (leaderboard/kitchen truth)
- User wallet keys — **never touchable by this codebase** (MetaMask signs)
- Availability of the recipe API (rate limits, size caps)

### Key abuse cases → controls

| Abuse case | Control | Evidence |
|---|---|---|
| Oversized/malformed body → resource burn | `MAX_BODY_BYTES` → 413; invalid JSON → 400 | `worker.test.ts` "rejects oversized/malformed" |
| Mass recipe generation → cost abuse | 20 req/IP/hour, 429 + `Retry-After` | `worker.test.ts` "rate limiting" |
| Cross-origin website calls the Worker | Exact-origin allowlist from env → 403 | `worker.test.ts` "routing and CORS" (4 cases) |
| Key leaked to client | Key only in Worker env; response never contains it | `worker.test.ts` "never leaks the API key" |
| Provider error details leaked (SSRF hints, internal paths) | Generic `{error:{code,message}}`, upstream body stripped | `worker.test.ts` "maps upstream HTTP failures…" |
| Malicious model JSON (injection, huge strings, wrong shape) | `validateRecipesResponse` in Worker **and** re-validated in client; rendered only via React auto-escaping | `schema.test.ts`, `recipes-client.test.ts`, e2e |
| Prompt injection via ingredient strings | Accepted risk — see §4.1 | — |
| Crafted titles on-chain (dup, overflow, huge storage) | `cookIt` guards + checked math; key normalization in-contract | `test/ChefBOT.ts` 16/16 |
| Secrets committed | `.gitignore` covers `.env*` (only `.env.example` re-included); placeholder template only | `.gitignore`, `.env.example` |

## 2. Controls verified (with evidence)

- **Input validation at the boundary (A03):** `validateRecipesRequest` —
  types, 2–12 ingredients, ≤40 chars each, minutes ∈ {10,20,30}, boolean flag.
  Frontend ids come from a fixed vocabulary (`lib/ingredients.ts`).
- **Key hygiene (A02):** grep over `app|components|lib|shared|worker/src` —
  `OPENAI`/`sk-` appear only in Worker env handling; `.env.example` holds
  placeholders; `worker/.wrangler/` (contains `.dev.vars` if used) is
  gitignored. Set production key only via
  `npx wrangler secret put OPENAI_API_KEY`.
- **LLM output handling (LLM05):** model output is parsed defensively,
  schema-validated before leaving the Worker, validated again by the client,
  and always rendered as React text nodes. No `dangerouslySetInnerHTML`,
  `eval`, or `innerHTML` anywhere (grep: 0 matches in `app/`).
- **Error handling:** no stack traces in responses; Worker returns structured
  codes only (`invalid_json`, `rate_limited`, `ai_error`, …).
- **SSRF:** the Worker fetches exactly one fixed URL (`OPENAI_URL`
  constant). No user-influenced fetch target.
- **Security headers:** added in `next.config.ts` for all routes —
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  (camera/mic/geo off).
- **Contract:** no admin, no owner, no funds, no upgrade path — nothing to
  escalate; users sign their own transactions.
- **Frontend secret surface:** only `NEXT_PUBLIC_*` non-secrets (contract
  address, Worker URL, chain id) reach the bundle — verified by design and
  by grep.

## 3. Dependency audit (supply chain)

`npm audit` (root, committed `package-lock.json`):

- **5 high — `braces` (stack-exhaustion DoS), reached only through the
  lint chain** (`eslint-config-next → @next/eslint-plugin-next →
  fast-glob → micromatch → braces`). Dev-time only; **not in the runtime
  bundle**, not reachable by any shipped code path.
- Only offered remediation is `npm audit fix --force`, which downgrades
  `eslint-config-next` to 14.2.35 (breaking, out of declared range) —
  **not applied** per policy. **Deferral: re-check on the next release;
  next review when `eslint-config-next` ships a patched `fast-glob`.**
- `worker/` (own lockfile): **0 vulnerabilities.**
- **Not run:** `npm audit signatures` — run at first public push.

## 4. Accepted risks & known limitations

### 4.1 Prompt injection via ingredient strings (LLM01) — accepted
Arbitrary strings (≤40 chars, ≤12) can carry instruction-like text. The
system prompt is **not** treated as a security boundary: the blast radius
is limited to the shape of the returned recipe JSON, which is fully
schema-validated before use; the API key never enters the model context
(it rides only in the `Authorization` header), and no tools are exposed.
Mitigation if scope grows: constrain `ingredients` to an enum allowlist
in the Worker (mirroring `lib/ingredients.ts`).

### 4.2 In-memory rate limiter on serverless — accepted (hackathon scale)
`checkRateLimit` counts per isolate. On Cloudflare Workers the effective
budget can exceed the configured per-hour value across isolates (and the
skill's warning applies: in-memory ≠ a shared store). Accepted for MVP
scale; remediation path: Cloudflare's own rate-limiting rule, or a
KV/Durable-Object-backed counter, before high-traffic launch.

### 4.3 No Content-Security-Policy — deferred
A strict CSP for a Next.js app with inline bootstrap scripts requires a
nonce/`unsafe-inline` strategy; a wrong CSP breaks the app silently.
Headers added in §2 cover the low-risk set first. **Next review: add
CSP in report-only mode, then enforce.**

### 4.4 `getDishes()` is O(n) — accepted
View function only; no state risk. Event-log fallback documented in
`docs/remix-deployment.md` §8 if the dish list reaches thousands.

## 5. Verdict

No critical or high findings in shipped runtime paths. One dev-only
advisory deferred with reason and review trigger (§3), three accepted
limitations with documented remediation (§4). Production secret remains
user-held (`wrangler secret`); the repository contains no secrets.

**Re-review required before:** mainnet deployment (§ of
`docs/release-checklist.md`) and before adding auth endpoints
(`/auth/*`, future scope).
