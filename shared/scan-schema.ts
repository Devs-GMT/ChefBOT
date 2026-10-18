import { isKnownIngredient } from "./ingredients";
import type { ValidationResult } from "./recipe-schema";

/**
 * Fridge scan (v1.1) contract, shared by the Worker and the client.
 * The client shrinks photos to ~100 KB; the caps leave headroom without
 * letting the Worker become a free image relay.
 */
export const SCAN_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ScanMimeType = (typeof SCAN_MIME_TYPES)[number];

export const MAX_SCAN_IMAGE_BYTES = 1_000_000;
export const MAX_SCAN_BODY_BYTES = 1_500_000;
const MIN_SCAN_IMAGE_BYTES = 100;
export const MAX_SCAN_INGREDIENTS = 12;

export interface ScanRequest {
  /** Raw base64 (no `data:` prefix). */
  image: string;
  mime: ScanMimeType;
}

export interface ScanResponse {
  ingredients: string[];
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Leading bytes of each accepted format, so a declared type can't lie. */
const MAGIC: Record<ScanMimeType, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodedLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

function startsWith(base64: string, magic: number[]): boolean {
  try {
    const head = atob(base64.slice(0, 12));
    return magic.every((byte, index) => head.charCodeAt(index) === byte);
  } catch {
    return false;
  }
}

export function validateScanRequest(data: unknown): ValidationResult<ScanRequest> {
  if (!isPlainObject(data)) return { ok: false, reason: "body: not an object" };
  const { image, mime } = data;
  if (typeof mime !== "string" || !(SCAN_MIME_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, reason: "mime: must be image/jpeg, image/png or image/webp" };
  }
  if (typeof image !== "string" || image.length % 4 !== 0 || !BASE64.test(image)) {
    return { ok: false, reason: "image: not base64" };
  }
  const bytes = decodedLength(image);
  if (bytes < MIN_SCAN_IMAGE_BYTES || bytes > MAX_SCAN_IMAGE_BYTES) {
    return { ok: false, reason: "image: size out of range" };
  }
  if (!startsWith(image, MAGIC[mime as ScanMimeType])) {
    return { ok: false, reason: "image: content does not match mime" };
  }
  return { ok: true, value: { image, mime: mime as ScanMimeType } };
}

/** Keep vocabulary ids only — the model can only *suggest* chips. */
export function validateScanResponse(data: unknown): ValidationResult<ScanResponse> {
  if (!isPlainObject(data) || !Array.isArray(data.ingredients)) {
    return { ok: false, reason: "ingredients: not an array" };
  }
  const ingredients: string[] = [];
  for (const raw of data.ingredients) {
    if (typeof raw !== "string" || !isKnownIngredient(raw)) continue;
    const id = raw.trim().toLowerCase();
    if (!ingredients.includes(id)) ingredients.push(id);
    if (ingredients.length === MAX_SCAN_INGREDIENTS) break;
  }
  return { ok: true, value: { ingredients } };
}
