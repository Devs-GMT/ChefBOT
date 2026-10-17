import { afterEach, describe, expect, it, vi } from "vitest";

import {
  explorerAddressUrl,
  explorerTxUrl,
  explorerUrlFor,
  publicClientFor,
  targetChainId,
} from "@/lib/chain";

const CONTRACT = "0x5191b250E9F18d640B2138a1Da0409be0f1dD092";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("targetChainId", () => {
  it("defaults to mainnet 677 when the variable is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "");
    expect(targetChainId()).toBe(677);
  });

  it("returns 968 for the testnet value", () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "968");
    expect(targetChainId()).toBe(968);
  });

  it("falls back to 677 for unknown values", () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "12345");
    expect(targetChainId()).toBe(677);
  });
});

describe("explorer URLs follow the target chain", () => {
  it("uses the mainnet explorer by default", () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "");
    expect(explorerUrlFor()).toBe("https://scan.botchain.ai");
    expect(explorerAddressUrl(CONTRACT)).toBe(
      `https://scan.botchain.ai/address/${CONTRACT}`,
    );
    expect(explorerTxUrl("0xabc")).toBe("https://scan.botchain.ai/tx/0xabc");
  });

  it("uses the testnet explorer when the target chain is 968", () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "968");
    expect(explorerUrlFor()).toBe("https://scan.bohr.life");
    expect(explorerAddressUrl(CONTRACT)).toBe(
      `https://scan.bohr.life/address/${CONTRACT}`,
    );
    expect(explorerTxUrl("0xabc")).toBe("https://scan.bohr.life/tx/0xabc");
  });

  it("accepts an explicit chain id", () => {
    expect(explorerUrlFor(968)).toBe("https://scan.bohr.life");
    expect(explorerUrlFor(677)).toBe("https://scan.botchain.ai");
  });
});

describe("publicClientFor", () => {
  it("returns the testnet client for 968 and the mainnet client for 677", () => {
    expect(publicClientFor(968).chain.id).toBe(968);
    expect(publicClientFor(677).chain.id).toBe(677);
  });

  it("follows the configured target chain when no id is given", () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "968");
    expect(publicClientFor().chain.id).toBe(968);
  });

  it("reuses one client per chain", () => {
    expect(publicClientFor(968)).toBe(publicClientFor(968));
    expect(publicClientFor(677)).toBe(publicClientFor(677));
  });
});
