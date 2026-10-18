"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { INGREDIENT_GROUPS } from "@/lib/ingredients";
import { prepareScanImage, scanAvailable, scanFridge, type ScanFailure } from "@/lib/scan";

export const SCAN_CONSENT_KEY = "chefbot.scan-consent.v1";

const LABELS = new Map(
  INGREDIENT_GROUPS.flatMap((group) => group.ingredients).map((i) => [i.id, i.label]),
);

const FAILURE_TEXT: Record<ScanFailure, string> = {
  not_configured: "Scanning isn't set up on this site yet — pick by hand below.",
  rate_limited: "You've hit the hourly limit for AI requests. Pick by hand for now.",
  too_large: "That photo is too large. Try another one.",
  timeout: "The scan took too long. Try again, or pick by hand.",
  network: "Couldn't reach ChefBOT. Check your connection and try again.",
  failed: "The scan didn't work this time. Try another photo, or pick by hand.",
};

function hasConsent(): boolean {
  try {
    return window.localStorage.getItem(SCAN_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

function saveConsent() {
  try {
    window.localStorage.setItem(SCAN_CONSENT_KEY, "1");
  } catch {
    // Storage blocked: we'll simply ask again next time.
  }
}

/**
 * v1.1 "Scan my fridge": photo → Gemini (via the Worker) → chips
 * pre-selected in the picker. Never submits on its own.
 */
export function FridgeScan({ onDetected }: { onDetected: (ids: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!scanAvailable()) return null;

  function start() {
    if (busy) return;
    if (hasConsent()) {
      inputRef.current?.click();
    } else {
      setAsking(true);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setMessage("Looking in your fridge…");
    try {
      let payload;
      try {
        payload = await prepareScanImage(file);
      } catch {
        setMessage("We couldn't read that photo. Try a JPEG or PNG from your camera.");
        return;
      }
      const result = await scanFridge(payload);
      if (!result.ok) {
        setMessage(FAILURE_TEXT[result.reason]);
      } else if (result.ingredients.length === 0) {
        setMessage("We couldn't spot any ingredients we know. Pick them by hand below.");
      } else {
        onDetected(result.ingredients);
        const names = result.ingredients.map((id) => LABELS.get(id) ?? id).join(", ");
        setMessage(
          `Found ${result.ingredients.length}: ${names}. Check the picks below, then cook.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-dashed border-ink/25 bg-parchment p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brick">
          <span className="font-medium text-ink">New:</span> snap your fridge and
          ChefBOT picks what it sees.
        </p>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
        >
          <span aria-hidden="true">📷</span>
          {busy ? "Scanning…" : "Scan my fridge"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Fridge photo"
        tabIndex={-1}
        className="sr-only"
        onChange={handleFile}
      />

      {asking && (
        <div className="mt-4 border-t border-fog pt-4 text-sm text-brick">
          <p>
            Your photo is shrunk on this device, then sent to Google Gemini
            (free tier — Google may use it to improve its products). ChefBOT
            doesn&apos;t store it. Avoid photos with people or personal details.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                saveConsent();
                setAsking(false);
                inputRef.current?.click();
              }}
              className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-medium text-white"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="inline-flex min-h-11 items-center rounded-full border border-fog px-4 font-medium text-ink"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm font-medium text-ink">
          {message}
        </p>
      )}
    </div>
  );
}
