export const CART_UPDATED_EVENT = "cart:updated";

export function dispatchCartUpdated(): void {
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export function subscribeCartUpdated(listener: () => void): () => void {
  window.addEventListener(CART_UPDATED_EVENT, listener);
  return () => window.removeEventListener(CART_UPDATED_EVENT, listener);
}
