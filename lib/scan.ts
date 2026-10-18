import { validateScanResponse, type ScanRequest } from "../shared/scan-schema";

/**
 * Fridge scan client (v1.1). The photo is shrunk on the device before it
 * leaves (≤768 px JPEG ≈ 100 KB) — faster on mobile data and well inside the
 * Worker's caps. Only vocabulary ids come back; the cook confirms them.
 */

export const SCAN_TIMEOUT_MS = 12_000;
export const SCAN_MAX_SIDE = 768;
const SCAN_QUALITY = 0.7;

export type ScanFailure =
  | "not_configured"
  | "rate_limited"
  | "too_large"
  | "timeout"
  | "network"
  | "failed";

export type ScanResult =
  | { ok: true; ingredients: string[] }
  | { ok: false; reason: ScanFailure };

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_RECIPES_API_URL ?? "").replace(/\/+$/, "");
}

/** The scan needs the Worker; without it the button stays hidden. */
export function scanAvailable(): boolean {
  return apiBase() !== "";
}

export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Decode (EXIF-rotated), shrink and re-encode as JPEG in the browser. */
export async function prepareScanImage(file: Blob): Promise<ScanRequest> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, SCAN_MAX_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", SCAN_QUALITY),
    );
    if (!blob) throw new Error("encode failed");
    return { image: arrayBufferToBase64(await blob.arrayBuffer()), mime: "image/jpeg" };
  } finally {
    bitmap.close();
  }
}

const STATUS_REASON: Record<number, ScanFailure> = {
  413: "too_large",
  429: "rate_limited",
  504: "timeout",
};

export async function scanFridge(
  payload: ScanRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<ScanResult> {
  const base = apiBase();
  if (!base) return { ok: false, reason: "not_configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${base}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, reason: STATUS_REASON[response.status] ?? "failed" };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, reason: "failed" };
    }
    const validated = validateScanResponse(data);
    return validated.ok
      ? { ok: true, ingredients: validated.value.ingredients }
      : { ok: false, reason: "failed" };
  } catch (error) {
    const name =
      error !== null && typeof error === "object" && "name" in error ? String(error.name) : "";
    return {
      ok: false,
      reason: name === "AbortError" || name === "TimeoutError" ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}
