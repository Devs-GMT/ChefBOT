"use client";

import { useConnection } from "wagmi";

import { ListSearch, ShowMore } from "@/components/ui/list-controls";
import { SectionTag } from "@/components/ui/section-tag";
import { WalletButton } from "@/components/kitchen/wallet-button";
import { shortenAddress } from "@/lib/address";
import { contractAddress, explorerAddressUrl } from "@/lib/contract";
import { useMyKitchen } from "@/lib/queries";
import { usePagedList } from "@/lib/use-paged-list";

type Status = "no-config" | "disconnected" | "loading" | "empty" | "error" | "ready";

/** Tiles per page — a big kitchen stays one screen until asked for more. */
const PAGE = 12;

export function MyKitchen() {
  const connection = useConnection();
  const contract = contractAddress();
  const {
    data,
    isPending,
    isError,
    refetch,
  } = useMyKitchen(connection.address);
  const list = usePagedList(data ?? [], { size: PAGE, text: (entry) => entry.title });

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
          <>
            <p className="mb-5 font-mono text-xs tracking-[0.06em] text-ink uppercase tabular-nums">
              {(data ?? []).length} dish{(data ?? []).length === 1 ? "" : "es"}{" "}
              stamped by {shortenAddress(connection.address ?? "")}
            </p>
            {list.total > PAGE && (
              <div className="mb-5">
                <ListSearch label="Search your kitchen" value={list.query} onChange={list.setQuery} />
              </div>
            )}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.visible.map((entry, index) => (
                <li
                  key={entry.key}
                  className="card-rise flex flex-col justify-between gap-6 rounded-2xl bg-wheat p-4"
                  style={{ animationDelay: `${(index % PAGE) * 60}ms` }}
                >
                  <span aria-hidden="true" className="text-5xl leading-none">
                    {entry.emoji}
                  </span>
                  <div>
                    <p className="text-[15px] leading-tight font-bold tracking-[-0.019em] text-ink">
                      {entry.title}
                    </p>
                    <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-alert">
                      {entry.cooks} cook{entry.cooks === 1 ? "" : "s"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {list.matched === 0 && (
              <p className="text-sm text-brick">No stamped dish matches “{list.query}”.</p>
            )}
            {list.hasMore && <ShowMore left={list.matched - list.visible.length} onClick={list.showMore} />}
          </>
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
