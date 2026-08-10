/**
 * Temporary storefront auth lockdown.
 * Set STOREFRONT_AUTH_UI_ENABLED=true (and rebuild web if needed) to show
 * login/register entry points again. Login via /login URL stays available either way.
 */
export function isStorefrontAuthUiEnabled(): boolean {
  return process.env.STOREFRONT_AUTH_UI_ENABLED === "true";
}
