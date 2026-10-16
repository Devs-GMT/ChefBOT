import { keccak256 } from "viem";

import {
  MAX_EMOJI_BYTES,
  MAX_TITLE_BYTES,
  byteLength,
  normalizeTitle,
  trimTitle,
} from "../shared/recipe-schema";

/**
 * Canonical recipe-key algorithm — MUST stay byte-identical to ChefBOT.sol.
 *
 * The normalization primitives live in shared/recipe-schema.ts (also used
 * by the Worker). Rule:
 *  1. UTF-8 bytes of the title.
 *  2. Trim leading/trailing ASCII whitespace (space, tab, LF, CR).
 *  3. Lowercase ASCII letters only (0x41–0x5A → +0x20). Non-ASCII bytes
 *     are left untouched (no Unicode case folding — both sides agree).
 *  4. key = keccak256(bytes(normalizedTitle)) — plain text hash,
 *     never abi.encode.
 */

export { MAX_EMOJI_BYTES, MAX_TITLE_BYTES, normalizeTitle, trimTitle };

const encoder = new TextEncoder();

/** Canonical on-chain recipe key. */
export function recipeKey(title: string): `0x${string}` {
  return keccak256(encoder.encode(normalizeTitle(title)));
}

/**
 * Frontend-side input guard mirroring the contract's reverts.
 * The contract remains the source of truth — this only avoids
 * sending transactions that would be rejected.
 */
export function validateTitle(title: string): void {
  const length = byteLength(title);
  if (length === 0) {
    throw new Error("EMPTY_TITLE");
  }
  if (length > MAX_TITLE_BYTES) {
    throw new Error("TITLE_TOO_LONG");
  }
}

export function validateEmoji(emoji: string): void {
  if (byteLength(emoji) > MAX_EMOJI_BYTES) {
    throw new Error("EMOJI_TOO_LONG");
  }
}
