import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import {
  BOT_CHAIN,
  BOT_CHAIN_TESTNET,
  BOT_RPC_URL,
  BOT_TESTNET_RPC_URL,
} from "./chain";

export { targetChainId, type SupportedChainId } from "./chain";

export const SUPPORTED_CHAINS = [BOT_CHAIN, BOT_CHAIN_TESTNET] as const;

export const wagmiConfig = createConfig({
  // Hydrate wagmi storage after mount so the first client render matches the
  // server-rendered markup (no React hydration mismatch after reconnecting).
  ssr: true,
  chains: [BOT_CHAIN, BOT_CHAIN_TESTNET],
  // MetaMask is addressed directly through window.ethereum (EIP-1193): the
  // extension ships its own provider, so no optional SDK dependency is needed.
  // The generic injected connector covers every other injected wallet and is
  // used automatically when MetaMask is not installed.
  connectors: [injected({ target: "metaMask" }), injected()],
  transports: {
    [BOT_CHAIN.id]: http(BOT_RPC_URL),
    [BOT_CHAIN_TESTNET.id]: http(BOT_TESTNET_RPC_URL),
  },
});

export function isSupportedChainId(
  chainId: number | undefined,
): chainId is 677 | 968 {
  return chainId === 677 || chainId === 968;
}
