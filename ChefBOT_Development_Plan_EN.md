# ChefBOT — Development Plan (MVP)

**Goal:** Build ChefBOT as an AI-powered recipe app with on-chain cooking records on BOT Chain Mainnet. The core demo flow is: select ingredients → receive three recipes → record a dish you cooked → see the leaderboard update.

**UI direction:** Bold, warm, editorial, and food-focused. Take inspiration from the visual storytelling and oversized typography of [realfood.gov](https://realfood.gov/), while giving ChefBOT its own identity.

**Target build time:** Approximately 5 hours for a demo-ready MVP, assuming the development environment, AI Worker, wallet, and deployment access are already available. Allow extra time for network debugging, contract verification, and domain setup.

---

## 1. Development Principles

1. **Prioritize the end-to-end flow.** Do not build every UI section first. Make sure one user can select ingredients, receive recipes, approve a MetaMask transaction, and see the cooking count change.
2. **Use the AI coding agent in stages.** Ask the agent to inspect the repository, propose a file plan, and then work on one milestone at a time. Do not ask it to generate the entire application in one step.
3. **Treat the smart contract as the source of truth for cooking counts.** The leaderboard and My Kitchen must read on-chain data, not just local state.
4. **Keep secrets and responsibilities separate.** The API key belongs only in the Worker. The frontend is a static site; the Worker handles AI requests. Never put secrets in `NEXT_PUBLIC_*` variables or commit them to the repository.
5. **Provide a real fallback.** The app should still suggest recipes from `recipes.json` when the AI request times out or fails.
6. **Do not claim a dish was physically verified.** A transaction proves that a wallet recorded or claimed to have cooked a recipe. It does not prove that the food was physically cooked.

## 2. MVP Scope and Priorities

### P0 — Required for completion

- Landing page and **Start cooking** button.
- Selection of at least two ingredients, 10/20/30-minute cooking time, and an optional vegetarian setting.
- AI returns exactly three recipes through `POST /recipes`; validate the response structure.
- An 8-second timeout and fallback recipes from `recipes.json`.
- MetaMask connection, network detection, and switch/add BOT Chain Mainnet (Chain ID `677`).
- `cookIt` function with duplicate-stamp prevention per wallet per recipe.
- Pending, successful, rejected, and failed transaction states.
- Leaderboard and My Kitchen read from the contract.
- Mainnet contract deployment, contract address in one configuration constant, explorer footer, and README.
- Responsive layouts for mobile and desktop.

### P1 — Polish after P0 works

- Headline reveal animations on scroll.
- Hover glow on the footer media card.
- Share-to-X button.
- Food photography on selected recipes.
- Consistent empty states, skeleton loading, toasts, and micro-interactions.

### Out of scope for the MVP

Fridge photo recognition, nutrition/calorie calculations, shopping lists, comments, user-submitted recipes, payments, NFTs, and a backend database.

## 3. Recommended Architecture

```text
Browser
  ├── ChefBOT UI (Next.js + TypeScript + Tailwind, static export)
  │     ├── Ingredient picker + recipe cards
  │     ├── Wallet interaction (MetaMask)
  │     ├── Read/write smart contract via viem/wagmi
  │     └── Local fallback: recipes.json
  │
  ├── Cloudflare Worker (POST /recipes)
  │     ├── Keeps AI API key secret
  │     ├── CORS allowlist + rate limit + timeout
  │     └── Validates and returns recipe JSON
  │
  └── BOT Chain Mainnet (EVM, Chain ID 677)
        └── ChefBOT.sol: dishes, cooked status, leaderboard, My Kitchen
```

### Suggested stack

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS. Use static export because the target host is GitHub Pages; do not depend on a Next.js server runtime for the AI endpoint.
- **Wallet/EVM:** `viem` or `wagmi` + `viem`. Choose one integration pattern and use it consistently.
- **AI proxy:** The existing GitAura Cloudflare Worker, extended with `POST /recipes`.
- **Contract:** Solidity `^0.8.20`, authored in Remix as specified in the PRD. Test on the appropriate testnet before mainnet deployment.
- **Hosting:** GitHub Pages for the frontend and custom domain; Worker for the AI proxy.
- **Fallback:** Static `recipes.json` in the frontend.

> **Hosting note:** GitHub Pages serves static files only. Do not create a Next.js server route such as `/api/recipes` and expect it to run on GitHub Pages. The frontend must call a separate Worker URL. For a custom domain, configure DNS and make sure `CORS_ALLOWED_ORIGIN` matches the production domain.

## 4. Initial Folder Structure

Adapt this to the existing repository. Do not move files or replace major configuration until the agent has inspected the project.

```text
chefbot/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── IngredientPicker.tsx
│   ├── RecipeCard.tsx
│   ├── RecipeResults.tsx
│   ├── CookButton.tsx
│   ├── Leaderboard.tsx
│   ├── MyKitchen.tsx
│   ├── WalletButton.tsx
│   ├── TransactionStatus.tsx
│   └── Footer.tsx
├── data/
│   └── recipes.json
├── lib/
│   ├── recipes.ts
│   ├── recipe-key.ts
│   ├── botchain.ts
│   ├── contract.ts
│   └── validation.ts
├── public/
│   └── images/
├── contracts/
│   └── ChefBOT.sol
├── worker/
│   └── src/index.ts
├── tests/
├── .env.example
├── README.md
└── package.json
```

The `worker/` directory can live in the same repository or remain in the existing Worker repository. Never copy secrets from the GitAura Worker into frontend files.

## 5. Smart Contract: Decisions Before Coding

### Data and functions

- `Dish { string title; string emoji; uint32 cooks; }`
- `dishes[bytes32]`, `dishKeys`, `cooked[key][wallet]`, `myDishes[wallet]`.
- `cookIt(title, emoji)` rejects a second stamp from the same wallet for the same recipe key.
- `getDishes()` provides data for the leaderboard.
- `getMyDishes(wallet)` provides the list of recipes recorded by that wallet.
- The `Cooked` event contains the key, cook address, title, and updated cook count.

### Title normalization — must be consistent

Define one normalization rule and test it from the frontend through the contract. At minimum, for the MVP:

1. Trim whitespace from the beginning and end.
2. Convert ASCII letters to lowercase.
3. Calculate the key using `keccak256(bytes(normalizedTitle))` — do not use `keccak256(abi.encode(...))` on one side and a plain text hash on the other.
4. Make sure the contract calculates the key from the same normalized input. The safest option is for the contract to normalize the title too, while the frontend uses an identical normalization function to predict button state. If the contract trusts the frontend to submit lowercase titles, carefully design display-title handling and consistency checks.
5. Create test vectors such as `"Fried Rice"`, `"fried rice"`, and `" fried rice "` to verify that they produce the same key under the chosen policy.

### Product decision

The contract can only record that a wallet submitted a transaction for a recipe. It cannot verify that the user physically cooked the dish. Use UI copy such as **“Stamped!”** or **“Recipe recorded”**; do not call it physical verification.

### Reading data

`getMyDishes(address)` returns only recipe keys, so the frontend can map those keys to data from `getDishes()`. This is sufficient for the MVP. If the recipe list grows significantly, fetching the entire list through `getDishes()` may become expensive; consider event indexing or pagination in a later version, outside the five-hour scope.

## 6. AI API Contract

### `POST /recipes` request

```json
{
  "ingredients": ["egg", "rice", "garlic"],
  "maxMinutes": 20,
  "vegetarian": false
}
```

### Required response shape

```json
{
  "recipes": [
    {
      "title": "Garlic Egg Fried Rice",
      "emoji": "🍳",
      "minutes": 15,
      "uses": ["egg", "rice", "garlic"],
      "missing": ["spring onion"],
      "steps": ["Prepare the ingredients.", "Cook the garlic and egg."]
    }
  ]
}
```

Validate that there are exactly three recipes, `minutes` is numeric, `uses`/`missing`/`steps` are arrays of strings, and `steps` contains no more than eight items. The AI prompt should request realistic home-cooking recipes that use the selected ingredients, respect the time limit, and follow the vegetarian toggle.

### Worker safeguards

- Read the API key only from the Worker’s secret environment variables.
- Use a CORS allowlist for the production domain and local development domain.
- Apply rate limiting per IP or another abuse-control mechanism supported by the Worker environment.
- Limit request size and validate input.
- Limit processing time; the frontend should use an 8-second timeout.
- Do not return provider exception details or secrets to the browser.
- If AI fails, the frontend should use local `recipes.json` and display the **House favourites** label.

## 7. UI Plan Based on realfood.gov

Reference: [realfood.gov](https://realfood.gov/). The site uses oversized campaign headlines, concise narrative copy, clear navigation, food-focused sections, food imagery, and storytelling across the page. Borrow the design principles, not the government site's branding or content.

### ChefBOT design direction

- **Canvas:** `#120A06` (warm near-black); card surface `#1E1410`.
- **Text:** cream `#F5EFE3`; muted `#A89E92`.
- **Data accents:** red `#C8261E` through `#E0362C`; amber `#D9A441` for subtle radial glows.
- **Typography:** heavy grotesk for headlines, readable sans-serif for body text, monospace for metadata labels.
- **Hero:** `Real Food. Real Fast.` in two large lines, a short manifesto, a rounded food photo/video card, and a clear CTA.
- **Navigation:** floating rounded pill labelled “ChefBOT ☰”, sticky on scroll.
- **Ingredient picker:** category tabs and chips with clear selected states; chips must be functional, not decorative.
- **Recipe cards:** clear information hierarchy—title, time, ingredient match, missing ingredients in red, expandable steps, and a cook button.
- **Leaderboard:** red bars sized according to `cooks` count; show counts and recipe titles clearly. Do not use percentages unless a valid denominator exists.
- **Footer:** “Cooked on BOT Chain.” headline, a logo card linking to `botchain.ai`, and an explorer CTA to the mainnet contract address.
- **Responsive behavior:** stack sections in one column on mobile, allow chips to wrap, make CTAs at least 44px tall, and prevent horizontal scrolling in the footer.

Do not use government emblems or labels, do not imply government affiliation, and use food imagery that you own or are licensed to use.

## 8. Implementation Milestones

### Milestone 0 — Repository audit and configuration (10–15 minutes)

- The agent inspects `package.json`, folder structure, deployment configuration, the available Worker, and existing wallet libraries.
- Decide whether to keep the current project or create a new scaffold only if necessary.
- Define one configuration source for the chain ID, official RPC, explorer URL, contract address, and Worker URL.
- **Acceptance criteria:** the file plan and configuration list are clear; no important files are deleted or replaced without a reason.

### Milestone 1 — Smart contract (30–45 minutes)

- Implement `ChefBOT.sol`.
- Add title normalization and duplicate-stamp prevention.
- Test in Remix/testnet: a new recipe, the same recipe from a second wallet, a duplicate stamp from the first wallet, the leaderboard, and My Kitchen.
- **Acceptance criteria:** all core tests pass, and no fake mainnet address has been inserted.

### Milestone 2 — AI Worker and fallback (20–30 minutes)

- Implement `POST /recipes` in the existing Worker.
- Add the prompt, JSON validation, timeout, and CORS.
- Prepare around 25 recipes in `recipes.json`, including ingredient categories, time, vegetarian status, `uses`, `missing`, and `steps`.
- **Acceptance criteria:** valid responses contain exactly three recipes; simulated timeout/error cases return fallback recipes.

### Milestone 3 — Recipe UI and flow (60–90 minutes)

- Build the hero, nav, ingredient picker, time/diet filters, loading skeleton, three recipe cards, expandable cooking steps, and fallback label.
- Connect the Cook something button to the Worker.
- **Acceptance criteria:** users can select ingredients and receive three recipe ideas without connecting a wallet; the CTA is disabled when fewer than two ingredients are selected.

### Milestone 4 — Wallet and on-chain transactions (45–60 minutes)

- Integrate MetaMask.
- Handle missing wallet, connect/disconnect, chain mismatch, switch/add network, and network-request cancellation.
- Connect `cookIt`, wait for a successful receipt, and refresh the leaderboard and My Kitchen from the contract.
- Prevent double-clicks while a transaction is pending.
- **Acceptance criteria:** one successful stamp updates the count, the same wallet cannot record the same recipe again, and failed transactions show understandable messages.

### Milestone 5 — Leaderboard, My Kitchen, footer, and polish (30–45 minutes)

- Build the red-bar leaderboard and recipe details when a bar is clicked.
- Build My Kitchen from keys belonging to the active wallet.
- Add the BOT Chain footer and explorer link using a valid contract address.
- Add empty states, simple animations, and mobile layouts.
- **Acceptance criteria:** all elements work on desktop and mobile; no placeholder links or addresses remain in the production build.

### Milestone 6 — Mainnet, live website, and submission (30–45 minutes)

- Make sure all testnet checks pass before deploying to mainnet.
- Deploy the contract to BOT Chain Mainnet and verify the network/address using the correct explorer.
- Store the address in one configuration constant only.
- Deploy the static site to GitHub Pages, connect the domain, and update the Worker’s CORS allowlist.
- Run smoke tests against the public URL, not just localhost.
- Write the README, record a short demo, and prepare an X post tagging `@BOTChain_ai`.
- **Acceptance criteria:** the UI is live, AI works on the live domain, the wallet can stamp a recipe, the explorer opens the correct contract, and no API key is present in the bundle/build/logs/repository.

> The timeline above is an aggressive target. If time is short, reduce animation and visual polish first—do not compromise contract testing, API-key security, or the core working stamp flow.

## 9. Pre-Demo Test Checklist

### Product and AI

- [ ] No ingredients selected: CTA is disabled and a hint is visible.
- [ ] One ingredient selected: CTA remains disabled.
- [ ] Two or more ingredients selected: CTA becomes enabled.
- [ ] Valid AI response: exactly three recipes, no more than eight steps per recipe.
- [ ] Malformed API response, HTTP 500, or timeout: fallback recipes appear.
- [ ] Vegetarian and cooking-time filters are reflected in recommendations.
- [ ] Missing ingredients are clearly shown in red.

### Wallet and contract

- [ ] MetaMask is not installed.
- [ ] Wallet is not connected.
- [ ] Wrong network: switch/add network can be attempted; cancellation does not crash the app.
- [ ] User rejects a transaction.
- [ ] Transaction pending and successful states.
- [ ] Transaction fails or reverts.
- [ ] Same wallet tries to stamp the same recipe twice.
- [ ] A second wallet stamps the same recipe; `cooks` increments rather than creating a duplicate dish.
- [ ] Leaderboard refreshes from on-chain data after the receipt.
- [ ] My Kitchen updates when the connected wallet changes.

### Deployment and responsiveness

- [ ] Production URL works on mobile and desktop.
- [ ] CORS allows the exact production domain and rejects unlisted origins.
- [ ] The API key is not in frontend source code or Git history.
- [ ] The contract appears in the explorer and the footer link is correct.
- [ ] No placeholder contract address, fatal console errors, or mobile horizontal scrolling.
- [ ] README explains local setup, Worker secrets, chain configuration, contract address, and deployment.

## 10. How to Work with the AI Coding Agent

Use short iterations. For each milestone, ask the agent to list the files it plans to change, implement only that scope, run available checks, and report results and remaining risks. Review the diff before moving to the next milestone.

### Prompt 1 — Repository audit and plan

```text
Act as a senior full-stack engineer. We are building ChefBOT based on the provided PRD. Before writing code, audit the current repository: framework, scripts, folder structure, deployment configuration, and reusable existing code. Do not overwrite files or replace the stack without a clear reason. Provide a staged implementation plan, files to create/change, required dependencies, and technical risks. The frontend must be deployable as a static site on GitHub Pages; the AI API must remain in a separate Cloudflare Worker. Wait for approval before making major changes.
```

### Prompt 2 — Smart contract

```text
Implement ChefBOT.sol in Solidity ^0.8.20 based on the PRD. Include Dish, dishes, dishKeys, cooked, myDishes, cookIt, getDishes, getMyDishes, and the Cooked event. Apply consistent title normalization in the contract so uppercase/lowercase/whitespace variants do not create duplicate keys; explain the normalization rule and use keccak256(bytes(normalizedTitle)). Reject a second stamp from the same wallet for the same dish key. Do not add tokens, payments, admin features, NFTs, or personal data. Provide test cases that can be run in Remix and explain assumptions/risks before deployment.
```

### Prompt 3 — AI Worker and fallback

```text
Add POST /recipes to the existing Cloudflare Worker without moving or exposing the API key. Validate ingredients, maxMinutes, and vegetarian. The result must be JSON { recipes: [...] } with exactly 3 items; each item must have title, emoji, minutes, uses, missing, and steps; steps must contain no more than 8 items. Add a CORS allowlist, rate limiting appropriate for the Worker environment, output validation, and safe error responses. On the frontend, add an 8-second timeout and local fallback from data/recipes.json labelled House favourites. Do not hardcode secrets or treat CORS as authentication. Show changed files and testing instructions.
```

### Prompt 4 — UI based on the reference

```text
Build the ChefBOT UI according to the PRD, using the editorial visual direction of realfood.gov as inspiration without copying its branding, assets, or text. Use background #120A06, surface #1E1410, cream #F5EFE3, muted #A89E92, red #C8261E/#E0362C, and amber glow #D9A441. Build the “Real Food. Real Fast.” headline, short manifesto, food media card, floating pill nav, ingredient tabs/chips, 10/20/30-minute and vegetarian filters, skeleton loading, three recipe cards, expandable cooking steps, red missing ingredients, red-bar leaderboard, My Kitchen, and BOT Chain footer. Prioritize responsiveness, accessibility, text hierarchy, and real interactive states. Do not create decorative buttons that do nothing. Do not integrate the wallet yet if the recipe UI is not ready.
```

### Prompt 5 — Wallet and on-chain integration

```text
Integrate MetaMask with the ChefBOT contract using an ABI and address from one configuration source. Use chain ID 677 and obtain network configuration from an official source; do not guess the RPC or invent a contract address. Users who are not connected must still be able to request recipes, but clicking “I cooked it” should prompt wallet connection. Handle missing MetaMask, connect, wrong network, switch/add network, user rejection, pending transactions, reverts, and successful receipts. After a successful receipt, re-read getDishes and getMyDishes so the UI reflects blockchain state. Disable the button while a transaction is pending and if the wallet has already recorded the recipe. Display an explorer link built from the actual transaction and contract addresses.
```

### Prompt 6 — Pre-release audit

```text
Run a pre-release review of ChefBOT against the PRD and checklist. Do not add new scope. Run the available lint, typecheck, tests, and production build. Check GitHub Pages static export, base path/custom domain, Worker URL, CORS, API-key leaks, recipe-key normalization, duplicate stamps, state refresh after transactions, mobile responsiveness, all empty/error/loading states, and explorer links. Report bugs by P0/P1/P2 priority and fix P0 first. Do not deploy to mainnet or change secrets without explicit confirmation.
```

## 11. Final Definition of Done

The MVP is complete only when the following flow succeeds from the production domain:

1. A user opens ChefBOT without a wallet.
2. They select at least two ingredients and cooking preferences.
3. They receive three valid recipes from AI or the fallback.
4. They click **I cooked it 🍳**, connect MetaMask, and switch to BOT Chain Mainnet if needed.
5. They approve the transaction and see a success confirmation with a transaction link.
6. The leaderboard cook count increases based on contract data.
7. The recipe button changes to **Cooked ✓** for that wallet, and the recipe appears in My Kitchen.
8. The footer opens the BOT Chain website and the correct contract explorer page.
9. The full flow remains readable and usable on mobile.

**Most important order of operations:** get the contract and recipe-key rules right → make the recipe-to-stamp flow work → integrate AI fallback → finish visual polish → then deploy to mainnet and prepare the public demo.
