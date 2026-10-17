/**
 * Pure BOT Chain configuration — no viem, no wallet code. Safe to import from
 * the landing page and the shared footer without pulling the wallet stack
 * into their bundles. `lib/chain.ts` and `lib/contract.ts` re-export these.
 */

export const BOT_RPC_URL = "https://rpc.botchain.ai";
export const BOT_EXPLORER_URL = "https://scan.botchain.ai";
export const BOT_TESTNET_RPC_URL = "https://rpc.bohr.life";
export const BOT_TESTNET_EXPLORER_URL = "https://scan.bohr.life";

export type SupportedChainId = 677 | 968;

/**
 * Chain the UI targets for add/switch, cooking transactions AND every
 * read-only lookup (leaderboard, My Kitchen, cooked flag).
 * Default: BOT Chain mainnet (677). Set NEXT_PUBLIC_CHEFBOT_CHAIN_ID=968
 * while testing against a testnet deployment.
 */
export function targetChainId(): SupportedChainId {
  const raw = Number(process.env.NEXT_PUBLIC_CHEFBOT_CHAIN_ID ?? "");
  return raw === 968 ? 968 : 677;
}

/** Explorer base URL for the target chain (or an explicit chain id). */
export function explorerUrlFor(
  chainId: SupportedChainId = targetChainId(),
): string {
  return chainId === 968 ? BOT_TESTNET_EXPLORER_URL : BOT_EXPLORER_URL;
}

/** Explorer page for a contract address on the target chain. */
export function explorerAddressUrl(
  address: string,
  chainId: SupportedChainId = targetChainId(),
): string {
  return `${explorerUrlFor(chainId)}/address/${address}`;
}

/** Explorer page for a transaction hash on the target chain. */
export function explorerTxUrl(
  hash: string,
  chainId: SupportedChainId = targetChainId(),
): string {
  return `${explorerUrlFor(chainId)}/tx/${hash}`;
}

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/** Deployed ChefBOT address, or null while it is still a placeholder. */
export function contractAddress(): `0x${string}` | null {
  const raw = process.env.NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS ?? "";
  if (!ADDRESS_PATTERN.test(raw)) {
    return null;
  }
  return raw as `0x${string}`;
}
