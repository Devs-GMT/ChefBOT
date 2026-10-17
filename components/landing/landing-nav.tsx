import Link from "next/link";

import { PillNav } from "@/components/ui/pill-nav";

const LINKS = [
  { href: "#numbers", label: "Numbers" },
  { href: "#fridge", label: "Food groups" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  return (
    <PillNav
      label="ChefBOT"
      homeHref="#top"
      links={LINKS}
      className="landing-header"
      action={
        <Link
          href="/app"
          className="flex min-h-11 items-center rounded-full bg-parchment px-4 text-sm font-medium whitespace-nowrap text-ink transition-colors hover:bg-white"
        >
          Start cooking
        </Link>
      }
    />
  );
}
