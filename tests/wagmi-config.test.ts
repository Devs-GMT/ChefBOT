import { describe, expect, it } from "vitest";

import { SUPPORTED_CHAINS, wagmiConfig } from "@/lib/wagmi";

describe("wagmiConfig", () => {
  it("registers both BOT chains with their verified RPC endpoints", () => {
    expect(wagmiConfig.chains.map((chain) => chain.id)).toEqual([677, 968]);
    expect(SUPPORTED_CHAINS.map((chain) => chain.id)).toEqual([677, 968]);
    expect(wagmiConfig.chains[0].rpcUrls.default.http[0]).toBe(
      "https://rpc.botchain.ai",
    );
    expect(wagmiConfig.chains[1].rpcUrls.default.http[0]).toBe(
      "https://rpc.bohr.life",
    );
    expect(wagmiConfig.chains[0].blockExplorers?.default.url).toBe(
      "https://scan.botchain.ai",
    );
    expect(wagmiConfig.chains[1].blockExplorers?.default.url).toBe(
      "https://scan.bohr.life",
    );
  });

  it("only registers connectors that work without optional peer dependencies", () => {
    expect(
      wagmiConfig.connectors.map((connector) => ({
        id: connector.id,
        type: connector.type,
      })),
    ).toEqual([
      { id: "metaMask", type: "injected" },
      { id: "injected", type: "injected" },
    ]);
  });

  it("keeps the MetaMask connector first so it is the preferred wallet", () => {
    expect(wagmiConfig.connectors[0]?.id).toBe("metaMask");
  });

  it("hydrates storage after mount instead of during the first render (ssr)", () => {
    const internal = (
      wagmiConfig as unknown as { _internal: { ssr: boolean } }
    )._internal;
    expect(internal.ssr).toBe(true);
  });
});
