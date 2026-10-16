import type { ReactNode } from "react";
import Link from "next/link";

const LINKS = [
  { href: "#cook", label: "Cook" },
  { href: "#most-cooked", label: "Most Cooked" },
  { href: "#my-kitchen", label: "My Kitchen" },
];

export function AppNav({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 pt-4">
      <nav
        aria-label="ChefBOT app"
        className="mx-auto flex w-fit max-w-full items-center gap-1 rounded-full border border-fog bg-paper/90 px-2 py-1.5 backdrop-blur"
      >
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold tracking-tight text-ink"
        >
          <span aria-hidden className="size-2 rounded-full bg-ink" />
          ChefBOT
        </Link>
        <div className="hidden items-center md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center rounded-full px-3 text-sm text-brick transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </div>
        {children ? <div className="ml-1 flex items-center">{children}</div> : null}
      </nav>
    </header>
  );
}
