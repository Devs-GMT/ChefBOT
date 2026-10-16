import { createConfig, http } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";

import {
  BOT_CHAIN,
  BOT_CHAIN_TESTNET,
  BOT_RPC_URL,
  BOT_TESTNET_RPC_URL,
} from "./chain";

export const SUPPORTED_CHAINS = [BOT_CHAIN, BOT_CHAIN_TESTNET] as const;

export const wagmiConfig = createConfig({
  chains: [BOT_CHAIN, BOT_CHAIN_TESTNET],
  connectors: [metaMask(), injected()],
  transports: {
    [BOT_CHAIN.id]: http(BOT_RPC_URL),
    [BOT_CHAIN_TESTNET.id]: http(BOT_TESTNET_RPC_URL),
  },
});

/**
 * Chain the UI targets for add/switch and cooking transactions.
 * Default: BOT Chain mainnet (677). Set NEXT_PUBLIC_CHEFBOT_CHAIN_ID=968
 * while testing against a testnet deployment.
 */
export function targetChainId(): 677 | 968 {
  const raw = Number(process.env.NEXT_PUBLIC_CHEFBOT_CHAIN_ID ?? "");
  return raw === 968 ? 968 : 677;
}

export function isSupportedChainId(
  chainId: number | undefined,
): chainId is 677 | 968 {
  return chainId === 677 || chainId === 968;
}
