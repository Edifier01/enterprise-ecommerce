"use client";

type CheckoutShippingFormProps = {
  defaultRecipientName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  disabled?: boolean;
};

export function CheckoutShippingForm({
  defaultRecipientName = "",
  defaultPhone = "",
  defaultAddress = "",
  disabled = false,
}: CheckoutShippingFormProps) {
  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
          className={`mt-1.5 ${inputClass}`}
        />
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
          className={`mt-1.5 ${inputClass}`}
        />
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
          className={`mt-1.5 resize-y ${inputClass}`}
        />
      </div>
    </div>
  );
}

export type CheckoutShippingInput = {
  recipient_name: string;
  phone: string;
  address: string;
};

export function readCheckoutShippingFromForm(form: HTMLFormElement): CheckoutShippingInput {
  const data = new FormData(form);
  return {
    recipient_name: String(data.get("shipping_recipient_name") ?? "").trim(),
    phone: String(data.get("shipping_phone") ?? "").trim(),
    address: String(data.get("shipping_address") ?? "").trim(),
  };
}
