export type WalletErrorKind = "no_wallet" | "rejected" | "failed";

export const WALLET_ERROR_TEXT: Record<WalletErrorKind, string> = {
  no_wallet: "MetaMask not detected",
  rejected: "Request rejected",
  failed: "Wallet request failed",
};

/** Classifies provider/connection/write errors into stable UI kinds. */
export function classifyWalletError(error: unknown): WalletErrorKind {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lower = message.toLowerCase();

  const looksMissingProvider =
    (lower.includes("provider") || lower.includes("ethereum") || lower.includes("wallet")) &&
    (lower.includes("not found") ||
      lower.includes("notfound") ||
      lower.includes("not detected") ||
      lower.includes("not available") ||
      lower.includes("unable to find") ||
      lower.includes("no eth"));
  if (looksMissingProvider) {
    return "no_wallet";
  }

  if (
    lower.includes("user rejected") ||
    lower.includes("rejected the request") ||
    lower.includes("request rejected") ||
    lower.includes("user denied")
  ) {
    return "rejected";
  }

  return "failed";
}
