const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type CartLine = {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  currency: string;
  product_snapshot: {
    product_name?: string;
    name?: string;
    variant_name?: string;
    sku?: string;
    attributes?: Record<string, string>;
  };
};

export type Cart = {
  id: string;
  status: string;
  currency: string | null;
  subtotal_cents: number;
  total_cents: number;
  lines: CartLine[];
};

export type CheckoutSession = {
  id: string;
  cart_id: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  order_number: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentIntentResponse = {
  client_secret: string;
  payment_intent_id: string;
};

async function requestJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const body = (await res.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // Keep the generic message if the API returns no JSON body.
    }
    throw new Error(detail);
  }

  return res.json();
}

export function createIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function getCheckoutErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.includes("Insufficient stock")) {
    return "Недостаточно товара на складе. Измените количество или удалите позицию из корзины.";
  }
  return error instanceof Error ? error.message : fallback;
}

export function getCart(): Promise<Cart> {
  return requestJson<Cart>("/api/v1/cart", { method: "GET" });
}

export function addCartLine(variantId: string, quantity = 1): Promise<Cart> {
  return requestJson<Cart>("/api/v1/cart/lines", {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
}

export function updateCartLine(lineId: string, quantity: number): Promise<Cart> {
  return requestJson<Cart>(`/api/v1/cart/lines/${lineId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function deleteCartLine(lineId: string): Promise<Cart> {
  return requestJson<Cart>(`/api/v1/cart/lines/${lineId}`, {
    method: "DELETE",
  });
}

export type CheckoutShippingInput = {
  recipient_name: string;
  phone: string;
  address: string;
};

export function createCheckoutSession(
  shipping?: CheckoutShippingInput,
): Promise<CheckoutSession> {
  return requestJson<CheckoutSession>("/api/v1/checkout/sessions", {
    method: "POST",
    headers: { "Idempotency-Key": createIdempotencyKey("checkout") },
    body: JSON.stringify(shipping ? { shipping } : {}),
  });
}

export function createPaymentIntent(
  sessionId: string
): Promise<PaymentIntentResponse> {
  return requestJson<PaymentIntentResponse>(
    `/api/v1/checkout/sessions/${sessionId}/payment-intent`,
    {
      method: "POST",
      headers: { "Idempotency-Key": createIdempotencyKey("payment") },
    }
  );
}

export function getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  return requestJson<CheckoutSession>(`/api/v1/checkout/sessions/${sessionId}`, {
    method: "GET",
  });
}

export function simulateStubPaymentSuccess(
  paymentIntentId: string
): Promise<{ status: string }> {
  return requestJson<{ status: string }>(
    `/api/v1/dev/payments/${paymentIntentId}/simulate-success`,
    { method: "POST" }
  );
}
