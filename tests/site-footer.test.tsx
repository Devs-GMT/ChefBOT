import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/ui/site-footer";
import { contractAddress } from "@/lib/chain-config";
import { renderWithProviders } from "./render-with-providers";

vi.mock("@/lib/chain-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chain-config")>();
  return { ...actual, contractAddress: vi.fn() };
});

const CONTRACT = "0x5191b250E9F18d640B2138a1Da0409be0f1dD092";

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(contractAddress).mockReturnValue(null);
});

describe("SiteFooter (PRD §8)", () => {
  it("closes with the Cooked on BOT Chain headline", () => {
    renderWithProviders(<SiteFooter />);
    expect(
      screen.getByRole("heading", { name: "Cooked on BOT Chain." }),
    ).toBeInTheDocument();
  });

  it("makes the BOT Chain logo card a new-tab link to botchain.ai", () => {
    renderWithProviders(<SiteFooter />);
    const card = screen.getByRole("link", { name: /Visit BOT Chain/ });
    expect(card).toHaveAttribute("href", "https://botchain.ai");
    expect(card).toHaveAttribute("target", "_blank");
    expect(card).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("img", { name: "BOT Chain" })).toBeInTheDocument();
  });

  it("points View on explorer at the configured contract", () => {
    vi.mocked(contractAddress).mockReturnValue(CONTRACT);
    renderWithProviders(<SiteFooter />);

    const explorer = screen.getByRole("link", { name: /View on explorer/ });
    expect(explorer).toHaveAttribute(
      "href",
      `https://scan.botchain.ai/address/${CONTRACT}`,
    );
    expect(explorer).toHaveAttribute("target", "_blank");
    expect(
      screen.getByRole("link", { name: "0x5191…D092" }),
    ).toHaveAttribute("href", `https://scan.botchain.ai/address/${CONTRACT}`);
  });

  it("falls back to the explorer home when no contract is configured", () => {
    renderWithProviders(<SiteFooter />);
    expect(
      screen.getByRole("link", { name: /View on explorer/ }),
    ).toHaveAttribute("href", "https://scan.botchain.ai");
    expect(screen.queryByText(/0x5191/)).not.toBeInTheDocument();
  });

  it("states the chain id and the safety line", () => {
    renderWithProviders(<SiteFooter />);
    expect(
      screen.getByText(/Every dish here is stamped on BOT Chain · chain ID 677/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/© ChefBOT 2026 · recipes are AI suggestions, cook safely/),
    ).toBeInTheDocument();
  });
});
