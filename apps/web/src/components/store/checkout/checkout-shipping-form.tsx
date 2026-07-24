"use client";

import { z } from "zod";

export const checkoutShippingSchema = z.object({
  recipient_name: z
    .string()
    .trim()
    .min(2, "Укажите имя получателя")
    .max(120, "Слишком длинное имя"),
  phone: z
    .string()
    .trim()
    .min(6, "Укажите телефон")
    .max(32, "Слишком длинный телефон")
    .regex(/^[+\d()\-\s]+$/, "Телефон может содержать цифры, пробелы и +()-"),
  address: z
    .string()
    .trim()
    .min(8, "Укажите адрес доставки")
    .max(500, "Слишком длинный адрес"),
});

export type CheckoutShippingInput = z.infer<typeof checkoutShippingSchema>;

export type CheckoutShippingFieldErrors = Partial<
  Record<keyof CheckoutShippingInput, string>
>;

export function parseCheckoutShipping(
  input: CheckoutShippingInput,
):
  | { success: true; data: CheckoutShippingInput }
  | { success: false; fieldErrors: CheckoutShippingFieldErrors; formError: string } {
  const parsed = checkoutShippingSchema.safeParse(input);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const fieldErrors: CheckoutShippingFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (
      (key === "recipient_name" || key === "phone" || key === "address") &&
      !fieldErrors[key]
    ) {
      fieldErrors[key] = issue.message;
    }
  }

  return {
    success: false,
    fieldErrors,
    formError: "Проверьте поля доставки",
  };
}

type CheckoutShippingFormProps = {
  defaultRecipientName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  disabled?: boolean;
  fieldErrors?: CheckoutShippingFieldErrors;
};

export function CheckoutShippingForm({
  defaultRecipientName = "",
  defaultPhone = "",
  defaultAddress = "",
  disabled = false,
  fieldErrors,
}: CheckoutShippingFormProps) {
  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="shipping_recipient_name" className="text-sm font-medium">
          Получатель
        </label>
        <input
          id="shipping_recipient_name"
          name="shipping_recipient_name"
          required
          disabled={disabled}
          defaultValue={defaultRecipientName}
          autoComplete="name"
          aria-invalid={Boolean(fieldErrors?.recipient_name)}
          className={`mt-1.5 ${inputClass}`}
        />
        {fieldErrors?.recipient_name ? (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.recipient_name}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="shipping_phone" className="text-sm font-medium">
          Телефон
        </label>
        <input
          id="shipping_phone"
          name="shipping_phone"
          type="tel"
          required
          disabled={disabled}
          defaultValue={defaultPhone}
          autoComplete="tel"
          aria-invalid={Boolean(fieldErrors?.phone)}
          className={`mt-1.5 ${inputClass}`}
        />
        {fieldErrors?.phone ? (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.phone}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="shipping_address" className="text-sm font-medium">
          Адрес доставки
        </label>
        <textarea
          id="shipping_address"
          name="shipping_address"
          required
          disabled={disabled}
          defaultValue={defaultAddress}
          autoComplete="street-address"
          rows={3}
          aria-invalid={Boolean(fieldErrors?.address)}
          className={`mt-1.5 resize-y ${inputClass}`}
        />
        {fieldErrors?.address ? (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.address}</p>
        ) : null}
      </div>
    </div>
  );
}

export function readCheckoutShippingFromForm(form: HTMLFormElement): CheckoutShippingInput {
  const data = new FormData(form);
  return {
    recipient_name: String(data.get("shipping_recipient_name") ?? "").trim(),
    phone: String(data.get("shipping_phone") ?? "").trim(),
    address: String(data.get("shipping_address") ?? "").trim(),
  };
}
