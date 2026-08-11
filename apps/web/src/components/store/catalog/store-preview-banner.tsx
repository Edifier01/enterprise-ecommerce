type StorePreviewBannerProps = {
  className?: string;
};

export function StorePreviewBanner({ className }: StorePreviewBannerProps) {
  return (
    <div
      role="status"
      className={className}
    >
      <div className="rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Режим предпросмотра</p>
        <p className="mt-1 text-amber-900/90">
          Эта страница видна только по ссылке из админки. Товар может быть ещё не опубликован на витрине.
        </p>
      </div>
    </div>
  );
}
