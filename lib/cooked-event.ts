import { parseEventLogs, type Log } from "viem";

import { chefbotAbi } from "./abi/ChefBOT";

/**
 * Cook number from a confirmed `cookIt` receipt: the contract emits
 * `Cooked(key, cook, title, cooks)` with the dish's new total, so "You're
 * cook #N" comes straight from the chain — never a local guess. Only logs
 * from the ChefBOT contract count; returns null when none decode.
 */
export function cookNumberFromLogs(
  logs: readonly Log[],
  contract: `0x${string}`,
): number | null {
  const target = contract.toLowerCase();
  const own = logs.filter((log) => log.address?.toLowerCase() === target);
  const events = parseEventLogs({
    abi: chefbotAbi,
    eventName: "Cooked",
    logs: own as Log[],
    strict: true,
  });
  const cooks = events.at(-1)?.args.cooks;
  return typeof cooks === "number" ? cooks : null;
}

export interface ShareInput {
  title: string;
  emoji: string;
  cookNumber: number | null;
  /** Public app link appended by X when present. */
  appUrl?: string;
}

/** X (Twitter) post intent for a freshly stamped dish. */
export function shareOnXUrl({
  title,
  emoji,
  cookNumber,
  appUrl,
}: ShareInput): string {
  const who = cookNumber ? `I'm cook #${cookNumber} of` : "I just cooked";
  const text = `${who} ${emoji} ${title} — stamped on BOT Chain with ChefBOT. Real food. Real fast.`;
  const params = new URLSearchParams({ text });
  if (appUrl) {
    params.set("url", appUrl);
  }
  return `https://x.com/intent/post?${params.toString()}`;
}
