/** Deep link to MoySklad product editor (read-only reference for admins). */
export function moyskladProductUrl(moyskladProductId: string): string {
  return `https://online.moysklad.ru/app/#good/edit?id=${moyskladProductId}`;
}

export function isMoySkladSynced(syncSource: string | undefined): boolean {
  return syncSource === "moysklad";
}
