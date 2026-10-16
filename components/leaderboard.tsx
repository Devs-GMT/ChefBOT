"use client";

import { SectionTag } from "@/components/section-tag";
import { contractAddress, explorerAddressUrl, type DishEntry } from "@/lib/contract";
import { useDishes } from "@/lib/queries";

type Status = "loading" | "ready" | "empty" | "error" | "no-config";

export function Leaderboard() {
  const address = contractAddress();
  const { data, isPending, isError, refetch } = useDishes();

  const status: Status = !address
    ? "no-config"
    : isError
      ? "error"
      : isPending || !data
        ? "loading"
        : data.length === 0
          ? "empty"
          : "ready";

  const dishes: DishEntry[] = data ?? [];
  const sorted = [...dishes].sort((a, b) => b.cooks - a.cooks);
  const maxCooks = Math.max(1, sorted[0]?.cooks ?? 1);

  return (
    <section
      id="most-cooked"
      aria-labelledby="leaderboard-heading"
      className="mx-auto w-full max-w-5xl scroll-mt-24 px-4 py-16 sm:px-6"
    >
      <SectionTag>On-chain</SectionTag>
      <h2
        id="leaderboard-heading"
        className="mt-6 text-[clamp(2rem,5vw,48px)] leading-[0.96] font-bold tracking-normal text-ink"
      >
        Most Cooked
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-[1.4] tracking-[-0.02em] text-brick">
        Every confirmed stamp lives on BOT Chain. Counts here come from
        on-chain reads — never from local guesses.
      </p>

      <div className="mt-8 rounded-2xl border border-fog bg-paper p-6 shadow-card">
        {status === "loading" && (
          <div aria-busy="true" aria-label="Loading dishes" className="space-y-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-8 animate-pulse rounded bg-wheat" />
            ))}
          </div>
        )}

        {status === "no-config" && (
          <div role="status" className="text-sm text-brick">
            <p className="font-medium text-ink">
              On-chain leaderboard is not live yet.
            </p>
            <p className="mt-2">
              Once the ChefBOT contract is deployed, its address is set via{" "}
              <code className="rounded bg-wheat px-1.5 py-0.5 font-mono text-xs text-ink">
                NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS
              </code>{" "}
              and the real counts appear here.
            </p>
          </div>
        )}

        {status === "empty" && (
          <div role="status" className="text-sm text-brick">
            <p className="font-medium text-ink">No dishes stamped yet.</p>
            <p className="mt-2">
              Cook something and claim the first spot on the board.
            </p>
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="text-sm text-brick">
            <p className="font-medium text-alert">
              Could not reach BOT Chain.
            </p>
            <p className="mt-2">The leaderboard will retry on the next load.</p>
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
          <ol className="space-y-5">
            {sorted.map((dish, index) => (
              <li key={dish.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <p className="font-medium text-ink">
                    <span aria-hidden className="mr-2 font-mono text-brick">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {dish.emoji} {dish.title}
                  </p>
                  <p className="shrink-0 font-mono text-alert">
                    {dish.cooks} cook{dish.cooks === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-fog">
                  <div
                    className="h-full rounded-sm bg-alert"
                    style={{ width: `${Math.round((dish.cooks / maxCooks) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {address && (
        <p className="mt-4 text-xs text-brick">
          Contract:{" "}
          <a
            href={explorerAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-ink underline underline-offset-2"
          >
            {address}
          </a>
        </p>
      )}
    </section>
  );
}
