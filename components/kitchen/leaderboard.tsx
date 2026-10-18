"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ListSearch, ShowMore } from "@/components/ui/list-controls";
import { SectionTag } from "@/components/ui/section-tag";
import { contractAddress, explorerAddressUrl, type DishEntry } from "@/lib/contract";
import { fetchArchivedDish } from "@/lib/dish-archive";
import { findCuratedRecipe } from "@/lib/fallback";
import { useDishes } from "@/lib/queries";
import { usePagedList } from "@/lib/use-paged-list";

type Status = "loading" | "ready" | "empty" | "error" | "no-config";

/** Bars shown at once — the chart stays legible on a phone. */
const TOP = 8;
/** Rows per page in the full ranking under the bars. */
const ALL_PAGE = 10;

function cooksLabel(cooks: number) {
  return `${cooks} cook${cooks === 1 ? "" : "s"}`;
}

/**
 * "Most cooked" (PRD §2/§6): realfood.gov-style data moment — tall red bars
 * whose height is the on-chain cook count, the count set huge inside each
 * bar, the dish under it. Tapping a bar opens the dish.
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

  const dishes: DishEntry[] = data ?? [];
  const ranked = [...dishes].sort((a, b) => b.cooks - a.cooks);
  const sorted = ranked.slice(0, TOP);
  const maxCooks = Math.max(1, sorted[0]?.cooks ?? 1);
  const totalCooks = dishes.reduce((sum, dish) => sum + dish.cooks, 0);
  const openIndex = ranked.findIndex((dish) => dish.key === openKey);
  const open = openIndex >= 0 ? ranked[openIndex] : undefined;

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
                Top {sorted.length} · {dishes.length} dish
                {dishes.length === 1 ? "" : "es"} on-chain
              </p>
              <p className="font-mono text-xs tracking-[0.06em] text-alert uppercase tabular-nums">
                {totalCooks} total stamps
              </p>
            </div>

            <ol className="-mx-4 flex items-end gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:gap-4 sm:px-0">
              {sorted.map((dish, index) => {
                const isOpen = dish.key === openKey;
                const height = Math.max(14, Math.round((dish.cooks / maxCooks) * 100));
                return (
                  <li
                    key={dish.key}
                    className="flex min-w-[96px] max-w-[180px] flex-1 flex-col sm:min-w-[110px]"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls="dish-detail"
                      aria-label={`${dish.title}, ${cooksLabel(dish.cooks)}`}
                      onClick={() => setOpenKey(isOpen ? null : dish.key)}
                      className="group flex h-56 flex-col justify-end sm:h-72"
                    >
                      <span
                        className={`bar-grow relative flex w-full flex-col justify-between overflow-hidden rounded-t-xl p-3 text-left text-white transition-[background-color,filter] ${
                          isOpen ? "bg-ink" : "bg-alert group-hover:brightness-110"
                        }`}
                        style={{
                          height: `${height}%`,
                          animationDelay: `${index * 80}ms`,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="text-[clamp(2rem,5vw,64px)] leading-[0.84] font-bold tracking-[-0.03em] tabular-nums"
                        >
                          {dish.cooks}
                        </span>
                        <span aria-hidden="true" className="text-2xl">
                          {dish.emoji}
                        </span>
                      </span>
                    </button>
                    <div className="mt-3 border-t-2 border-ink pt-2">
                      <p className="font-mono text-[11px] tracking-[0.06em] text-brick tabular-nums">
                        #{index + 1}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-tight font-medium text-ink">
                        {dish.title}
                      </p>
                      <p className="mt-0.5 text-xs text-alert">{cooksLabel(dish.cooks)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {open && <DishDetail dish={open} rank={openIndex + 1} />}

            {ranked.length > TOP && (
              <AllDishes
                ranked={ranked}
                openKey={openKey}
                onToggle={(key) => {
                  setOpenKey(openKey === key ? null : key);
                  // The detail opens under the bars; bring it into view.
                  requestAnimationFrame(() =>
                    document
                      .getElementById("dish-detail")
                      ?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }),
                  );
                }}
              />
            )}
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

/** Every stamped dish, ranked — searchable and paged so it scales. */
function AllDishes({
  ranked,
  openKey,
  onToggle,
}: {
  ranked: DishEntry[];
  openKey: string | null;
  onToggle: (key: string) => void;
}) {
  const rankOf = new Map(ranked.map((dish, index) => [dish.key, index + 1]));
  const list = usePagedList(ranked, { size: ALL_PAGE, text: (dish) => dish.title });
  return (
    <div className="mt-10 border-t border-fog pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[21px] leading-tight font-bold tracking-[-0.02em] text-ink">
          All dishes ({ranked.length})
        </h3>
        <ListSearch label="Search dishes" value={list.query} onChange={list.setQuery} />
      </div>
      <ol aria-label="All dishes" className="mt-4 divide-y divide-fog">
        {list.visible.map((dish) => {
          const isOpen = dish.key === openKey;
          return (
            <li key={dish.key}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls="dish-detail"
                onClick={() => onToggle(dish.key)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-wheat ${
                  isOpen ? "bg-wheat" : ""
                }`}
              >
                <span className="w-9 shrink-0 font-mono text-xs text-brick tabular-nums">
                  #{rankOf.get(dish.key)}
                </span>
                <span aria-hidden="true" className="text-xl">
                  {dish.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{dish.title}</span>
                <span className="shrink-0 font-mono text-xs text-alert tabular-nums">{cooksLabel(dish.cooks)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {list.matched === 0 && <p className="mt-4 text-sm text-brick">No dish matches “{list.query}”.</p>}
      {list.hasMore && <ShowMore left={list.matched - list.visible.length} onClick={list.showMore} />}
    </div>
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
