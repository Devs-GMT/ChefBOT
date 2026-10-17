"use client";

import { useState } from "react";
import { useConnect, useConnection, useDisconnect, useSwitchChain } from "wagmi";

import { WalletWaitHint } from "@/components/kitchen/wallet-wait-hint";
import { shortenAddress } from "@/lib/address";
import { targetChainId } from "@/lib/wagmi";
import {
  connectFirstAvailable,
  connectedChainId,
  orderedConnectors,
} from "@/lib/wallet-connect";
import {
  WALLET_ERROR_TEXT,
  classifyWalletError,
  type WalletErrorKind,
} from "@/lib/wallet-errors";

export interface WalletButtonProps {
  /** "dark" when the button sits on the ink nav pill. */
  tone?: "light" | "dark";
}

export function WalletButton({ tone = "light" }: WalletButtonProps) {
  const dark = tone === "dark";
  const connection = useConnection();
  const {
    mutateAsync: connectAsync,
    connectors,
    isPending: isConnecting,
    reset: resetConnect,
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
    if (orderedConnectors(connectors).length === 0) {
      setError("no_wallet");
      return;
    }
    let connectedOn: number | undefined;
    try {
      connectedOn = connectedChainId(
        await connectFirstAvailable(connectors, connectAsync),
      );
    } catch (connectError) {
      setError(classifyWalletError(connectError));
      return;
    }
    // PRD: connecting lands on BOT Chain — wagmi's switch also asks the
    // wallet to add the network when it is unknown. Declining is fine: the
    // button falls back to "Switch to BOT Chain".
    if (connectedOn !== undefined && connectedOn !== chainId) {
      try {
        await switchChainAsync({ chainId });
      } catch {
        // Stay connected on the other network.
      }
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
      <div className="relative flex flex-col items-end">
        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={isConnecting}
          className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-wait disabled:opacity-70 ${
            dark
              ? "bg-parchment text-ink hover:bg-white"
              : "bg-ink text-white hover:bg-ink/85"
          }`}
        >
          <span aria-hidden="true" className="text-base leading-none">🦊</span>
          {isConnecting ? "Connecting…" : "Connect wallet"}
        </button>
        <WalletWaitHint
          active={isConnecting}
          onCancel={() => resetConnect()}
          tone={tone}
        />
        {error && (
          <p
            role="alert"
            className={`max-w-56 text-right text-[11px] leading-tight text-alert ${
              dark
                ? "absolute top-full right-0 mt-3 rounded-xl bg-paper px-3 py-2 shadow-card"
                : "mt-1"
            }`}
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
      <div className="relative flex flex-col items-end">
        <button
          type="button"
          onClick={() => void handleSwitch()}
          disabled={isSwitching}
          className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-wait ${
            dark
              ? "bg-alert text-white hover:brightness-110"
              : "border-[1.5px] border-alert text-alert hover:bg-alert hover:text-white"
          }`}
        >
          {isSwitching ? "Switching…" : `Switch to ${chainLabel}`}
        </button>
        {error && (
          <p
            role="alert"
            className={`text-[11px] leading-tight text-alert ${
              dark
                ? "absolute top-full right-0 mt-3 w-56 rounded-xl bg-paper px-3 py-2 text-right shadow-card"
                : "mt-1"
            }`}
          >
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
        className={`flex min-h-11 items-center gap-2 rounded-full px-3 font-mono text-xs ${
          dark ? "bg-parchment/10 text-parchment" : "border border-fog bg-paper text-ink"
        }`}
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-[#1fb58f]" />
        {shortenAddress(connection.address ?? "")}
      </span>
      <button
        type="button"
        onClick={() => void disconnectAsync()}
        aria-label="Disconnect wallet"
        className={`flex size-11 items-center justify-center rounded-full transition-colors ${
          dark ? "text-parchment/60 hover:text-parchment" : "text-brick hover:text-ink"
        }`}
      >
        ✕
      </button>
    </div>
  );
}
