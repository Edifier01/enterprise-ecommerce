import { getApiBase } from "@/lib/api-base";

export type SearchSuggestionProduct = {
  name: string;
  slug: string;
};

export type SearchSuggestionCategory = {
  name: string;
  slug: string;
};

export type SearchSuggestions = {
  products: SearchSuggestionProduct[];
  categories: SearchSuggestionCategory[];
};

let categoriesCache: SearchSuggestionCategory[] | null = null;
let categoriesPromise: Promise<SearchSuggestionCategory[]> | null = null;

async function loadCategories(): Promise<SearchSuggestionCategory[]> {
  if (categoriesCache) {
    return categoriesCache;
  }
  if (!categoriesPromise) {
    categoriesPromise = fetch(`${getApiBase()}/api/v1/categories`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("categories fetch failed");
        }
        return res.json() as Promise<{ items: { name: string; slug: string }[] }>;
      })
      .then((data) => {
        categoriesCache = data.items.map((item) => ({
          name: item.name,
          slug: item.slug,
        }));
        return categoriesCache;
      })
      .catch(() => {
        categoriesPromise = null;
        return [];
      });
  }
  return categoriesPromise;
}

export async function fetchSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { products: [], categories: [] };
  }

  const base = getApiBase();
  const [productsResult, categories] = await Promise.all([
    fetch(
      `${base}/api/v1/products/search?q=${encodeURIComponent(trimmed)}&limit=5&page=1`,
      { cache: "no-store" },
    )
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .catch(() => ({ items: [] })),
    loadCategories(),
  ]);

  const products = (productsResult.items ?? []).map(
    (item: { name: string; slug: string }) => ({
      name: item.name,
      slug: item.slug,
    }),
  );

  const qLower = trimmed.toLowerCase();
  const matchedCategories = categories
    .filter((category) => category.name.toLowerCase().includes(qLower))
    .slice(0, 3);

  return { products, categories: matchedCategories };
}
