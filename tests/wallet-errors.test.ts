import { describe, expect, it } from "vitest";

import { shortenAddress } from "@/lib/address";
import {
  WALLET_ERROR_TEXT,
  classifyWalletError,
} from "@/lib/wallet-errors";

describe("shortenAddress", () => {
  it("keeps the first 6 and last 4 characters", () => {
    expect(shortenAddress("0x1111111111111111111111111111111111111111")).toBe(
      "0x1111…1111",
    );
  });

  it("passes short values through unchanged", () => {
    expect(shortenAddress("0xabc")).toBe("0xabc");
  });
});

describe("classifyWalletError", () => {
  it("detects missing providers", () => {
    expect(
      classifyWalletError(
        new Error("ProviderNotFoundError: unable to find a provider"),
      ),
    ).toBe("no_wallet");
    expect(classifyWalletError(new Error("No Ethereum provider was found"))).toBe(
      "no_wallet",
    );
  });

  it("detects user rejections", () => {
    expect(classifyWalletError(new Error("User rejected the request."))).toBe(
      "rejected",
    );
    expect(classifyWalletError(new Error("User denied transaction signature"))).toBe(
      "rejected",
    );
  });

  it("falls back to failed", () => {
    expect(classifyWalletError(new Error("boom"))).toBe("failed");
    expect(classifyWalletError(undefined)).toBe("failed");
  });

  it("exposes text for every kind", () => {
    expect(WALLET_ERROR_TEXT.no_wallet).toBeTruthy();
    expect(WALLET_ERROR_TEXT.rejected).toBeTruthy();
    expect(WALLET_ERROR_TEXT.failed).toBeTruthy();
  });
});
