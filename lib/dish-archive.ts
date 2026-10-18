import { validateRecipe, type Recipe } from "../shared/recipe-schema";

/**
 * Recipe archive client (v1.1). Only title + emoji live on-chain; after a
 * confirmed stamp the full recipe is posted to the Worker, which keeps it
 * if the transaction proves the stamp. The leaderboard reads it back so
 * anyone can open an AI-made dish. Both calls are best effort: failures
 * just mean the dish shows without steps, as before.
 */

const ARCHIVE_TIMEOUT_MS = 8000;
/** Same cap the Worker applies to archived dishes. */
const MAX_ARCHIVED_MINUTES = 180;

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_RECIPES_API_URL ?? "").replace(/\/+$/, "");
}

export async function archiveDish(
  txHash: `0x${string}`,
  recipe: Recipe,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;
  try {
    const response = await fetchImpl(`${base}/dishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, recipe }),
      signal: AbortSignal.timeout(ARCHIVE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchArchivedDish(
  title: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Recipe | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const response = await fetchImpl(`${base}/dishes?title=${encodeURIComponent(title)}`, {
      signal: AbortSignal.timeout(ARCHIVE_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { recipe?: unknown };
    const recipe = validateRecipe(body.recipe, { maxMinutes: MAX_ARCHIVED_MINUTES });
    return recipe.ok ? recipe.value : null;
  } catch {
    return null;
  }
}
