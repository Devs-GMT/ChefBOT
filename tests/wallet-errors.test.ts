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

  it("detects chain mismatches", () => {
    expect(
      classifyWalletError(
        new Error(
          "ChainMismatchError: The current chain of the wallet (id: 1) does not match the target chain for the transaction (id: 677 – BOT Chain).",
        ),
      ),
    ).toBe("wrong_chain");
    expect(
      classifyWalletError(
        new Error(
          "The current chain of the connector (id: 1) does not match the connection's chain (id: 677).",
        ),
      ),
    ).toBe("wrong_chain");
  });

  it("falls back to failed", () => {
    expect(classifyWalletError(new Error("boom"))).toBe("failed");
    expect(classifyWalletError(undefined)).toBe("failed");
  });

  it("exposes text for every kind", () => {
    expect(WALLET_ERROR_TEXT.no_wallet).toBeTruthy();
    expect(WALLET_ERROR_TEXT.rejected).toBeTruthy();
    expect(WALLET_ERROR_TEXT.wrong_chain).toBeTruthy();
    expect(WALLET_ERROR_TEXT.failed).toBeTruthy();
  });
});

describe("classifyWalletError — unreachable MetaMask", () => {
  it("flags MetaMask's own connection failure as unreachable", () => {
    const error = new Error("Failed to connect to MetaMask", {
      cause: new Error("MetaMask extension not found"),
    });
    expect(classifyWalletError(error)).toBe("unreachable");
  });

  it("reads the cause chain when the outer message is generic", () => {
    const error = new Error("Connection request failed.", {
      cause: new Error("MetaMask extension not found"),
    });
    expect(classifyWalletError(error)).toBe("unreachable");
  });

  it("explains how to recover instead of a generic failure", () => {
    expect(WALLET_ERROR_TEXT.unreachable).toMatch(/MetaMask isn't responding/);
    expect(WALLET_ERROR_TEXT.unreachable).toMatch(/reload/i);
  });

  it("still treats a user rejection inside a cause as rejected", () => {
    const error = new Error("Connection request failed.", {
      cause: new Error("User rejected the request."),
    });
    expect(classifyWalletError(error)).toBe("rejected");
  });
});

describe("classifyWalletError — request already pending", () => {
  it("detects MetaMask's -32002 already-pending error", () => {
    const error = Object.assign(
      new Error("Request of type 'wallet_requestPermissions' already pending for origin http://localhost:3000. Please wait."),
      { code: -32002 },
    );
    expect(classifyWalletError(error)).toBe("pending");
  });

  it("detects the pending code on a wrapped cause", () => {
    const error = new Error("Requested resource not available.", {
      cause: { code: -32002, message: "Resource unavailable" },
    });
    expect(classifyWalletError(error)).toBe("pending");
  });

  it("tells the user where the open request is", () => {
    expect(WALLET_ERROR_TEXT.pending).toMatch(/already has a request open/);
    expect(WALLET_ERROR_TEXT.pending).toMatch(/MetaMask icon/);
  });
});
