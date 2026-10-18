import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChefBotMark, MARK_HEAD_PATH, markIconSvg } from "@/components/ui/chefbot-mark";
import { PillNav } from "@/components/ui/pill-nav";

describe("ChefBOT mark", () => {
  it("is decorative, inks with currentColor and keeps one red light", () => {
    const { container } = render(<ChefBotMark className="size-6" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.querySelector("g")).toHaveAttribute("fill", "currentColor");
    expect(svg.querySelector("path")).toHaveAttribute("fill-rule", "evenodd");
    const lights = svg.querySelectorAll("[fill='#d50000']");
    expect(lights).toHaveLength(1);
  });

  it("app/icon.svg is the same mark as the component", () => {
    const icon = readFileSync(join(process.cwd(), "app/icon.svg"), "utf8").trim();
    expect(icon).toBe(markIconSvg());
    expect(icon).toContain(MARK_HEAD_PATH);
    expect(Buffer.byteLength(icon)).toBeLessThan(2048);
  });

  it("brands the nav: the home link shows the mark next to the ChefBOT wordmark", () => {
    render(<PillNav label="Main" homeHref="/" links={[]} />);
    const home = screen.getByRole("link", { name: "ChefBOT" });
    expect(home).toHaveAttribute("href", "/");
    expect(home.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(home.querySelector("span.rounded-full.bg-alert")).toBeNull();
  });
});
