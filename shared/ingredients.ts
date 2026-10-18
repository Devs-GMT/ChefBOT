/**
 * ChefBOT ingredient vocabulary — the single source of truth for the chips
 * in the UI, the curated fallback matcher, AND the Worker's request
 * validation (only these ids may reach the AI prompt). Pure TypeScript with
 * no dependencies so the Worker bundle can import it.
 */

export type IngredientCategory =
  | "protein"
  | "vegetables"
  | "grains"
  | "pantry";

export interface Ingredient {
  /** Canonical id used in API requests and recipe matching (lowercase). */
  id: string;
  /** Display label on the chip. */
  label: string;
  category: IngredientCategory;
}

export interface IngredientGroup {
  id: IngredientCategory;
  title: string;
  ingredients: Ingredient[];
}

export const INGREDIENT_GROUPS: IngredientGroup[] = [
  {
    id: "protein",
    title: "Protein & Fats",
    ingredients: [
      { id: "egg", label: "Egg", category: "protein" },
      { id: "chicken breast", label: "Chicken breast", category: "protein" },
      { id: "ground beef", label: "Ground beef", category: "protein" },
      { id: "bacon", label: "Bacon", category: "protein" },
      { id: "tofu", label: "Tofu", category: "protein" },
      { id: "salmon", label: "Salmon", category: "protein" },
      { id: "shrimp", label: "Shrimp", category: "protein" },
      { id: "butter", label: "Butter", category: "protein" },
      { id: "cheese", label: "Cheese", category: "protein" },
      { id: "yogurt", label: "Yogurt", category: "protein" },
    ],
  },
  {
    id: "vegetables",
    title: "Vegetables & Fruits",
    ingredients: [
      { id: "tomato", label: "Tomato", category: "vegetables" },
      { id: "onion", label: "Onion", category: "vegetables" },
      { id: "carrot", label: "Carrot", category: "vegetables" },
      { id: "spinach", label: "Spinach", category: "vegetables" },
      { id: "broccoli", label: "Broccoli", category: "vegetables" },
      { id: "bell pepper", label: "Bell pepper", category: "vegetables" },
      { id: "mushroom", label: "Mushroom", category: "vegetables" },
      { id: "potato", label: "Potato", category: "vegetables" },
      { id: "spring onion", label: "Spring onion", category: "vegetables" },
      { id: "lemon", label: "Lemon", category: "vegetables" },
    ],
  },
  {
    id: "grains",
    title: "Grains",
    ingredients: [
      { id: "rice", label: "Rice", category: "grains" },
      { id: "pasta", label: "Pasta", category: "grains" },
      { id: "bread", label: "Bread", category: "grains" },
      { id: "noodle", label: "Noodles", category: "grains" },
      { id: "tortilla", label: "Tortilla", category: "grains" },
      { id: "oats", label: "Oats", category: "grains" },
      { id: "flour", label: "Flour", category: "grains" },
    ],
  },
  {
    id: "pantry",
    title: "Pantry",
    ingredients: [
      { id: "garlic", label: "Garlic", category: "pantry" },
      { id: "chili", label: "Chili", category: "pantry" },
      { id: "soy sauce", label: "Soy sauce", category: "pantry" },
      { id: "olive oil", label: "Olive oil", category: "pantry" },
      { id: "peanut butter", label: "Peanut butter", category: "pantry" },
      { id: "coconut milk", label: "Coconut milk", category: "pantry" },
      { id: "canned beans", label: "Canned beans", category: "pantry" },
      { id: "hot sauce", label: "Hot sauce", category: "pantry" },
      { id: "honey", label: "Honey", category: "pantry" },
      { id: "vinegar", label: "Vinegar", category: "pantry" },
      { id: "sugar", label: "Sugar", category: "pantry" },
      { id: "curry paste", label: "Curry paste", category: "pantry" },
    ],
  },
];

export const ALL_INGREDIENT_IDS: string[] = INGREDIENT_GROUPS.flatMap((g) =>
  g.ingredients.map((i) => i.id),
);

const KNOWN = new Set(ALL_INGREDIENT_IDS);

/** True when an id (any casing / surrounding spaces) is in the vocabulary. */
export function isKnownIngredient(id: string): boolean {
  return KNOWN.has(id.trim().toLowerCase());
}
