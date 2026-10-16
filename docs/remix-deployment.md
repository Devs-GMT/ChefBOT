# ChefBOT — Remix Deployment Guide

**Deployment is performed by the project owner, not by the coding agent.**
This document covers compiling, deploying, and verifying `contracts/ChefBOT.sol`
through Remix IDE on BOT Chain.

---

## 1. Contract facts

| Item | Value |
|---|---|
| File | `contracts/ChefBOT.sol` |
| Pragma | `^0.8.20` (tested with solc **0.8.34**) |
| Optimizer | enabled, 200 runs (matches `hardhat.config.ts`) |
| Deployed bytecode | **4,779 bytes** (EIP-170 limit is 24,576 — well under) |
| Creation bytecode | 4,807 bytes |
| Constructor | none (no arguments) |
| Admin/owner roles | none — the contract has no admin, funds, or upgrade path |
| Storage on-chain | `Dish {title, emoji, cooks}` + keys + two indexes. No instructions, credentials, or personal data. |

### Recipe-key algorithm (single canonical rule)

1. UTF-8 bytes of the title.
2. Trim leading/trailing ASCII whitespace (space, tab, LF, CR).
3. Lowercase ASCII letters only (A–Z → a–z). Non-ASCII bytes unchanged
   (no Unicode case folding — both Solidity and TypeScript agree).
4. `key = keccak256(bytes(normalizedTitle))`.

Implemented in Solidity (`recipeKey`/`cookIt`) and mirrored in
`lib/recipe-key.ts`. Verified by parity tests in `test/ChefBOT.ts` and
`tests/recipe-key.test.ts` — run both suites before deploying.

---

## 2. Before you open Remix — run the local checks

```bash
npm run lint
npm run typecheck
npm test            # vitest: recipe-key parity vectors
npm run test:contract   # hardhat: 16 contract tests
```

All four must pass. Never deploy from a dirty or unverified state.

## 3. Testnet first (required before mainnet)

| Item | Testnet value | Mainnet value |
|---|---|---|
| Chain ID | **968** | **677** |
| RPC | `https://rpc.bohr.life` | `https://rpc.botchain.ai` |
| Explorer | `https://scan.bohr.life` | `https://scan.botchain.ai` |
| Native token | BOT (faucet: `https://faucet.botchain.ai`) | BOT (mainnet balance required) |

Add the testnet to MetaMask first (chain ID **968**, RPC above) and get test
BOT from the faucet.

### Testnet exercise checklist

- [ ] Deploy succeeds from Remix with Injected Provider on chain 968.
- [ ] `cookIt("Fried Rice", "🍳")` from wallet A → dish appears in `getDishes()`, `cooks = 1`.
- [ ] Wallet A calls `cookIt(" fried rice ", "🍳")` again → reverts `AlreadyCooked`.
- [ ] Wallet B (second account) calls `cookIt("FRIED RICE", "🍳")` → same dish, `cooks = 2`.
- [ ] `getMyDishes(A)` returns exactly A's keys; `getMyDishes(B)` returns B's.
- [ ] `cookIt("", "🍳")` reverts `EmptyTitle`; 65-byte title reverts `TitleTooLong`.
- [ ] `recipeKey("Fried Rice") == recipeKey("fried rice") == recipeKey(" fried rice ")`.
- [ ] Frontend pointed at the testnet address stamps successfully end-to-end.

## 4. Deploying with Remix

