import { createPublicClient, http, type Chain } from "viem";

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

export const BOT_EXPLORER_URL = "https://scan.botchain.ai";

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

export const BOT_TESTNET_RPC_URL = "https://rpc.bohr.life";
export const BOT_TESTNET_EXPLORER_URL = "https://scan.bohr.life";

export const BOT_RPC_URL = "https://rpc.botchain.ai";

/** Public (read-only) client — works without a wallet. */
export const botPublicClient = createPublicClient({
  chain: BOT_CHAIN,
  transport: http(BOT_RPC_URL),
});
