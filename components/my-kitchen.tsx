"use client";

import { useConnection } from "wagmi";

import { SectionTag } from "@/components/section-tag";
import { WalletButton } from "@/components/wallet-button";
import { contractAddress, explorerAddressUrl } from "@/lib/contract";
import { useMyKitchen } from "@/lib/queries";

type Status = "no-config" | "disconnected" | "loading" | "empty" | "error" | "ready";

export function MyKitchen() {
  const connection = useConnection();
  const contract = contractAddress();
  const {
    data,
    isPending,
    isError,
    refetch,
  } = useMyKitchen(connection.address);

  const status: Status = !contract
    ? "no-config"
    : !connection.isConnected || !connection.address
      ? "disconnected"
      : isError
        ? "error"
        : isPending || !data
          ? "loading"
          : data.length === 0
            ? "empty"
            : "ready";

  return (
    <section
      id="my-kitchen"
      aria-labelledby="kitchen-heading"
      className="mx-auto w-full max-w-5xl scroll-mt-24 px-4 py-16 sm:px-6"
    >
      <SectionTag>Your ledger</SectionTag>
      <h2
        id="kitchen-heading"
        className="mt-6 text-[clamp(2rem,5vw,48px)] leading-[0.96] font-bold tracking-normal text-ink"
      >
        My Kitchen
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-[1.4] tracking-[-0.02em] text-brick">
        Connect your wallet to see every dish you have stamped on BOT Chain —
        your personal kitchen, written in blocks.
      </p>

      <div className="mt-8 rounded-2xl border border-fog bg-paper p-6 shadow-card">
        {status === "no-config" && (
          <div role="status" className="text-sm text-brick">
            <p className="font-medium text-ink">
              Your kitchen opens after deployment.
            </p>
            <p className="mt-2">
              Set{" "}
              <code className="rounded bg-wheat px-1.5 py-0.5 font-mono text-xs text-ink">
                NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS
              </code>{" "}
              once the ChefBOT contract is live, and every stamp you make shows
              up here.
            </p>
          </div>
        )}

        {status === "disconnected" && (
          <div role="status" className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-brick">
              <span className="font-medium text-ink">
                No wallet connected yet.
              </span>{" "}
              Your stamped dishes will appear here once you connect.
            </p>
            <WalletButton />
          </div>
        )}

        {status === "loading" && (
          <div aria-busy="true" aria-label="Loading your kitchen" className="space-y-4">
            {[0, 1].map((row) => (
              <div key={row} className="h-8 animate-pulse rounded bg-wheat" />
            ))}
          </div>
        )}

        {status === "empty" && (
          <div role="status" className="text-sm text-brick">
            <p className="font-medium text-ink">Nothing stamped yet.</p>
            <p className="mt-2">
              Pick a recipe above and hit “I cooked it” — your first stamp lands
              here.
            </p>
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="text-sm text-brick">
            <p className="font-medium text-alert">
              Could not load your kitchen from BOT Chain.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 min-h-11 rounded-full border-[1.5px] border-ink px-5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {(data ?? []).map((entry) => (
              <li
                key={entry.key}
                className="flex items-center justify-between gap-3 rounded border border-fog bg-parchment px-4 py-3"
              >
                <p className="text-sm font-medium text-ink">
                  {entry.emoji} {entry.title}
                </p>
                <p className="shrink-0 font-mono text-xs text-alert">
                  {entry.cooks} cook{entry.cooks === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {contract && (
        <p className="mt-4 text-xs text-brick">
          Contract:{" "}
          <a
            href={explorerAddressUrl(contract)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-ink underline underline-offset-2"
          >
            {contract}
          </a>
        </p>
      )}
    </section>
  );
}
