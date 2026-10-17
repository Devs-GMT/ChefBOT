import { classifyWalletError } from "./wallet-errors";

/**
 * Shared wallet-connect helpers for WalletButton and CookButton.
 *
 * Both components list the same connectors, so both need the same rule for
 * picking one: MetaMask first, then the generic injected wallet, then the
 * rest — and a connect loop that survives "provider not found" style failures
 * (e.g. MetaMask missing while another wallet is present) but never opens a
 * second wallet prompt after the user rejected the first one.
 */

/** Ranks connectors by wallet preference; lower rank is tried first. */
function rank(id: string): number {
  const lower = id.toLowerCase();
  if (lower.startsWith("metamask")) return 0;
  if (lower.includes("injected")) return 1;
  if (lower.includes("meta")) return 2;
  return 3;
}

/** Returns a new list ordered by wallet preference (stable within a rank). */
export function orderedConnectors<T extends { id: string }>(
  connectors: readonly T[],
): T[] {
  return [...connectors].sort((a, b) => rank(a.id) - rank(b.id));
}

/**
 * Connects with the first connector that succeeds and returns its result
 * (wagmi resolves `{ accounts, chainId }`). Throws the last error when every
 * connector fails, or immediately when the user rejects the preferred one.
 */
export async function connectFirstAvailable<T extends { id: string }, R>(
  connectors: readonly T[],
  connect: (args: { connector: T }) => Promise<R>,
): Promise<R> {
  const ordered = orderedConnectors(connectors);
  if (ordered.length === 0) {
    throw new Error("No wallet connectors available.");
  }

  let lastError: unknown;
  for (const connector of ordered) {
    try {
      return await connect({ connector });
    } catch (error) {
      lastError = error;
      if (classifyWalletError(error) === "rejected") {
        throw error;
      }
      // Any other failure ("provider not found", connector setup errors, …)
      // falls through to the next connector instead of blocking the user.
    }
  }
  throw lastError;
}

/** Chain id reported by a wagmi connect result, if any. */
export function connectedChainId(result: unknown): number | undefined {
  if (result !== null && typeof result === "object" && "chainId" in result) {
    const { chainId } = result as { chainId: unknown };
    return typeof chainId === "number" ? chainId : undefined;
  }
  return undefined;
}
