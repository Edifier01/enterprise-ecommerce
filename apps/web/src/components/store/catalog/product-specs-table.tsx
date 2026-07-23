import type { Product, ProductVariant } from "@/lib/api";

type SpecRow = {
  label: string;
  value: string;
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  size: "Размер",
  waist: "Талия",
  color: "Цвет",
  camouflage: "Камуфляж",
  material: "Материал",
};

function formatAttributeLabel(key: string): string {
  return ATTRIBUTE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function collectVariantSpecs(variants: ProductVariant[]): SpecRow[] {
  const rows: SpecRow[] = [];

  for (const [key, label] of Object.entries(ATTRIBUTE_LABELS)) {
    const values = new Set<string>();
    for (const variant of variants) {
      const value = variant.attributes[key]?.trim();
      if (value) {
        values.add(value);
      }
    }
    if (values.size > 0) {
      rows.push({
        label,
        value: [...values].join(", "),
      });
    }
  }

  return rows;
}

export function buildProductSpecRows(product: Product): SpecRow[] {
  const rows: SpecRow[] = [
    { label: "Артикул", value: product.slug },
    {
      label: "Наличие",
      value: product.in_stock ? "В наличии" : "Нет в наличии",
    },
    ...collectVariantSpecs(product.variants),
  ];

  return rows.filter((row) => row.value.length > 0);
}

export function ProductSpecsTable({ product }: { product: Product }) {
  const rows = buildProductSpecRows(product);

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0">
              <th
                scope="row"
                className="w-2/5 bg-muted/30 px-4 py-2.5 text-left font-medium text-foreground"
              >
                {row.label}
              </th>
              <td className="px-4 py-2.5 text-muted-foreground">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