1. Open **https://remix.ethereum.org**.
2. In the **File explorers** panel, create `ChefBOT.sol` and paste the contents
   of `contracts/ChefBOT.sol` verbatim (or use the plugin's GitHub/local upload).
3. Open the **Solidity compiler** panel:
   - Compiler version: **0.8.34** (any `0.8.20`–`0.8.x` satisfies the pragma;
     use the same version for reproducibility).
   - Optimization: **enabled**, runs: **200**.
   - EVM version: leave the compiler default. If the node rejects `PUSH0`
     (a Shanghai opcode), switch EVM version to **paris** and recompile —
     `hardhat.config.ts` production profile already targets `paris`.
   - Compile. Zero errors and zero warnings required.
4. Open the **Deploy & run transactions** panel:
   - Environment: **Injected Provider – MetaMask**.
   - Confirm MetaMask is on **BOT Chain testnet (chain ID 968)** for the first
     deployment. The contract has no constructor arguments.
   - Press **Deploy** and confirm the transaction in MetaMask.
5. After the transaction confirms:
   - Copy the deployed contract address from the "Deployed Contracts" section.
   - Copy the ABI from Remix (or reuse `lib/abi/ChefBOT.ts`, regenerated with
     `npm run abi:export`).
6. Run the testnet exercise checklist above against the deployed instance in
   Remix's "Deployed Contracts" section.

## 5. Wiring the address into ChefBOT

Use **one** configuration source — no addresses hard-coded anywhere else:

```bash
# Local development (.env.local)
NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS=0xYourDeployedAddress
```

or on Vercel: Project → Settings → Environment Variables →
`NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS`.

Until the address is set, `lib/config.ts` reports the contract as **not
configured** and the UI explains that stamps require deployment. The
placeholder is an explicit empty value — never a fabricated address.

After updating the address, rebuild (`npm run build`) so the value is baked
into the static bundle (`NEXT_PUBLIC_*` values are read at build time on
Vercel).

## 6. Mainnet deployment checklist

- [ ] All local suites green (`lint`, `typecheck`, `test`, `test:contract`, `build`).
- [ ] Testnet deployment exercised end-to-end (section 3).
- [ ] MetaMask switched to **BOT Chain Mainnet — chain ID 677**
      (RPC `https://rpc.botchain.ai`, explorer `https://scan.botchain.ai`).
- [ ] Wallet funded with mainnet BOT for gas.
- [ ] Deploy via Remix with Injected Provider on chain 677.
- [ ] Post-deploy smoke test on mainnet: one `cookIt` from a throwaway-friendly
      wallet, verify `getDishes()` and the `Cooked` event.
- [ ] Set `NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS` and redeploy the frontend.
- [ ] Footer explorer link opens the real contract on `scan.botchain.ai`.

## 7. Explorer verification

BOT Scan is the official explorer (`scan.botchain.ai`). If its developer
pages expose a **contract-verification** form:

1. In Remix's "Solidity compiler" panel copy the compiler version + source.
2. Submit `contracts/ChefBOT.sol` (standard JSON input is exported by
   `artifacts/build-info/*.output.json` in this repo) with the same compiler
   version and optimizer settings (enabled, 200 runs).
3. After verification, the explorer shows the source and read/write functions.

If the explorer does not offer verification, document that fact in the
README — the contract remains fully functional either way. **Do not claim
verification until it is visible on the explorer page.**

## 8. Gas, network, and size considerations

- **Contract size:** 4,779 bytes deployed — 19% of the EIP-170 limit.
- **`cookIt` gas:** storage writes only on first registration
  (new struct + array push); subsequent stamps are one mapping write, one
  array push, one counter increment, plus the event. Expect tens of thousands
  of gas — cheap on a near-zero-fee chain.
- **`getDishes()` is O(n)** in the number of registered dishes and copies all
  structs to memory. Fine for a hackathon-scale leaderboard (hundreds of
  dishes). If the list grows into the thousands, switch the frontend to event
  logs (`Cooked`) or pagination — out of MVP scope.
- **`uint32` counter overflow:** `cooks += 1` uses Solidity 0.8 checked math —
  at 4,294,967,295 cooks the next increment **reverts** (panic 0x11) instead
  of wrapping to zero. Reaching that count is unrealistic; behavior is
  documented rather than silently wrapping.
- **Network config:** only chain IDs and URLs published in the official BOT
  Chain docs (section 3) are used anywhere in this repository.

## 9. What the agent will never do

- Deploy the contract, sign transactions, or touch your wallet/private keys.
- Claim deployment or verification succeeded without your reported result.
- Insert a contract address that was not actually deployed.
