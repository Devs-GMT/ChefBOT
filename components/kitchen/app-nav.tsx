"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PillNav } from "@/components/ui/pill-nav";
import { useShoppingList } from "@/lib/shopping-list";

/** One page per part of the kitchen, in the order a cook uses them. */
export const KITCHEN_PAGES = [
  { href: "/app", label: "Cook" },
  { href: "/app/list", label: "List" },
  { href: "/app/recipes", label: "Mine" },
  { href: "/app/leaderboard", label: "Most Cooked" },
  { href: "/app/kitchen", label: "My Kitchen" },
] as const;

export function AppNav({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const toBuy = useShoppingList().filter((item) => !item.done).length;
  const links = KITCHEN_PAGES.map((page) => ({
    href: page.href,
    label: page.label,
    active: pathname === page.href,
    badge: page.href === "/app/list" ? toBuy : undefined,
  }));
  return (
    <PillNav label="ChefBOT app" homeHref="/" links={links} action={children} />
  );
}
