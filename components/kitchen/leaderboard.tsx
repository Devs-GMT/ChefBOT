"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Ladder, Podium, type RankedDish } from "@/components/kitchen/leaderboard-chart";
import { SectionTag } from "@/components/ui/section-tag";
import { contractAddress, explorerAddressUrl, type DishEntry } from "@/lib/contract";
import { fetchArchivedDish } from "@/lib/dish-archive";
import { findCuratedRecipe } from "@/lib/fallback";
import { useDishes } from "@/lib/queries";

type Status = "loading" | "ready" | "empty" | "error" | "no-config";

/**
 * "Most cooked" (PRD §2/§6): the top three stand on a red podium with their
 * on-chain cook counts set huge; everyone else climbs a ranked ladder with
 * bars scaled to the leader. Tapping any dish opens it.
 */
export function Leaderboard() {
  const address = contractAddress();
  const { data, isPending, isError, refetch } = useDishes();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const status: Status = !address
    ? "no-config"
    : isError
      ? "error"
      : isPending || !data
        ? "loading"
        : data.length === 0
          ? "empty"
          : "ready";

  const ranked: RankedDish[] = [...(data ?? [])]
    .sort((a, b) => b.cooks - a.cooks)
    .map((dish, index) => ({ ...dish, rank: index + 1 }));
  const maxCooks = Math.max(1, ranked[0]?.cooks ?? 1);
  const totalCooks = ranked.reduce((sum, dish) => sum + dish.cooks, 0);
  const open = ranked.find((dish) => dish.key === openKey);
  const toggle = (key: string) => setOpenKey((current) => (current === key ? null : key));

  return (
    <section
      id="most-cooked"
      aria-labelledby="leaderboard-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 lg:py-16"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionTag>Step 03 · On-chain</SectionTag>
          <h2
            id="leaderboard-heading"
            className="mt-5 text-[clamp(2.25rem,6vw,72px)] leading-[0.92] font-bold tracking-[-0.03em] text-ink"
          >
            Most Cooked
          </h2>
        </div>
        <p className="max-w-sm text-base leading-[1.4] tracking-[-0.02em] text-brick">
          Every bar is a count of real stamps on BOT Chain —{" "}
          <span className="font-medium text-alert">
            read from the contract, never guessed.
          </span>
        </p>
      </div>

      <div className="mt-8 rounded-[28px] border border-fog bg-paper p-4 shadow-card sm:p-8">
        {status === "loading" && (
          <div
            aria-busy="true"
            aria-label="Loading dishes"
            className="flex h-72 items-end gap-3"
          >
            {[70, 48, 34, 22].map((height) => (
              <div
                key={height}
                className="flex-1 animate-pulse rounded-t-xl bg-wheat"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        )}

        {status === "no-config" && (
          <div role="status" className="py-6 text-sm text-brick">
            <p className="text-[19px] font-medium text-ink">
              On-chain leaderboard is not live yet.
            </p>
            <p className="mt-2 max-w-xl">
              Once the ChefBOT contract is deployed, its address is set via{" "}
              <code className="rounded bg-wheat px-1.5 py-0.5 font-mono text-xs text-ink">
                NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS
              </code>{" "}
              and the real counts appear here.
            </p>
          </div>
        )}

        {status === "empty" && (
          <div role="status" className="flex flex-col items-center py-10 text-center">
            <div aria-hidden="true" className="flex h-28 items-end gap-2">
              {[40, 70, 100].map((height) => (
                <div
                  key={height}
                  className="w-10 rounded-t-lg border-2 border-dashed border-alert/40"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <p className="mt-6 text-[clamp(1.5rem,3vw,33px)] leading-[1.04] font-bold tracking-[-0.025em] text-ink">
              No dishes stamped yet.
            </p>
            <p className="mt-2 text-base text-brick">
              Be the first to cook something —{" "}
              <a href="#cook" className="font-medium text-alert underline underline-offset-2">
                pick your ingredients
              </a>
              .
            </p>
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="py-6 text-sm text-brick">
            <p className="text-[19px] font-medium text-alert">
              Could not reach BOT Chain.
            </p>
            <p className="mt-2">The leaderboard will retry on the next load.</p>
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
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-fog pb-4">
              <p className="font-mono text-xs tracking-[0.06em] text-ink uppercase">
                {ranked.length} dish{ranked.length === 1 ? "" : "es"} on-chain
              </p>
              <p className="font-mono text-xs tracking-[0.06em] text-alert uppercase tabular-nums">
                {totalCooks} total stamps
              </p>
            </div>

            <Podium dishes={ranked.slice(0, 3)} openKey={openKey} onToggle={toggle} />
            <div aria-hidden="true" className="h-2 rounded-b-md bg-ink" />
            {open && open.rank <= 3 && <DishDetail dish={open} rank={open.rank} />}

            {ranked.length > 3 && (
              <Ladder
                dishes={ranked.slice(3)}
                maxCooks={maxCooks}
                openKey={openKey}
                onToggle={toggle}
              />
            )}
            {open && open.rank > 3 && <DishDetail dish={open} rank={open.rank} />}
          </>
        )}
      </div>

      {address && (
        <p className="mt-4 text-xs text-brick">
          Contract:{" "}
          <a
            href={explorerAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono break-all text-ink underline underline-offset-2"
          >
            {address}
          </a>
        </p>
      )}
    </section>
  );
}

function DishDetail({ dish, rank }: { dish: DishEntry; rank: number }) {
  const curated = findCuratedRecipe(dish.title);
  // AI-made dishes: steps come from the stamp-proven archive, if any.
  const archived = useQuery({
    queryKey: ["chefbot", "archive", dish.title],
    queryFn: () => fetchArchivedDish(dish.title),
    enabled: !curated,
    staleTime: 5 * 60_000,
  });
  const known = curated ?? archived.data ?? null;
  return (
    <section
      id="dish-detail"
      aria-label={dish.title}
      className="card-rise mt-6 grid gap-6 rounded-2xl bg-wheat p-5 sm:grid-cols-[auto_1fr] sm:p-6"
    >
      <div className="flex items-center gap-4 sm:flex-col sm:items-start">
        <span aria-hidden="true" className="text-6xl leading-none">
          {dish.emoji}
        </span>
        <p className="font-mono text-xs tracking-[0.06em] text-alert uppercase">
          #{rank} most cooked
        </p>
      </div>
      <div>
        <h3 className="text-[clamp(1.5rem,3vw,33px)] leading-[1.04] font-bold tracking-[-0.025em] text-ink">
          {dish.title}
        </h3>
        <p className="mt-1 text-sm text-brick">
          Stamped {dish.cooks} time{dish.cooks === 1 ? "" : "s"} on BOT Chain
          {known ? ` · ${known.minutes} min` : ""}
        </p>
        {known ? (
          <ol aria-label="Steps" className="mt-4 space-y-2">
            {known.steps.map((step, index) => (
              <li key={index} className="flex gap-3 text-[15px] leading-[1.45] text-ink">
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[11px] text-white"
                >
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        ) : archived.isPending && !curated ? (
          <p className="mt-4 text-sm text-brick">Looking up the recipe…</p>
        ) : (
          <p className="mt-4 max-w-lg text-[15px] leading-[1.45] text-ink">
            Only the title and emoji live on-chain — the steps stay in the app
            where the recipe was cooked.{" "}
            <a href="#cook" className="font-medium underline underline-offset-2">
              Ask ChefBOT for your own version →
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
