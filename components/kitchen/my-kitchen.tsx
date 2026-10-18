"use client";

import { useId, useState } from "react";

import { SectionTag } from "@/components/ui/section-tag";
import { PassportStamp, StampDefs } from "@/components/kitchen/passport-stamp";
import { WalletButton } from "@/components/kitchen/wallet-button";
import { shortenAddress } from "@/lib/address";
import { contractAddress, explorerAddressUrl } from "@/lib/contract";
import { pageOf } from "@/lib/paged-list";
import { useMyKitchen, type MyKitchenEntry } from "@/lib/queries";
import { useWalletConnection } from "@/lib/use-wallet-connection";

type Status = "no-config" | "disconnected" | "loading" | "empty" | "error" | "ready";

/** Stamps per passport page: 3×4 on a phone, 4×3 from `sm`. */
const STAMPS_PER_PAGE = 12;

export function MyKitchen() {
  const connection = useWalletConnection();
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
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 lg:py-16"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionTag>Your ledger</SectionTag>
          <h2
            id="kitchen-heading"
            className="mt-5 text-[clamp(2.25rem,6vw,72px)] leading-[0.92] font-bold tracking-[-0.03em] text-ink"
          >
            My Kitchen
          </h2>
        </div>
        <p className="max-w-sm text-base leading-[1.4] tracking-[-0.02em] text-brick">
          Every dish your wallet has stamped on BOT Chain — your personal
          kitchen, written in blocks.
        </p>
      </div>

      <div className="mt-8 rounded-[28px] border border-fog bg-paper p-4 shadow-card sm:p-8">
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
              className="mt-4 min-h-11 rounded-full border-[1.5px] border-ink px-5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-white"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && (
          <Passport entries={data ?? []} owner={shortenAddress(connection.address ?? "")} />
        )}
      </div>

      {contract && (
        <p className="mt-4 text-xs text-brick">
          Contract:{" "}
          <a
            href={explorerAddressUrl(contract)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono break-all text-ink underline underline-offset-2"
          >
            {contract}
          </a>
        </p>
      )}
    </section>
  );
}

/**
 * The wallet's stamps as a passport: a stats strip, then pages of twelve
 * rubber stamps, so a busy kitchen never turns into an endless scroll.
 */
function Passport({ entries, owner }: { entries: MyKitchenEntry[]; owner: string }) {
  const defsId = useId().replace(/:/g, "");
  const [requested, setRequested] = useState(0);
  const { items, page, pageCount } = pageOf(entries, requested, STAMPS_PER_PAGE);
  const totalCooks = entries.reduce((sum, entry) => sum + entry.cooks, 0);

  return (
    <>
      <ul aria-label="Passport stats" className="grid grid-cols-3 divide-x divide-fog rounded-2xl bg-wheat">
        {[
          [entries.length, "Dishes stamped"],
          [totalCooks, "Cooks on your dishes"],
          [pageCount, pageCount === 1 ? "Passport page" : "Passport pages"],
        ].map(([value, label]) => (
          <li key={label} className="px-3 py-3 sm:px-5 sm:py-4">
            <span className="block text-[clamp(1.5rem,4vw,40px)] leading-none font-bold tracking-[-0.03em] text-ink tabular-nums">
              {value}
            </span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.06em] text-brick uppercase sm:text-[11px]">
              {label}
            </span>
          </li>
        ))}
      </ul>

      <div className="relative mt-5 rounded-2xl border-2 border-dashed border-stone bg-parchment px-3 pt-5 pb-10 sm:px-8 sm:pt-7">
        <p className="mb-5 font-mono text-[11px] tracking-[0.08em] text-brick uppercase">
          Passport of {owner}
        </p>
        <StampDefs id={defsId} />
        <ol
          key={page}
          aria-label={`Passport page ${page + 1} of ${pageCount}`}
          className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-6"
        >
          {items.map((entry, index) => (
            <PassportStamp
              key={entry.key}
              entry={entry}
              number={page * STAMPS_PER_PAGE + index + 1}
              defsId={defsId}
              delay={index * 50}
            />
          ))}
        </ol>
        <p aria-hidden="true" className="absolute right-4 bottom-3 font-mono text-[11px] text-brick tabular-nums">
          — {page + 1} —
        </p>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setRequested(page - 1)}
            className="min-h-11 rounded-full border-[1.5px] border-ink px-5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            ‹ Prev
          </button>
          <p className="font-mono text-xs tracking-[0.06em] text-ink uppercase tabular-nums">
            Page {page + 1} / {pageCount}
          </p>
          <button
            type="button"
            aria-label="Next page"
            disabled={page === pageCount - 1}
            onClick={() => setRequested(page + 1)}
            className="min-h-11 rounded-full border-[1.5px] border-ink px-5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            Next ›
          </button>
        </div>
      )}
    </>
  );
}
