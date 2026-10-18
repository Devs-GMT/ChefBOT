import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CookFlow } from "@/components/kitchen/cook-flow";
import { SCAN_CONSENT_KEY } from "@/components/kitchen/fridge-scan";
import { renderWithProviders } from "./render-with-providers";

const scan = vi.hoisted(() => ({
  prepareScanImage: vi.fn(),
  scanFridge: vi.fn(),
}));

vi.mock("@/lib/scan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/scan")>()),
  prepareScanImage: scan.prepareScanImage,
  scanFridge: scan.scanFridge,
}));

const PHOTO = new File([new Uint8Array([1, 2, 3])], "fridge.jpg", { type: "image/jpeg" });

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "https://worker.test");
  scan.prepareScanImage.mockResolvedValue({ image: "AAAA", mime: "image/jpeg" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  scan.prepareScanImage.mockReset();
  scan.scanFridge.mockReset();
});

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Scan my fridge/ }));
}

describe("Fridge scan", () => {
  it("is hidden when no Worker URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "");
    renderWithProviders(<CookFlow />);
    expect(screen.queryByRole("button", { name: /Scan my fridge/ })).not.toBeInTheDocument();
  });

  it("asks for consent before the first scan and remembers it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookFlow />);
    await openPicker(user);

    expect(screen.getByText(/sent to Google Gemini/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByText(/sent to Google Gemini/)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SCAN_CONSENT_KEY)).toBeNull();

    await openPicker(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(window.localStorage.getItem(SCAN_CONSENT_KEY)).toBe("1");
    expect(screen.getByLabelText("Fridge photo")).toBeInTheDocument();
  });

  it("pre-selects what the scan found and leaves the decision to the cook", async () => {
    window.localStorage.setItem(SCAN_CONSENT_KEY, "1");
    scan.scanFridge.mockResolvedValue({ ok: true, ingredients: ["egg", "tomato"] });
    const user = userEvent.setup();
    renderWithProviders(<CookFlow />);

    await user.upload(screen.getByLabelText("Fridge photo"), PHOTO);

    expect(await screen.findByText(/Found 2: Egg, Tomato/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Egg/ })).toHaveAttribute("aria-pressed", "true");
    expect(scan.prepareScanImage).toHaveBeenCalledWith(PHOTO);
    expect(screen.queryByRole("heading", { name: /Tonight's picks/ })).not.toBeInTheDocument();
  });

  it("explains an empty result and keeps manual picking", async () => {
    window.localStorage.setItem(SCAN_CONSENT_KEY, "1");
    scan.scanFridge.mockResolvedValue({ ok: true, ingredients: [] });
    const user = userEvent.setup();
    renderWithProviders(<CookFlow />);
    await user.upload(screen.getByLabelText("Fridge photo"), PHOTO);
    expect(await screen.findByText(/couldn't spot any ingredients/)).toBeInTheDocument();
  });

  it.each([
    ["rate_limited", /hourly limit/],
    ["timeout", /took too long/],
    ["network", /Couldn't reach ChefBOT/],
    ["failed", /scan didn't work/],
  ])("shows a friendly message for %s", async (reason, message) => {
    window.localStorage.setItem(SCAN_CONSENT_KEY, "1");
    scan.scanFridge.mockResolvedValue({ ok: false, reason });
    const user = userEvent.setup();
    renderWithProviders(<CookFlow />);
    await user.upload(screen.getByLabelText("Fridge photo"), PHOTO);
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("handles a photo the browser can't read", async () => {
    window.localStorage.setItem(SCAN_CONSENT_KEY, "1");
    scan.prepareScanImage.mockRejectedValue(new Error("decode"));
    const user = userEvent.setup();
    renderWithProviders(<CookFlow />);
    await user.upload(screen.getByLabelText("Fridge photo"), PHOTO);
    expect(await screen.findByText(/couldn't read that photo/)).toBeInTheDocument();
    await waitFor(() => expect(scan.scanFridge).not.toHaveBeenCalled());
  });
});
