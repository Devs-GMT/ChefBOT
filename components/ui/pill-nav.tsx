"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface PillNavLink {
  href: string;
  label: string;
}

export interface PillNavProps {
  label: string;
  /** Where the ChefBOT wordmark points. */
  homeHref: string;
  links: PillNavLink[];
  /** Right-hand slot: CTA or wallet button. */
  action?: ReactNode;
  className?: string;
}

/**
 * PRD §6 nav: a floating dark rounded pill ("ChefBOT ☰") that stays on
 * scroll. Desktop shows links inline; small screens get a ☰ disclosure
 * that drops a matching dark panel. Escape and link taps close it.
 */
export function PillNav({ label, homeHref, links, action, className = "" }: PillNavProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const Home = homeHref.startsWith("#") ? "a" : Link;

  return (
    <header className={`sticky top-0 z-50 px-3 pt-3 sm:pt-4 ${className}`}>
      <div className="band-dark relative mx-auto w-fit max-w-full">
        <nav
          aria-label={label}
          className="flex items-center gap-1 rounded-full bg-ink/95 p-1.5 text-parchment shadow-[0_10px_30px_-10px_rgba(17,0,0,0.5)] md:backdrop-blur"
        >
          <Home
            href={homeHref}
            className="flex min-h-11 items-center gap-2 rounded-full pr-3 pl-3.5 text-[15px] font-bold tracking-[-0.02em]"
          >
            <span aria-hidden="true" className="size-2.5 rounded-full bg-alert" />
            ChefBOT
          </Home>

          <div className="hidden items-center md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center rounded-full px-3.5 text-sm font-medium text-parchment/75 transition-colors hover:bg-parchment/10 hover:text-parchment"
              >
                {link.label}
              </a>
            ))}
          </div>

          {action ? <div className="flex items-center">{action}</div> : null}

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className="flex size-11 items-center justify-center rounded-full text-lg transition-colors hover:bg-parchment/10 md:hidden"
          >
            <span aria-hidden="true">{open ? "✕" : "☰"}</span>
          </button>
        </nav>

        {open && (
          <div
            id={menuId}
            className="card-rise absolute inset-x-0 top-full mt-2 min-w-60 rounded-3xl bg-ink p-2 shadow-card md:hidden"
          >
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center rounded-2xl px-4 text-[17px] font-medium text-parchment transition-colors hover:bg-parchment/10"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
