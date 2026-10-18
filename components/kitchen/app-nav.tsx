import type { ReactNode } from "react";

import { PillNav } from "@/components/ui/pill-nav";

/** The workspace tabs (kitchen-tabs.tsx) navigate the app; the pill points home. */
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export function AppNav({ children }: { children?: ReactNode }) {
  return (
    <PillNav label="ChefBOT app" homeHref="/" links={LINKS} action={children} />
  );
}
