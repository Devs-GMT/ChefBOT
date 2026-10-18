import type { RecipeResult } from "./recipes";

/**
 * The Cook page's state for the rest of the visit. Leaving /app for the
 * list or the leaderboard unmounts CookFlow; this module keeps the picks
 * and the last three recipes so coming back shows them again.
 *
 * Memory only (no storage): a full reload starts empty, exactly like the
 * server render, so hydration always matches.
 */
export interface CookSession {
  selected: string[];
  maxMinutes: number;
  vegetarian: boolean;
  result: RecipeResult | null;
  /** "New ideas" history: pick-set key, round and titles already shown. */
  history: { key: string; round: number; seen: string[] };
}

const EMPTY: CookSession = {
  selected: [],
  maxMinutes: 20,
  vegetarian: false,
  result: null,
  history: { key: "", round: 0, seen: [] },
};

let session: CookSession = EMPTY;

export function readCookSession(): CookSession {
  return session;
}

export function saveCookSession(next: Partial<CookSession>): void {
  session = { ...session, ...next };
}

export function resetCookSession(): void {
  session = EMPTY;
}
