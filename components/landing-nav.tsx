import Link from "next/link";

const LINKS = [
  { href: "#numbers", label: "Numbers" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 pt-4">
      <nav
        aria-label="ChefBOT"
        className="mx-auto flex w-fit max-w-full items-center gap-1 rounded-full border border-fog bg-paper/90 px-2 py-1.5 backdrop-blur"
      >
        <a
          href="#top"
          className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold tracking-tight text-ink"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-ink" />
          ChefBOT
        </a>
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
        <Link
          href="/app"
          className="flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink/85"
        >
          Open the kitchen
        </Link>
      </nav>
    </header>
  );
}