"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old single-page anchors → their own pages. */
const LEGACY: Record<string, string> = {
  "#shopping-list": "/app/list",
  "#my-recipes": "/app/recipes",
  "#most-cooked": "/app/leaderboard",
  "#my-kitchen": "/app/kitchen",
};

/** Only the fixed table above, so a crafted hash can never pick the URL. */
export function routeForHash(hash: string): string | null {
  return Object.hasOwn(LEGACY, hash) ? LEGACY[hash]! : null;
}

/**
 * /app used to be one page with #section anchors; shared links such as
 * /app#most-cooked now land on the page that replaced the section.
 */
export function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const follow = () => {
      const route = routeForHash(window.location.hash);
      if (route) router.replace(route);
    };
    follow();
    // An old #section link clicked while /app is already open only changes the hash.
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [router]);
  return null;
}
