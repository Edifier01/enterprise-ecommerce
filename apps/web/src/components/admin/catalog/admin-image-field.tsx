"use client";

import { useRef, useState, useTransition } from "react";

import { uploadAdminMediaAction } from "@/app/actions/admin-catalog";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AdminImageFieldProps = {
  inputId?: string;
  defaultValue?: string;
};

export function AdminImageField({ inputId = "image_url", defaultValue = "" }: AdminImageFieldProps) {
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload(file: File) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAdminMediaAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl(result.url);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        URL изображения
      </label>
      <input
        id={inputId}
        name="image_url"
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        className={inputClass}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              handleUpload(file);
            }
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Загрузка…" : "Загрузить файл"}
        </button>
        <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF — до 5 МБ</span>
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
