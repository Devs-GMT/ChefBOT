import { describe, expect, it, vi } from "vitest";

import { connectFirstAvailable, orderedConnectors } from "@/lib/wallet-connect";

const META = { id: "metaMask", name: "MetaMask" };
const INJECTED = { id: "injected", name: "Injected" };
const OTHER = { id: "walletConnect", name: "WalletConnect" };

describe("orderedConnectors", () => {
  it("prefers MetaMask, then the generic injected wallet, then the rest", () => {
    expect(orderedConnectors([OTHER, INJECTED, META]).map((c) => c.id)).toEqual(
      ["metaMask", "injected", "walletConnect"],
    );
  });

  it("keeps the original order inside the same rank", () => {
    expect(orderedConnectors([OTHER, INJECTED]).map((c) => c.id)).toEqual([
      "injected",
      "walletConnect",
    ]);
  });

  it("handles an empty list", () => {
    expect(orderedConnectors([])).toEqual([]);
  });
});

describe("connectFirstAvailable", () => {
  it("connects with the preferred connector when it works", async () => {
    const connect = vi.fn().mockResolvedValue(undefined);

    await connectFirstAvailable([INJECTED, META], connect);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith({ connector: META });
  });

  it("falls back to the next connector when no provider is found", async () => {
    const connect = vi.fn()
      .mockRejectedValueOnce(new Error("Provider not found."))
      .mockResolvedValueOnce(undefined);

    await connectFirstAvailable([META, INJECTED], connect);

    expect(connect).toHaveBeenNthCalledWith(1, { connector: META });
    expect(connect).toHaveBeenNthCalledWith(2, { connector: INJECTED });
  });

  it("stops at a user rejection without prompting the next wallet", async () => {
    const connect = vi
      .fn()
      .mockRejectedValue(new Error("User rejected the request."));

    await expect(connectFirstAvailable([META, INJECTED], connect)).rejects.toThrow(
      /rejected/i,
    );
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("throws the last failure when every connector fails", async () => {
    const connect = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(connectFirstAvailable([META, INJECTED], connect)).rejects.toThrow(
      "boom",
    );
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("fails fast when no connectors exist", async () => {
    const connect = vi.fn();

    await expect(connectFirstAvailable([], connect)).rejects.toThrow(
      /no wallet connector/i,
    );
    expect(connect).not.toHaveBeenCalled();
  });
});
