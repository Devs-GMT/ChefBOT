"use client";

import { useEffect, useState } from "react";

/** How long a wallet prompt may stay silent before we explain it. */
export const WALLET_WAIT_HINT_MS = 12_000;

export interface WalletWaitHintProps {
  /** True while a wallet request is in flight. */
  active: boolean;
  /** Abandons the wait in the UI (the wallet request itself cannot be recalled). */
  onCancel: () => void;
  /** "dark" when rendered on the ink nav pill. */
  tone?: "light" | "dark";
}

/**
 * A wallet request can sit unanswered: the MetaMask popup was closed or is
 * behind the window, MetaMask is locked, or the extension stopped responding.
 * After a short wait, say where to look and let the user back out instead of
 * leaving the button on "Connecting…" forever.
 */
export function WalletWaitHint({ active, onCancel, tone = "light" }: WalletWaitHintProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), WALLET_WAIT_HINT_MS);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [active]);

  if (!active || !slow) {
    return null;
  }

  return (
    <div
      role="status"
      className={`max-w-64 rounded-xl px-3 py-2 text-left text-[11px] leading-snug shadow-card ${
        tone === "dark"
          ? "absolute top-full right-0 z-10 mt-3 w-64 bg-paper text-ink"
          : "mt-2 bg-wheat text-ink"
      }`}
    >
      <p>
        <span className="font-medium">Waiting for MetaMask…</span> Click the
        MetaMask icon in your browser toolbar to approve. Nothing there? Unlock
        MetaMask and reload this page.
      </p>
      <button
        type="button"
        onClick={() => {
          setSlow(false);
          onCancel();
        }}
        className="mt-2 min-h-8 rounded-full border border-ink px-3 font-medium transition-colors hover:bg-ink hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}
