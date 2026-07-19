const textareaClass =
  "min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminSeoFieldsProps = {
  metaTitle?: string | null;
  metaDescription?: string | null;
};

export function AdminSeoFields({ metaTitle, metaDescription }: AdminSeoFieldsProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <p className="font-medium">SEO</p>
        <p className="text-xs text-muted-foreground">
          Заголовок и описание для поисковых систем. Если пусто — используется название товара.
        </p>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        Meta title
        <input
          name="meta_title"
          defaultValue={metaTitle ?? ""}
          maxLength={255}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Meta description
        <textarea
          name="meta_description"
          defaultValue={metaDescription ?? ""}
          maxLength={5000}
          className={textareaClass}
        />
      </label>
    </div>
  );
}
