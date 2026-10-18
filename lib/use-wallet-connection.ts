import { useSyncExternalStore } from "react";
import { useConnection } from "wagmi";

const noSubscribe = () => () => {};

const DISCONNECTED = {
  isConnected: false,
  address: undefined,
  chainId: undefined,
  status: "disconnected",
} as unknown as ReturnType<typeof useConnection>;

/**
 * `useConnection`, but "disconnected" until hydration is done. wagmi can
 * reconnect a returning MetaMask user before React hydrates the page; the
 * server HTML always shows the disconnected UI, so reading the live state
 * during hydration would mismatch (React #418).
 */
export function useWalletConnection(): ReturnType<typeof useConnection> {
  const connection = useConnection();
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return hydrated ? connection : DISCONNECTED;
}
