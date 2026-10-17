import { createPublicClient, http, type Chain } from "viem";

import {
  BOT_RPC_URL,
  BOT_TESTNET_RPC_URL,
  targetChainId,
  type SupportedChainId,
} from "./chain-config";

// Pure config lives in chain-config.ts (wallet-free); re-exported here so
// existing imports keep working.
export {
  BOT_EXPLORER_URL,
  BOT_RPC_URL,
  BOT_TESTNET_EXPLORER_URL,
  BOT_TESTNET_RPC_URL,
  explorerAddressUrl,
  explorerTxUrl,
  explorerUrlFor,
  targetChainId,
  type SupportedChainId,
} from "./chain-config";

/** BOT Chain mainnet — verified from dev-docs.botchain.ai (chain ID 677). */
export const BOT_CHAIN: Chain = {
  id: 677,
  name: "BOT Chain",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.botchain.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "BOT Scan",
      url: "https://scan.botchain.ai",
    },
  },
  testnet: false,
};


/** BOT Chain testnet — verified from dev-docs.botchain.ai (chain ID 968). */
export const BOT_CHAIN_TESTNET: Chain = {
  id: 968,
  name: "BOT Chain Testnet",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.bohr.life"],
    },
  },
  blockExplorers: {
    default: {
      name: "BOT Scan Testnet",
      url: "https://scan.bohr.life",
    },
  },
  testnet: true,
};



/** Chain definition for a supported id (defaults to the target chain). */
export function chainFor(chainId: SupportedChainId = targetChainId()): Chain {
  return chainId === 968 ? BOT_CHAIN_TESTNET : BOT_CHAIN;
}

// One client per chain, created once — reads work without a wallet and always
// hit the RPC of the chain the deployment targets.
const mainnetClient = createPublicClient({
  chain: BOT_CHAIN,
  transport: http(BOT_RPC_URL),
});
const testnetClient = createPublicClient({
  chain: BOT_CHAIN_TESTNET,
  transport: http(BOT_TESTNET_RPC_URL),
});

/** Public (read-only) client for the target chain — works without a wallet. */
export function publicClientFor(chainId: SupportedChainId = targetChainId()) {
  return chainId === 968 ? testnetClient : mainnetClient;
}
