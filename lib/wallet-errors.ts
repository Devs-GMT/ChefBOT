export type WalletErrorKind =
  | "no_wallet"
  | "unreachable"
  | "pending"
  | "rejected"
  | "wrong_chain"
  | "failed";

export const WALLET_ERROR_TEXT: Record<WalletErrorKind, string> = {
  no_wallet: "MetaMask not detected",
  pending:
    "MetaMask already has a request open — click the MetaMask icon in your browser toolbar to finish it",
  unreachable:
    "MetaMask isn't responding — open and unlock it, then reload this page",
  rejected: "Request rejected",
  wrong_chain: "Wrong network — switch chain first",
  failed: "Wallet request failed",
};

/**
 * Every message in an error chain: wagmi/viem wrap wallet failures
 * (`shortMessage`, `details`, nested `cause`), and MetaMask nests its own
 * reason under a generic "Failed to connect" outer error.
 */
/** True when any error in the chain carries the given EIP-1193/JSON-RPC code. */
function hasCode(error: unknown, code: number): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current !== null && typeof current === "object"; depth++) {
    if ((current as { code?: unknown }).code === code) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function messageChain(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current !== undefined && current !== null; depth++) {
    if (typeof current === "string") {
      parts.push(current);
      break;
    }
    if (typeof current !== "object") {
      break;
    }
    const record = current as Record<string, unknown>;
    for (const key of ["message", "shortMessage", "details"]) {
      if (typeof record[key] === "string") {
        parts.push(record[key] as string);
      }
    }
    current = record.cause;
  }
  return parts.join(" | ");
}

/** Classifies provider/connection/write errors into stable UI kinds. */
export function classifyWalletError(error: unknown): WalletErrorKind {
  const lower = messageChain(error).toLowerCase();

  // The user said no — never mask that as a connectivity problem.
  const rejected =
    lower.includes("user rejected") ||
    lower.includes("rejected the request") ||
    lower.includes("request rejected") ||
    lower.includes("user denied");

  // -32002: MetaMask already shows (or hid) an approval for this site and
  // will not open another until that one is answered.
  if (
    !rejected &&
    (hasCode(error, -32002) || lower.includes("already pending"))
  ) {
    return "pending";
  }

  // MetaMask is installed (its page script is present) but cannot reach its
  // extension background: stale tab after an extension update/reload,
  // locked or disabled extension, or site access turned off.
  if (
    !rejected &&
    (lower.includes("metamask extension not found") ||
      lower.includes("failed to connect to metamask"))
  ) {
    return "unreachable";
  }

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

  if (rejected) {
    return "rejected";
  }

  // viem ChainMismatchError / wagmi ConnectorChainMismatchError — the wallet
  // sits on a different chain than the one the transaction targets.
  if (
    lower.includes("chainmismatch") ||
    lower.includes("chain mismatch") ||
    lower.includes("does not match the target chain") ||
    lower.includes("does not match the connection's chain")
  ) {
    return "wrong_chain";
  }

  return "failed";
}
