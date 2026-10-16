"use client";

import { useState } from "react";
import { useConnect, useConnection, useDisconnect, useSwitchChain } from "wagmi";

import { shortenAddress } from "@/lib/address";
import { targetChainId } from "@/lib/wagmi";
import {
  WALLET_ERROR_TEXT,
  classifyWalletError,
  type WalletErrorKind,
} from "@/lib/wallet-errors";

export function WalletButton() {
  const connection = useConnection();
  const {
    mutateAsync: connectAsync,
    connectors,
    isPending: isConnecting,
  } = useConnect();
  const { mutateAsync: disconnectAsync } = useDisconnect();
  const { mutateAsync: switchChainAsync, isPending: isSwitching } =
    useSwitchChain();
  const [error, setError] = useState<WalletErrorKind | null>(null);

  const chainId = targetChainId();
  const chainLabel = chainId === 968 ? "BOT Testnet" : "BOT Chain";
  const wrongChain = connection.isConnected && connection.chainId !== chainId;

  async function handleConnect() {
    setError(null);
    const preferred =
      connectors.find((c) => c.id.toLowerCase().includes("meta")) ??
      connectors.find((c) => c.id.toLowerCase().includes("injected")) ??
      connectors[0];
    if (!preferred) {
      setError("no_wallet");
      return;
    }
    try {
      await connectAsync({ connector: preferred });
    } catch (connectError) {
      setError(classifyWalletError(connectError));
    }
  }

  async function handleSwitch() {
    setError(null);
    try {
      await switchChainAsync({ chainId });
    } catch (switchError) {
      setError(classifyWalletError(switchError));
    }
  }

  if (!connection.isConnected) {
    return (
      <div className="flex flex-col items-end">
        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={isConnecting}
          className="flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink/85 disabled:cursor-wait disabled:opacity-70"
        >
          {isConnecting ? "Connecting…" : "Connect wallet"}
        </button>
        {error && (
          <p
            role="alert"
            className="mt-1 max-w-56 text-right text-[11px] leading-tight text-alert"
          >
            {WALLET_ERROR_TEXT[error]}
            {error === "no_wallet" && (
              <>
                {" — "}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  install
                </a>
              </>
            )}
          </p>
        )}
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className="flex flex-col items-end">
        <button
          type="button"
          onClick={() => void handleSwitch()}
          disabled={isSwitching}
          className="flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:cursor-wait"
        >
          {isSwitching ? "Switching…" : `Switch to ${chainLabel}`}
        </button>
        {error && (
          <p role="alert" className="mt-1 text-[11px] leading-tight text-alert">
            {WALLET_ERROR_TEXT[error]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span
        title={connection.address}
        className="flex min-h-11 items-center rounded-full border border-fog bg-paper px-3 font-mono text-xs text-ink"
      >
        {shortenAddress(connection.address ?? "")}
      </span>
      <button
        type="button"
        onClick={() => void disconnectAsync()}
        aria-label="Disconnect wallet"
        className="flex size-11 items-center justify-center rounded-full text-brick transition-colors hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
