import type { Metadata } from "next";

import { MyRecipes } from "@/components/kitchen/my-recipes";

export const metadata: Metadata = {
  title: "My Recipes — ChefBOT Kitchen",
  description: "Your own recipes, filed in a recipe box. Private to this browser; stamp them when you cook.",
};

export default function RecipesPage() {
  return (
    <main className="flex-1">
      <MyRecipes titleAs="h1" />
    </main>
  );
}
