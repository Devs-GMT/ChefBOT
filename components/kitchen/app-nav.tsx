import type { ReactNode } from "react";

import { PillNav } from "@/components/ui/pill-nav";

const LINKS = [
  { href: "#cook", label: "Cook" },
  { href: "#most-cooked", label: "Most Cooked" },
  { href: "#my-kitchen", label: "My Kitchen" },
  { href: "#shopping-list", label: "List" },
];

export function AppNav({ children }: { children?: ReactNode }) {
  return (
    <PillNav label="ChefBOT app" homeHref="/" links={LINKS} action={children} />
  );
}
