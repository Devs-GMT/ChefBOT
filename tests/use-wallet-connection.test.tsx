import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { useWalletConnection } from "@/lib/use-wallet-connection";

vi.mock("wagmi", () => ({ useConnection: vi.fn() }));
const { useConnection } = await import("wagmi");

function Status() {
  const connection = useWalletConnection();
  return connection.isConnected ? <span>{connection.address}</span> : <button type="button">Connect</button>;
}

describe("useWalletConnection", () => {
  it("hydrates as disconnected even if wagmi reconnected first, then shows the wallet", async () => {
    vi.mocked(useConnection).mockReturnValue({ isConnected: false } as never);
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Status />);

    // A returning MetaMask user: wagmi already reconnected before hydration.
    vi.mocked(useConnection).mockReturnValue({ isConnected: true, address: "0xabc" } as never);
    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, <Status />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe("0xabc");
  });
});
