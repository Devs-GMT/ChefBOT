import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/site-footer";
import { contractAddress } from "@/lib/contract";
import { renderWithProviders } from "./render-with-providers";

vi.mock("@/lib/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/contract")>();
  return { ...actual, contractAddress: vi.fn() };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(contractAddress).mockReturnValue(null);
});

describe("SiteFooter", () => {
  it("links the BOT Chain website and the contract explorer page when configured", () => {
    vi.mocked(contractAddress).mockReturnValue(
      "0x5191b250E9F18d640B2138a1Da0409be0f1dD092",
    );
    renderWithProviders(<SiteFooter />);

    expect(
      screen.getByRole("link", { name: "botchain.ai" }),
    ).toHaveAttribute("href", "https://botchain.ai");
    const contractLink = screen.getByRole("link", {
      name: "0x5191…D092",
    });
    expect(contractLink).toHaveAttribute(
      "href",
      "https://scan.botchain.ai/address/0x5191b250E9F18d640B2138a1Da0409be0f1dD092",
    );
    expect(contractLink).toHaveAttribute("target", "_blank");
  });

  it("falls back to the generic explorer link when no contract is configured", () => {
    vi.mocked(contractAddress).mockReturnValue(null);
    renderWithProviders(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Explorer" })).toHaveAttribute(
      "href",
      "https://scan.botchain.ai",
    );
    expect(screen.queryByText(/0x5191/)).not.toBeInTheDocument();
  });
});
