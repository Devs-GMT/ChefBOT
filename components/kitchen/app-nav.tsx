"use client";

import type { ReactNode } from "react";

import { PillNav } from "@/components/ui/pill-nav";
import { useShoppingList } from "@/lib/shopping-list";

/** Order follows the page: cook → what to buy → leaderboard → your ledger. */
export function AppNav({ children }: { children?: ReactNode }) {
  const toBuy = useShoppingList().filter((item) => !item.done).length;
  const links = [
    { href: "#cook", label: "Cook" },
    { href: "#shopping-list", label: "List", badge: toBuy },
    { href: "#my-recipes", label: "Mine" },
    { href: "#most-cooked", label: "Most Cooked" },
    { href: "#my-kitchen", label: "My Kitchen" },
  ];
  return (
    <PillNav label="ChefBOT app" homeHref="/" links={links} action={children} />
  );
}
