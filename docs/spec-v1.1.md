# Spec: ChefBOT v1.1 — post-MVP kitchen helpers

Status: **approved 2026-10-18 — implemented on `feat/v1.1` (not merged)** · Branch: `feat/v1.1` · Merged only after
the MVP (Phase C, Vercel) is live and verified.

## Objective
The three PRD §9 "out of scope (MVP)" items the owner chose:

| Module id | User story | Depends on |
|---|---|---|
| `shopping-list` | As a cook, I add a recipe's missing items to a list and copy or share it when I go shopping. | — |
| `nutrition` | As a cook, I see a rough kcal and protein estimate per serving on AI recipes. | `/recipes` schema |
| `fridge-scan` | As a cook on my phone, I photograph my fridge and ChefBOT pre-selects the ingredients it sees, which I then confirm. | Worker, ingredient vocabulary |

Build order: `shopping-list` → `nutrition` → `fridge-scan`. Each one is its own commit.

## Assumptions (correct me if wrong)
1. No accounts and no database. The shopping list lives only in this browser (localStorage).
2. `missing` items are free text from the AI (or ids from the house favourites). The list
   de-duplicates them case-insensitively after trimming and does not map them to the vocabulary.
3. Nutrition is an **AI estimate** per serving, clearly labelled as not medical advice. No
   calorie maths on the client. House favourites show no nutrition.
4. Fridge scan uses the same Gemini key and per-IP limit as `/recipes`. The photo is shrunk on the
   device, sent once, and never stored or logged by ChefBOT.
5. Scan results only **pre-select** chips in the existing picker; the user still taps "Find recipes".
6. No new npm dependencies. The contract is unchanged; there is no on-chain impact and no mainnet.

## Tech stack / commands
Next.js 16, React 19, Tailwind 4, Vitest, Cloudflare Worker (wrangler 4).
```
npm run typecheck && npx tsc --noEmit -p worker
npm run lint
npx vitest run --maxWorkers=2
npm run build
```

## Structure
- `lib/shopping-list.ts`: store (localStorage `chefbot.shopping.v1`, try/catch, `useSyncExternalStore`)
- `components/kitchen/shopping-list.tsx`: checklist, Copy, Share, Clear
- `shared/recipe-schema.ts`: optional `nutrition`, validated
- `worker/src/routes/recipes.ts`: schema + prompt line
- `worker/src/routes/scan.ts`: `POST /scan`; `worker/src/lib/gemini.ts` gets an optional image part
- `lib/scan.ts`: downscale + client call; picker button in `components/kitchen/ingredient-picker.tsx`
- Tests in `tests/*.test.ts(x)` next to the existing ones

## Contracts
**Recipe (extended):** `nutrition?: { kcal: int 50–2000, proteinG: int 0–150 }`. An invalid
value drops the field, not the recipe.

**`POST /scan`:**
- Request: `{ "image": "<base64>", "mime": "image/jpeg" | "image/png" | "image/webp" }`.
  The body is at most 1.5 MB and the decoded image at most 1 MB.
- `200 { "ingredients": string[] }`: ids from `ALL_INGREDIENT_IDS`, at most 12. May be empty.
- Errors:
  - `400 invalid_request`
  - `413 payload_too_large`
  - `429 rate_limited`
  - `502 ai_error` / `ai_invalid`
  - `503 ai_not_configured`
  - `504 ai_timeout`
- Gemini `responseSchema` uses a STRING `enum` of the vocabulary. The Worker re-filters the
  result with `isKnownIngredient`.

## Testing strategy
TDD per slice, with unit and component tests in Vitest, mocking Gemini and `fetch` as today.
- `shopping-list`:
  - de-duplication, toggle, clear;
  - persistence across reloads;
  - corrupt or blocked storage falls back to an empty list;
  - copy text format.
- `nutrition`:
  - bounds and drop cases;
  - Worker pass-through;
  - card render with and without the field.
- `fridge-scan`:
  - mime, size and base64 rejection;
  - unknown ids filtered;
  - blocked → 502;
  - route is rate-limited;
  - no key in any response;
  - downscale helper;
  - picker pre-select;
  - friendly error states.
- Live check (after merge and deploy): 2–3 real fridge photos; report latency and accuracy honestly.

## Boundaries
- **Always:**
  - validate every Worker input and AI output;
  - keep the key server-side;
  - run the full gate before each commit;
  - show a privacy note before the first scan.
- **Ask first:**
  - new dependencies;
  - merging to `main`;
  - `wrangler deploy` of `/scan`;
  - changing the rate limit.
- **Never:**
  - store photos;
  - send anything but the photo to `/scan`;
  - touch the contract or mainnet;
  - weaken existing tests.

## Success criteria
- [ ] Add-to-list from any recipe card; the list survives a reload; Copy produces plain text; works at 390 px.
- [ ] AI recipes show `≈ N kcal · N g protein (AI estimate)`; old or invalid responses still render.
- [ ] On a phone, Scan → camera → chips pre-selected in under 6 s for a typical photo; errors leave manual picking intact.
- [ ] The gate is green (typecheck ×2, lint, all tests, build); `/recipes` behaviour is unchanged.

## Open questions
1. Should the shopping list get its own nav tab, or be a panel under My Kitchen? (Default: its own tab, "List".)
2. Is the 20 per IP per hour budget shared between `/recipes` and `/scan` OK? (Default: yes, shared.)

## Addendum (2026-10-18) — PRD §9 follow-ups chosen by the owner

| Module id | User story |
|---|---|
| `dish-archive` | As anyone browsing Most Cooked, I tap an AI-made dish and see its real steps, not just the on-chain title. |
| `my-recipes` | As a cook, I write my own recipe, keep it in this browser, and can stamp it like any other dish. |

- Archive writes need proof: the stamp transaction's receipt must contain the contract's `Cooked` event for that title. First writer wins. Own recipes are never archived.
- My recipes stay in localStorage only (no account, no sharing); stamping puts only title + emoji on-chain.
- Not doing: comments, payments (moderation/money); NFT badges wait for the mainnet launch.
