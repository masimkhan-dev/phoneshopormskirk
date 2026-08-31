import { TermsBlockThermal, invoiceTerms } from "@/components/admin/TermsBlock";
import { money, paymentMethodLabel, ukDateTime } from "@/lib/admin/money";
import type { Invoice, Payment } from "@/lib/admin/queries";
import logoImg from "@/assets/logo.png";

type Business = {
  business_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  warranty_policy?: string;
};

const KIND_TITLE: Record<Invoice["kind"], string> = {
  REPAIR: "Repair invoice",
  PHONE_PURCHASE: "Purchase receipt",
  PHONE_SALE: "Sales invoice",
  PRODUCT_SALE: "Sales receipt",
};

/**
 * 80mm thermal receipt. Purpose-built for narrow black-and-white printing —
 * single column, no colour blocks, readable 11px body text.
 */
export function ReceiptDocument({
  invoice,
  items,
  payments,
}: {
  invoice: Invoice & { customers: { name: string; phone: string } | null };
  items: {
    id: string;
    description: string;
    quantity: number;
    unit_price_pence: number;
    line_total_pence: number;
  }[];
  payments: Payment[];
}) {
  const snapshot = (invoice.snapshot ?? {}) as {
    business?: Business;
    customer?: { name?: string; phone?: string };
    repair?: {
      device_brand?: string | null;
      device_model?: string | null;
      imei?: string | null;
      fault?: string | null;
    };
    stock?: {
      brand?: string | null;
      model?: string | null;
      imei?: string | null;
      storage?: string | null;
      colour?: string | null;
    };
  };
  const business = snapshot.business ?? {};
  const customer = snapshot.customer ?? invoice.customers ?? undefined;
  const repair = snapshot.repair;
  const stock = snapshot.stock;
  const isPurchase = invoice.kind === "PHONE_PURCHASE";
  const device = [
    repair?.device_brand ?? stock?.brand,
    repair?.device_model ?? stock?.model,
    stock?.storage,
    stock?.colour,
  ]
    .filter(Boolean)
    .join(" ");
  const imei = repair?.imei ?? stock?.imei;
  const terms = invoiceTerms(invoice.snapshot);

  return (
    <div className="print-doc receipt-doc mx-auto w-full max-w-[80mm] rounded-lg border border-admin-border bg-white p-4 text-[0.78rem] leading-snug text-ink print:rounded-none">
      <div className="text-center">
        <img
          src={logoImg}
          alt=""
          className="mx-auto mb-2 h-10 w-auto object-contain"
        />
        <p className="text-sm font-extrabold uppercase tracking-wide">
          {business.business_name ?? "Phone Shop Ormskirk"}
        </p>
        <p className="mt-0.5 text-[0.7rem]">
          {[business.address_line1, business.city, business.postcode]
            .filter(Boolean)
            .join(", ")}
        </p>
        {business.phone && <p className="text-[0.7rem]">{business.phone}</p>}
        <p className="mt-2 border-y border-dashed border-ink/40 py-1 text-[0.75rem] font-extrabold uppercase">
          {KIND_TITLE[invoice.kind]}
        </p>
      </div>

      <dl className="mt-2 space-y-0.5 text-[0.72rem]">
        <Line label="No." value={invoice.invoice_number} />
        <Line label="Date" value={ukDateTime(invoice.created_at)} />
        <Line
          label={isPurchase ? "Seller" : "Customer"}
          value={customer?.name ?? "Walk-in"}
        />
        {customer?.phone && <Line label="Phone" value={customer.phone} />}
        {device && <Line label="Device" value={device} />}
        {imei && <Line label="IMEI" value={imei} />}
        {repair?.fault && <Line label="Fault" value={repair.fault} />}
      </dl>

      <div className="mt-2 border-t border-dashed border-ink/40 pt-1">
        {items.map((item) => (
          <div key={item.id} className="mb-1">
            <p className="font-semibold">{item.description}</p>
            <div className="flex justify-between text-[0.72rem] tabular-nums">
              <span>
                {item.quantity} × {money(item.unit_price_pence)}
              </span>
              <span className="font-semibold">{money(item.line_total_pence)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 space-y-0.5 border-t border-dashed border-ink/40 pt-1 text-[0.75rem]">
        <Total label="Subtotal" value={money(invoice.subtotal_pence)} />
        {invoice.discount_pence > 0 && (
          <Total label="Discount" value={`-${money(invoice.discount_pence)}`} />
        )}
        <Total label="Total" value={money(invoice.total_pence)} strong />
        <Total
          label={isPurchase ? "Paid to seller" : "Paid"}
          value={money(invoice.amount_paid_pence)}
        />
        <Total label="Balance due" value={money(invoice.balance_pence)} strong />
      </div>

      {payments.length > 0 && (
        <div className="mt-1 border-t border-dashed border-ink/40 pt-1 text-[0.7rem]">
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between tabular-nums">
              <span>
                {paymentMethodLabel(p.method)}
                {p.is_reversal ? " (refund)" : ""}
              </span>
              <span>
                {p.direction === "IN" ? "" : "-"}
                {money(p.amount_pence)}
              </span>
            </div>
          ))}
        </div>
      )}

      {invoice.status === "VOID" && (
        <p className="mt-2 text-center text-[0.75rem] font-extrabold uppercase">
          Voided{invoice.void_reason ? ` — ${invoice.void_reason}` : ""}
        </p>
      )}

      {terms && <TermsBlockThermal terms={terms} />}

      <div className="mt-2 border-t border-dashed border-ink/40 pt-1 text-[0.68rem] leading-relaxed">
        {invoice.notes && <p>{invoice.notes}</p>}
        {!terms && business.warranty_policy && <p>{business.warranty_policy}</p>}
        <p className="mt-1 text-center font-semibold">
          Thank you for choosing {business.business_name ?? "Phone Shop Ormskirk"}.
        </p>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 font-semibold">{label}</dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  );
}

function Total({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between tabular-nums ${strong ? "font-extrabold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
