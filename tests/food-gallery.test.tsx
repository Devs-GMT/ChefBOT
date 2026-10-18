import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FOOD_ART, GALLERY_CHAPTERS, LandingFoodGallery } from "@/components/landing/food-gallery";
import { INGREDIENT_GROUPS } from "@/lib/ingredients";

// jsdom has no matchMedia and GSAP reads it on import: report "no match"
// (reduced motion) so no animation runs in tests.
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }),
  });
});

const ART_DIR = join(process.cwd(), "public", "food-art");


describe("painted food gallery", () => {
  it("has one chapter per food group, in pyramid order", () => {
    render(<LandingFoodGallery />);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(INGREDIENT_GROUPS.map((g) => g.title));
  });

  it("states how many ingredients ChefBOT knows per group", () => {
    render(<LandingFoodGallery />);
    for (const group of INGREDIENT_GROUPS) {
      const chapter = screen.getByRole("region", { name: group.title });
      expect(chapter).toHaveTextContent(`ChefBOT knows: ${group.ingredients.length} items`);
    }
  });

  it("renders each chapter's illustrations as decorative images", () => {
    const { container } = render(<LandingFoodGallery />);
    for (const chapter of GALLERY_CHAPTERS) {
      const region = screen.getByRole("region", { name: INGREDIENT_GROUPS.find((g) => g.id === chapter.group)!.title });
      const images = region.querySelectorAll("img");
      expect(images).toHaveLength(chapter.items.length);
      images.forEach((img) => expect(img).toHaveAttribute("alt", ""));
    }
    expect(within(container).queryAllByRole("img")).toHaveLength(0);
  });

  it("only references painted assets that exist, stay small and match their size", () => {
    const used = new Set(GALLERY_CHAPTERS.flatMap((c) => c.items.map((i) => i.art)));
    for (const name of used) {
      const art = FOOD_ART[name];
      const file = join(ART_DIR, `${name}.svg`);
      expect(statSync(file).size, name).toBeLessThan(8 * 1024);
      const viewBox = readFileSync(file, "utf8").match(/viewBox="0 0 (\d+) (\d+)"/);
      expect(viewBox?.slice(1).map(Number), name).toEqual([art.w, art.h]);
    }
  });
});
