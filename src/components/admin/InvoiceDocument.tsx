import { TermsBlockA4, invoiceTerms } from "@/components/admin/TermsBlock";
import { money, paymentMethodLabel, ukDate, ukDateTime } from "@/lib/admin/money";
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
  PHONE_PURCHASE: "Phone purchase receipt",
  PHONE_SALE: "Sales invoice",
  PRODUCT_SALE: "Sales receipt",
};

/**
 * Printable document rendered from the invoice snapshot so a reprint always
 * shows exactly what the customer was given at the counter.
 */
export function InvoiceDocument({
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
    meta?: Record<string, unknown> | null;
  }[];
  payments: Payment[];
}) {
  const snapshot = invoice.snapshot as {
    business?: Business;
    customer?: { name?: string; phone?: string; address?: string; postcode?: string };
    repair?: {
      device_brand?: string | null;
      device_model?: string | null;
      imei?: string | null;
      device_condition?: string | null;
      fault?: string | null;
      accessories_received?: string | null;
    };
    stock?: {
      brand?: string | null;
      model?: string | null;
      imei?: string | null;
      storage?: string | null;
      colour?: string | null;
      condition?: string | null;
    };
  };
  const business = snapshot?.business ?? {};
  const customer = snapshot?.customer ?? invoice.customers ?? undefined;
  const repair = snapshot?.repair;
  const stock = snapshot?.stock;
  const isPurchase = invoice.kind === "PHONE_PURCHASE";
  const terms = invoiceTerms(invoice.snapshot);

  return (
    <div className="print-doc mx-auto w-full max-w-[46rem] rounded-lg border border-admin-border bg-white p-6 text-[0.9rem] text-ink print:max-w-none print:rounded-none print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 pb-4">
        <div className="flex items-start gap-4">
          <img
            src={logoImg}
            alt=""
            className="h-12 w-auto object-contain print:h-10"
          />
          <div>
            <p className="text-xl font-extrabold tracking-tight">
              {business.business_name ?? "Phone Shop Ormskirk"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink/70">
              {[business.address_line1, business.city, business.postcode]
                .filter(Boolean)
                .join(", ")}
              <br />
              {business.phone}
              {business.email ? ` · ${business.email}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-primary">
            {KIND_TITLE[invoice.kind]}
          </p>
          <p className="mt-1 text-lg font-extrabold">{invoice.invoice_number}</p>
          <p className="text-xs text-ink/70">{ukDateTime(invoice.created_at)}</p>
          {invoice.status === "VOID" && (
            <p className="mt-1 text-xs font-extrabold uppercase text-primary">Voided</p>
          )}
        </div>
      </header>

      <section className="grid gap-4 border-b border-ink/10 py-4 sm:grid-cols-2">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink/50">
            {isPurchase ? "Seller" : "Customer"}
          </p>
          <p className="font-bold">{customer?.name ?? "Walk-in customer"}</p>
          {customer?.phone && <p className="text-ink/70">{customer.phone}</p>}
          {snapshot?.customer?.address && (
            <p className="text-ink/70">
              {snapshot.customer.address}
              {snapshot.customer.postcode ? `, ${snapshot.customer.postcode}` : ""}
            </p>
          )}
        </div>
        {(repair || stock) && (
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink/50">
              Device
            </p>
            <p className="font-bold">
              {[
                repair?.device_brand ?? stock?.brand,
                repair?.device_model ?? stock?.model,
              ]
                .filter(Boolean)
                .join(" ") || "—"}
            </p>
            <p className="text-ink/70">
              {[
                (repair?.imei ?? stock?.imei) && `IMEI ${repair?.imei ?? stock?.imei}`,
                stock?.storage,
                stock?.colour,
                repair?.device_condition ?? stock?.condition,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {repair?.fault && <p className="mt-1 text-ink/70">Fault: {repair.fault}</p>}
            {repair?.accessories_received && (
              <p className="text-ink/70">Accessories: {repair.accessories_received}</p>
            )}
          </div>
        )}
      </section>

      <table className="w-full border-collapse py-4 text-left">
        <thead>
          <tr className="border-b border-ink/10 text-[0.7rem] uppercase tracking-[0.1em] text-ink/50">
            <th className="py-2 font-bold">Description</th>
            <th className="py-2 text-center font-bold">Qty</th>
            <th className="py-2 text-right font-bold">Price</th>
            <th className="py-2 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-ink/5">
              <td className="py-2 pr-2">{item.description}</td>
              <td className="py-2 text-center tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{money(item.unit_price_pence)}</td>
              <td className="py-2 text-right font-semibold tabular-nums">
                {money(item.line_total_pence)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="ml-auto mt-4 w-full max-w-xs space-y-1">
        <Row label="Subtotal" value={money(invoice.subtotal_pence)} />
        {invoice.discount_pence > 0 && (
          <Row label="Discount" value={`−${money(invoice.discount_pence)}`} />
        )}
        <Row label="Total" value={money(invoice.total_pence)} strong />
        <Row
          label={isPurchase ? "Paid to seller" : "Paid"}
          value={money(invoice.amount_paid_pence)}
        />
        <Row label="Balance due" value={money(invoice.balance_pence)} strong />
      </section>

      {payments.length > 0 && (
        <section className="mt-5 border-t border-ink/10 pt-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink/50">
            Payments
          </p>
          <ul className="mt-1 space-y-0.5 text-ink/80">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>
                  {ukDate(p.created_at)} · {paymentMethodLabel(p.method)}
                  {p.is_reversal ? " (refund)" : ""}
                </span>
                <span className="tabular-nums">
                  {p.direction === "IN" ? "" : "−"}
                  {money(p.amount_pence)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {terms && <TermsBlockA4 terms={terms} />}

      {(invoice.notes || (!terms && business.warranty_policy)) && (
        <footer className="mt-5 space-y-2 border-t border-ink/10 pt-3 text-xs leading-relaxed text-ink/70">
          {invoice.notes && <p>{invoice.notes}</p>}
          {!terms && business.warranty_policy && <p>{business.warranty_policy}</p>}
          <p className="font-semibold text-ink">
            Thank you for choosing {business.business_name ?? "Phone Shop Ormskirk"}.
          </p>
        </footer>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={strong ? "font-bold" : "text-ink/70"}>{label}</span>
      <span className={strong ? "font-extrabold tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}
