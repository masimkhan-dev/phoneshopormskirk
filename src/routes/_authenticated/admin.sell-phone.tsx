import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Printer, Save, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { TermsWarranty, useTerms } from "@/components/admin/TermsWarranty";

import { CustomerPicker, type CustomerDraft } from "@/components/admin/CustomerPicker";
import {
  ActionBar,
  Field,
  FormSection,
  Kbd,
  MoneyInput,
  MoreDetails,
  PageHeader,
  SelectField,
  SummaryFigure,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callRpc, newClientRef } from "@/lib/admin/db";
import { PAYMENT_METHODS, money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import { availableStockQuery, type StockItem } from "@/lib/admin/queries";
import { useHotkeys } from "@/lib/admin/useHotkeys";

export const Route = createFileRoute("/_authenticated/admin/sell-phone")({
  component: SellPhone,
});

function SellPhone() {
  const navigate = useNavigate();
  const clientRef = useRef(newClientRef());
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [item, setItem] = useState<StockItem | null>(null);
  const [customer, setCustomer] = useState<CustomerDraft | null>(null);
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");

  const { data: results = [], isFetching } = useQuery({
    ...availableStockQuery(search),
    enabled: !item,
  });

  const totals = useMemo(() => {
    const subtotal = poundsToPence(price);
    const disc = Math.min(poundsToPence(discount), subtotal);
    const total = subtotal - disc;
    const received = Math.max(poundsToPence(paid), 0);
    const amountPaid = Math.min(received, total);
    return {
      subtotal,
      disc,
      total,
      received,
      amountPaid,
      balance: total - amountPaid,
      // Cash change is a preview only; the recorded payment stays capped.
      change: method === "CASH" ? Math.max(received - total, 0) : 0,
    };
  }, [price, discount, paid, method]);

  // Auto-prefill paid = total whenever the total changes.
  // Staff can manually reduce it for partial payments.
  useEffect(() => {
    if (totals.total >= 0) {
      setPaid(penceToPounds(totals.total));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total]);

  const margin = item ? totals.total - item.purchase_cost_pence : 0;

  const save = useMutation({
    mutationFn: async (print: boolean) => {
      const result = await callRpc<{ invoice: { id: string; invoice_number: string } }>(
        "sell_phone",
        {
          p: {
            client_ref: clientRef.current,
            stock_item_id: item?.id,
            customer,
            selling_price_pence: totals.subtotal,
            discount_pence: totals.disc,
            amount_paid_pence: totals.amountPaid,
            payment_method: method,
            notes,
            terms: terms.createPayload(),
          },
        },
      );
      return { result, print };
    },
    onSuccess: ({ result, print }) => {
      toast.success(`Sale ${result.invoice.invoice_number} saved successfully.`);
      navigate({
        to: "/admin/invoices/$invoiceId",
        params: { invoiceId: result.invoice.id },
        search: print ? { print: "1" } : {},
      });
    },
    onError: (error: Error) => {
      clientRef.current = newClientRef();
      toast.error(error.message);
    },
  });

  const terms = useTerms(
    (item?.condition ?? "").toUpperCase().includes("NEW") ? "NEW_PHONE" : "SALES",
  );

  const disabled = save.isPending || !item || totals.subtotal <= 0;

  function pick(stock: StockItem) {
    setItem(stock);
    setSearch("");
    if (stock.selling_price_pence) setPrice(penceToPounds(stock.selling_price_pence));
  }

  const submit = useCallback(
    (print: boolean) => {
      if (save.isPending) return;
      if (disabled) {
        toast.error("Please choose a phone and enter a price.");
        return;
      }
      if (terms.acknowledgementMissing) {
        toast.error("Please tick the customer acknowledgement in Terms & warranty.");
        return;
      }
      save.mutate(print);
    },
    [disabled, save, terms.acknowledgementMissing],
  );

  useHotkeys(
    useMemo(
      () => ({
        "/": () => searchRef.current?.focus(),
        F2: () => submit(true),
        "mod+Enter": () => submit(false),
      }),
      [submit],
    ),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(true);
      }}
    >
      <PageHeader
        compact
        title="Sell a phone"
        description="Pick the handset from stock, add the buyer, take payment."
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <FormSection title="Phone from stock" cols={1} step={1}>
            {item ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface p-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">
                    {[item.brand, item.model].filter(Boolean).join(" ")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[item.sku, item.storage, item.colour, item.condition, item.imei]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold">
                    Cost {money(item.purchase_cost_pence)}
                    {item.selling_price_pence
                      ? ` · Asking ${money(item.selling_price_pence)}`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItem(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    className="h-9 pl-9 pr-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search stock by IMEI, SKU, brand or model"
                    aria-label="Search stock"
                  />
                  {search && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Clear search"
                      className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setSearch("")}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="max-h-56 divide-y divide-admin-border overflow-y-auto rounded-md border border-admin-border">
                  {results.length ? (
                    results.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => pick(s)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-bold">
                            {[s.brand, s.model].filter(Boolean).join(" ")}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[s.sku, s.storage, s.condition, s.imei]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-extrabold tabular-nums">
                          {money(s.selling_price_pence ?? s.purchase_cost_pence)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {isFetching
                        ? "Searching stock…"
                        : search
                          ? "No phones match that search."
                          : "No phones available in stock."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </FormSection>

          <FormSection title="Buyer (optional)" cols={1} step={2}>
            <CustomerPicker value={customer} onChange={setCustomer} label="" optional />
          </FormSection>

          <TermsWarranty terms={terms} step={3} />

          <MoreDetails cols={1} label="Notes and extra details">
            <Field label="Notes">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </MoreDetails>
        </div>

        <FormSection
          title="Price and payment"
          cols={1}
          step={3}
          className="lg:sticky lg:top-32 lg:self-start"
        >
          <Field label="Selling price" htmlFor="price">
            <MoneyInput id="price" value={price} onChange={setPrice} required />
          </Field>
          <Field label="Discount" htmlFor="discount">
            <MoneyInput id="discount" value={discount} onChange={setDiscount} />
          </Field>
          <Field label="Amount paid now" htmlFor="paid">
            <MoneyInput id="paid" value={paid} onChange={setPaid} />
          </Field>
          <Field label="Payment method" htmlFor="method">
            <SelectField
              id="method"
              value={method}
              onChange={setMethod}
              options={PAYMENT_METHODS}
            />
          </Field>
          <dl className="rounded-md bg-surface p-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-extrabold tabular-nums">{money(totals.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-extrabold tabular-nums">{money(totals.amountPaid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {totals.change > 0 ? "Change due" : "Balance"}
              </dt>
              <dd
                className={
                  totals.change > 0
                    ? "font-extrabold tabular-nums text-emerald-600"
                    : "font-extrabold tabular-nums text-primary"
                }
              >
                {money(totals.change > 0 ? totals.change : totals.balance)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-admin-border pt-1">
              <dt className="text-muted-foreground">Gross profit</dt>
              <dd className="font-extrabold tabular-nums">{item ? money(margin) : "—"}</dd>
            </div>
          </dl>
        </FormSection>
      </div>

      <ActionBar
        summary={
          <>
            <SummaryFigure label="Subtotal" value={money(totals.subtotal)} tone="muted" />
            <SummaryFigure label="Discount" value={money(totals.disc)} tone="muted" />
            <SummaryFigure label="Total" value={money(totals.total)} />
            <SummaryFigure label="Paid" value={money(totals.amountPaid)} />
            {totals.change > 0 ? (
              <SummaryFigure label="Change due" value={money(totals.change)} tone="good" />
            ) : (
              <SummaryFigure label="Balance" value={money(totals.balance)} tone="primary" />
            )}
            <SummaryFigure
              label="Gross profit"
              value={item ? money(margin) : "—"}
              tone={!item ? "muted" : margin > 0 ? "good" : "primary"}
            />
          </>
        }
        hint={
          <>
            <span>
              <Kbd>/</Kbd> search stock
            </span>
            <span>
              <Kbd>F2</Kbd> save &amp; print
            </span>
            <span>
              <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save
            </span>
          </>
        }
      >
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => submit(false)}
        >
          {save.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save
        </Button>
        <Button type="submit" disabled={disabled}>
          <Printer className="mr-2 size-4" /> Save &amp; print
        </Button>
      </ActionBar>
    </form>
  );
}
